'use strict';
// ============ HUD + menus (immediate mode, canvas-drawn) ============

function press(code) { if (G.pressed.has(code)) { G.pressed.delete(code); return true; } return false; }
function navUp()   { return press('KeyW') || press('ArrowUp'); }
function navDown() { return press('KeyS') || press('ArrowDown'); }
function navLeft() { return press('KeyA') || press('ArrowLeft'); }
function navRight(){ return press('KeyD') || press('ArrowRight'); }
function uiAct()   { return press('Enter') || press('KeyE') || (G.mouse.click ? (G.mouse.click = false, true) : false); }
function uiHot(x, y, w, h) {
  const m = G.mouse;
  const sx = TOUCH.on ? 4 : 0, sy = TOUCH.on ? 3 : 0; // touch slop: fingers aren't cursors
  return m.sx >= x - sx && m.sx < x + w + sx && m.sy >= y - sy && m.sy < y + h + sy;
}
function trunc(s, n) { return s.length > n ? s.slice(0, n - 1) + '…'.replace('…', '.') : s; }

function uiPanel(c, x, y, w, h, title, col) {
  col = col || '#05d9e8';
  c.fillStyle = 'rgba(6,8,14,0.94)'; c.fillRect(x, y, w, h);
  c.fillStyle = col; c.fillRect(x, y, w, 1); c.fillRect(x, y + h - 1, w, 1);
  c.fillRect(x, y, 1, h); c.fillRect(x + w - 1, y, 1, h);
  c.fillRect(x, y, 14, 3); c.fillRect(x + w - 14, y, 14, 3);
  if (title) {
    c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(x + 1, y + 1, w - 2, 16);
    drawText(c, title, x + 8, y + 6, col, 1);
    drawTextR(c, '€$' + fmt(G.eddies), x + w - 8, y + 6, '#f9f002', 1);
  }
}

function uiBar(c, x, y, w, h, frac, col, bg) {
  c.fillStyle = bg || 'rgba(255,255,255,0.08)'; c.fillRect(x, y, w, h);
  c.fillStyle = col; c.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, frac))), h);
}

// generic list nav; returns sel
function navList(n, viewRows) {
  const s = G.uiS;
  if (navUp()) { s.sel = (s.sel - 1 + n) % n; SFX.ui(); }
  if (navDown()) { s.sel = (s.sel + 1) % n; SFX.ui(); }
  if (G.uiWheel) { s.sel = Math.max(0, Math.min(n - 1, s.sel + G.uiWheel)); G.uiWheel = 0; }
  s.sel = Math.max(0, Math.min(n - 1, s.sel));
  if (viewRows) {
    if (s.sel < s.scroll) s.scroll = s.sel;
    if (s.sel >= s.scroll + viewRows) s.scroll = s.sel - viewRows + 1;
  }
  return s.sel;
}

// =================== TITLE ===================
function drawTitle(c) {
  c.fillStyle = '#06060a'; c.fillRect(0, 0, VIEW_W, VIEW_H);
  // skyline strip from the prerendered city
  if (WORLD) { c.globalAlpha = 0.35; c.drawImage(WORLD.cv, 600, 600, 640, 360, 0, 0, VIEW_W, VIEW_H); c.globalAlpha = 1; }
  c.fillStyle = 'rgba(6,6,10,0.72)'; c.fillRect(0, 0, VIEW_W, VIEW_H);
  drawRain(c);
  const gx = Math.random() < 0.07 ? (Math.random() * 6 - 3) | 0 : 0;
  drawTextC(c, 'NIGHT CITY', VIEW_W / 2 - 3 + gx, 60, '#ff2a6d', 5);
  drawTextC(c, 'NIGHT CITY', VIEW_W / 2 + 3 + gx, 60, '#05d9e8', 5);
  drawTextC(c, 'NIGHT CITY', VIEW_W / 2 + gx, 60, '#e8f6ff', 5);
  drawTextC(c, '— P I X E L   E D I T I O N —', VIEW_W / 2, 96, '#f9f002', 1);
  drawTextC(c, 'COLLECT IRON · BUY CHROME · OWN THE STREETS', VIEW_W / 2, 112, '#8a93a6', 1);

  if (G.titleMode === 'name') { titleName(c); drawCursorSpr(c); return; }
  if (G.titleMode === 'gender') { titleGender(c); drawCursorSpr(c); return; }

  const items = [];
  if (hasSave()) items.push('CONTINUE');
  items.push('NEW GAME');
  items.push('SOUND: ' + (SFX.muted ? 'OFF' : 'ON'));
  const sel = navList(items.length);
  for (let i = 0; i < items.length; i++) {
    const y = 170 + i * 22, hot = uiHot(VIEW_W / 2 - 80, y - 6, 160, 18);
    if (hot && G.mouse.moved) G.uiS.sel = i;
    const on = sel === i;
    drawTextC(c, (on ? '> ' : '') + items[i] + (on ? ' <' : ''), VIEW_W / 2, y, on ? '#f9f002' : '#8a93a6', on ? 2 : 1);
    if (hot && G.mouse.click) { G.mouse.click = false; titleSelect(i); return; }
  }
  if (press('Enter') || press('Space')) titleSelect(G.uiS.sel);

  drawTextC(c, 'WASD MOVE · MOUSE SHOOT · SPACE DASH · C HEAL · E INTERACT · V VEHICLE · N RADIO · TAB GEAR', VIEW_W / 2, 300, '#5a6372', 1);
  drawTextC(c, 'UNOFFICIAL FAN TRIBUTE · ALL PIXELS HANDMADE · NOT AFFILIATED WITH CDPR', VIEW_W / 2, 330, '#3a414e', 1);
  drawCursorSpr(c);
}

function titleSelect(i) {
  SFX.init(); SFX.buy();
  const hasC = hasSave();
  if (hasC && i === 0) { startGame(true); return; }
  if ((hasC && i === 1) || (!hasC && i === 0)) { G.titleMode = 'name'; G.uiS.sel = 0; return; }
  SFX.toggleMute();
}

function titleName(c) {
  while (G.textQ.length) {
    const ch = G.textQ.shift();
    if (ch === '\b') G.titleName = G.titleName.slice(0, -1);
    else if (G.titleName.length < 18) G.titleName = cleanPlayerName(G.titleName + ch);
  }
  drawTextC(c, 'ĐẶT TÊN NHÂN VẬT', VIEW_W / 2, 148, '#05d9e8', 2);
  const name = cleanPlayerName(G.titleName);
  const blink = Math.floor(G.rt * 2) % 2 ? '_' : '';
  c.fillStyle = 'rgba(255,255,255,0.06)';
  c.fillRect(VIEW_W / 2 - 116, 176, 232, 36);
  c.strokeStyle = '#05d9e8';
  c.strokeRect(VIEW_W / 2 - 115.5, 176.5, 231, 35);
  drawTextC(c, name + blink, VIEW_W / 2, 190, '#f9f002', 2);
  drawTextC(c, 'GÕ TÊN · BACKSPACE XOÁ · ENTER TIẾP TỤC', VIEW_W / 2, 236, '#8a93a6', 1);
  drawTextC(c, '[ESC] QUAY LẠI', VIEW_W / 2, 252, '#5a6372', 1);
  if (press('Enter') || press('Space')) {
    G.titleName = name;
    if (typeof window !== 'undefined') window.NCPX_PLAYER = Object.assign({}, window.NCPX_PLAYER || {}, { name });
    try { localStorage.setItem('ncpx_player_name', name); } catch (e) {}
    G.titleMode = 'gender'; G.uiS.sel = 0; SFX.ui();
  }
  if (press('Escape')) { G.titleMode = 'menu'; G.uiS.sel = 0; SFX.ui(); }
}

function titleGender(c) {
  drawTextC(c, 'CHOOSE YOUR V', VIEW_W / 2, 148, '#05d9e8', 2);
  if (navLeft() || navRight()) { G.uiS.sel = G.uiS.sel ? 0 : 1; SFX.ui(); }
  G.uiS.sel = G.uiS.sel ? 1 : 0;
  const frame = (G.rt * 3 | 0) % 2;
  for (let i = 0; i < 2; i++) {
    const cx = VIEW_W / 2 + (i ? 78 : -78), sel = G.uiS.sel === i;
    const hot = uiHot(cx - 42, 168, 84, 96);
    if (hot && G.mouse.moved) G.uiS.sel = i;
    c.fillStyle = sel ? 'rgba(5,217,232,0.10)' : 'rgba(255,255,255,0.04)';
    c.fillRect(cx - 42, 168, 84, 96);
    c.strokeStyle = sel ? '#05d9e8' : 'rgba(255,255,255,0.15)';
    c.strokeRect(cx - 41.5, 168.5, 83, 95);
    c.imageSmoothingEnabled = false;
    c.drawImage(SPR.player[i ? 'f' : 'm'].down[sel ? frame : 0], cx - 16, 178, 32, 56);
    drawTextC(c, i ? 'FEMALE V' : 'MALE V', cx, 246, sel ? '#f9f002' : '#8a93a6', 1);
    if (hot && G.mouse.click) {
      G.mouse.click = false;
      if (sel) { startGame(false, i ? 'f' : 'm'); return; }
      G.uiS.sel = i;
    }
  }
  drawTextC(c, '[A/D] SELECT · [ENTER] JACK IN · [ESC] BACK', VIEW_W / 2, 284, '#5a6372', 1);
  if (press('Enter') || press('Space')) { startGame(false, G.uiS.sel ? 'f' : 'm'); return; }
  if (press('Escape')) { G.titleMode = 'menu'; G.uiS.sel = 0; }
}

// =================== HUD ===================
function drawHUD(c) {
  const p = G.p;
  // HUD Background Panel (Glassmorphic)
  const hx = 8, hy = 8, hw = 196, hh = 112;
  c.fillStyle = 'rgba(6, 8, 14, 0.85)';
  c.fillRect(hx, hy, hw, hh);
  // cyan border with pink corner highlights
  c.strokeStyle = 'rgba(5, 217, 232, 0.35)';
  c.strokeRect(hx + 0.5, hy + 0.5, hw - 1, hh - 1);
  c.fillStyle = '#ff2a6d';
  c.fillRect(hx, hy, 4, 1); c.fillRect(hx, hy, 1, 4);
  c.fillRect(hx + hw - 4, hy, 4, 1); c.fillRect(hx + hw - 1, hy, 1, 4);
  c.fillRect(hx, hy + hh - 1, 4, 1); c.fillRect(hx, hy + hh - 4, 1, 4);
  c.fillRect(hx + hw - 4, hy + hh - 1, 4, 1); c.fillRect(hx + hw - 1, hy + hh - 4, 1, 4);

  // Line 1: Player Name & Level
  drawText(c, G.playerName, hx + 10, hy + 8, '#05d9e8', 1.2);
  drawTextR(c, 'LV' + G.lvl, hx + hw - 10, hy + 10, '#05d9e8', 1.0);

  // Line 2: XP Bar
  uiBar(c, hx + 10, hy + 24, hw - 20, 3, G.xp / xpFor(G.lvl), '#05d9e8');

  // Line 3: Health Bar & Health Value
  uiBar(c, hx + 10, hy + 33, 116, 8, p.hp / p.maxhp, p.hp < p.maxhp * 0.35 ? '#ff2a3c' : '#e84545', 'rgba(120,20,30,0.4)');
  drawTextR(c, Math.ceil(p.hp) + '/' + p.maxhp, hx + hw - 10, hy + 31, '#ff8a8a', 1.0);

  // Line 4: Eddies & Armor
  drawText(c, '€$' + fmt(G.eddies), hx + 10, hy + 48, '#f9f002', 1.2);
  if (p.armor > 0) {
    drawTextR(c, 'GIÁP ' + p.armor, hx + hw - 10, hy + 50, '#8a93a6', 1.0);
  }

  // Line 5: Gang Info & Menu key
  const gangName = G.gang ? gangLabel(G.gang) : 'CHƯA CÓ';
  drawText(c, 'BĂNG: ' + gangName, hx + 10, hy + 68, G.gang ? factionColor(G.gang) : '#8a93a6', 1.0);
  drawTextR(c, G.gangInvite ? 'MỜI!' : '[G]', hx + hw - 10, hy + 68, G.gangInvite ? '#f9f002' : '#5a6372', 1.0);

  // Line 6: Active cyberware chips & Concealed status
  let cx = hx + 10;
  if (G.os) {
    const cd = Math.max(0, p.osCd), def = CYB[G.os].tiers[G.cyber[G.os] - 1];
    uiBar(c, cx, hy + 88, 46, 8, p.osT > 0 ? 1 : 1 - cd / def.cd, p.osT > 0 ? '#f9f002' : G.os === 'berserk' ? '#ff2a3c' : '#00ff9f');
    drawText(c, 'Q ' + (G.os === 'berserk' ? 'BERSERK' : 'SANDE'), cx + 2, hy + 89, '#06060a', 1.0);
    cx += 52;
  }
  if (G.cyber.camo) {
    uiBar(c, cx, hy + 88, 36, 8, p.camoT > 0 ? 1 : 1 - Math.max(0, p.camoCd) / CYB.camo.tiers[0].cd, '#05d9e8');
    drawText(c, 'F CAMO', cx + 2, hy + 89, '#06060a', 1.0);
    cx += 42;
  }
  const docLabel = 'C ×' + G.maxdocs;
  drawText(c, docLabel, cx, hy + 89, G.maxdocs > 0 ? '#2ecc71' : '#5a6372', 1.0);
  if (p.useT > 0) {
    uiBar(c, cx, hy + 97, textW(docLabel), 2, 1 - p.useT, '#2ecc71');
  }
  if (p.joyT > 0) {
    drawText(c, '♥' + Math.ceil(p.joyT), cx + textW(docLabel) + 8, hy + 89, '#ff2a6d', 1.0);
  }
  if (G.pHidden && !G.driving) {
    // Draw CONCEALED tag overlay if hideout/bush hides player
    c.fillStyle = 'rgba(0, 255, 159, 0.15)';
    c.fillRect(hx + 1, hy + hh + 2, 80, 12);
    c.strokeStyle = '#00ff9f';
    c.strokeRect(hx + 1.5, hy + hh + 2.5, 79, 11);
    drawText(c, 'CONCEALED', hx + 6, hy + hh + 4, '#00ff9f', 1.0);
  }

  drawMinimap(c);

  // weapon card (redesigned and scaled up)
  const w = curWpn();
  const wx = VIEW_W - 188, wy = VIEW_H - 56;
  c.fillStyle = 'rgba(6, 8, 14, 0.85)'; c.fillRect(wx, wy, 180, 48);
  c.fillStyle = RAR_COL[w ? w.rar : 0]; c.fillRect(wx, wy, 180, 1);
  // cyan side accents
  c.fillStyle = 'rgba(5, 217, 232, 0.25)';
  c.fillRect(wx, wy, 1, 48); c.fillRect(wx + 179, wy, 1, 48);

  if (w) {
    c.drawImage(SPR.wicon(w.cls, KIND_COL[w.kind]), wx + 6, wy + 10);
    drawText(c, trunc(w.name, 18), wx + 38, wy + 8, RAR_COL[w.rar], 1.2);
    if (MELEE_CLS[w.cls]) {
      drawText(c, 'MELEE', wx + 38, wy + 26, '#cfd6e4', 1.1);
    } else {
      const st = G.weapons[w.id];
      drawText(c, (p.reloadT > 0 ? '...' : st.mag) + '/' + w.mag, wx + 38, wy + 26, p.reloadT > 0 ? '#ff9f1c' : '#e8f6ff', 1.1);
      if (p.reloadT > 0) {
        uiBar(c, wx + 38, wy + 38, 64, 3, 1 - p.reloadT / w.rel, '#ff9f1c');
      }
    }
  } else {
    drawText(c, 'UNARMED', wx + 8, wy + 16, '#5a6372', 1.2);
  }

  // Draw uniform, modern slot indicators
  for (let i = 0; i < 3; i++) {
    const id = G.loadout[i];
    const bx = wx + 120 + i * 20, by = wy + 20;
    c.fillStyle = i === G.slot ? 'rgba(249, 240, 2, 0.22)' : 'rgba(255, 255, 255, 0.05)';
    c.fillRect(bx, by, 18, 18);
    c.strokeStyle = i === G.slot ? '#f9f002' : id ? RAR_COL[WPN[id].rar] : 'rgba(255, 255, 255, 0.15)';
    c.strokeRect(bx + 0.5, by + 0.5, 17, 17);
    drawTextC(c, String(i + 1), bx + 9, by + 5, i === G.slot ? '#f9f002' : id ? '#cfd6e4' : '#5a6372', 1.0);
  }
  // car status
  if (G.driving && G.car) {
    const spd = Math.hypot(G.car.vx, G.car.vy);
    drawTextR(c, (spd * 0.55 | 0) + ' KM/H', VIEW_W - 10, wy - 20, '#05d9e8', 2);
    drawTextR(c, 'RADIO: ' + SFX.stationName(), VIEW_W - 10, wy - 30, '#ff2a6d', 1);
    uiBar(c, wx, wy - 8, 140, 3, G.car.hp / CARD[G.car.id].hp, '#00ff9f');
  }
  // interact prompt
  if (G.prompt) drawTextC(c, G.prompt, VIEW_W / 2, VIEW_H - 84, '#f9f002', 1);
  // psycho health bar
  const ps = G.enemies.find(e => e.psycho);
  if (ps && !ps.dead) {
    drawTextC(c, 'CYBERPSYCHO — ' + ps.name, VIEW_W / 2, 8, '#ff2a3c', 1);
    uiBar(c, VIEW_W / 2 - 90, 16, 180, 5, ps.hp / ps.maxhp, '#bd00ff', 'rgba(80,0,40,0.5)');
  }
  // objective lines under minimap (adjusted to larger S = 90 minimap)
  const mmS = 90, mmMy = 8;
  let oy = mmMy + mmS + 6;
  if (G.bounty) {
    const d = Math.hypot(G.bounty.x - p.x, G.bounty.y - p.y) / 10 | 0;
    drawTextR(c, (G.bounty.psycho ? 'PSYCHO' : 'BOUNTY') + ': ' + G.bounty.left + ' LEFT · ' + d + 'M', VIEW_W - 8, oy, G.bounty.psycho ? '#bd00ff' : '#ff5a5a', 1);
    oy += 10;
  }
  if (G.airdrop) {
    const d = Math.hypot(G.airdrop.x - p.x, G.airdrop.y - p.y) / 10 | 0;
    drawTextR(c, 'AIRDROP: ' + (G.airdrop.state === 'falling' ? 'INBOUND' : Math.ceil(G.airdrop.t) + 'S') + ' · ' + d + 'M', VIEW_W - 8, oy, '#ff6a00', 1);
    oy += 10;
  }
  drawTextR(c, WEATHERS[G.weather.kind].name, VIEW_W - 8, oy, '#5a6372', 1);
  oy += 10;
  if (G.marketWarActive) {
    const mins = (G.marketWarT / 60) | 0;
    const secs = (G.marketWarT % 60) | 0;
    const timeStr = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    drawTextR(c, 'ĐẠI CHIẾN CHỢ: ' + timeStr, VIEW_W - 8, oy, '#ff2a6d', 1);
    oy += 10;
    const myGang = String((G.gang ? gangLabel(G.gang) : '') || 'SOLO').toUpperCase();
    for (const m of WORLD.markets || []) {
      const state = G.marketStates && G.marketStates[m.id];
      let ownerText = 'TRỐNG';
      let col = '#cfd6e4';
      if (state && state.winner) {
        ownerText = state.winner;
        col = (state.winner === myGang) ? '#00ff9f' : '#ff5a5a';
      } else if (state && state.members > 0) {
        ownerText = 'TRANH CHẤP (' + state.members + ')';
        col = '#f9f002';
      }
      drawTextR(c, m.code + ': ' + ownerText, VIEW_W - 8, oy, col, 1);
      oy += 10;
    }
  } else {
    const mins = (G.marketWarT / 60) | 0;
    const hours = (mins / 60) | 0;
    const displayMins = mins % 60;
    const displayStr = hours > 0 ? (hours + 'H ' + displayMins + 'M') : (displayMins + 'M');
    drawTextR(c, 'ĐẠI CHIẾN SAU: ' + displayStr, VIEW_W - 8, oy, '#5a6372', 1);
    oy += 10;
  }
  drawMsgs(c);
  drawBanner(c);
  // edge markers
  if (G.bounty) edgeArrow(c, G.bounty.x, G.bounty.y, G.bounty.psycho ? '#bd00ff' : '#ff2a3c');
  if (G.airdrop) edgeArrow(c, G.airdrop.x, G.airdrop.y, '#ff6a00');
  if (!G.skippyFound && distPx(p.x, p.y, WORLD.skippySpot.x, WORLD.skippySpot.y) < 700) edgeArrow(c, WORLD.skippySpot.x, WORLD.skippySpot.y, '#f9f002');
}

function drawMinimap(c) {
  const p = G.p, S = 90, mx = VIEW_W - S - 8, my = 8;
  const range = G.cyber.kiroshi >= 2 ? 64 : 44;
  let tx = p.x / TILE - range / 2, ty = p.y / TILE - range / 2;
  tx = Math.max(0, Math.min(WORLD.W - range, tx)); ty = Math.max(0, Math.min(WORLD.H - range, ty));
  c.fillStyle = 'rgba(6,8,14,0.8)'; c.fillRect(mx - 2, my - 2, S + 4, S + 4);
  c.drawImage(WORLD.mini, tx, ty, range, range, mx, my, S, S);
  c.strokeStyle = '#05d9e8'; c.strokeRect(mx - 1.5, my - 1.5, S + 3, S + 3);
  const dot = (wx, wy, col, txt) => {
    const ddx = wx / TILE - tx, ddy = wy / TILE - ty;
    if (ddx < 0 || ddy < 0 || ddx > range || ddy > range) return;
    if (txt) drawText(c, txt, mx + ddx * S / range - 2, my + ddy * S / range - 2, col, 1);
    else { c.fillStyle = col; c.fillRect(mx + ddx * S / range - 1, my + ddy * S / range - 1, 2, 2); }
  };
  dot(WORLD.shops.guns.x, WORLD.shops.guns.y, '#f9f002', 'G');
  dot(WORLD.shops.ripper.x, WORLD.shops.ripper.y, '#05d9e8', 'R');
  dot(WORLD.shops.cars.x, WORLD.shops.cars.y, '#00ff9f', 'A');
  dot(WORLD.shops.bar.x, WORLD.shops.bar.y, '#ff2a6d', 'B');
  if (WORLD.shops.casino) dot(WORLD.shops.casino.x, WORLD.shops.casino.y, '#bd00ff', 'C');
  if (WORLD.shops.clothing) dot(WORLD.shops.clothing.x, WORLD.shops.clothing.y, '#ff2a6d', 'T');
  const myGang = String((G.gang ? gangLabel(G.gang) : '') || 'SOLO').toUpperCase();
  for (const m of WORLD.markets || []) {
    const state = G.marketStates && G.marketStates[m.id];
    let col = '#5a6372';
    if (G.marketWarActive) {
      if (state && state.winner) {
        col = (state.winner === myGang) ? '#00ff9f' : '#ff2a6d';
      } else if (state && state.members > 0) {
        col = '#f9f002';
      } else {
        col = '#cfd6e4';
      }
    }
    dot(m.tx * TILE, m.ty * TILE, col, m.code);
  }
  for (const n of WORLD.npcs) {
    if (n.kind === 'casino') dot(n.x, n.y, '#00ff9f', 'C');
    else if (n.kind === 'stylist') dot(n.x, n.y, '#bd00ff', 'M');
    else if (n.kind === 'joy' || n.kind === 'doll') dot(n.x, n.y, '#ff2a6d', 'J');
  }
  for (const e of G.enemies) if (!e.dead && (e.bounty || e.psycho || e.war || G.cyber.kiroshi)) dot(e.x, e.y, e.psycho ? '#bd00ff' : factionColor(e.fac));
  for (const rp of G.remotePlayers || []) dot(rp.x, rp.y, String(rp.gang || '').toUpperCase() === ((window.NCPX_PLAYER && window.NCPX_PLAYER.gang) || '').toUpperCase() ? '#00ff9f' : '#bd00ff');
  if (G.bounty && (G.frame / 20 | 0) % 2) dot(G.bounty.x, G.bounty.y, G.bounty.psycho ? '#bd00ff' : '#ff2a3c', '×');
  if (G.airdrop && (G.frame / 14 | 0) % 2) dot(G.airdrop.x, G.airdrop.y, '#ff6a00', '×');
  if (!G.skippyFound && distPx(p.x, p.y, WORLD.skippySpot.x, WORLD.skippySpot.y) < 500) dot(WORLD.skippySpot.x, WORLD.skippySpot.y, '#f9f002', '?');
  // player
  dot(p.x, p.y, '#e8f6ff');
}

function edgeArrow(c, wx, wy, col) {
  const sx = wx - G.cam.x, sy = wy - G.cam.y;
  if (sx > 10 && sx < VIEW_W - 10 && sy > 10 && sy < VIEW_H - 10) return;
  const cxx = VIEW_W / 2, cyy = VIEW_H / 2, a = Math.atan2(sy - cyy, sx - cxx);
  const px = Math.max(14, Math.min(VIEW_W - 14, sx)), py = Math.max(28, Math.min(VIEW_H - 28, sy));
  c.save(); c.translate(px, py); c.rotate(a);
  c.fillStyle = col; c.beginPath(); c.moveTo(7, 0); c.lineTo(-4, -5); c.lineTo(-4, 5); c.closePath(); c.fill();
  c.restore();
}

function drawMsgs(c) {
  let y = VIEW_H - 16;
  for (let i = G.msgs.length - 1; i >= 0 && i >= G.msgs.length - 5; i--) {
    const m = G.msgs[i], a = Math.min(1, m.t);
    c.globalAlpha = a;
    drawText(c, m.text, 8, y, m.col, 1);
    c.globalAlpha = 1;
    y -= 10;
  }
}

function drawBanner(c) {
  const b = G.bannerO;
  if (!b) return;
  const a = Math.min(1, b.t * 2);
  c.globalAlpha = a;
  drawTextC(c, b.text, VIEW_W / 2, 120, b.col, 2);
  if (b.sub) drawTextC(c, b.sub, VIEW_W / 2, 140, '#cfd6e4', 1);
  c.globalAlpha = 1;
}

function drawCrosshair(c) {
  if (TOUCH.on && !TOUCH.aim.act) return; // on touch, crosshair only while aiming
  const m = G.mouse, p = G.p;
  const r = 3 + p.recoil * 10 + (curWpn() && !MELEE_CLS[curWpn().cls] ? curWpn().spread * 0.3 : 0);
  const col = G.lockTarget ? '#ff2a6d' : '#e8f6ff';
  c.strokeStyle = col; c.lineWidth = 1;
  c.beginPath(); c.arc(m.sx, m.sy, r, 0, Math.PI * 2); c.stroke();
  c.fillStyle = col; c.fillRect(m.sx - 0.5, m.sy - 0.5, 1, 1);
  if (G.lockTarget && !G.lockTarget.dead) {
    const lx = G.lockTarget.x - G.cam.x, ly = G.lockTarget.y - G.cam.y - 10;
    c.strokeStyle = '#ff2a6d'; c.strokeRect(lx - 6, ly - 6, 12, 12);
    drawText(c, 'LOCK', lx - 7, ly - 14, '#ff2a6d', 1);
  }
}
function drawCursorSpr(c) { if (!TOUCH.on) c.drawImage(SPR.cursor, G.mouse.sx, G.mouse.sy); }

// =================== VIRTUAL TOUCH CONTROLS ===================
function drawTouchControls(c) {
  if (G.state === 'play' && !G.ui) {
    const stick = (s, dx, dy, label, show) => {
      if (!show) return;
      const bx = s.act ? s.bx : dx, by = s.act ? s.by : dy;
      c.globalAlpha = s.act ? 0.3 : 0.12;
      c.strokeStyle = '#8fd6e8'; c.lineWidth = 1.5;
      c.beginPath(); c.arc(bx, by, 28, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#8fd6e8';
      c.beginPath(); c.arc(s.act ? s.kx : bx, s.act ? s.ky : by, 11, 0, Math.PI * 2); c.fill();
      c.globalAlpha = s.act ? 0.6 : 0.18;
      drawTextC(c, label, bx, by + 36, '#8fd6e8', 1);
      c.globalAlpha = 1; c.lineWidth = 1;
    };
    stick(TOUCH.mv, 70, 290, 'MOVE', true);
    stick(TOUCH.aim, 572, 272, 'AIM+FIRE', !G.driving);
    for (const b of touchButtons()) {
      const hot = TOUCH.held[b.k], pulse = b.k === 'use' && G.prompt;
      c.globalAlpha = hot ? 0.5 : pulse ? 0.3 + 0.15 * Math.sin(G.rt * 6) : 0.16;
      c.fillStyle = pulse ? '#f9f002' : '#8fd6e8';
      c.beginPath(); c.arc(b.x, b.y, b.r, 0, Math.PI * 2); c.fill();
      c.globalAlpha = hot ? 0.95 : 0.6;
      drawTextC(c, b.label, b.x, b.y - 2, pulse ? '#f9f002' : '#dfeaf2', 1);
      c.globalAlpha = 1;
    }
  }
  if (touchCloseVisible()) { // ✕ close — thumb-sized
    c.globalAlpha = 0.65;
    c.fillStyle = '#1a1c26'; c.beginPath(); c.arc(612, 24, 18, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#ff5a5a'; c.lineWidth = 1.5; c.beginPath(); c.arc(612, 24, 18, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 1;
    drawTextC(c, '×', 612, 19, '#ff5a5a', 3);
    c.globalAlpha = 1;
  }
  if (window.innerHeight > window.innerWidth) {
    drawTextC(c, 'ROTATE DEVICE — LANDSCAPE PLAYS BEST', VIEW_W / 2, 2, '#f9f002', 1);
  }
}

// =================== DEATH ===================
function drawDead(c) {
  c.fillStyle = 'rgba(40,0,8,0.55)'; c.fillRect(0, 0, VIEW_W, VIEW_H);
  drawTextC(c, 'FLATLINED', VIEW_W / 2, 130, '#ff2a3c', 4);
  drawTextC(c, 'TRAUMA TEAM EXTRACTION FEE: €$' + fmt(G.deathFee || 0), VIEW_W / 2, 170, '#cfd6e4', 1);
  drawTextC(c, 'REBOOTING IN ' + Math.ceil(G.deadT) + '...', VIEW_W / 2, 186, '#8a93a6', 1);
}

// =================== PAUSE ===================
function drawPause(c) {
  c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(0, 0, VIEW_W, VIEW_H);
  uiPanel(c, 200, 60, 240, 226, localText('SETTINGS'), '#f9f002');
  const langVal = (window.NCPX_I18N && window.NCPX_I18N.lang()) || 'vi';
  const langLabel = langVal === 'vi' ? 'TIẾNG VIỆT' : 'ENGLISH';
  const soundLabel = SFX.muted ? localText('SOUND: OFF') : localText('SOUND: ON');
  const items = [
    localText('RESUME'),
    localText('SAVE GAME'),
    soundLabel,
    localText('LANGUAGE: ') + langLabel,
    localText('ACCOUNT: ') + G.playerName + ' (' + (window.NCPX_CLOUD_SLOT || 'DEFAULT').toUpperCase() + ')',
    G.uiS.confirm ? localText('CONFIRM WIPE? [ENTER]') : localText('NEW GAME')
  ];
  const sel = navList(items.length);
  for (let i = 0; i < items.length; i++) {
    const y = 82 + i * 15, hot = uiHot(210, y - 4, 220, 13);
    if (hot && G.mouse.moved) G.uiS.sel = i;
    drawText(c, (sel === i ? '> ' : '  ') + items[i], 216, y, sel === i ? (i === 5 && G.uiS.confirm ? '#ff2a3c' : '#f9f002') : '#8a93a6', 1);
  }
  if (uiAct()) {
    if (sel === 0) { G.ui = null; }
    else if (sel === 1) { saveGame(); msg(localText('GAME SAVED'), '#2ecc71'); SFX.buy(); }
    else if (sel === 2) { SFX.toggleMute(); }
    else if (sel === 3) {
      const nextLang = langVal === 'vi' ? 'en' : 'vi';
      window.NCPX_LANG = nextLang;
      try { localStorage.setItem('ncpx_lang', nextLang); } catch (e) {}
      SFX.ui();
    }
    else if (sel === 4) {
      msg(localText('ACCOUNT ACTIVE: ') + G.playerName, '#00ff9f');
      SFX.ui();
    }
    else if (sel === 5) {
      if (!G.uiS.confirm) G.uiS.confirm = true;
      else { wipeSave(); G.ui = null; G.state = 'title'; G.titleMode = 'name'; G.uiS = { sel: 0, scroll: 0, tab: 0, confirm: false }; }
    }
  }
  const ctrl = ['WASD MOVE · MOUSE AIM/FIRE', 'SPACE DASH · R RELOAD', 'Q OS ABILITY · F CAMO · C MAXDOC', 'E INTERACT · V VEHICLE · N RADIO', '1/2/3 + WHEEL WEAPON SLOTS', 'TAB INVENTORY · M MUTE · ESC PAUSE'];
  for (let i = 0; i < ctrl.length; i++) drawText(c, ctrl[i], 216, 180 + i * 11, '#5a6372', 1);
  drawTextC(c, 'PROGRESS AUTOSAVES EVERY 12S', VIEW_W / 2, 272, '#3a414e', 1);
  drawCursorSpr(c);
}

// =================== SHOPS ===================
function shopList(c, rows, drawRow, footer, title, col) {
  c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(0, 0, VIEW_W, VIEW_H);
  uiPanel(c, 56, 22, 528, 316, title, col);
  const view = 12, sel = navList(rows.length, view), s = G.uiS;
  for (let i = s.scroll; i < Math.min(rows.length, s.scroll + view); i++) {
    const y = 46 + (i - s.scroll) * 22;
    const hot = uiHot(64, y - 2, 280, 21);
    if (hot && G.mouse.moved) s.sel = i;
    if (sel === i) { c.fillStyle = 'rgba(249,240,2,0.08)'; c.fillRect(62, y - 3, 284, 21); c.fillStyle = '#f9f002'; c.fillRect(62, y - 3, 2, 21); }
    drawRow(c, rows[i], 68, y, sel === i);
    if (hot && G.mouse.click) { G.mouse.click = false; if (s.sel === i) return { act: true, sel }; }
  }
  if (rows.length > view) {
    const sb = 46 + (s.scroll / rows.length) * 264;
    c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(348, sb, 2, Math.max(12, 264 * view / rows.length));
  }
  if (footer) drawTextC(c, footer, VIEW_W / 2, 324, '#5a6372', 1);
  return { act: press('Enter') || press('KeyE'), sel };
}

function statRow(c, x, y, label, frac, col, txt) {
  drawText(c, label, x, y, '#8a93a6', 1);
  uiBar(c, x + 36, y + 1, 110, 4, frac, col);
  if (txt != null) drawTextR(c, String(txt), x + 180, y, '#cfd6e4', 1);
}

function drawShopGuns(c) {
  const stock = WEAPONS.filter(w => !w.iconic && !w.granted && !w.hidden);
  const r = shopList(c, stock, (cc, w, x, y, on) => {
    cc.drawImage(SPR.wicon(w.cls, KIND_COL[w.kind]), x, y + 1);
    drawText(cc, trunc(w.name, 26), x + 28, y + 3, G.weapons[w.id] ? '#5a6372' : RAR_COL[w.rar], 1);
    const right = G.weapons[w.id] ? 'OWNED' : G.lvl < w.lvl ? 'LV' + w.lvl : '€$' + fmt(w.price);
    drawTextR(cc, right, x + 272, y + 3, G.weapons[w.id] ? '#5a6372' : G.lvl < w.lvl ? '#ff5a5a' : G.eddies >= w.price ? '#2ecc71' : '#ff5a5a', 1);
  }, 'ICONIC IRON DROPS FROM CYBERPSYCHOS — GO HUNTING', WORLD.shops.guns.name + ' — WEAPONS', '#f9f002');
  const w = stock[r.sel];
  if (w) {
    const dx = 360, dy = 46;
    drawText(c, w.name, dx, dy, RAR_COL[w.rar], 1);
    drawText(c, RAR_NAME[w.rar] + ' · ' + w.kind.toUpperCase() + ' · ' + w.cls.toUpperCase(), dx, dy + 12, KIND_COL[w.kind], 1);
    statRow(c, dx, dy + 28, 'DMG', w.dmg * (w.pellets || 1) / 120, '#ff5a5a', w.dmg * (w.pellets || 1));
    statRow(c, dx, dy + 40, 'RPS', w.rof / 16, '#f9f002', w.rof);
    statRow(c, dx, dy + 52, 'MAG', (w.mag || 0) / 80, '#05d9e8', w.mag || '—');
    statRow(c, dx, dy + 64, 'DPS', dpsOf(w) / 220, '#bd00ff', dpsOf(w));
    wrapText(w.desc, 40).forEach((ln, i) => drawText(c, ln, dx, dy + 84 + i * 9, '#8a93a6', 1));
    const cur = curWpn();
    if (cur && !G.weapons[w.id]) drawText(c, 'EQUIPPED DPS: ' + dpsOf(cur), dx, dy + 130, '#5a6372', 1);
    let act = G.weapons[w.id] ? 'OWNED' : G.lvl < w.lvl ? 'REQUIRES LEVEL ' + w.lvl : '[ENTER] BUY — €$' + fmt(w.price);
    drawText(c, act, dx, dy + 150, G.weapons[w.id] ? '#5a6372' : '#f9f002', 1);
    if (r.act) buyWeapon(w.id);
  }
  drawCursorSpr(c);
}

function drawShopCars(c) {
  const r = shopList(c, CARS, (cc, car, x, y, on) => {
    cc.save(); cc.translate(x + 12, y + 8); cc.rotate(Math.PI / 2); cc.drawImage(SPR.car(car.id), -8, -15, 16, 30); cc.restore();
    drawText(cc, trunc(car.name, 24), x + 30, y + 3, G.cars[car.id] ? '#5a6372' : '#cfd6e4', 1);
    const right = G.cars[car.id] ? (G.activeCar === car.id ? 'ACTIVE' : 'OWNED') : '€$' + fmt(car.price);
    drawTextR(cc, right, x + 272, y + 3, G.cars[car.id] ? (G.activeCar === car.id ? '#00ff9f' : '#5a6372') : G.eddies >= car.price ? '#2ecc71' : '#ff5a5a', 1);
  }, '[V] SUMMONS YOUR ACTIVE RIDE · RESUMMON REPAIRS FREE', WORLD.shops.cars.name + ' — VEHICLES', '#00ff9f');
  const car = CARS[r.sel];
  if (car) {
    const dx = 360, dy = 46;
    drawText(c, car.name, dx, dy, '#e8f6ff', 1);
    drawText(c, (car.bike ? 'MOTORCYCLE' : 'CAR') + ' · ' + car.shape.toUpperCase(), dx, dy + 12, '#00ff9f', 1);
    c.save(); c.translate(dx + 90, dy + 46); c.rotate(Math.PI / 2); c.imageSmoothingEnabled = false;
    c.drawImage(SPR.car(car.id), -16, -30, 32, 60); c.restore();
    statRow(c, dx, dy + 78, 'TOP', car.top / 360, '#f9f002', car.top);
    statRow(c, dx, dy + 90, 'ACC', car.acc / 320, '#ff5a5a', car.acc);
    statRow(c, dx, dy + 102, 'GRIP', (car.grip - 0.8) / 0.16, '#05d9e8', car.grip);
    statRow(c, dx, dy + 114, 'HP', car.hp / 420, '#00ff9f', car.hp);
    let act = G.cars[car.id] ? (G.activeCar === car.id ? 'YOUR ACTIVE RIDE' : '[ENTER] SET ACTIVE') : '[ENTER] BUY — €$' + fmt(car.price);
    drawText(c, act, dx, dy + 140, '#f9f002', 1);
    if (r.act) buyCar(car.id);
  }
  drawCursorSpr(c);
}

function fxDesc(cy, ti) {
  const t = cy.tiers[ti]; if (!t) return '';
  switch (cy.id) {
    case 'sandevistan': return 'TIME ' + (t.ts * 100 | 0) + '% FOR ' + t.dur + 'S · CD ' + t.cd + 'S';
    case 'berserk': return 'DMG ×' + t.dmg + ' +' + t.armor + ' ARMOR · ' + t.dur + 'S';
    case 'memboost': return 'XP ×' + t.xp;
    case 'kiroshi': return 'CRIT +' + (t.crit * 100 | 0) + '%' + (ti >= 1 ? ' · WIDE MINIMAP' : '');
    case 'biomonitor': return 'AUTO-MAXDOC BELOW 30% HP';
    case 'second_heart': return 'REVIVE ON DEATH · CD 180S';
    case 'kerenzikov': return 'DASH SLOWS TIME TO ' + (t.ts * 100 | 0) + '% FOR ' + t.dur + 'S';
    case 'subdermal': return '+' + t.armor + ' ARMOR';
    case 'camo': return 'INVISIBLE ' + t.dur + 'S · CD ' + t.cd + 'S';
    case 'titanium': return '+' + t.hp + ' MAX HP';
    case 'microrotor': return 'FIRE RATE ×' + t.rof;
    case 'smartlink': return 'SMART GUNS TRACK · TURN ' + t.turn;
    case 'tendons': return 'SPEED ×' + t.spd + ' · DASH CD ×' + t.dash;
    default: return 'ADDS ' + (cy.grants ? WPN[cy.grants].name : '') + ' TO ARSENAL';
  }
}

function drawRipper(c) {
  const rows = [];
  for (const slot of CYBER_SLOTS) { rows.push({ hdr: slot }); CYBER.filter(x => x.slot === slot).forEach(x => rows.push({ cy: x })); }
  const r = shopList(c, rows, (cc, row, x, y, on) => {
    if (row.hdr) { drawText(cc, '— ' + row.hdr + ' —', x, y + 3, '#3a5a66', 1); return; }
    const cy = row.cy, tier = G.cyber[cy.id] || 0, max = cy.tiers.length;
    let nm = cy.name;
    drawText(cc, nm, x + 8, y + 3, tier ? '#05d9e8' : '#cfd6e4', 1);
    for (let k = 0; k < max; k++) { cc.fillStyle = k < tier ? '#05d9e8' : 'rgba(255,255,255,0.15)'; cc.fillRect(x + 8 + textW(nm) + 6 + k * 5, y + 4, 3, 3); }
    let right, rcol = '#2ecc71';
    if (cy.os && tier && G.os !== cy.id) { right = 'ACTIVATE'; rcol = '#f9f002'; }
    else if (tier >= max) { right = cy.os && G.os === cy.id ? 'ACTIVE·MAX' : 'MAXED'; rcol = '#5a6372'; }
    else {
      const t = cy.tiers[tier];
      right = (G.lvl < t.lvl ? 'LV' + t.lvl : '€$' + fmt(t.price));
      rcol = G.lvl < t.lvl ? '#ff5a5a' : G.eddies >= t.price ? '#2ecc71' : '#ff5a5a';
    }
    drawTextR(cc, right, x + 272, y + 3, rcol, 1);
  }, 'CHROME UP. EVERYTHING STACKS. OS SLOT: ONE ACTIVE AT A TIME', WORLD.shops.ripper.name + ' — RIPPERDOC', '#05d9e8');
  const row = rows[r.sel];
  if (row && row.cy) {
    const cy = row.cy, tier = G.cyber[cy.id] || 0, dx = 360, dy = 46;
    drawText(c, cy.name, dx, dy, '#05d9e8', 1);
    drawText(c, cy.slot + (cy.os ? ' · OS' : ''), dx, dy + 12, '#5a6372', 1);
    wrapText(cy.desc, 40).forEach((ln, i) => drawText(c, ln, dx, dy + 28 + i * 9, '#8a93a6', 1));
    for (let k = 0; k < cy.tiers.length; k++) {
      const owned = k < tier;
      drawText(c, 'MK.' + (k + 1) + ' ' + fxDesc(cy, k), dx, dy + 66 + k * 11, owned ? '#05d9e8' : '#5a6372', 1);
    }
    let act;
    if (cy.os && tier && G.os !== cy.id) act = '[ENTER] ACTIVATE OS';
    else if (tier >= cy.tiers.length) act = 'FULLY INSTALLED';
    else { const t = cy.tiers[tier]; act = G.lvl < t.lvl ? 'REQUIRES LEVEL ' + t.lvl : '[ENTER] ' + (tier ? 'UPGRADE' : 'INSTALL') + ' — €$' + fmt(t.price); }
    drawText(c, act, dx, dy + 150, '#f9f002', 1);
    if (r.act) buyCyber(cy.id);
  } else if (row && row.hdr && r.act) SFX.ui();
  drawCursorSpr(c);
}

// =================== JOYTOY / DOLL TALK ===================
function drawTalk(c) {
  c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(0, 0, VIEW_W, VIEW_H);
  const n = G.talk.npc;
  uiPanel(c, 110, 218, 420, 116, n.name + (n.kind === 'doll' ? ' — CLOUDS' : ' — JIG-JIG STREET'), '#ff2a6d');
  wrapText(G.talk.text, 66).slice(0, 2).forEach((ln, i) => drawText(c, ln, 122, 242 + i * 10, '#e8f6ff', 1));
  const opts = talkOptions(n);
  const isStylist = n.kind === 'stylist';
  const sel = navList(opts.length, isStylist ? 3 : undefined);
  const start = isStylist ? (G.uiS.scroll || 0) : 0;
  const count = isStylist ? Math.min(opts.length, start + 3) : opts.length;
  for (let i = start; i < count; i++) {
    const displayIdx = i - start;
    const y = 272 + displayIdx * 16, hot = uiHot(118, y - 4, 404, 14);
    if (hot && G.mouse.moved) G.uiS.sel = i;
    drawText(c, (sel === i ? '> ' : '  ') + opts[i], 124, y, sel === i ? '#f9f002' : '#8a93a6', 1);
    if (hot && G.mouse.click) { G.mouse.click = false; talkSelect(i); return; }
  }
  if (press('Enter') || press('KeyE')) talkSelect(sel);
  drawCursorSpr(c);
}

function drawWardrobe(c) {
  const isVi = window.NCPX_I18N && window.NCPX_I18N.lang() === 'vi';
  const stock = [null, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const r = shopList(c, stock, (cc, row, x, y, on) => {
    const name = row === null ? (isVi ? 'MẶC ĐỊNH' : 'DEFAULT V') : (isVi ? 'BỘ TRANG PHỤC #' : 'OUTFIT #') + (row + 1);
    drawText(cc, name, x, y + 3, G.skin === row ? '#05d9e8' : '#cfd6e4', 1);
    const right = G.skin === row ? (isVi ? 'ĐANG MẶC' : 'EQUIPPED') : '€$100';
    drawTextR(cc, right, x + 272, y + 3, G.skin === row ? '#5a6372' : G.eddies >= 100 ? '#2ecc71' : '#ff5a5a', 1);
  }, isVi ? 'PHÍ THAY ĐỔI DIỆN MẠO: €$100' : 'WARDROBE SERVICE FEE: €$100', isVi ? 'GƯƠNG SOI — TỦ ĐỒ' : 'MIRROR — WARDROBE', '#ff2a6d');

  const row = stock[r.sel];
  const pedSpr = row === null ? (SPR.player[G.gender] || SPR.player.m) : SPR.playerCiv(row, G.gender);

  const dx = 360, dy = 46;
  const outfitName = row === null ? (isVi ? 'MẶC ĐỊNH' : 'DEFAULT V') : (isVi ? 'BỘ TRANG PHỤC #' : 'OUTFIT #') + (row + 1);
  drawText(c, outfitName, dx, dy, '#f9f002', 1);
  drawText(c, (isVi ? 'GIỚI TÍNH: ' : 'GENDER: ') + (G.gender === 'f' ? (isVi ? 'NỮ' : 'FEMALE') : (isVi ? 'NAM' : 'MALE')), dx, dy + 12, '#5a6372', 1);

  drawPed(c, pedSpr, 'down', false, Math.floor(G.rt * 4), dx + 30, dy + 78, 1, 3);
  drawPed(c, pedSpr, 'side', false, Math.floor(G.rt * 4), dx + 90, dy + 78, 1, 3);
  drawPed(c, pedSpr, 'up', false, Math.floor(G.rt * 4), dx + 150, dy + 78, 1, 3);

  drawTextC(c, isVi ? 'MẶT TRƯỚC' : 'FRONT', dx + 30, dy + 96, '#8a93a6', 1);
  drawTextC(c, isVi ? 'MẶT BÊN' : 'PROFILE', dx + 90, dy + 96, '#8a93a6', 1);
  drawTextC(c, isVi ? 'MẶT SAU' : 'BACK', dx + 150, dy + 96, '#8a93a6', 1);

  let act;
  if (G.skin === row) {
    act = isVi ? 'ĐÃ ĐƯỢC TRANG BỊ' : 'ALREADY EQUIPPED';
  } else {
    act = G.eddies < 100 ? (isVi ? 'KHÔNG ĐỦ EDDIES' : 'NOT ENOUGH EDDIES') : (isVi ? '[ENTER] MẶC LÊN — €$100' : '[ENTER] EQUIP — €$100');
  }
  drawText(c, act, dx, dy + 150, G.skin === row ? '#5a6372' : G.eddies >= 100 ? '#f9f002' : '#ff5a5a', 1);

  if (r.act) {
    buyWardrobeOutfit(row);
  }
  drawCursorSpr(c);
}

function drawBar(c) {
  c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(0, 0, VIEW_W, VIEW_H);
  uiPanel(c, 220, 110, 200, 130, 'AFTERLIFE', '#ff2a6d');
  const items = ["'JOHNNY SILVERHAND' — €$100", 'MAXDOC (+1) — €$50', 'LEAVE'];
  const sel = navList(items.length);
  for (let i = 0; i < items.length; i++) {
    const y = 146 + i * 20, hot = uiHot(228, y - 4, 184, 16);
    if (hot && G.mouse.moved) G.uiS.sel = i;
    drawText(c, (sel === i ? '> ' : '  ') + items[i], 230, y, sel === i ? '#f9f002' : '#8a93a6', 1);
    if (hot && G.mouse.click) { G.mouse.click = false; barSelect(i); return; }
  }
  drawText(c, 'FULL HEAL + SPEED BUFF 20S', 230, 210, '#5a6372', 1);
  if (press('Enter') || press('KeyE')) barSelect(sel);
  drawCursorSpr(c);
}

function drawCasino(c) {
  c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(0, 0, VIEW_W, VIEW_H);
  uiPanel(c, 180, 70, 280, 220, localText('CASINO — TÀI XỈU'), '#00ff9f');

  const s = G.uiS;
  const sel = navList(4); // 4 menu items

  // Make sure bet and choice stay valid (within player's eddies and at least 100)
  s.bet = s.bet || 100;
  s.choice = s.choice !== undefined ? s.choice : 1;

  // Item 0: Bet Size
  const y0 = 100, hot0 = uiHot(180, y0 - 4, 280, 16);
  if (hot0 && G.mouse.moved) s.sel = 0;
  drawTextC(c, localText('BET SIZE: ') + '< €$ ' + fmt(s.bet) + ' >', 320, y0, sel === 0 ? '#f9f002' : '#8a93a6', 1);
  if (sel === 0) {
    if (press('ArrowLeft')) { s.bet = Math.max(100, s.bet - 100); SFX.ui(); }
    if (press('ArrowRight')) { s.bet = s.bet + 100; SFX.ui(); }
  }
  if (hot0 && G.mouse.click) {
    G.mouse.click = false;
    if (G.mouse.sx < 320) s.bet = Math.max(100, s.bet - 100);
    else s.bet = s.bet + 100;
    SFX.ui();
  }

  // Item 1: Choice
  const y1 = 120, hot1 = uiHot(180, y1 - 4, 280, 16);
  if (hot1 && G.mouse.moved) s.sel = 1;
  const choiceText = s.choice === 1 ? localText('TÀI (BIG)') : localText('XỈU (SMALL)');
  drawTextC(c, localText('CHOICE: ') + '< ' + choiceText + ' >', 320, y1, sel === 1 ? '#f9f002' : '#8a93a6', 1);
  if (sel === 1 && (press('ArrowLeft') || press('ArrowRight'))) { s.choice = 1 - s.choice; SFX.ui(); }
  if (hot1 && G.mouse.click) {
    G.mouse.click = false;
    s.choice = 1 - s.choice;
    SFX.ui();
  }

  // Item 2: Roll Dice
  const y2 = 140, hot2 = uiHot(180, y2 - 4, 280, 16);
  if (hot2 && G.mouse.moved) s.sel = 2;
  drawTextC(c, localText('ROLL DICE'), 320, y2, sel === 2 ? '#00ff9f' : '#8a93a6', 1);

  // Item 3: Exit
  const y3 = 160, hot3 = uiHot(180, y3 - 4, 280, 16);
  if (hot3 && G.mouse.moved) s.sel = 3;
  drawTextC(c, localText('LEAVE CASINO'), 320, y3, sel === 3 ? '#ff2a6d' : '#8a93a6', 1);

  // Active triggers
  const triggerRoll = () => {
    if (G.eddies < s.bet) {
      msg(localText('NOT ENOUGH EDDIES'), '#ff5a5a');
      SFX.deny();
      return;
    }
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const d3 = Math.floor(Math.random() * 6) + 1;
    s.dice = [d1, d2, d3];
    const sum = d1 + d2 + d3;
    if (sum === 3 || sum === 18) {
      s.result = 'triple';
      G.eddies -= s.bet;
      SFX.hurt();
    } else {
      const sumOutcome = (sum >= 11 && sum <= 17) ? 1 : 0;
      if (sumOutcome === s.choice) {
        s.result = 'win';
        G.eddies += s.bet;
        SFX.levelup();
      } else {
        s.result = 'lose';
        G.eddies -= s.bet;
        SFX.hurt();
      }
    }
    saveGame();
  };

  const triggerExit = () => {
    G.ui = null;
    SFX.ui();
  };

  if (press('Enter') || press('Space')) {
    if (sel === 2) triggerRoll();
    if (sel === 3) triggerExit();
  }

  if (hot2 && G.mouse.click) {
    G.mouse.click = false;
    triggerRoll();
  }

  if (hot3 && G.mouse.click) {
    G.mouse.click = false;
    triggerExit();
  }

  // Draw dice results if rolled
  if (s.dice) {
    const diceY = 186;
    const sum = s.dice[0] + s.dice[1] + s.dice[2];
    
    // Draw 3 dice boxes
    for (let k = 0; k < 3; k++) {
      const diceX = 220 + k * 32;
      c.fillStyle = '#1c1c22';
      c.fillRect(diceX, diceY, 24, 24);
      c.strokeStyle = '#00ff9f';
      c.strokeRect(diceX + 0.5, diceY + 0.5, 23, 23);
      drawTextC(c, String(s.dice[k]), diceX + 12, diceY + 8, '#f9f002', 1);
    }

    // Draw outcome text
    const outcome = (sum === 3 || sum === 18) 
      ? localText('TRIPLE') 
      : (sum >= 11 ? localText('BIG') : localText('SMALL'));
    drawText(c, '= ' + sum + ' (' + outcome + ')', 324, diceY + 9, '#00ff9f', 1);

    // Draw Win/Loss text
    const resultY = 222;
    if (s.result === 'win') {
      drawTextC(c, localText('WIN! +€$') + ' ' + fmt(s.bet), 320, resultY, '#2ecc71', 2);
    } else if (s.result === 'lose') {
      drawTextC(c, localText('LOSE! -€$') + ' ' + fmt(s.bet), 320, resultY, '#ff2a3c', 2);
    } else if (s.result === 'triple') {
      drawTextC(c, localText('DEALER WINS ON TRIPLE!'), 320, resultY, '#ff2a3c', 1);
    }
  }

  drawCursorSpr(c);
}

// =================== INVENTORY ===================
const INV_TABS = ['WEAPONS', 'CYBERWARE', 'GARAGE', 'MAP', 'STATS'];
function drawInv(c) {
  c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(0, 0, VIEW_W, VIEW_H);
  uiPanel(c, 56, 22, 528, 316, null, '#bd00ff');
  drawTextR(c, '€$' + fmt(G.eddies), 576, 28, '#f9f002', 1);
  const s = G.uiS;
  if (press('ArrowLeft')) { s.tab = (s.tab + 4) % 5; s.sel = 0; SFX.ui(); }
  if (press('ArrowRight')) { s.tab = (s.tab + 1) % 5; s.sel = 0; SFX.ui(); }
  let tx = 66;
  for (let i = 0; i < 5; i++) {
    const w = textW(INV_TABS[i]) + 12, hot = uiHot(tx, 26, w, 12);
    if (hot && G.mouse.click) { G.mouse.click = false; s.tab = i; s.sel = 0; }
    if (s.tab === i) { c.fillStyle = 'rgba(189,0,255,0.18)'; c.fillRect(tx, 26, w, 11); }
    drawText(c, INV_TABS[i], tx + 6, 28, s.tab === i ? '#bd00ff' : '#5a6372', 1);
    tx += w + 6;
  }
  if (s.tab === 0) invWeapons(c);
  else if (s.tab === 1) invCyber(c);
  else if (s.tab === 2) invGarage(c);
  else if (s.tab === 3) invMap(c);
  else invStats(c);
  drawTextC(c, 'ARROW KEYS SWITCH TAB · WASD NAVIGATE · TAB/ESC CLOSE', VIEW_W / 2, 324, '#5a6372', 1);
  drawCursorSpr(c);
}

function invWeapons(c) {
  const all = WEAPONS, s = G.uiS;
  const owned = all.filter(w => G.weapons[w.id]).length;
  drawText(c, 'WEAPON DATABASE: ' + owned + '/' + all.length, 66, 46, '#f9f002', 1);
  uiBar(c, 240, 47, 120, 4, owned / all.length, '#f9f002');
  const cols = 8, cw = 63, ch = 24, gx = 66, gy = 58;
  if (navUp()) { s.sel = Math.max(0, s.sel - cols); SFX.ui(); }
  if (navDown()) { s.sel = Math.min(all.length - 1, s.sel + cols); SFX.ui(); }
  if (press('KeyA')) s.sel = Math.max(0, s.sel - 1);
  if (press('KeyD')) s.sel = Math.min(all.length - 1, s.sel + 1);
  for (let i = 0; i < all.length; i++) {
    const w = all[i], x = gx + (i % cols) * cw, y = gy + ((i / cols) | 0) * ch, have = !!G.weapons[w.id];
    const hot = uiHot(x, y, cw - 3, ch - 3);
    if (hot && G.mouse.moved) s.sel = i;
    if (hot && G.mouse.click) { G.mouse.click = false; s.sel = i; }
    c.fillStyle = s.sel === i ? 'rgba(249,240,2,0.12)' : 'rgba(255,255,255,0.04)';
    c.fillRect(x, y, cw - 3, ch - 3);
    c.fillStyle = have ? RAR_COL[w.rar] : 'rgba(255,255,255,0.1)'; c.fillRect(x, y, cw - 3, 1);
    if (have) c.drawImage(SPR.wicon(w.cls, KIND_COL[w.kind]), x + 18, y + 6);
    else drawTextC(c, w.hidden ? '???' : trunc(w.name.split(' ')[0], 8), x + 30, y + 8, 'rgba(120,130,150,0.5)', 1);
    const li = G.loadout.indexOf(w.id);
    if (li >= 0) drawText(c, String(li + 1), x + 2, y + 2, '#f9f002', 1);
  }
  const w = all[s.sel], have = !!G.weapons[w.id], dy = 196;
  c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(66, dy - 4, 508, 1);
  if (have || !w.hidden) {
    drawText(c, have ? w.name : w.hidden ? '???' : w.name, 66, dy, have ? RAR_COL[w.rar] : '#5a6372', 1);
    drawText(c, RAR_NAME[w.rar] + ' · ' + w.kind.toUpperCase() + ' · ' + w.cls.toUpperCase(), 66, dy + 12, KIND_COL[w.kind], 1);
    drawText(c, 'DMG ' + w.dmg * (w.pellets || 1) + ' · RPS ' + w.rof + ' · DPS ' + dpsOf(w) + (w.mag ? ' · MAG ' + w.mag : ''), 66, dy + 24, '#cfd6e4', 1);
    wrapText(w.desc, 80).forEach((ln, i) => drawText(c, ln, 66, dy + 38 + i * 9, '#8a93a6', 1));
    if (have) {
      if (TOUCH.on) {
        drawText(c, localText('EQUIP TO SLOT:'), 66, dy + 64, '#f9f002', 1);
        for (let slotIdx = 0; slotIdx < 3; slotIdx++) {
          const bx = 160 + slotIdx * 32, by = dy + 59, bw = 24, bh = 13;
          const hotB = uiHot(bx, by, bw, bh);
          if (hotB && G.mouse.click) {
            G.mouse.click = false;
            assignSlot(w.id, slotIdx);
            SFX.buy();
          }
          c.fillStyle = hotB ? 'rgba(249,240,2,0.2)' : 'rgba(255,255,255,0.06)';
          c.fillRect(bx, by, bw, bh);
          c.strokeStyle = '#f9f002';
          c.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
          drawTextC(c, String(slotIdx + 1), bx + bw / 2, by + 3.5, '#f9f002', 1);
        }
      } else {
        drawText(c, localText('PRESS [1] [2] [3] TO ASSIGN LOADOUT SLOT'), 66, dy + 64, '#f9f002', 1);
      }
    } else drawText(c, w.iconic ? 'DROPS FROM CYBERPSYCHOS' : w.granted ? 'INSTALLED BY RIPPERDOC' : 'SOLD AT 2ND AMENDMENT', 66, dy + 64, '#5a6372', 1);
  } else drawText(c, 'UNKNOWN. RUMORS SPEAK OF A VOICE IN A GUTTER...', 66, dy, '#5a6372', 1);
  if (have) {
    if (press('Digit1')) assignSlot(w.id, 0);
    if (press('Digit2')) assignSlot(w.id, 1);
    if (press('Digit3')) assignSlot(w.id, 2);
  }
}

function invCyber(c) {
  let y = 50;
  const ownedN = CYBER.filter(cy => G.cyber[cy.id]).length;
  drawText(c, 'CHROME: ' + ownedN + '/' + CYBER.length, 66, 46, '#05d9e8', 1);
  uiBar(c, 240, 47, 120, 4, ownedN / CYBER.length, '#05d9e8');
  y = 62;
  for (const slot of CYBER_SLOTS) {
    const items = CYBER.filter(x => x.slot === slot && G.cyber[x.id]);
    drawText(c, slot, 66, y, '#3a5a66', 1);
    if (!items.length) drawText(c, '— EMPTY —', 200, y, '#3a414e', 1);
    else drawText(c, items.map(x => x.name + ' MK.' + G.cyber[x.id] + (x.os ? (G.os === x.id ? ' [ACTIVE]' : ' [OFF]') : '')).join(' · '), 200, y, '#cfd6e4', 1);
    y += 13;
  }
  drawText(c, 'VISIT VIK [R ON MAP] TO INSTALL AND UPGRADE', 66, y + 12, '#5a6372', 1);
}

function invGarage(c) {
  const s = G.uiS, ownedN = CARS.filter(car => G.cars[car.id]).length;
  drawText(c, 'GARAGE: ' + ownedN + '/' + CARS.length, 66, 46, '#00ff9f', 1);
  uiBar(c, 240, 47, 120, 4, ownedN / CARS.length, '#00ff9f');
  const cols = 4, cw = 126, ch = 54, gx = 66, gy = 60;
  if (navUp()) s.sel = Math.max(0, s.sel - cols);
  if (navDown()) s.sel = Math.min(CARS.length - 1, s.sel + cols);
  if (press('KeyA')) s.sel = Math.max(0, s.sel - 1);
  if (press('KeyD')) s.sel = Math.min(CARS.length - 1, s.sel + 1);
  for (let i = 0; i < CARS.length; i++) {
    const car = CARS[i], x = gx + (i % cols) * cw, y = gy + ((i / cols) | 0) * ch, have = !!G.cars[car.id];
    const hot = uiHot(x, y, cw - 6, ch - 6);
    if (hot && G.mouse.moved) s.sel = i;
    c.fillStyle = s.sel === i ? 'rgba(0,255,159,0.1)' : 'rgba(255,255,255,0.04)';
    c.fillRect(x, y, cw - 6, ch - 6);
    if (have) {
      c.save(); c.translate(x + 30, y + 22); c.rotate(Math.PI / 2); c.drawImage(SPR.car(car.id), -10, -19, 21, 39); c.restore();
      drawText(c, trunc(car.name.split(' ').slice(-1)[0], 11), x + 58, y + 8, '#cfd6e4', 1);
      if (G.activeCar === car.id) drawText(c, 'ACTIVE', x + 58, y + 20, '#00ff9f', 1);
      if (hot && G.mouse.click) { G.mouse.click = false; setActiveCar(car.id); }
    } else {
      drawTextC(c, '???', x + (cw - 6) / 2, y + 12, 'rgba(120,130,150,0.4)', 1);
      drawTextC(c, '€$' + fmt(car.price), x + (cw - 6) / 2, y + 26, 'rgba(120,130,150,0.4)', 1);
    }
  }
  const car = CARS[s.sel];
  if (car && G.cars[car.id]) {
    drawText(c, car.name + (G.activeCar === car.id ? ' — ACTIVE' : ' — [ENTER] SET ACTIVE'), 66, 246, '#00ff9f', 1);
    if (press('Enter') || press('KeyE')) setActiveCar(car.id);
  } else if (car) drawText(c, car.name + ' — AVAILABLE AT NC AUTOFIXER', 66, 246, '#5a6372', 1);
}

function invStats(c) {
  const st = G.stats;
  let worth = G.eddies;
  for (const id in G.weapons) worth += WPN[id].price;
  for (const id in G.cars) worth += CARD[id].price;
  for (const id in G.cyber) for (let k = 0; k < G.cyber[id]; k++) worth += CYB[id].tiers[k].price;
  const mins = (st.playT / 60) | 0;
  const lines = [
    ['STREET CRED', 'LV ' + G.lvl + '  (' + G.xp + '/' + xpFor(G.lvl) + ' XP)'],
    ['NET WORTH', '€$' + fmt(worth)],
    ['ENEMIES FLATLINED', st.kills],
    ['CYBERPSYCHOS DOWNED', st.psychos + '/' + ICONICS.length],
    ['BOUNTIES CLEARED', st.bounties],
    ['AIRDROPS SECURED', st.airdrops || 0],
    ['CRATES CRACKED', st.crates],
    ['DISTANCE ROAMED', (st.dist / 1000).toFixed(1) + ' KM'],
    ['TIME IN NIGHT CITY', mins + ' MIN'],
    ['PLAYER GANG', G.gang ? gangLabel(G.gang) : 'CHƯA CÓ'],
    ['ONLINE CREW', (G.onlineCount || ((G.remotePlayers || []).length + (window.NCPX_NET && window.NCPX_NET.connected ? 1 : 0))) + ' ONLINE'],
    ['SKIPPY', G.skippyFound ? 'FOUND (HE TALKS)' : 'STILL OUT THERE...'],
  ];
  let y = 52;
  for (const [k, v] of lines) {
    drawText(c, k, 80, y, '#5a6372', 1);
    drawText(c, String(v), 260, y, '#e8f6ff', 1);
    y += 16;
  }
  drawTextC(c, '"WRONG CITY, WRONG PEOPLE."', VIEW_W / 2, y + 18, '#3a414e', 1);
}

function invMap(c) {
  const mapSize = 220;
  const mx = 70, my = 52;
  c.fillStyle = '#06080e'; c.fillRect(mx - 2, my - 2, mapSize + 4, mapSize + 4);
  c.strokeStyle = '#bd00ff'; c.strokeRect(mx - 1.5, my - 1.5, mapSize + 3, mapSize + 3);

  const smoothing = c.imageSmoothingEnabled;
  c.imageSmoothingEnabled = false;
  c.drawImage(WORLD.mini, mx, my, mapSize, mapSize);
  c.imageSmoothingEnabled = smoothing;

  const project = (wx, wy) => {
    const tx = wx / TILE, ty = wy / TILE;
    return {
      x: mx + (tx / WORLD.W) * mapSize,
      y: my + (ty / WORLD.H) * mapSize
    };
  };

  const dot = (wx, wy, col, txt, label, desc) => {
    const pt = project(wx, wy);
    c.fillStyle = '#06080e'; c.fillRect(pt.x - 3, pt.y - 3, 7, 7);
    drawTextC(c, txt, pt.x, pt.y - 2.5, col, 1);

    const m = G.mouse;
    if (m && Math.hypot(m.sx - pt.x, m.sy - pt.y) < 6) {
      const tx = 310, ty = 200;
      c.fillStyle = 'rgba(6,8,14,0.95)'; c.fillRect(tx, ty, 250, 60);
      c.strokeStyle = col; c.strokeRect(tx + 0.5, ty + 0.5, 249, 59);
      drawText(c, label, tx + 8, ty + 8, col, 1);
      drawText(c, desc, tx + 8, ty + 20, '#cfd6e4', 1);
      drawText(c, 'COORD: ' + Math.floor(wx/TILE) + ', ' + Math.floor(wy/TILE), tx + 8, ty + 38, '#8a93a6', 1);
    }
  };

  // 1. Player
  dot(G.p.x, G.p.y, '#05d9e8', 'P', 'PLAYER: ' + cleanPlayerName(G.playerName), localText('YOUR CURRENT POSITION'));

  // 2. Shops
  dot(WORLD.shops.guns.x, WORLD.shops.guns.y, '#f9f002', 'G', 'QU\u00c2N - ' + localText('GUN SHOP'), localText('WEAPONS & AMMO'));
  dot(WORLD.shops.ripper.x, WORLD.shops.ripper.y, '#05d9e8', 'R', 'S\u01a0N - ' + localText('RIPPERDOC'), localText('CYBERWARE CLINIC'));
  dot(WORLD.shops.cars.x, WORLD.shops.cars.y, '#00ff9f', 'A', 'T\u00da - AUTOFIXER', localText('VEHICLES AND GARAGE'));
  dot(WORLD.shops.bar.x, WORLD.shops.bar.y, '#ff2a6d', 'B', 'LAN - AFTERLIFE BAR', localText('ORDER A DRINK'));
  if (WORLD.shops.casino) dot(WORLD.shops.casino.x, WORLD.shops.casino.y, '#bd00ff', 'C', 'T\u00c0I - ' + localText('CASINO DEALER'), localText('PLAY DICE MINI-GAME'));
  if (WORLD.shops.clothing) dot(WORLD.shops.clothing.x, WORLD.shops.clothing.y, '#ff69b4', 'T', 'TRANG - ' + localText('MIRROR ROOM'), localText('SWITCH GENDER / SKIN'));

  // 3. NPCs (joy/doll only — casino+stylist now have dedicated buildings)
  for (const n of WORLD.npcs) {
    if (n.kind === 'joy') {
      dot(n.x, n.y, '#ff2a6d', 'J', n.name + ' - JOY', localText('CLOUDS LOUNGE'));
    } else if (n.kind === 'doll') {
      dot(n.x, n.y, '#ff2a6d', 'D', n.name + ' - DOLL', localText('CLOUDS VIP ROOM'));
    }
  }

  // 4. Legend
  const lx = 308, ly = 52;
  drawText(c, localText('NIGHT CITY MAP'), lx, ly, '#bd00ff', 2);
  drawText(c, localText('LEGEND:'), lx, ly + 18, '#5a6372', 1);

  const legendItems = [
    { key: 'P', name: 'PLAYER V', col: '#05d9e8' },
    { key: 'G', name: 'GUN SHOP', col: '#f9f002' },
    { key: 'R', name: 'RIPPERDOC', col: '#05d9e8' },
    { key: 'A', name: 'AUTOFIXER', col: '#00ff9f' },
    { key: 'B', name: 'AFTERLIFE', col: '#ff2a6d' },
    { key: 'C', name: 'CASINO DEALER', col: '#bd00ff' },
    { key: 'T', name: 'TRANG PHUC', col: '#ff69b4' },
    { key: 'J', name: 'JOY / DOLL', col: '#ff2a6d' },
  ];

  legendItems.forEach((item, index) => {
    const rx = lx + (index % 2) * 130;
    const ry = ly + 32 + Math.floor(index / 2) * 14;
    drawText(c, '[' + item.key + '] ' + localText(item.name), rx, ry, item.col, 1);
  });

  drawText(c, localText('HOVER ON DOTS TO IDENTIFY LOCATIONS'), lx, ly + 104, '#8a93a6', 1);
}


function drawGangMenu(c) {
  const s = G.uiS;
  uiPanel(c, 126, 50, 388, 264, 'QUẢN LÝ BĂNG', '#00ff9f');
  drawText(c, 'BĂNG HIỆN TẠI', 154, 84, '#5a6372', 1);
  drawText(c, G.gang ? gangLabel(G.gang) : 'CHƯA CÓ BĂNG', 292, 84, G.gang ? factionColor(G.gang) : '#8a93a6', 1);
  drawText(c, 'CHỌN TÊN', 154, 108, '#5a6372', 1);
  const names = PLAYER_GANG_NAMES;
  if (navLeft()) { G.gangNameSel = (G.gangNameSel - 1 + names.length) % names.length; SFX.ui(); }
  if (navRight()) { G.gangNameSel = (G.gangNameSel + 1) % names.length; SFX.ui(); }
  G.gangNameSel = Math.max(0, Math.min(names.length - 1, G.gangNameSel || 0));
  const hotName = uiHot(150, 118, 340, 18);
  if (hotName && G.mouse.click) {
    G.mouse.click = false;
    if (G.mouse.sx < 326) G.gangNameSel = (G.gangNameSel - 1 + names.length) % names.length;
    else G.gangNameSel = (G.gangNameSel + 1) % names.length;
    SFX.ui();
  }
  drawTextC(c, '< ' + names[G.gangNameSel] + ' >', 326, 128, '#f9f002', 2);
  const icons = PLAYER_GANG_ICONS;
  if (press('KeyZ')) { G.gangIconSel = (G.gangIconSel - 1 + icons.length) % icons.length; SFX.ui(); }
  if (press('KeyX')) { G.gangIconSel = (G.gangIconSel + 1) % icons.length; SFX.ui(); }
  G.gangIconSel = Math.max(0, Math.min(icons.length - 1, G.gangIconSel || 0));
  const hotIcon = uiHot(150, 146, 340, 18);
  if (hotIcon && G.mouse.click) {
    G.mouse.click = false;
    if (G.mouse.sx < 326) G.gangIconSel = (G.gangIconSel - 1 + icons.length) % icons.length;
    else G.gangIconSel = (G.gangIconSel + 1) % icons.length;
    SFX.ui();
  }
  const icon = gangIconObj(G.gangIconSel);
  drawText(c, 'BIỂU TƯỢNG', 154, 154, '#5a6372', 1);
  drawTextC(c, '< [' + icon.mark + '] ' + icon.name + ' >', 326, 154, icon.col, 1);

  const inviteTarget = nearestRemotePlayer(rp => G.gang && !sameGangProfile(rp, playerProfile()));
  const requestTarget = nearestRemotePlayer(rp => !G.gang && rp.gang && rp.gang !== 'SOLO');
  const rows = [
    G.gang === 'player' ? 'ĐỔI TÊN BĂNG' : 'TẠO BĂNG',
    inviteTarget ? 'MỜI ' + cleanPlayerName(inviteTarget.name) : 'KHÔNG CÓ NGƯỜI ĐỂ MỜI',
    requestTarget ? 'XIN VÀO ' + requestTarget.gang : 'KHÔNG CÓ BĂNG ĐỂ XIN',
    G.gangJoinReq ? 'DUYỆT ' + cleanPlayerName(G.gangJoinReq.fromName) : 'CHƯA CÓ ĐƠN XIN',
    G.playerInvite ? 'VÀO ' + G.playerInvite.gang : (G.gangInvite ? 'VÀO ' + gangLabel(G.gangInvite) : 'CHƯA CÓ LỜI MỜI'),
    'ĐÓNG',
  ];
  const sel = navList(rows.length);
  for (let i = 0; i < rows.length; i++) {
    const y = 184 + i * 18, hot = uiHot(166, y - 5, 308, 15);
    const enabled = i === 0 || (i === 1 && !!inviteTarget) || (i === 2 && !!requestTarget) || (i === 3 && !!G.gangJoinReq && G.gang) || (i === 4 && (!!G.playerInvite || !!G.gangInvite)) || i === 5;
    if (hot && G.mouse.moved && enabled) s.sel = i;
    drawTextC(c, (sel === i ? '> ' : '') + rows[i] + (sel === i ? ' <' : ''), 320, y, !enabled ? '#3a414e' : sel === i ? '#00ff9f' : '#8a93a6', 1);
    if (hot && G.mouse.click && enabled) { G.mouse.click = false; s.sel = i; gangMenuAct(i); return; }
  }
  drawTextC(c, '[A/D] TÊN · [Z/X] ICON · [ENTER] CHỌN · [ESC/G] ĐÓNG', VIEW_W / 2, 292, '#5a6372', 1);
  drawTextC(c, 'CÙNG BĂNG KHÔNG THỂ BẮN NHAU TRONG REALTIME', VIEW_W / 2, 304, '#00ff9f', 1);
  if (press('KeyG') || press('Escape')) { G.ui = null; SFX.ui(); return; }
  if (uiAct()) gangMenuAct(sel);
}

function gangMenuAct(sel) {
  if (sel === 0) { setPlayerGang(PLAYER_GANG_NAMES[G.gangNameSel || 0]); G.ui = null; SFX.buy(); return; }
  if (sel === 1) {
    const target = nearestRemotePlayer(rp => G.gang && !sameGangProfile(rp, playerProfile()));
    if (target && window.NCPX_NET && window.NCPX_NET.invite) {
      window.NCPX_NET.invite(target.id, playerProfile());
      msg('ĐÃ GỬI LỜI MỜI CHO ' + cleanPlayerName(target.name), '#00ff9f');
      SFX.buy();
    }
    return;
  }
  if (sel === 2) {
    const target = nearestRemotePlayer(rp => !G.gang && rp.gang && rp.gang !== 'SOLO');
    if (target && window.NCPX_NET && window.NCPX_NET.requestJoin) {
      window.NCPX_NET.requestJoin(target.id, playerProfile());
      msg('ĐÃ XIN VÀO ' + target.gang, '#f9f002');
      SFX.buy();
    }
    return;
  }
  if (sel === 3 && G.gangJoinReq && G.gang && window.NCPX_NET && window.NCPX_NET.invite) {
    window.NCPX_NET.invite(G.gangJoinReq.from, playerProfile());
    msg('ĐÃ DUYỆT ' + cleanPlayerName(G.gangJoinReq.fromName), '#00ff9f');
    G.gangJoinReq = null;
    window.NCPX_NET.requests = [];
    SFX.buy();
    return;
  }
  if (sel === 4 && G.playerInvite) {
    joinPlayerGang(G.playerInvite.gang, G.playerInvite.gangIcon, G.playerInvite.gangIconCol);
    G.ui = null;
    SFX.buy();
    return;
  }
  if (sel === 4 && G.gangInvite) {
    G.gang = G.gangInvite;
    G.playerGangName = null;
    const name = gangLabel(G.gang);
    G.gangInvite = null;
    banner('GIA NHẬP BĂNG', name, factionColor(G.gang));
    msg('BẠN ĐÃ VÀO ' + name, factionColor(G.gang));
    saveGame();
    G.ui = null;
    SFX.buy();
    return;
  }
  if (sel === 5) { G.ui = null; SFX.ui(); }
}

function wrapText(s, n) {
  const words = String(s).split(' '), lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > n) { lines.push(cur.trim()); cur = w; }
    else cur += ' ' + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

window.gangMenuAct = gangMenuAct;

