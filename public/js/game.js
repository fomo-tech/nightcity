'use strict';
// ============ Core sim + render. Night City: Pixel Edition ============
const SAVE_KEY = 'ncpx2077_v1';
let CV = null, C = null, G = null;
function activeSaveKey() {
  return (typeof window !== 'undefined' && window.NCPX_SAVE_KEY) || SAVE_KEY;
}
let WORLD_ZOOM = 1.0;

// ---- helpers ----
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, f) { return a + (b - a) * f; }
function rnd(a, b) { return a + Math.random() * (b - a); }
function irnd(a, b) { return Math.floor(rnd(a, b + 1)); }
function pick(arr) { return arr[Math.random() * arr.length | 0]; }
function distPx(x0, y0, x1, y1) { return Math.hypot(x1 - x0, y1 - y0); }
function turnToward(cur, want, max) {
  const diff = ((want - cur) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
  return cur + clamp(diff, -max, max);
}
const FOV_HALF = 1.0; // ~57° half-angle view cone
function enemyRange(e) {
  const base = e.psycho ? 420 : e.bounty ? 230 : e.kind === 'gun' ? 185 : 160;
  return base * ((G && G.weather && WEATHERS[G.weather.kind].range) || 1); // fog/storms shorten sight
}
function fmt(n) {
  n = Math.round(n); let s = String(Math.abs(n)), o = '';
  while (s.length > 3) { o = ',' + s.slice(-3) + o; s = s.slice(0, -3); }
  return (n < 0 ? '-' : '') + s + o;
}
function curWpn() { const id = G.loadout[G.slot]; return id ? WPN[id] : null; }
function gangLabel(fac) {
  if (!fac) return 'SOLO';
  if (fac === 'player') return G && G.playerGangName ? G.playerGangName : 'BĂNG CỦA BẠN';
  return (FACTION_LABELS && FACTION_LABELS[fac]) || (FACTIONS[fac] && FACTIONS[fac].name) || String(fac).toUpperCase();
}
function gangIconObj(sel) {
  const icons = (typeof PLAYER_GANG_ICONS !== 'undefined' && PLAYER_GANG_ICONS.length) ? PLAYER_GANG_ICONS : [{ mark:'NC', name:'NIGHT CITY', col:'#00ff9f' }];
  return icons[clamp(sel || 0, 0, icons.length - 1) | 0] || icons[0];
}
function activeGangIcon() {
  if (G && G.gang === 'player' && G.playerGangIcon) return { mark:G.playerGangIcon, name:G.playerGangIcon, col:G.playerGangIconCol || '#00ff9f' };
  return G && G.gang === 'player' ? gangIconObj(G.gangIconSel || 0) : { mark:'', name:'', col:factionColorSafe(G && G.gang) };
}
function factionColorSafe(fac) {
  return fac === 'player' ? '#00ff9f' : (FACTIONS[fac] && FACTIONS[fac].pal && FACTIONS[fac].pal.T) || '#8a93a6';
}
function cleanPlayerName(name) {
  return String(name || 'V').replace(/[^\p{L}\p{N}_ -]/gu, '').trim().slice(0, 18).toUpperCase() || 'V';
}
function playerProfile() {
  const p = (typeof window !== 'undefined' && window.NCPX_PLAYER) || {};
  const ownGang = G && G.gang ? gangLabel(G.gang) : p.gang;
  const icon = activeGangIcon();
  return {
    name: cleanPlayerName((G && G.playerName) || p.name || 'V'),
    gang: String(ownGang || 'SOLO').slice(0, 18).toUpperCase(),
    gangKey: G && G.gang ? G.gang : 'solo',
    gangIcon: icon.mark || '',
    gangIconCol: icon.col || '#8a93a6',
    isLeader: G ? !!G.isGangLeader : !!p.isLeader,
  };
}
function sameGangProfile(a, b) {
  const ak = String((a && a.gangKey) || '').toUpperCase();
  const bk = String((b && b.gangKey) || '').toUpperCase();
  const ag = String((a && a.gang) || '').toUpperCase();
  const bg = String((b && b.gang) || '').toUpperCase();
  return ak && bk && ak !== 'SOLO' && bk !== 'SOLO' ? ak === bk && ag === bg : ag && ag !== 'SOLO' && ag === bg;
}
const MAX_GANG_MEMBERS = 10;
function gangMemberCount(profile) {
  profile = profile || playerProfile();
  if (!profile || !profile.gang || profile.gang === 'SOLO') return 0;
  let n = sameGangProfile(profile, playerProfile()) ? 1 : 0;
  for (const rp of G.remotePlayers || []) if (Number(rp.hp) > 0 && sameGangProfile(rp, profile)) n++;
  return n;
}
function gangHasRoom(profile) { return gangMemberCount(profile) < MAX_GANG_MEMBERS; }
function sendRemoteHit(rp, dmg, crit, weapon) {
  if (!rp || !rp.id) return;
  const amt = Math.max(0, Math.round(dmg) || 0);
  if (!Number.isFinite(rp.hp)) rp.hp = rp.maxhp || 100;
  rp.maxhp = rp.maxhp || 100;
  rp.hp = Math.max(0, rp.hp - amt);
  rp.hitT = 0.45;
  addTxt(rp.x, rp.y - 26, (crit ? 'CRIT -' : '-') + amt, crit ? '#f9f002' : '#ff2a6d');
  if (typeof window === 'undefined' || !window.NCPX_NET || !window.NCPX_NET.hit) return;
  window.NCPX_NET.hit(rp.id, { dmg: amt, crit: !!crit, weapon: weapon || 'WEAPON' });
}
function sendCombatFx(payload) {
  if (G) {
    G.netActSeq = (G.netActSeq || 0) + 1;
    G.netAct = Object.assign({ seq: G.netActSeq }, payload || {});
    G.netActRepeat = 8;
  }
  if (typeof window === 'undefined' || !window.NCPX_NET || !window.NCPX_NET.combatFx) return;
  window.NCPX_NET.combatFx(Object.assign({ seq: G.netActSeq }, payload || {}));
}
function applyCombatFx(ev) {
  if (!ev || !G.p) return;
  const kind = String(ev.kind || '');
  const x = Number(ev.x), y = Number(ev.y), a = Number(ev.a);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(a)) return;
  if (distPx(x, y, G.p.x, G.p.y) > 900) return;
  if (kind === 'melee') {
    G.slashes.push({
      x, y, a, t: 0.32, dur: 0.32,
      range: clamp(Number(ev.range) || 24, 8, 64),
      col: cleanFxColor(ev.col, '#dfe6f2'),
    });
    return;
  }
  if (kind !== 'fire') return;
  const col = cleanFxColor(ev.col, '#ffe9a0');
  const shots = Array.isArray(ev.shots) ? ev.shots.slice(0, 12) : null;
  const fallbackPellets = clamp(Math.round(Number(ev.pellets) || 1), 1, 12);
  for (let i = 0; i < (shots ? shots.length : fallbackPellets); i++) {
    const sh = shots && shots[i] ? shots[i] : null;
    const spd = sh ? Math.hypot(Number(sh.vx) || 0, Number(sh.vy) || 0) : clamp(Number(ev.spd) || 360, 80, 900);
    const spread = clamp(Number(ev.spread) || 0, 0, 35);
    const aa = sh ? Math.atan2(Number(sh.vy) || 0, Number(sh.vx) || 0) : a + rnd(-spread, spread) * Math.PI / 180;
    G.bullets.push({
      x: sh && Number.isFinite(Number(sh.x)) ? Number(sh.x) : x + Math.cos(a) * 8,
      y: sh && Number.isFinite(Number(sh.y)) ? Number(sh.y) : y - 2 + Math.sin(a) * 8,
      vx: Math.cos(aa) * spd, vy: Math.sin(aa) * spd,
      dmg: 0, from: 'fx', fx: true, pierce: 0, life: clamp(Number(sh && sh.life) || 0.75, 0.2, 1.5),
      col: cleanFxColor(sh && sh.col, col), turn: 0,
    });
  }
  G.glows.push({ x: x + Math.cos(a) * 12, y: y - 2 + Math.sin(a) * 12, r: 12, col: '#ffd27a', t: 0.05 });
}
function cleanFxColor(value, fallback) {
  const s = String(value || '');
  return /^#[0-9a-f]{6}$/i.test(s) ? s : fallback;
}
function drawWorldTextC(c, text, x, y, col, sc) {
  sc = sc || 0.82;
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.scale(sc, sc);
  drawTextC(c, text, 0, 0, col, 1);
  c.restore();
}
function drawGangWorldLabel(c, gang, icon, iconCol, x, y, col) {
  const label = trunc(String(gang || '').toUpperCase(), 10);
  if (!label || label === 'SOLO') return;
  if (icon && typeof drawGangBadge === 'function') {
    const sc = 0.62, w = textW(label, 1) * sc, left = x - (w + 11) / 2;
    drawGangBadge(c, left, y - 7, icon, iconCol || col, 0.64);
    drawWorldTextC(c, label, left + 13 + w / 2, y - 3, iconCol || col, sc);
  } else {
    drawWorldTextC(c, label, x, y, col, 0.62);
  }
}
function isRealtimeNpcReplica() {
  return !!(typeof window !== 'undefined' && window.NCPX_NET && window.NCPX_NET.connected && !window.NCPX_NET.isHost);
}
function sendNpcHit(e, dmg, crit, dir, kb, burn) {
  if (!e || !e.id || typeof window === 'undefined' || !window.NCPX_NET || !window.NCPX_NET.npcHit) return;
  window.NCPX_NET.npcHit({ enemyId: e.id, dmg: Math.round(dmg), crit: !!crit, dir: dir || 0, kb: kb || 0, burn: burn || 0 });
}

// ---- touch / mobile: twin-stick virtual controls (left = move, right = aim+fire) ----
const TOUCH = {
  on: false, ids: new Map(), setKeys: new Set(), held: {},
  mv: { act: false, x: 0, y: 0, bx: 0, by: 0, kx: 0, ky: 0 },
  aim: { act: false, x: 0, y: 0, bx: 0, by: 0, kx: 0, ky: 0 },
  firing: false,
};
window.TOUCH = TOUCH;
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'VIEW_W', { get: () => VIEW_W, configurable: true });
  Object.defineProperty(window, 'VIEW_H', { get: () => VIEW_H, configurable: true });
}

// thumb-sized: on a phone 1 canvas px ≈ 1pt, so r≥17 keeps targets near the 44pt guideline
// thumb-sized: on a phone 1 canvas px ≈ 1pt, so r≥17 keeps targets near the 44pt guideline
function touchButtons() {
  const comfy = !!window.__NCPX_MOBILE_COMFY;
  const portrait = VIEW_H > VIEW_W;
  if (portrait) {
    const B = [
      { k: 'pause', x: 25, y: 76, r: comfy ? 18 : 15, label: 'II' },
      { k: 'radio', x: 70, y: 76, r: comfy ? 18 : 15, label: 'FM' },
      { k: 'car', x: 115, y: 76, r: comfy ? 18 : 15, label: 'V' },
      { k: 'inv', x: 160, y: 76, r: comfy ? 18 : 15, label: 'TAB' },
      { k: 'fire', x: VIEW_W - 90, y: VIEW_H - 75, r: comfy ? 26 : 22, label: 'FIRE' },
      { k: 'dash', x: VIEW_W - 35, y: VIEW_H - 75, r: comfy ? 20 : 17, label: 'DASH' },
      { k: 'doc', x: VIEW_W - 90, y: VIEW_H - 130, r: comfy ? 18 : 15, label: 'C' },
      { k: 'use', x: VIEW_W - 35, y: VIEW_H - 130, r: comfy ? 18 : 15, label: 'E' },
      { k: 'wpn', x: VIEW_W - 90, y: VIEW_H - 185, r: comfy ? 18 : 15, label: 'WPN' },
      { k: 'reload', x: VIEW_W - 35, y: VIEW_H - 185, r: comfy ? 18 : 15, label: 'REL' },
    ];
    if (G.os) B.push({ k: 'os', x: VIEW_W - 35, y: VIEW_H - 240, r: comfy ? 18 : 15, label: 'Q' });
    if (G.cyber.camo) B.push({ k: 'camo', x: VIEW_W - 90, y: VIEW_H - 240, r: comfy ? 18 : 15, label: 'F' });
    return B;
  }
  const cx = Math.floor(VIEW_W / 2);
  const B = [
    { k: 'pause', x: cx - 75, y: 26, r: comfy ? 19 : 16, label: 'II' },
    { k: 'radio', x: cx - 25, y: 26, r: comfy ? 19 : 16, label: 'FM' },
    { k: 'car', x: cx + 25, y: 26, r: comfy ? 19 : 16, label: 'V' },
    { k: 'inv', x: cx + 75, y: 26, r: comfy ? 19 : 16, label: 'TAB' },
    { k: 'fire', x: VIEW_W - 105, y: VIEW_H - 75, r: comfy ? 26 : 22, label: 'FIRE' },
    { k: 'dash', x: VIEW_W - 45, y: VIEW_H - 75, r: comfy ? 22 : 18, label: 'DASH' },
    { k: 'doc', x: VIEW_W - 105, y: VIEW_H - 135, r: comfy ? 18 : 15, label: 'C' },
    { k: 'use', x: VIEW_W - 45, y: VIEW_H - 135, r: comfy ? 18 : 15, label: 'E' },
    { k: 'wpn', x: VIEW_W - 105, y: VIEW_H - 195, r: comfy ? 18 : 15, label: 'WPN' },
    { k: 'reload', x: VIEW_W - 45, y: VIEW_H - 195, r: comfy ? 18 : 15, label: 'REL' },
  ];
  if (G.os) B.push({ k: 'os', x: VIEW_W - 45, y: VIEW_H - 255, r: comfy ? 18 : 15, label: 'Q' });
  if (G.cyber.camo) B.push({ k: 'camo', x: VIEW_W - 105, y: VIEW_H - 255, r: comfy ? 18 : 15, label: 'F' });
  return B;
}

function touchBtnDown(k) {
  if (k === 'dash') { G.keys.add('Space'); G.pressed.add('Space'); }
  else if (k === 'use') G.pressed.add('KeyE');
  else if (k === 'doc') G.pressed.add('KeyC');
  else if (k === 'os') G.pressed.add('KeyQ');
  else if (k === 'camo') G.pressed.add('KeyF');
  else if (k === 'car') G.pressed.add('KeyV');
  else if (k === 'radio') G.pressed.add('KeyN');
  else if (k === 'wpn') cycleSlot(1);
  else if (k === 'pause') escAction();
  else if (k === 'inv') toggleInv();
  else if (k === 'fire') { TOUCH.firing = true; G.mouse.down = true; }
  else if (k === 'reload') { G.pressed.add('KeyR'); }
}
function touchBtnUp(k) {
  if (k === 'dash') G.keys.delete('Space');
  else if (k === 'fire') { TOUCH.firing = false; G.mouse.down = false; }
}

function touchMenuMode() { return G.state !== 'play' || !!G.ui; }

function touchCloseVisible() {
  return !!G.ui || (G.state === 'title' && (G.titleMode === 'gender' || G.titleMode === 'name'));
}

function touchStartPt(id, pt) {
  if (touchMenuMode()) {
    // close button (✕) — generous hit area
    if (touchCloseVisible() && Math.hypot(pt.x - (VIEW_W - 28), pt.y - 28) < 32) { escAction(); return; }
    TOUCH.ids.set(id, { role: 'menu', x: pt.x, y: pt.y, drag: 0, moved: 0 });
    G.mouse.sx = pt.x; G.mouse.sy = pt.y; G.mouse.moved = true;
    return;
  }
  let bestBtn = null;
  let bestDist = Infinity;
  for (const b of touchButtons()) {
    const slop = window.__NCPX_MOBILE_COMFY ? 16 : 10;
    const dist = Math.hypot(pt.x - b.x, pt.y - b.y);
    if (dist <= b.r + slop) {
      if (dist < bestDist) {
        bestDist = dist;
        bestBtn = b;
      }
    }
  }
  if (bestBtn) {
    TOUCH.ids.set(id, { role: 'btn', k: bestBtn.k });
    TOUCH.held[bestBtn.k] = true;
    touchBtnDown(bestBtn.k);
    return;
  }
  // weapon card: tap a slot box to equip it, tap the card body to reload
  const wcx = VIEW_W - 188, wcy = VIEW_H - 56;
  if (pt.x >= wcx && pt.y >= wcy) {
    for (let i = 0; i < 3; i++) {
      const bx = wcx + 120 + i * 20;
      if (pt.x >= bx - 2 && pt.x < bx + 20 && pt.y >= wcy + 18 && pt.y < wcy + 40) {
        if (G.loadout[i]) { G.slot = i; cycleSlot(0); }
        return;
      }
    }
    G.pressed.add('KeyR');
    return;
  }
  const portrait = VIEW_H > VIEW_W;
  const topGuard = portrait ? Math.max(128, VIEW_H * 0.16) : 90;
  const moveEdge = portrait ? VIEW_W * 0.58 : VIEW_W * 0.46;
  const aimEdge = portrait ? VIEW_W * 0.52 : VIEW_W * 0.54;
  if (pt.x < moveEdge && pt.y > topGuard) {
    TOUCH.ids.set(id, { role: 'mv' });
    TOUCH.mv = { act: true, x: 0, y: 0, bx: pt.x, by: pt.y, kx: pt.x, ky: pt.y };
  } else if (pt.x > aimEdge && pt.y > topGuard) {
    TOUCH.ids.set(id, { role: 'aim' });
    TOUCH.aim = { act: true, x: 0, y: 0, bx: pt.x, by: pt.y, kx: pt.x, ky: pt.y };
  }
}

function touchMovePt(id, pt) {
  const t = TOUCH.ids.get(id);
  if (!t) return;
  if (t.role === 'menu') {
    const dy = pt.y - t.y;
    t.drag += dy; t.moved += Math.abs(dy) + Math.abs(pt.x - t.x);
    t.x = pt.x; t.y = pt.y;
    while (t.drag > 24) { G.uiWheel += 1; t.drag -= 24; }
    while (t.drag < -24) { G.uiWheel -= 1; t.drag += 24; }
    G.mouse.sx = pt.x; G.mouse.sy = pt.y; G.mouse.moved = true;
  } else if (t.role === 'mv' || t.role === 'aim') {
    const s = TOUCH[t.role];
    let dx = pt.x - s.bx, dy = pt.y - s.by;
    const len = Math.hypot(dx, dy), max = 30;
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    s.x = dx / max; s.y = dy / max;
    s.kx = s.bx + dx; s.ky = s.by + dy;
  }
}

function touchEndPt(id, pt) {
  const t = TOUCH.ids.get(id);
  TOUCH.ids.delete(id);
  if (!t) return;
  if (t.role === 'menu') {
    if (t.moved < 14) {
      const r = uiPanelRect();
      if (r && (pt.x < r[0] || pt.x > r[0] + r[2] || pt.y < r[1] || pt.y > r[1] + r[3])) { escAction(); return; } // tap outside = dismiss
      G.mouse.sx = pt.x; G.mouse.sy = pt.y; G.mouse.click = true; G.mouse.moved = true;
    }
  } else if (t.role === 'btn') {
    TOUCH.held[t.k] = false;
    touchBtnUp(t.k);
  } else if (t.role === 'mv') TOUCH.mv.act = false;
  else if (t.role === 'aim') { TOUCH.aim.act = false; if (TOUCH.firing) { TOUCH.firing = false; G.mouse.down = false; } }
}

// translate virtual sticks into the existing key/mouse model every frame
function applyTouch() {
  if (!TOUCH.on) return;
  const play = G.state === 'play' && !G.ui;
  const want = new Set();
  if (play && TOUCH.mv.act) {
    if (TOUCH.mv.x > 0.35) want.add('KeyD');
    if (TOUCH.mv.x < -0.35) want.add('KeyA');
    if (TOUCH.mv.y < -0.35) want.add('KeyW');
    if (TOUCH.mv.y > 0.35) want.add('KeyS');
  }
  for (const k of [...TOUCH.setKeys]) if (!want.has(k)) { G.keys.delete(k); TOUCH.setKeys.delete(k); }
  for (const k of want) if (!TOUCH.setKeys.has(k)) { G.keys.add(k); TOUCH.setKeys.add(k); }

  if (play && !G.driving) {
    let aiming = false;
    if (TOUCH.aim.act) {
      const len = Math.hypot(TOUCH.aim.x, TOUCH.aim.y);
      if (len > 0.2) {
        aiming = true;
        G.lockTarget = null;
        const a = Math.atan2(TOUCH.aim.y, TOUCH.aim.x);
        G.mouse.sx = clamp((G.p.x - G.cam.x) * WORLD_ZOOM + Math.cos(a) * 90, 4, VIEW_W - 4);
        G.mouse.sy = clamp((G.p.y - G.cam.y) * WORLD_ZOOM + Math.sin(a) * 90, 4, VIEW_H - 4);
      }
      const fire = len > 0.45;
      if (fire !== TOUCH.firing) { TOUCH.firing = fire; G.mouse.down = fire; }
    } else if (TOUCH.held['fire']) {
      // Hold dedicated fire button: auto-aim at nearest enemy or fire forward
      let nearest = null, minDist = 220;
      for (const e of G.enemies) {
        if (e.dead || e.hidden) continue;
        const d = Math.hypot(e.x - G.p.x, e.y - G.p.y);
        if (d < minDist) { minDist = d; nearest = e; }
      }
      if (nearest) {
        G.lockTarget = nearest;
        G.mouse.sx = (nearest.x - G.cam.x) * WORLD_ZOOM;
        G.mouse.sy = (nearest.y - G.cam.y - 4) * WORLD_ZOOM;
      } else {
        G.lockTarget = null;
        const facing = G.p.facing || 'down';
        let dx = 0, dy = 0;
        if (facing === 'down') dy = 60;
        else if (facing === 'up') dy = -60;
        else if (facing === 'left') dx = -60;
        else if (facing === 'right') dx = 60;
        else if (facing === 'side') dx = (G.p.flipX ? -60 : 60);
        G.mouse.sx = (G.p.x - G.cam.x) * WORLD_ZOOM + dx;
        G.mouse.sy = (G.p.y - G.cam.y) * WORLD_ZOOM + dy;
      }
      if (!TOUCH.firing) { TOUCH.firing = true; G.mouse.down = true; }
    } else {
      if (TOUCH.firing) { TOUCH.firing = false; G.mouse.down = false; }
    }
  } else {
    if (TOUCH.firing) { TOUCH.firing = false; G.mouse.down = false; }
  }
}

// ---- NCPX mod API: players become creators. See MODDING.md; mods load from mods/mods.js ----
const NCPX = {
  mods: [], hooks: {},
  registerMod(m) {
    this.mods.push(m);
    (m.weapons || []).forEach(w => { if (w.id && !WPN[w.id]) { WEAPONS.push(w); WPN[w.id] = w; } });
    (m.cars || []).forEach(cd => { if (cd.id && !CARD[cd.id]) { CARS.push(cd); CARD[cd.id] = cd; } });
    (m.cyber || []).forEach(cy => { if (cy.id && !CYB[cy.id]) { CYBER.push(cy); CYB[cy.id] = cy; } });
    (m.stations || []).forEach(st => SFX.stations.push(st));
    for (const k in (m.on || {})) (this.hooks[k] = this.hooks[k] || []).push(m.on[k]);
    if (typeof console !== 'undefined') console.log('[NCPX] mod loaded:', m.name || 'unnamed');
  },
  emit(name, data) {
    for (const fn of this.hooks[name] || []) {
      try { fn(data, G); } catch (e) { if (typeof console !== 'undefined') console.warn('[NCPX] mod hook error:', e); }
    }
  },
};
NCPX.mel = _mel; // melody helper from sfx.js, re-exported for station mods
window.NCPX = NCPX;
function hasSave() { try { return !!localStorage.getItem(activeSaveKey()); } catch (e) { return false; } }
function wipeSave() {
  try { localStorage.removeItem(activeSaveKey()); } catch (e) {}
  try { if (window.NCPX_SAVE && window.NCPX_SAVE.remove) window.NCPX_SAVE.remove(); } catch (e) {}
}

// ---- fresh state ----
function newGame() {
  return {
    state: 'title', titleMode: 'menu', ui: null, uiS: { sel: 0, scroll: 0, tab: 0, confirm: false }, textQ: [], invTheme: 'grey',
    gender: 'm',
    skin: null,
    playerName: cleanPlayerName((typeof window !== 'undefined' && window.NCPX_PLAYER && window.NCPX_PLAYER.name) || 'V'),
    titleName: cleanPlayerName((typeof localStorage !== 'undefined' && localStorage.getItem('ncpx_player_name')) || (typeof window !== 'undefined' && window.NCPX_PLAYER && window.NCPX_PLAYER.name) || 'V'),
    t: 0, rt: 0, frame: 0, timeScale: 1,
    cam: { x: 0, y: 0 }, shake: 0,
    keys: new Set(), pressed: new Set(),
    mouse: { sx: 320, sy: 180, wx: 0, wy: 0, down: false, click: false, moved: false }, uiWheel: 0,
    p: null,
    eddies: 500, lvl: 1, xp: 0, maxdocs: 1,
    weapons: {}, loadout: [null, null, null], slot: 0,
    cars: {}, activeCar: null, car: null, driving: false, summonCd: 0,
    cyber: {}, os: null,
    enemies: [], enemySeq: 0, bullets: [], parts: [], decals: [], texts: [], pickups: [], crates: [], civs: [], civSeq: 0, slashes: [], glows: [], remotePlayers: [], remoteLerp: {}, onlineCount: 0, onlineRoom: 'default', roomIsHost: false, npcSyncT: 0, npcSyncSeq: 0, netAct: null, netActSeq: 0, netActRepeat: 0,
    bounty: null, bountyT: 10, bountyCount: 0, psychoPending: 0,
    airdrop: null, airdropT: 90, talk: null, fade: null,
    skippyFound: false, skippyHintT: 0,
    msgs: [], bannerO: null, tipsQ: [], fixerT: 75,
    stats: { kills: 0, psychos: 0, bounties: 0, crates: 0, dist: 0, playT: 0, airdrops: 0 },
    saveT: 12, deadT: 0, deathFee: 0, hurtT: 0, flashT: 0, thunderT: rnd(18, 40),
    rotateHintT: 6.0,
    rain: [], prompt: null, lockTarget: null, lastDistrict: null,
    gang: null, playerGangName: null, playerGangIcon: null, playerGangIconCol: null, gangNameSel: 0, gangIconSel: 0, gangRel: {}, gangInvite: null, playerInvite: null, gangJoinReq: null, gangWarT: 22, gangWar: null, netT: 0,
    weather: { kind: 'drizzle', t: rnd(60, 120) }, wfx: { density: 55, fog: 0 }, fogBlobs: [], pHidden: false,
    marketWarActive: false,
    marketWarT: (typeof window !== 'undefined' && window.location && window.location.search && window.location.search.includes('fastmarket')) ? 30 : 7200,
    marketPayoutT: 5,
    marketStates: [
      { winner: null, members: 0 },
      { winner: null, members: 0 },
      { winner: null, members: 0 },
      { winner: null, members: 0 }
    ],
    isGangLeader: false,
  };
}

function setWeather(kind) {
  G.weather = { kind, t: rnd(70, 160) };
  msg('WEATHER: ' + WEATHERS[kind].name, '#8a93a6');
}

function updateWeather(dt) {
  G.weather.t -= dt;
  if (G.weather.t <= 0) {
    const next = pick(WEATHER_POOL.filter(k => k !== G.weather.kind));
    setWeather(next);
    SFX.msg();
  }
  const W = WEATHERS[G.weather.kind];
  G.wfx.density += ((W.density || 0) - G.wfx.density) * Math.min(1, dt * 0.7);
  G.wfx.fog += ((W.fog || 0) - G.wfx.fog) * Math.min(1, dt * 0.7);
  SFX.rainLevel(Math.min(1, G.wfx.density / 160));
}

function makePlayer(x, y) {
  return {
    x, y, vx: 0, vy: 0, face: 'down', flip: false, anim: 0, moving: false,
    hp: 100, maxhp: 100, armor: 0,
    aim: 0, recoil: 0, fireCd: 0, reloadT: 0, useT: 0, iframes: 0, regenT: 0,
    dashT: 0, dashCd: 0, kzT: 0, trail: [],
    speedMult: 1, rofMult: 1, xpMult: 1, critCh: 0.05, smartTurn: 0, dashCdMult: 1,
    osT: 0, osCd: 0, camoT: 0, camoCd: 0, bioCd: 0, shCd: 0, buffT: 0, joyT: 0,
  };
}

// ---- save / load ----
function saveGame() {
  if (!G || !G.p) return;
  const d = {
    v: 1, gender: G.gender, skin: G.skin, playerName: G.playerName, gang: G.gang, playerGangName: G.playerGangName, playerGangIcon: G.playerGangIcon, playerGangIconCol: G.playerGangIconCol, gangNameSel: G.gangNameSel, gangIconSel: G.gangIconSel, gangRel: G.gangRel, eddies: G.eddies, lvl: G.lvl, xp: G.xp, maxdocs: G.maxdocs,
    px: G.p.x, py: G.p.y, hp: G.p.hp,
    weapons: Object.keys(G.weapons), loadout: G.loadout, slot: G.slot,
    cars: Object.keys(G.cars), activeCar: G.activeCar,
    cyber: G.cyber, os: G.os, stats: G.stats,
    skippyFound: G.skippyFound, bountyCount: G.bountyCount,
    dens: WORLD.dens.filter(dn => dn.cleared).map(dn => dn.id),
    isGangLeader: G.isGangLeader,
    marketWarActive: G.marketWarActive,
    marketWarT: G.marketWarT,
    marketStates: G.marketStates,
    state: G.state,
    deadT: G.deadT,
    deathFee: G.deathFee,
    invTheme: G.invTheme,
  };
  try { localStorage.setItem(activeSaveKey(), JSON.stringify(d)); } catch (e) {}
  try { if (window.NCPX_SAVE && window.NCPX_SAVE.put) window.NCPX_SAVE.put(d); } catch (e) {}
}

function applySave() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(activeSaveKey())); } catch (e) {}
  if (!d) return false;
  G.gender = d.gender === 'f' ? 'f' : 'm';
  G.skin = d.skin !== undefined ? d.skin : null;
  G.playerName = cleanPlayerName(d.playerName || G.titleName || 'V');
  if (typeof window !== 'undefined') window.NCPX_PLAYER = Object.assign({}, window.NCPX_PLAYER || {}, { name: G.playerName });
  G.gang = d.gang || null; G.playerGangName = d.playerGangName || null; G.playerGangIcon = d.playerGangIcon || null; G.playerGangIconCol = d.playerGangIconCol || null; G.gangNameSel = d.gangNameSel || 0; G.gangIconSel = clamp(d.gangIconSel || 0, 0, (PLAYER_GANG_ICONS || []).length - 1); G.gangRel = Object.assign(G.gangRel, d.gangRel || {});
  const isFast = (typeof window !== 'undefined' && window.location && window.location.search && window.location.search.includes('fastmarket'));
  G.isGangLeader = d.isGangLeader !== undefined ? !!d.isGangLeader : false;
  G.marketWarActive = d.marketWarActive !== undefined ? !!d.marketWarActive : false;
  G.marketWarT = d.marketWarT !== undefined ? d.marketWarT : (isFast ? 30 : 7200);
  G.marketPayoutT = 5;
  G.marketStates = d.marketStates || [
    { winner: null, members: 0 },
    { winner: null, members: 0 },
    { winner: null, members: 0 },
    { winner: null, members: 0 }
  ];
  G.eddies = d.eddies; G.lvl = d.lvl; G.xp = d.xp; G.maxdocs = d.maxdocs;
  d.weapons.forEach(id => { if (WPN[id]) G.weapons[id] = { mag: WPN[id].mag || 0 }; });
  G.loadout = d.loadout.map(id => (id && G.weapons[id]) ? id : null);
  G.slot = d.slot || 0;
  d.cars.forEach(id => { if (CARD[id]) G.cars[id] = 1; });
  G.activeCar = d.activeCar && G.cars[d.activeCar] ? d.activeCar : null;
  G.cyber = d.cyber || {}; G.os = d.os || null;
  G.stats = Object.assign(G.stats, d.stats);
  G.skippyFound = !!d.skippyFound; G.bountyCount = d.bountyCount || 0;
  (d.dens || []).forEach(id => { const dn = WORLD.dens[id]; if (dn) { dn.cleared = true; dn.done = true; } });
  if (!WORLD.blockedPx(d.px, d.py)) { G.p.x = d.px; G.p.y = d.py; } // saves standing on old-version furniture fall back to spawn
  G.state = d.state || 'play'; G.deadT = d.deadT || 0; G.deathFee = d.deathFee || 0; G.invTheme = d.invTheme || 'grey';
  G.p.hp = d.hp !== undefined ? d.hp : 100;
  return true;
}

function startGame(cont, gender) {
  const keep = G ? { keys: G.keys, mouse: G.mouse, rain: G.rain } : null;
  const chosenName = cleanPlayerName((typeof window !== 'undefined' && window.NCPX_PLAYER && window.NCPX_PLAYER.name) || (G && G.titleName));
  G = newGame();
  window.G = G;
  if (keep) { G.keys = keep.keys; G.mouse = keep.mouse; G.rain = keep.rain; }
  G.titleName = chosenName;
  G.playerName = chosenName;
  if (typeof window !== 'undefined') {
    window.NCPX_PLAYER = Object.assign({}, window.NCPX_PLAYER || {}, { name: G.playerName });
    try { localStorage.setItem('ncpx_player_name', G.playerName); } catch (e) {}
  }
  const profileGender = typeof window !== 'undefined' && window.NCPX_PLAYER && window.NCPX_PLAYER.gender;
  G.gender = (gender || profileGender) === 'f' ? 'f' : 'm';
  G.p = makePlayer(WORLD.spawn.x, WORLD.spawn.y);
  G.crates = WORLD.crateSpots.map(s => ({ x: s.x, y: s.y, hp: 1, respT: 0 }));
  G.pickups = WORLD.giftSpots.map(s => s.kind === 'doc'
    ? { kind: 'doc', x: s.x, y: s.y, vx: 0, vy: 0, t: 240 }
    : { kind: 'ed', amt: s.amt || irnd(20, 95), x: s.x, y: s.y, vx: 0, vy: 0, t: 240 });
  if (cont && applySave()) {
    recalcStats();
    if (G.state === 'dead') {
      G.p.hp = 0;
    } else {
      G.p.hp = clamp(G.p.hp, 1, G.p.maxhp);
      G.state = 'play';
    }
    banner('CHÀO MỪNG TRỞ LẠI NIGHT CITY', DISTRICTS[WORLD.districtAt(G.p.x, G.p.y)].name, '#05d9e8');
  } else {
    // random starter kit: one weapon, one ride
    const sw = pick(STARTER_WPNS), sc = pick(STARTER_CARS);
    giveWeapon(sw, true); G.loadout[0] = sw; G.slot = 0;
    G.cars[sc] = 1; G.activeCar = sc;
    recalcStats(); G.p.hp = G.p.maxhp;
    banner('NIGHT CITY', 'THỨC DẬY, SAMURAI. TA CÓ CẢ THÀNH PHỐ ĐỂ ĐỐT CHÁY', '#f9f002');
    msg('STARTER KIT: ' + WPN[sw].name + ' + ' + CARD[sc].name + ' [V]', '#2ecc71');
    TIPS.forEach((tip, i) => G.tipsQ.push({ at: 3 + i * 6, text: tip }));
    NCPX.emit('newgame', { gender: G.gender });
    G.state = 'play';
  }
  G.ui = null;
  snapCam();
  maintainCivs();
}

function snapCam() {
  const wv_w = VIEW_W / WORLD_ZOOM;
  const wv_h = VIEW_H / WORLD_ZOOM;
  G.cam.x = clamp(G.p.x - wv_w / 2, 0, WORLD.W * TILE - wv_w);
  G.cam.y = clamp(G.p.y - wv_h / 2, 0, WORLD.H * TILE - wv_h);
}

// =================== boot & input ===================
function boot() {
  if (window.__NCPX_GAME_RUNNING) return;
  window.__NCPX_GAME_RUNNING = true;
  CV = document.getElementById('cv');
  C = CV.getContext('2d');
  C.imageSmoothingEnabled = false;
  genWorld();
  G = newGame();
  window.G = G;
  fitCanvas();
  window.addEventListener('resize', fitCanvas);

  window.addEventListener('keydown', e => {
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (G && ((G.state === 'title' && G.titleMode === 'name') || (G.state === 'play' && G.ui === 'gang'))) {
      if (e.key && e.key.length === 1) G.textQ.push(e.key);
      else if (e.code === 'Backspace') G.textQ.push('\b');
    }
    G.keys.add(e.code); G.pressed.add(e.code);
    if (e.code === 'KeyM') { SFX.init(); msg('SOUND ' + (SFX.toggleMute() ? 'OFF' : 'ON'), '#8a93a6'); }
    if (G.state === 'play') {
      if (e.code === 'Escape') escAction();
      if (e.code === 'Tab') toggleInv();
      if (e.code === 'KeyG') {
        if (G.ui === 'gang') { G.ui = null; SFX.ui(); }
        else if (!G.ui) { G.ui = 'gang'; G.uiS = { sel: 0, scroll: 0, tab: 0, confirm: false }; SFX.ui(); }
      }
    }
  });
  window.addEventListener('keyup', e => G.keys.delete(e.code));
  CV.addEventListener('mousemove', e => {
    const r = CV.getBoundingClientRect();
    if (window.innerHeight > window.innerWidth) {
      const pctX = r.width > 0 ? (e.clientX - r.left) / r.width : 0;
      const pctY = r.height > 0 ? (e.clientY - r.top) / r.height : 0;
      G.mouse.sx = pctY * VIEW_W;
      G.mouse.sy = (1 - pctX) * VIEW_H;
    } else {
      G.mouse.sx = (e.clientX - r.left) * (VIEW_W / r.width);
      G.mouse.sy = (e.clientY - r.top) * (VIEW_H / r.height);
    }
    G.mouse.moved = true;
  });
  CV.addEventListener('mousedown', e => { SFX.init(); G.mouse.down = true; G.mouse.click = true; e.preventDefault(); });
  window.addEventListener('mouseup', () => { G.mouse.down = false; });
  CV.addEventListener('contextmenu', e => e.preventDefault());
  // touch / mobile
  TOUCH.on = ('ontouchstart' in window) || (typeof navigator !== 'undefined' && (navigator.maxTouchPoints | 0) > 0);
  const toPt = t => {
    const r = CV.getBoundingClientRect();
    if (window.innerHeight > window.innerWidth) {
      const pctX = r.width > 0 ? (t.clientX - r.left) / r.width : 0;
      const pctY = r.height > 0 ? (t.clientY - r.top) / r.height : 0;
      return { x: pctY * VIEW_W, y: (1 - pctX) * VIEW_H };
    } else {
      return { x: (t.clientX - r.left) * (VIEW_W / r.width), y: (t.clientY - r.top) * (VIEW_H / r.height) };
    }
  };
  const onTouch = fn => e => {
    e.preventDefault();
    TOUCH.on = true;
    SFX.init();
    for (const t of e.changedTouches) fn(t.identifier, toPt(t));
  };
  CV.addEventListener('touchstart', onTouch(touchStartPt), { passive: false });
  CV.addEventListener('touchmove', onTouch(touchMovePt), { passive: false });
  CV.addEventListener('touchend', onTouch(touchEndPt), { passive: false });
  CV.addEventListener('touchcancel', onTouch(touchEndPt), { passive: false });
  CV.addEventListener('wheel', e => {
    e.preventDefault();
    const d = Math.sign(e.deltaY);
    if (G.ui) G.uiWheel += d;
    else if (G.state === 'play') cycleSlot(d);
  }, { passive: false });

  // headless/screenshot support: ?autostart skips the title menu, ?demo fast-forwards into action
  const q = (window.location && window.location.search) || '';
  if (/touch/.test(q)) TOUCH.on = true; // preview virtual controls on desktop
  // ?wx=storm|fog|acid|clear|smog|drizzle forces weather in any debug mode
  const wxm = q.match(/wx=(\w+)/);
  const forceWx = () => {
    if (wxm && WEATHERS[wxm[1]]) {
      setWeather(wxm[1]);
      G.wfx.density = WEATHERS[wxm[1]].density || 0;
      G.wfx.fog = WEATHERS[wxm[1]].fog || 0;
      G.weather.t = 9999;
    }
  };
  if (/autostart|demo/.test(q)) { startGame(false, /v=f/.test(q) ? 'f' : 'm'); forceWx(); }
  else if (/charsel/.test(q)) G.titleMode = 'gender';
  else if (/indoor/.test(q)) { // screenshot helper: stand inside the gun shop
    startGame(false);
    G.p.x = WORLD.shops.guns.x; G.p.y = WORLD.shops.guns.y + 6;
    for (let i = 0; i < 90; i++) step(1 / 60);
    G.bannerO = null;
  } else if (/doorstep/.test(q)) { // screenshot helper: stand at the Afterlife door, outside
    startGame(false);
    const bs = WORLD.signs.find(s => s.text === 'AFTERLIFE');
    const r = WORLD.roofs[bs.roof];
    G.p.x = r.doorTx[0] * TILE + 8; G.p.y = (r.doorTy + 1) * TILE + 10;
    for (let i = 0; i < 90; i++) step(1 / 60);
    G.bannerO = null;
  } else if (/airdrop/.test(q)) { // screenshot helper: chase an airdrop in Dogtown
    startGame(false);
    G.airdropT = 0; spawnAirdrop();
    if (G.airdrop) { G.p.x = G.airdrop.x + 40; G.p.y = G.airdrop.y + 50; }
    for (let i = 0; i < 300; i++) step(1 / 60);
    G.bannerO = null;
  } else if (/jigjig/.test(q)) { // screenshot helper: Jig-Jig Street
    startGame(false);
    const jj = WORLD.npcs.find(n => n.kind === 'joy');
    if (jj) { G.p.x = jj.x + 14; G.p.y = jj.y + 12; }
    for (let i = 0; i < 90; i++) step(1 / 60);
    G.bannerO = null;
  } else if (window.__NCPX_SKIP_TITLE_MENU) {
    if (hasSave()) startGame(true);
    else if (window.__NCPX_CHARACTER_READY) startGame(false, window.NCPX_PLAYER && window.NCPX_PLAYER.gender);
    else { G.titleMode = 'name'; G.uiS.sel = 0; }
  }
  if (/demo/.test(q)) {
    G.eddies = 60000;
    G.cars.galena = 1; G.activeCar = 'galena';
    summonCar();
    spawnPack(G.p.x + 110, G.p.y - 30, 4, { alerted: true });
    for (let i = 0; i < 240; i++) step(1 / 60);
    if (G.car) { // scripted run-over so screenshots show vehicle combat + blood decals
      enterCar();
      G.car.a = 0; G.car.vx = 260; G.car.vy = 0;
      for (let k = 0; k < 3; k++) G.enemies.push(makeEnemy(G.car.x + 30 + k * 22, G.car.y + rnd(-4, 4), 1, 'scavs', 'melee', { alerted: true }));
      for (let i = 0; i < 80; i++) step(1 / 60);
      if (G.driving) exitCar();
      for (let i = 0; i < 30; i++) step(1 / 60);
    }
  }
  step(1 / 60); // paint one frame synchronously so load-time screenshots aren't black

  let last = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
  const loop = now => {
    if (now == null) now = last + 16.6667;
    const dt = clamp((now - last) / 1000, 0.001, 0.05);
    last = now;
    // crash shield: a bad frame (or a broken mod) must never freeze the game
    try { step(dt); } catch (err) {
      if (typeof console !== 'undefined') console.error('[NCPX] frame error:', err);
      try {
        C.fillStyle = 'rgba(60,0,12,0.85)'; C.fillRect(0, 150, VIEW_W, 36);
        drawTextC(C, 'SCRIPT ERROR — CHECK CONSOLE (F12), HARD-REFRESH (CTRL+SHIFT+R)', VIEW_W / 2, 158, '#ff5a5a', 1);
        drawTextC(C, String(err && err.message || err).slice(0, 90), VIEW_W / 2, 172, '#ffaaaa', 1);
      } catch (e2) {}
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function fitCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const vv = window.visualViewport;
  const w = Math.round((vv && vv.width) || window.innerWidth);
  const h = Math.round((vv && vv.height) || window.innerHeight);
  const portrait = h > w;
  const layoutW = portrait ? h : w;
  const layoutH = portrait ? w : h;
  if (window.__NCPX_RESPONSIVE_FIT) {
    const shortSide = Math.min(layoutW, layoutH);
    const scale = shortSide >= 700 ? 1.5 : shortSide >= 520 ? 1.25 : 1;
    VIEW_W = Math.max(320, Math.floor(layoutW / scale));
    VIEW_H = Math.max(180, Math.floor(layoutH / scale));
    if (CV.width !== VIEW_W || CV.height !== VIEW_H) {
      CV.width = VIEW_W;
      CV.height = VIEW_H;
      C = CV.getContext('2d');
      C.imageSmoothingEnabled = false;
      if (SPR) SPR.scan = null;
    }
    CV.style.width = '100%';
    CV.style.height = '100%';
    return;
  }
  let s = Math.min(layoutW * dpr / VIEW_W, layoutH * dpr / VIEW_H);
  if (s >= 1) s = Math.floor(s);
  CV.style.width = (VIEW_W * s / dpr) + 'px';
  CV.style.height = (VIEW_H * s / dpr) + 'px';
  // refit when the window moves to a display with a different pixel density
  if (window.matchMedia && fitCanvas._dpr !== dpr) {
    fitCanvas._dpr = dpr;
    try { window.matchMedia('(resolution: ' + dpr + 'dppx)').addEventListener('change', fitCanvas, { once: true }); } catch (e) {}
  }
}

function makeScanOverlay() {
  const cv = document.createElement('canvas'), c = cv.getContext('2d');
  cv.width = VIEW_W; cv.height = VIEW_H;
  c.fillStyle = 'rgba(0,0,0,0.07)';
  for (let y = 1; y < VIEW_H; y += 2) c.fillRect(0, y, VIEW_W, 1);
  const g = c.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H / 2.6, VIEW_W / 2, VIEW_H / 2, VIEW_W / 1.35);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)');
  c.fillStyle = g; c.fillRect(0, 0, VIEW_W, VIEW_H);
  return cv;
}

function drawScanOverlay(c) {
  if (!SPR.scan || SPR.scan.width !== VIEW_W || SPR.scan.height !== VIEW_H) SPR.scan = makeScanOverlay();
  c.drawImage(SPR.scan, 0, 0);
}

function uiPanelRect() {
  const isMobile = !!(typeof TOUCH !== 'undefined' && TOUCH.on);
  switch (G.ui) {
    case 'pause': return [200, 60, 240, 226];
    case 'gang': return [128, 54, 384, 258];
    case 'bar': return [220, 110, 200, 130];
    case 'talk': return [110, 218, 420, 116];
    case 'casino': return [180, 70, 280, 220];
    case 'guns': case 'cars': case 'ripper': case 'inv':
      if (isMobile) {
        return [80, 25, 480, 275];
      }
      return [56, 22, 528, 316];
    default: return null;
  }
}

function escAction() {
  if (G.state === 'title') {
    if (G.titleMode === 'gender') { G.titleMode = 'menu'; G.uiS.sel = 0; SFX.ui(); }
    else if (G.titleMode === 'name') { G.titleMode = 'menu'; G.uiS.sel = 0; SFX.ui(); }
    return;
  }
  if (G.state !== 'play') return;
  if (G.ui) { G.ui = null; SFX.ui(); }
  else { G.ui = 'pause'; G.uiS = { sel: 0, scroll: 0, tab: 0, confirm: false }; }
}
function toggleInv() {
  if (G.state !== 'play') return;
  if (G.ui === 'inv') G.ui = null;
  else if (!G.ui) { G.ui = 'inv'; G.uiS = { sel: 0, scroll: 0, tab: 0, confirm: false }; SFX.ui(); }
}

function cycleSlot(d) {
  for (let k = 0; k < 3; k++) {
    G.slot = ((G.slot + d) % 3 + 3) % 3;
    if (G.loadout[G.slot]) break;
  }
  G.p.reloadT = 0; G.p.fireCd = Math.max(G.p.fireCd, 0.12);
  const w = curWpn(); if (w) msg('EQUIPPED: ' + w.name, RAR_COL[w.rar]);
}

// =================== main step ===================
function step(dt) {
  window.G = G;
  WORLD_ZOOM = TOUCH.on ? 1.35 : 1.0;
  G.rt += dt; G.frame++;
  if (G.rotateHintT === undefined) G.rotateHintT = 6.0;
  if (G.rotateHintT > 0 && G.state === 'play' && !G.ui) {
    G.rotateHintT -= dt;
  }
  updateRain(dt);
  applyTouch();
  if (!G.ui && G.state === 'play' && G.p) {
    const bx = 538, by = 8, bw = 22, bh = 11;
    const m = G.mouse;
    if (m.sx >= bx && m.sx < bx + bw && m.sy >= by && m.sy < by + bh) {
      if (m.click || m.down) {
        m.click = false;
        m.down = false;
        G.ui = 'pause';
        G.uiS = { sel: 0, scroll: 0, tab: 0, confirm: false };
        SFX.ui();
      }
    }
  }
  if (G.state === 'title') { render(); endFrame(); return; }
  if (G.state === 'dead') {
    const oldSec = Math.ceil(G.deadT);
    G.deadT -= dt;
    if (Math.ceil(G.deadT) !== oldSec && G.deadT > 0) saveGame();
    if (G.deadT <= 0) respawn();
    render(); endFrame(); return;
  }
  // time dilation
  const p = G.p;
  let ts = 1;
  if (G.os === 'sandevistan' && p.osT > 0) ts = CYB.sandevistan.tiers[G.cyber.sandevistan - 1].ts;
  else if (p.kzT > 0 && G.cyber.kerenzikov) ts = CYB.kerenzikov.tiers[G.cyber.kerenzikov - 1].ts;
  G.timeScale = ts;
  const dtW = dt * ts, dtP = dt * lerp(ts, 1, 0.6);

  if (!G.ui) {
    G.t += dtW;
    G.stats.playT += dt;
    updatePlayer(dt, dtP);
    updateCar(dtW, dt);
    updateRealtime(dt);
    const npcReplica = isRealtimeNpcReplica();
    if (!npcReplica) updateEnemies(dtW);
    updateBullets(dtW);
    updatePickups(dtW);
    updateCrates(dt);
    if (!npcReplica) updateCivs(dtW);
    if (!npcReplica) updateSpawns(dt);
    if (!npcReplica) updateGangWars(dt);
    updateGangBots(dt);
    updateMarketWar(dt);
    if (!npcReplica) updateAirdrop(dt, dtW);
    updateWeather(dt);
    updateTips(dt);
    // roof reveal + gang hideout ambushes
    const ptx = Math.floor(p.x / TILE), pty = Math.floor(p.y / TILE);
    for (const r of WORLD.roofs) {
      let inside = ptx >= r.tx0 && ptx <= r.tx1 && pty >= r.ty0 && pty <= r.ty1;
      // standing on the doorstep already fades the roof, so crossing the door never pops
      if (!inside && pty === r.doorTy + 1 && r.doorTx.indexOf(ptx) >= 0) inside = true;
      r.a += ((inside ? 0.04 : 1) - r.a) * Math.min(1, 9 * dt);
    }
    for (const dn of WORLD.dens) {
      if (!dn.done && ptx > dn.tx0 && ptx < dn.tx1 && pty > dn.ty0 && pty < dn.ty1) triggerDen(dn);
    }
    G.parts = G.parts.filter(pa => (pa.t -= dtW) > 0 && (pa.x += pa.vx * dtW, pa.y += pa.vy * dtW, pa.vy += (pa.grav || 0) * dtW, true));
    G.texts = G.texts.filter(tx => (tx.t -= dt) > 0 && (tx.y -= 14 * dt, true));
    G.slashes = G.slashes.filter(s => (s.t -= dtW) > 0);
    G.glows = G.glows.filter(g => (g.t -= dtW) > 0);
    // autosave
    G.saveT -= dt;
    if (G.saveT <= 0) { G.saveT = 12; saveGame(); }
    // fixer chatter
    G.fixerT -= dt;
    if (G.fixerT <= 0) { G.fixerT = rnd(80, 140); msg(pick(FIXER_LINES), '#8a93a6'); SFX.msg(); }
  }
  G.msgs = G.msgs.filter(m => (m.t -= dt) > 0);
  if (G.bannerO && (G.bannerO.t -= dt) <= 0) G.bannerO = null;
  if (G.fade && (G.fade.t += dt) >= G.fade.dur) G.fade = null;
  G.hurtT = Math.max(0, G.hurtT - dt * 2);
  G.flashT = Math.max(0, G.flashT - dt * 3);
  G.thunderT -= dt;
  if (G.thunderT <= 0) {
    const W = WEATHERS[G.weather.kind];
    G.thunderT = G.weather.kind === 'storm' ? rnd(6, 16) : rnd(20, 50);
    if (Math.random() < (W.thunder || 0)) { G.flashT = 0.25; SFX.thunder(); }
  }
  // camera
  const wv_w = VIEW_W / WORLD_ZOOM;
  const wv_h = VIEW_H / WORLD_ZOOM;
  const tgt = G.driving && G.car ? { x: G.car.x + G.car.vx * 0.35, y: G.car.y + G.car.vy * 0.35 }
    : { x: p.x + (G.mouse.sx - VIEW_W / 2) * 0.18, y: p.y + (G.mouse.sy - VIEW_H / 2) * 0.18 };
  G.cam.x = clamp(lerp(G.cam.x, tgt.x - wv_w / 2, Math.min(1, 6 * dt)), 0, WORLD.W * TILE - wv_w);
  G.cam.y = clamp(lerp(G.cam.y, tgt.y - wv_h / 2, Math.min(1, 6 * dt)), 0, WORLD.H * TILE - wv_h);
  if (G.shake > 0) {
    G.cam.x += rnd(-G.shake, G.shake); G.cam.y += rnd(-G.shake, G.shake);
    G.shake = Math.max(0, G.shake - dt * 30);
  }
  G.mouse.wx = G.cam.x + G.mouse.sx / WORLD_ZOOM; G.mouse.wy = G.cam.y + G.mouse.sy / WORLD_ZOOM;
  render();
  endFrame();
}

function endFrame() { G.pressed.clear(); G.mouse.click = false; G.mouse.moved = false; G.uiWheel = 0; }

function updateRealtime(dt) {
  const net = window.NCPX_NET;
  if (!net) return;
  applyRealtimeEvents(net);
  applyRemoteDropEvents(net);
  applyNpcHitEvents(net);
  if (net.connected && !net.isHost) {
    if (net.npcState) applyNpcSnapshot(net.npcState);
    else { G.enemies = []; G.gangWar = null; }
  }
  updateRemotePlayers(net.players || [], dt);
  G.onlineCount = (net.connected ? 1 : 0) + (G.remotePlayers || []).length;
  G.onlineRoom = net.room || G.onlineRoom || 'default';
  G.roomIsHost = !!net.isHost;
  if (net.invites && net.invites.length) {
    const inv = net.invites[0];
    if (!G.playerInvite || G.playerInvite.from !== inv.from || G.playerInvite.gang !== inv.gang) {
      G.playerInvite = inv;
      msg('LỜI MỜI VÀO BĂNG ' + inv.gang + ' — MỞ [G]', '#00ff9f');
    }
  }
  if (net.requests && net.requests.length) {
    const req = net.requests[0];
    if (!G.gangJoinReq || G.gangJoinReq.from !== req.from) {
      G.gangJoinReq = req;
      msg((req.fromName || 'MERC') + ' XIN VÀO BĂNG — MỞ [G]', '#f9f002');
    }
  }
  G.netT -= dt;
  if (G.netT > 0 || !G.p) return;
  G.netT = 0.033;
  sendRealtimeState(Math.ceil(G.p.hp));
  if (net.isHost && net.sendNpcState) {
    G.npcSyncT = (G.npcSyncT || 0) - 0.08;
    if (G.npcSyncT <= 0) {
      G.npcSyncT = 0.12;
      net.sendNpcState(makeNpcSnapshot());
    }
  }
}

function sendRealtimeState(hpOverride) {
  const net = typeof window !== 'undefined' && window.NCPX_NET;
  if (!net || !G.p || !net.send) return;
  const profile = playerProfile();
  const state = { name: profile.name, gang: profile.gang, gangKey: profile.gangKey, gangIcon: profile.gangIcon, gangIconCol: profile.gangIconCol, x: G.p.x, y: G.p.y, vx: G.p.vx || 0, vy: G.p.vy || 0, face: G.p.face, flip: G.p.flip, hp: hpOverride == null ? Math.ceil(G.p.hp) : hpOverride, isLeader: profile.isLeader };
  if (G.netAct && G.netActRepeat > 0) {
    state.act = G.netAct;
    G.netActRepeat--;
    if (G.netActRepeat <= 0) G.netAct = null;
  }
  net.send(state);
}

function applyRemoteDropEvents(net) {
  const events = net.takeDropEvents ? net.takeDropEvents() : [];
  for (const ev of events) {
    if (ev && net.id && ev.from === net.id) continue;
    if (!ev || !Array.isArray(ev.drops)) continue;
    for (const d of ev.drops.slice(0, 4)) {
      const x = Number.isFinite(Number(d.x)) ? Number(d.x) : Number(ev.x) || G.p.x;
      const y = Number.isFinite(Number(d.y)) ? Number(d.y) : Number(ev.y) || G.p.y;
      if (d.kind === 'wpn' && WPN[d.id]) {
        G.pickups.push({ kind: 'wpn', deathDrop: true, remoteDrop: true, id: d.id, x, y, vx: 0, vy: 0, t: 10 });
      } else if (d.kind === 'ed' && Number(d.amt) > 0) {
        G.pickups.push({ kind: 'ed', deathDrop: true, remoteDrop: true, amt: Math.round(Number(d.amt)), x, y, vx: rnd(-18, 18), vy: rnd(-18, 18), t: 10 });
      }
    }
    if (ev.fromName) msg(cleanPlayerName(ev.fromName) + ' FLATLINED — LOOT DROPPED', '#f9f002');
  }
}

function makeNpcSnapshot() {
  G.npcSyncSeq = (G.npcSyncSeq || 0) + 1;
  return {
    seq: G.npcSyncSeq,
    enemies: (G.enemies || []).filter(e => !e.dead).slice(0, 80).map(e => ({
      id: e.id, x: Math.round(e.x), y: Math.round(e.y), vx: Math.round(e.vx || 0), vy: Math.round(e.vy || 0),
      hp: Math.ceil(e.hp), maxhp: e.maxhp, tier: e.tier, fac: e.fac, kind: e.kind,
      state: e.state, alerted: !!e.alerted, face: e.face, flip: !!e.flip, anim: e.anim || 0,
      bounty: !!e.bounty, psycho: !!e.psycho, war: !!e.war, name: e.name || gangLabel(e.fac),
      lookA: e.lookA || 0, detect: e.detect || 0, hitT: e.hitT || 0,
    })),
    civs: (G.civs || []).slice(0, 16).map(cv => ({
      id: cv.id, x: Math.round(cv.x), y: Math.round(cv.y), i: cv.i || 0,
      anim: cv.anim || 0, face: cv.face || 'down', flip: !!cv.flip, fleeT: cv.fleeT || 0,
    })),
  };
}

function applyNpcSnapshot(snap) {
  if (!snap || !Array.isArray(snap.enemies)) return;
  const oldEnemies = {};
  for (const e of G.enemies || []) if (e.id) oldEnemies[e.id] = e;
  G.enemies = snap.enemies.map(raw => {
    let e = oldEnemies[raw.id];
    if (!e) e = makeEnemy(raw.x, raw.y, raw.tier || 1, raw.fac || 'scavs', raw.kind || 'melee', { id: raw.id, hp: raw.hp, maxhp: raw.maxhp, name: raw.name });
    e.x = raw.x; e.y = raw.y; e.vx = raw.vx || 0; e.vy = raw.vy || 0;
    e.hp = raw.hp; e.maxhp = raw.maxhp || raw.hp || e.maxhp;
    e.tier = raw.tier || e.tier; e.fac = raw.fac || e.fac; e.kind = raw.kind || e.kind;
    e.state = raw.state || e.state; e.alerted = !!raw.alerted; e.face = raw.face || e.face; e.flip = !!raw.flip; e.anim = raw.anim || 0;
    e.bounty = !!raw.bounty; e.psycho = !!raw.psycho; e.war = !!raw.war; e.name = raw.name || e.name;
    e.lookA = raw.lookA || 0; e.detect = raw.detect || 0; e.hitT = raw.hitT || 0; e.dead = false;
    return e;
  });
  if (Array.isArray(snap.civs)) {
    const oldCivs = {};
    for (const cv of G.civs || []) if (cv.id) oldCivs[cv.id] = cv;
    G.civs = snap.civs.map(raw => Object.assign(oldCivs[raw.id] || {}, {
      id: raw.id, x: raw.x, y: raw.y, i: raw.i || 0, anim: raw.anim || 0,
      face: raw.face || 'down', flip: !!raw.flip, fleeT: raw.fleeT || 0,
    }));
  }
}

function applyNpcHitEvents(net) {
  if (!net.isHost || !net.takeNpcEvents) return;
  const events = net.takeNpcEvents();
  for (const ev of events) {
    const e = G.enemies.find(x => x.id === ev.enemyId && !x.dead);
    if (!e) continue;
    damageEnemy(e, Math.max(0, Number(ev.dmg) || 0), !!ev.crit, Number(ev.dir) || 0, Number(ev.kb) || 0, Number(ev.burn) || 0);
  }
}

function applyRealtimeEvents(net) {
  const events = net.takeEvents ? net.takeEvents() : [];
  const me = playerProfile();
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    if (ev && ev.type === 'combatFx') {
      applyCombatFx(ev);
      continue;
    }
    if (!ev || ev.type !== 'damage' || G.state !== 'play' || !G.p) continue;
    const from = (G.remotePlayers || []).find(rp => rp.id === ev.from);
    if (from && sameGangProfile(from, me)) {
      msg('ĐÃ CHẶN SÁT THƯƠNG ĐỒNG BĂNG', '#00ff9f');
      continue;
    }
    const before = G.p.hp;
    damagePlayer(Math.max(0, Number(ev.dmg) || 0));
    if (G.p.hp < before) {
      addTxt(G.p.x, G.p.y - 42, (ev.crit ? 'CRIT -' : '-') + Math.round(before - G.p.hp), ev.crit ? '#f9f002' : '#ff2a6d');
      msg('BỊ BẮN BỞI ' + cleanPlayerName(ev.fromName || 'MERC'), '#ff2a6d');
    }
  }
}

function updateRemotePlayers(rawPlayers, dt) {
  G.remoteLerp = G.remoteLerp || {};
  const seen = {};
  const out = [];
  const connected = !!(window.NCPX_NET && window.NCPX_NET.connected);
  const grace = connected ? 0 : 45;
  const follow = 1 - Math.pow(0.001, Math.min(0.2, dt) * 18);
  for (const raw of rawPlayers) {
    if (!raw || !raw.id) continue;
    if (Number(raw.hp) <= 0) {
      delete G.remoteLerp[raw.id];
      continue;
    }
    seen[raw.id] = true;
    let rp = G.remoteLerp[raw.id];
    const tx = Number.isFinite(raw.x) ? raw.x : (rp ? rp.tx : 0);
    const ty = Number.isFinite(raw.y) ? raw.y : (rp ? rp.ty : 0);
    const rvx = Number.isFinite(raw.vx) ? raw.vx : 0;
    const rvy = Number.isFinite(raw.vy) ? raw.vy : 0;
    const lead = Math.min(0.08, connected ? 0.045 : 0);
    const px2 = tx + rvx * lead, py2 = ty + rvy * lead;
    if (!rp) {
      rp = Object.assign({}, raw, { x: px2, y: py2, tx: px2, ty: py2, vx: rvx, vy: rvy, hp: raw.hp == null ? 100 : raw.hp, maxhp: raw.maxhp || 100, hitT: 0, staleT: 0 });
      G.remoteLerp[raw.id] = rp;
    } else {
      const px = rp.x, py = rp.y;
      const jump = distPx(rp.x, rp.y, px2, py2);
      Object.assign(rp, raw);
      rp.hp = raw.hp == null ? rp.hp : raw.hp;
      rp.maxhp = raw.maxhp || rp.maxhp || 100;
      rp.hitT = Math.max(0, (rp.hitT || 0) - dt);
      rp.tx = px2; rp.ty = py2; rp.vx = rvx; rp.vy = rvy; rp.staleT = 0;
      const f = jump > 180 ? 1 : follow;
      rp.x = lerp(px, px2, f);
      rp.y = lerp(py, py2, f);
    }
    if (raw.act && raw.act.seq && raw.act.seq !== rp.lastActSeq) {
      rp.lastActSeq = raw.act.seq;
      applyCombatFx(Object.assign({ from: raw.id, x: tx, y: ty }, raw.act));
    }
    out.push(rp);
  }
  for (const id in G.remoteLerp) {
    if (seen[id]) continue;
    const rp = G.remoteLerp[id];
    rp.staleT = (rp.staleT || 0) + dt;
    if (rp.staleT < grace) { rp.x += (rp.vx || 0) * dt; rp.y += (rp.vy || 0) * dt; out.push(rp); }
    else delete G.remoteLerp[id];
  }
  G.remotePlayers = out;
}

function setPlayerGang(name) {
  G.gang = 'player';
  G.playerGangName = String(name || 'BĂNG CỦA BẠN').toUpperCase().slice(0, 18);
  G.isGangLeader = true;
  G.gangIconSel = clamp(G.gangIconSel || 0, 0, PLAYER_GANG_ICONS.length - 1);
  const icon = gangIconObj(G.gangIconSel);
  G.playerGangIcon = icon.mark;
  G.playerGangIconCol = icon.col;
  if (typeof window !== 'undefined') {
    window.NCPX_PLAYER = Object.assign({}, window.NCPX_PLAYER || {}, { gang: G.playerGangName, gangIcon: icon.mark, gangIconCol: icon.col });
  }
  banner('TẠO BĂNG THÀNH CÔNG', G.playerGangName, '#00ff9f');
  msg('ĐỒNG BĂNG KHÔNG THỂ BẮN NHAU', '#00ff9f');
  saveGame();
}

function joinPlayerGang(name, iconMark, iconCol) {
  G.gang = 'player';
  G.playerGangName = cleanPlayerName(name || 'BĂNG CỦA BẠN');
  G.isGangLeader = false;
  G.playerGangIcon = String(iconMark || '').toUpperCase().slice(0, 4) || null;
  G.playerGangIconCol = iconCol || '#00ff9f';
  G.playerInvite = null;
  if (window.NCPX_NET) window.NCPX_NET.invites = [];
  if (typeof window !== 'undefined') {
    window.NCPX_PLAYER = Object.assign({}, window.NCPX_PLAYER || {}, { gang: G.playerGangName, gangIcon: iconMark || '', gangIconCol: iconCol || '#00ff9f' });
  }
  banner('ĐÃ VÀO BĂNG', G.playerGangName, '#00ff9f');
  msg('BẠN ĐÃ GIA NHẬP ' + G.playerGangName, '#00ff9f');
  saveGame();
}

function nearestRemotePlayer(fn) {
  if (!G.p) return null;
  let best = null, bestD = Infinity;
  for (const rp of G.remotePlayers || []) {
    if (fn && !fn(rp)) continue;
    const d = distPx(G.p.x, G.p.y, rp.x || 0, rp.y || 0);
    if (d < bestD) { best = rp; bestD = d; }
  }
  return best && bestD < 360 ? best : null;
}

function updateTips(dt) {
  for (const tip of G.tipsQ) {
    tip.at -= dt;
    if (tip.at <= 0 && !tip.done) { tip.done = true; msg(tip.text, '#05d9e8'); SFX.msg(); }
  }
  G.tipsQ = G.tipsQ.filter(t => !t.done);
}

// =================== player ===================
function updatePlayer(dt, dtP) {
  const p = G.p;
  p.iframes = Math.max(0, p.iframes - dt);
  p.fireCd = Math.max(0, p.fireCd - dtP);
  p.recoil = Math.max(0, p.recoil - dt * 3);
  p.osCd = Math.max(0, p.osCd - (p.osT > 0 ? 0 : dt));
  p.osT = Math.max(0, p.osT - dt);
  p.camoT = Math.max(0, p.camoT - dt); p.camoCd = Math.max(0, p.camoCd - dt);
  p.bioCd = Math.max(0, p.bioCd - dt); p.shCd = Math.max(0, p.shCd - dt);
  p.buffT = Math.max(0, p.buffT - dt); p.kzT = Math.max(0, p.kzT - dt);
  p.joyT = Math.max(0, p.joyT - dt);
  p.dashCd = Math.max(0, p.dashCd - dt);
  G.summonCd = Math.max(0, G.summonCd - dt);

  // passive regen after 6s out of combat
  p.regenT += dt;
  if (p.regenT > 6 && p.hp < p.maxhp) p.hp = Math.min(p.maxhp, p.hp + 3 * dt);
  // maxdoc use
  if (p.useT > 0) {
    p.useT -= dt;
    if (p.useT <= 0) { p.hp = Math.min(p.maxhp, p.hp + p.maxhp * 0.5); SFX.heal(); addTxt(p.x, p.y - 14, '+HP', '#2ecc71'); }
  }
  if (G.cyber.biomonitor && p.hp < p.maxhp * 0.3 && p.bioCd <= 0 && G.maxdocs > 0 && p.useT <= 0) {
    G.maxdocs--; p.useT = 0.4; p.bioCd = 45; msg('BIOMONITOR: MAXDOC AUTO-INJECTED', '#2ecc71');
  }
  if (press('KeyC') && p.useT <= 0) {
    if (G.maxdocs <= 0) { msg('NO MAXDOCS — VENDING MACHINES SELL THEM FOR $50', '#ff5a5a'); SFX.deny(); }
    else if (p.hp >= p.maxhp) { msg('HP ALREADY FULL', '#8a93a6'); }
    else { G.maxdocs--; p.useT = 1.0; SFX.drink(); }
  }
  // coach mark: don't let players bleed out not knowing the heal key
  if (p.hp < p.maxhp * 0.35) {
    G.healHintT = (G.healHintT || 0) - dt;
    if (G.healHintT <= 0) {
      G.healHintT = 12;
      msg(G.maxdocs > 0 ? 'LOW HP — PRESS [C] TO USE A MAXDOC' : 'LOW HP — BUY A MAXDOC AT A VENDING MACHINE [E]', G.maxdocs > 0 ? '#2ecc71' : '#ff9f1c');
    }
  }
  // OS ability
  if (press('KeyQ') && G.os && p.osCd <= 0 && p.osT <= 0) {
    const t = CYB[G.os].tiers[G.cyber[G.os] - 1];
    p.osT = t.dur; p.osCd = t.cd;
    if (G.os === 'sandevistan') { SFX.sande(true); banner('SANDEVISTAN', 'KÍCH HOẠT THẦN KHÍ', '#00ff9f'); }
    else { SFX.psycho(); banner('BERSERK', 'TRẠNG THÁI ĐIÊN CUỒNG', '#ff2a3c'); }
    recalcStats();
  }
  if (p.osT <= 0 && p.osWasOn) { recalcStats(); }
  p.osWasOn = p.osT > 0;
  // camo
  if (press('KeyF') && G.cyber.camo && p.camoCd <= 0) {
    const t = CYB.camo.tiers[0];
    p.camoT = t.dur; p.camoCd = t.cd; SFX.camo();
    for (const e of G.enemies) { e.alerted = false; e.state = 'idle'; }
    msg('OPTICAL CAMO ENGAGED', '#05d9e8');
  }
  // weapon slots
  if (press('Digit1') && G.loadout[0]) { G.slot = 0; cycleSlot(0); }
  if (press('Digit2') && G.loadout[1]) { G.slot = 1; cycleSlot(0); }
  if (press('Digit3') && G.loadout[2]) { G.slot = 2; cycleSlot(0); }
  // vehicle
  if (press('KeyV')) vehicleKey();
  // radio
  if (press('KeyN')) { SFX.init(); msg('RADIO: ' + SFX.cycleStation(), '#ff2a6d'); SFX.ui(); }

  if (G.driving) { interactScan(); return; }

  // movement
  let mx = (G.keys.has('KeyD') ? 1 : 0) - (G.keys.has('KeyA') ? 1 : 0);
  let my = (G.keys.has('KeyS') ? 1 : 0) - (G.keys.has('KeyW') ? 1 : 0);
  const mlen = Math.hypot(mx, my);
  if (mlen > 0) { mx /= mlen; my /= mlen; }
  let spd = 95 * p.speedMult * (p.buffT > 0 ? 1.25 : 1);
  // dash
  if (press('Space') && p.dashCd <= 0 && mlen > 0) {
    p.dashT = 0.18; p.dashCd = 0.9 * p.dashCdMult; p.iframes = Math.max(p.iframes, 0.25);
    if (G.cyber.kerenzikov) p.kzT = CYB.kerenzikov.tiers[G.cyber.kerenzikov - 1].dur + 0.18;
    SFX.dash();
  }
  if (p.dashT > 0) { p.dashT -= dt; spd *= 3.1; p.trail.push({ x: p.x, y: p.y, t: 0.25, face: p.face, flip: p.flip }); }
  p.trail = p.trail.filter(tr => (tr.t -= dt) > 0);
  p.vx = mx * spd; p.vy = my * spd;
  p.moving = mlen > 0;
  moveCollide(p, p.vx * dtP, p.vy * dtP, 5);
  if (p.moving) { p.anim += dtP * 9; G.stats.dist += Math.hypot(p.vx, p.vy) * dtP; }

  // aim & face
  const activeAim = TOUCH.on ? (TOUCH.aim.act || TOUCH.held['fire'] || G.mouse.down) : G.mouse.down;
  let faceAngle = null;
  if (p.moving && !activeAim) faceAngle = Math.atan2(p.vy, p.vx);
  else if (activeAim) faceAngle = Math.atan2(G.mouse.wy - p.y, G.mouse.wx - p.x);
  p.aim = faceAngle == null ? p.aim : faceAngle;
  if (faceAngle != null) {
    const ca = Math.cos(faceAngle), sa = Math.sin(faceAngle);
    if (Math.abs(ca) > Math.abs(sa)) { p.face = 'side'; p.flip = ca > 0; }
    else { p.face = sa > 0 ? 'down' : 'up'; }
  }

  // smart lock
  G.lockTarget = null;
  const w = curWpn();
  if (w && w.kind === 'smart' && p.smartTurn > 0) {
    let best = null, bd = 1e9;
    for (const e of G.enemies) {
      if (e.dead) continue;
      const d = distPx(p.x, p.y, e.x, e.y);
      if (d > 270) continue;
      let da = Math.abs(((Math.atan2(e.y - p.y, e.x - p.x) - p.aim) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
      if (da < 0.55 && d < bd && WORLD.losClear(p.x, p.y, e.x, e.y)) { best = e; bd = d; }
    }
    G.lockTarget = best;
  }
  // fire / reload
  if (press('KeyR')) startReload();
  if (p.reloadT > 0) {
    p.reloadT -= dtP;
    if (p.reloadT <= 0 && w && !MELEE_CLS[w.cls]) { G.weapons[w.id].mag = w.mag; SFX.reload(); }
  }
  if (G.mouse.down && w && !G.ui) tryFire(w);

  // greenery concealment
  G.pHidden = false;
  for (const b of WORLD.bushes) {
    if (Math.abs(b.x - p.x) < 14 && Math.abs(b.y - p.y) < 13 && distPx(b.x, b.y, p.x, p.y) < b.r) { G.pHidden = true; break; }
  }
  // district banner
  const dk = WORLD.districtAt(p.x, p.y);
  if (dk !== G.lastDistrict) {
    G.lastDistrict = dk;
    const d = DISTRICTS[dk];
    banner(d.name, 'NGUY HIỂM ' + '★'.repeat(d.danger), d.col);
  }
  // skippy
  if (!G.skippyFound) {
    const sd = distPx(p.x, p.y, WORLD.skippySpot.x, WORLD.skippySpot.y);
    G.skippyHintT = Math.max(0, G.skippyHintT - dt);
    if (sd < 480 && G.skippyHintT <= 0) { G.skippyHintT = 18; msg('YOU HEAR A MUFFLED, CHEERFUL VOICE NEARBY...', '#f9f002'); }
    if (sd < 22) {
      G.skippyFound = true; giveWeapon('skippy');
      banner('ĐÃ CÓ SKIPPY!', 'SKIPPY: XIN CHÀO! TÔI LÀ SKIPPY! HÃY LÀM BẠN THÂN NHÉ!', '#f9f002');
      SFX.levelup(); saveGame();
    }
  }
  interactScan();
}

function moveCollide(ent, dx, dy, r) {
  if (dx && !WORLD.blockedPx(ent.x + dx + Math.sign(dx) * r, ent.y - r * 0.6) && !WORLD.blockedPx(ent.x + dx + Math.sign(dx) * r, ent.y + r * 0.6)) ent.x += dx;
  if (dy && !WORLD.blockedPx(ent.x - r * 0.6, ent.y + dy + Math.sign(dy) * r) && !WORLD.blockedPx(ent.x + r * 0.6, ent.y + dy + Math.sign(dy) * r)) ent.y += dy;
  ent.x = clamp(ent.x, 8, WORLD.W * TILE - 8); ent.y = clamp(ent.y, 8, WORLD.H * TILE - 8);
}

const SHOP_PROMPTS = {
  guns: 'XEM VŨ KHÍ',
  ripper: 'ĐỘ CYBERWARE',
  cars: 'MUA XE',
  bar: 'GỌI ĐỒ UỐNG',
  casino: 'CHƠI XÚC XẮC',
  clothing: 'ĐỔI THỜI TRANG',
};

function interactScan() {
  G.prompt = null;
  const p = G.p;
  for (const k of ['guns', 'ripper', 'cars', 'bar', 'casino', 'clothing']) {
    const s = WORLD.shops[k];
    if (!s) continue;
    if (distPx(p.x, p.y, s.x, s.y) < 26) {
      G.prompt = '[E] ' + (SHOP_PROMPTS[k] || (localText('NÓI CHUYỆN — ') + s.name));
      if (press('KeyE')) {
        if (k === 'bar') { G.ui = 'bar'; }
        else if (k === 'casino') { G.ui = 'casino'; G.uiS = { sel: 0, scroll: 0, tab: 0, confirm: false, bet: 100, choice: 1, dice: null, result: null }; }
        else if (k === 'clothing') { G.ui = 'wardrobe'; G.uiS = { sel: 0, scroll: 0, tab: 0, confirm: false }; }
        else { G.ui = k; G.uiS = { sel: 0, scroll: 0, tab: 0, confirm: false }; }
        SFX.ui();
      }
      return;
    }
  }
  if (G.airdrop && G.airdrop.state === 'landed' && distPx(p.x, p.y, G.airdrop.x, G.airdrop.y) < 24) {
    G.prompt = '[E] CRACK AIRDROP';
    if (press('KeyE')) openAirdrop();
    return;
  }
  for (const n of WORLD.npcs) {
    if ((n.kind === 'joy' || n.kind === 'doll' || n.kind === 'stylist' || n.kind === 'casino') && distPx(p.x, p.y, n.x, n.y) < 22) {
      G.prompt = '[E] ' + localText('NÓI CHUYỆN — ') + n.name;
      if (press('KeyE')) {
        if (n.kind === 'stylist') {
          G.ui = 'wardrobe';
          G.uiS = { sel: 0, scroll: 0, tab: 0, confirm: false };
          SFX.ui();
        } else if (n.kind === 'casino') {
          G.ui = 'casino';
          G.uiS = { sel: 0, scroll: 0, tab: 0, confirm: false, bet: 100, choice: 1, dice: null, result: null };
          SFX.ui();
        } else {
          openTalk(n);
        }
      }
      return;
    }
  }
  for (const v of WORLD.vends) {
    if (distPx(p.x, p.y, v.x, v.y) < 22) {
      G.prompt = '[E] MAXDOC — $50' + (G.maxdocs >= 5 ? ' (FULL)' : '');
      if (press('KeyE')) vendBuy();
      return;
    }
  }
  if (!G.driving && G.car && !G.car.dead && distPx(p.x, p.y, G.car.x, G.car.y) < 30) {
    G.prompt = '[E/V] ENTER VEHICLE';
    if (press('KeyE')) enterCar();
  }
}

function vendBuy() {
  if (G.maxdocs >= 5) { msg('MAXDOC POUCH FULL', '#ff5a5a'); SFX.deny(); return; }
  if (G.eddies < 50) { msg('NOT ENOUGH EDDIES', '#ff5a5a'); SFX.deny(); return; }
  G.eddies -= 50; G.maxdocs++; SFX.drink(); msg('MAXDOC +1', '#2ecc71');
}

function barSelect(i) {
  if (i === 0) {
    if (G.eddies < 100) { msg('NOT ENOUGH EDDIES', '#ff5a5a'); SFX.deny(); return; }
    G.eddies -= 100; G.p.hp = G.p.maxhp; G.p.buffT = 20; SFX.drink(); SFX.heal();
    msg('TO JOHNNY. FULL HP + SPEED BUFF', '#ff2a6d'); G.ui = null;
  } else if (i === 1) vendBuy();
  else { G.ui = null; SFX.ui(); }
}

// =================== combat ===================
function startReload() {
  const w = curWpn();
  if (!w || MELEE_CLS[w.cls]) return;
  const st = G.weapons[w.id];
  if (st.mag >= w.mag || G.p.reloadT > 0) return;
  G.p.reloadT = w.rel;
}

function tryFire(w) {
  const p = G.p;
  if (p.fireCd > 0 || p.useT > 0) return;
  if (MELEE_CLS[w.cls]) { swingMelee(w); return; }
  const st = G.weapons[w.id];
  if (p.reloadT > 0) return;
  if (st.mag <= 0) { startReload(); return; }
  st.mag--;
  p.fireCd = 1 / (w.rof * p.rofMult);
  p.recoil = Math.min(1, p.recoil + 0.25);
  SFX.shoot(w.cls);
  alertNearby(p.x, p.y, 240);
  const n = w.pellets || 1;
  const dmgMult = (G.os === 'berserk' && p.osT > 0) ? CYB.berserk.tiers[G.cyber.berserk - 1].dmg : 1;
  const fxShots = [];
  for (let i = 0; i < n; i++) {
    const a = p.aim + (rnd(-w.spread, w.spread) * Math.PI / 180);
    const crit = Math.random() < p.critCh + (w.crit || 0) + (p.joyT > 0 ? 0.05 : 0);
    const b = {
      x: p.x + Math.cos(p.aim) * 8, y: p.y - 2 + Math.sin(p.aim) * 8,
      vx: Math.cos(a) * w.spd, vy: Math.sin(a) * w.spd,
      dmg: w.dmg * dmgMult * (crit ? 1.8 : 1), crit, from: 'p',
      pierce: w.pierce || 0, wallPierce: !!w.wallPierce, life: 1.5,
      weapon: w.name || w.id,
      col: w.kind === 'smart' ? '#ff7ab8' : w.kind === 'tech' ? '#7af2ff' : '#ffe9a0',
      homing: (w.kind === 'smart' && G.lockTarget && !G.lockTarget.dead) ? G.lockTarget : null,
      turn: (w.homing || 0) + p.smartTurn, aoe: w.aoe || 0, kb: w.kb || 0, burn: w.burn,
    };
    G.bullets.push(b);
    fxShots.push({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, life: b.life, col: b.col });
  }
  sendCombatFx({
    kind: 'fire', x: p.x, y: p.y, a: p.aim,
    pellets: n, spread: w.spread || 0, spd: w.spd || 360,
    shots: fxShots,
    col: w.kind === 'smart' ? '#ff7ab8' : w.kind === 'tech' ? '#7af2ff' : '#ffe9a0',
  });
  G.glows.push({ x: p.x + Math.cos(p.aim) * 12, y: p.y - 2 + Math.sin(p.aim) * 12, r: 14, col: '#ffd27a', t: 0.05 });
  if (st.mag <= 0) startReload();
}

function swingMelee(w) {
  const p = G.p;
  p.fireCd = 1 / (w.rof * p.rofMult);
  p.recoil = Math.min(1, p.recoil + 0.3);
  SFX.shoot(w.cls);
  const dmgMult = (G.os === 'berserk' && p.osT > 0) ? CYB.berserk.tiers[G.cyber.berserk - 1].dmg : 1;
  const npcReplica = isRealtimeNpcReplica();
  G.slashes.push({ x: p.x, y: p.y, a: p.aim, t: 0.16, range: w.range + 6, col: w.cls === 'mantis' ? '#ff2a3c' : w.cls === 'wire' ? '#05d9e8' : '#dfe6f2' });
  sendCombatFx({ kind: 'melee', x: p.x, y: p.y, a: p.aim, range: w.range + 6, col: w.cls === 'mantis' ? '#ff2a3c' : w.cls === 'wire' ? '#05d9e8' : '#dfe6f2' });
  let hitAny = false;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const d = distPx(p.x, p.y, e.x, e.y);
    if (d > w.range + (e.psycho ? 14 : 6)) continue;
    let da = Math.abs(((Math.atan2(e.y - p.y, e.x - p.x) - p.aim) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
    if (da > (w.arc / 2) * Math.PI / 180) continue;
    const crit = Math.random() < p.critCh + (w.crit || 0) + (p.joyT > 0 ? 0.05 : 0);
    const sneakM = e.alerted ? 1 : 2.5;
    if (sneakM > 1) addTxt(e.x, e.y - 20, 'TAKEDOWN', '#f9f002');
    const dmg = w.dmg * dmgMult * sneakM * (crit ? 1.8 : 1);
    if (npcReplica) {
      sendNpcHit(e, dmg, crit, p.aim, w.kb || 140, w.burn);
      addTxt(e.x, e.y - 20, crit ? 'SYNC CRIT' : 'SYNC HIT', crit ? '#f9f002' : '#ff2a6d');
    } else {
      damageEnemy(e, dmg, crit, p.aim, w.kb || 140, w.burn);
    }
    hitAny = true;
    if (G.os === 'berserk' && p.osT > 0) p.hp = Math.min(p.maxhp, p.hp + 2);
  }
  for (const cr of G.crates) {
    if (cr.hp > 0 && distPx(p.x, p.y, cr.x, cr.y) < w.range + 6) breakCrate(cr);
  }
  const me = playerProfile();
  for (const rp of G.remotePlayers || []) {
    const d = distPx(p.x, p.y, rp.x, rp.y);
    if (d > w.range + 8) continue;
    let da = Math.abs(((Math.atan2(rp.y - p.y, rp.x - p.x) - p.aim) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
    if (da > (w.arc / 2) * Math.PI / 180) continue;
    if (sameGangProfile(rp, me)) {
      msg('KHÔNG THỂ ĐÁNH ĐỒNG BĂNG', '#00ff9f');
      continue;
    }
    const crit = Math.random() < p.critCh + (w.crit || 0) + (p.joyT > 0 ? 0.05 : 0);
    const dmg = w.dmg * dmgMult * (crit ? 1.8 : 1);
    sendRemoteHit(rp, dmg, crit, w.name || w.id);
    hitAny = true;
  }
  if (hitAny) { SFX.hit(); G.shake = Math.max(G.shake, 1.5); }
}

function updateBullets(dt) {
  const p = G.p;
  for (const b of G.bullets) {
    if (b.dead) continue;
    b.life -= dt;
    if (b.life <= 0) { b.dead = true; continue; }
    if (b.homing && !b.homing.dead && b.turn > 0) {
      const want = Math.atan2(b.homing.y - b.y, b.homing.x - b.x);
      const cur = Math.atan2(b.vy, b.vx);
      let diff = ((want - cur) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      const na = cur + clamp(diff, -b.turn * dt, b.turn * dt);
      const sp = Math.hypot(b.vx, b.vy);
      b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
    }
    const steps = 2, sx = b.vx * dt / steps, sy = b.vy * dt / steps;
    for (let s = 0; s < steps && !b.dead; s++) {
      b.x += sx; b.y += sy;
      if (!b.wallPierce && WORLD.solidPx(b.x, b.y)) { impact(b); b.dead = true; break; }
      if (b.fx) continue;
      if (b.from === 'p') {
        for (const e of G.enemies) {
          if (e.dead || e.hitBy === b) continue;
          if (distPx(b.x, b.y, e.x, e.y - 4) < (e.psycho ? 13 : 6.5)) {
            const dmg = b.dmg * (e.alerted ? 1 : 1.5);
            if (isRealtimeNpcReplica()) {
              sendNpcHit(e, dmg, b.crit, Math.atan2(b.vy, b.vx), b.kb, b.burn);
              addTxt(e.x, e.y - 18, b.crit ? 'SYNC CRIT' : 'SYNC HIT', b.crit ? '#f9f002' : '#ff2a6d');
            } else {
              damageEnemy(e, dmg, b.crit, Math.atan2(b.vy, b.vx), b.kb, b.burn);
            }
            e.hitBy = b;
            if (b.aoe) { explode(b.x, b.y, b.aoe, b.dmg, 'p'); b.dead = true; }
            else if (b.pierce > 0) b.pierce--;
            else b.dead = true;
            break;
          }
        }
        const me = playerProfile();
        for (const rp of G.remotePlayers || []) {
          if (b.dead) break;
          if (distPx(b.x, b.y, rp.x, rp.y - 4) < 7) {
            const sameGang = sameGangProfile(rp, me);
            if (sameGang) {
              addTxt(rp.x, rp.y - 24, 'CÙNG BĂNG', '#00ff9f');
              msg('KHÔNG THỂ BẮN ĐỒNG BĂNG', '#00ff9f');
            } else {
              sendRemoteHit(rp, b.dmg, b.crit, b.weapon);
            }
            if (b.pierce > 0 && !sameGang) b.pierce--;
            else b.dead = true;
          }
        }
        for (const cr of G.crates) {
          if (cr.hp <= 0) continue;
          const dx = b.x - cr.x, dy = b.y - cr.y;
          if (dx * dx + dy * dy < 64) { breakCrate(cr); if (!b.pierce) b.dead = true; }
        }
      } else {
        if (G.driving && G.car && distPx(b.x, b.y, G.car.x, G.car.y) < 12) { damageCar(b.dmg); b.dead = true; break; }
        if (!G.driving && p.iframes <= 0 && distPx(b.x, b.y, p.x, p.y - 4) < 6) { damagePlayer(b.dmg); b.dead = true; break; }
      }
    }
    if (b.aoe && b.dead && !b.exploded) { b.exploded = true; explode(b.x, b.y, b.aoe, b.dmg, b.from); }
  }
  G.bullets = G.bullets.filter(b => !b.dead);
}

function impact(b) {
  addP(3, b.x, b.y, { col: '#8a93a6', sp: 40, life: 0.2 });
  if (b.aoe && !b.exploded) { b.exploded = true; explode(b.x, b.y, b.aoe, b.dmg, b.from); }
}

function explode(x, y, r, dmg, from) {
  SFX.explode(); G.shake = Math.max(G.shake, 5);
  G.glows.push({ x, y, r: r * 1.6, col: '#ff9f1c', t: 0.25 });
  addP(24, x, y, { col: '#ff9f1c', sp: 130, life: 0.5, grav: 60 });
  addP(12, x, y, { col: '#3a3a44', sp: 60, life: 0.8 });
  for (const e of G.enemies) {
    if (e.dead) continue;
    const d = distPx(x, y, e.x, e.y);
    if (d < r + 8) damageEnemy(e, dmg * (1 - d / (r + 20)) * 1.5, false, Math.atan2(e.y - y, e.x - x), 220);
  }
  const pd = distPx(x, y, G.p.x, G.p.y);
  if (from !== 'p' || pd < r * 0.5) {
    if (pd < r + 6 && G.p.iframes <= 0 && !G.driving) damagePlayer(dmg * 0.5 * (1 - pd / (r + 20)));
  }
  for (const cr of G.crates) if (cr.hp > 0 && distPx(x, y, cr.x, cr.y) < r + 8) breakCrate(cr);
}

function damageEnemy(e, dmg, crit, dir, kb, burn) {
  if (e.dead) return;
  e.hp -= dmg;
  e.hitT = 0.08;
  e.alerted = true; e.alertT = 5; e.lkx = G.p.x; e.lky = G.p.y; // pain reveals roughly where it came from
  if (dir != null) e.lastHitDir = dir;
  if (kb && !e.psycho) { e.kbx += Math.cos(dir || 0) * kb; e.kby += Math.sin(dir || 0) * kb; }
  if (burn) e.burnT = 2;
  addTxt(e.x + rnd(-4, 4), e.y - 14, String(Math.round(dmg)), crit ? '#f9f002' : '#e8f6ff');
  addP(crit ? 6 : 3, e.x, e.y - 4, { col: '#a01828', sp: 70, life: 0.35, grav: 100, dir, cone: 0.8 });
  if (Math.random() < 0.2) bloodStain(e.x, e.y, dir, 0.12);
  if (crit) SFX.crit(); else SFX.hit();
  if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e) {
  e.dead = true;
  SFX.kill();
  G.stats.kills++;
  addP(14, e.x, e.y - 4, { col: '#a01828', sp: 100, life: 0.5, grav: 120, dir: e.lastHitDir, cone: 1.2 });
  addP(6, e.x, e.y - 4, { col: '#ff2a3c', sp: 60, life: 0.3, dir: e.lastHitDir, cone: 1.4 });
  bloodStain(e.x, e.y, e.lastHitDir, e.psycho ? 1.6 : 0.7);
  xpGain(8 + 6 * e.tier + (e.psycho ? 350 : 0));
  if (!e.psycho && e.fac && distPx(G.p.x, G.p.y, e.x, e.y) < 280) {
    const ally = G.gangWar && (G.gangWar.a === e.fac ? G.gangWar.b : G.gangWar.b === e.fac ? G.gangWar.a : null);
    if (ally && FACTIONS[ally]) {
      G.gangRel[ally] = (G.gangRel[ally] || 0) + 1;
      if (!G.gang && !G.gangInvite && G.gangRel[ally] >= 3) {
        G.gangInvite = ally;
        msg(gangLabel(ally) + ' MỜI BẠN VÀO BĂNG — MỞ [G]', factionColor(ally));
      }
    }
  }
  // eddies
  const amt = Math.round((10 + 8 * e.tier) * rnd(0.8, 1.3)) * (e.psycho ? 8 : 1);
  G.pickups.push({ kind: 'ed', amt, x: e.x + rnd(-6, 6), y: e.y + rnd(-6, 6), vx: rnd(-20, 20), vy: rnd(-20, 20), t: 30 });
  // weapon drops
  if (e.psycho) {
    G.stats.psychos++;
    const next = ICONICS.find(id => !G.weapons[id]);
    if (next) G.pickups.push({ kind: 'wpn', id: next, x: e.x, y: e.y, vx: 0, vy: 0, t: 120 });
    else G.pickups.push({ kind: 'ed', amt: 5000, x: e.x, y: e.y, vx: 0, vy: 0, t: 120 });
    banner('CYBERPSYCHO ĐÃ BỊ HẠ', e.name + ' — ' + (next ? 'THU ĐƯỢC: ' + WPN[next].name : '+$5,000'), '#bd00ff');
    SFX.levelup();
  } else if (Math.random() < 0.09) {
    const pool = WEAPONS.filter(w => !w.iconic && !w.granted && !w.hidden && w.lvl <= G.lvl + 3 && w.price > 0);
    const unowned = pool.filter(w => !G.weapons[w.id]);
    const w = pick(unowned.length && Math.random() < 0.65 ? unowned : pool);
    if (w) G.pickups.push({ kind: 'wpn', id: w.id, x: e.x, y: e.y, vx: 0, vy: 0, t: 60 });
  } else if (Math.random() < 0.05) {
    G.pickups.push({ kind: 'doc', x: e.x, y: e.y, vx: 0, vy: 0, t: 60 });
  }
  // skippy chatter
  const w = curWpn();
  if (w && w.id === 'skippy' && Math.random() < 0.14) msg(pick(SKIPPY_LINES), '#f9f002');
  // gang den clear bonus
  if (e.denId != null) {
    const dn = WORLD.dens[e.denId];
    if (dn && --dn.left <= 0 && !dn.cleared) {
      dn.cleared = true;
      const bonus = 120 + 90 * e.tier;
      G.eddies += bonus;
      msg('HIDEOUT CLEARED: +$' + fmt(bonus), '#2ecc71');
      xpGain(30 + 12 * e.tier);
      SFX.buy();
    }
  }
  // bounty tracking
  if (e.bounty && G.bounty) {
    G.bounty.left--;
    if (G.bounty.left <= 0) completeBounty();
  }
  G.p.regenT = Math.min(G.p.regenT, 4);
  NCPX.emit('kill', { enemy: e });
}

function damagePlayer(dmg) {
  const p = G.p;
  if (p.iframes > 0) return;
  let armor = p.armor + ((G.os === 'berserk' && p.osT > 0) ? CYB.berserk.tiers[G.cyber.berserk - 1].armor : 0);
  dmg = dmg * 100 / (100 + armor);
  p.hp -= dmg;
  p.iframes = 0.3; p.regenT = 0;
  G.hurtT = 1; G.shake = Math.max(G.shake, 2.5);
  SFX.hurt();
  if (p.hp <= 0) {
    if (G.cyber.second_heart && p.shCd <= 0) {
      p.hp = p.maxhp; p.shCd = 180; p.iframes = 1.5;
      banner('TIM THỨ HAI', 'CỬA TỬ THOÁT HIỂM', '#ff2a6d'); SFX.levelup();
      return;
    }
    killPlayer();
  }
}

function killPlayer() {
  dropPlayerDeathLoot();
  sendRealtimeState(0);
  G.p.hp = 0;
  G.state = 'dead'; G.deadT = 10;
  G.deathFee = 0;
  G.driving = false;
  SFX.explode();
  saveGame();
}

function respawn() {
  const p = G.p;
  p.hp = p.maxhp; p.iframes = 2;
  const spot = respawnSpot();
  p.x = spot.x; p.y = spot.y;
  snapCam();
  G.state = 'play';
  G.enemies = G.enemies.filter(e => e.bounty || e.psycho);
  for (const e of G.enemies) e.alerted = false;
  banner('ĐÃ HỒI SINH', 'TRAUMA TEAM GỬI LỜI HỎI THĂM', '#05d9e8');
  saveGame();
}

function respawnSpot() {
  const cx = WORLD.spawn.x, cy = WORLD.spawn.y;
  for (let i = 0; i < 60; i++) {
    const s = findSpot(cx, cy, i < 12 ? 10 : 24, i < 12 ? 72 : 150);
    if (s && !WORLD.blockedPx(s.x, s.y)) return s;
  }
  return { x: cx, y: cy };
}

function dropPlayerDeathLoot() {
  const p = G.p;
  const drops = [];
  const amt = Math.max(0, Math.round(G.eddies || 0));
  if (amt > 0) {
    const x = p.x + rnd(-8, 8), y = p.y + rnd(-8, 8);
    G.pickups.push({ kind: 'ed', deathDrop: true, ownerId: 'self', noSelfPickup: true, amt, x, y, vx: rnd(-28, 28), vy: rnd(-28, 28), t: 18 });
    drops.push({ kind: 'ed', amt, x, y });
    addTxt(p.x, p.y - 24, '-$' + fmt(amt), '#f9f002');
    G.eddies = 0;
  }
  const lost = [];
  for (const wid of G.loadout) {
    if (wid && G.weapons[wid] && !WPN[wid].granted && !lost.includes(wid)) lost.push(wid);
  }
  for (let i = 0; i < lost.length; i++) {
    const wid = lost[i];
    delete G.weapons[wid];
    for (let k = 0; k < G.loadout.length; k++) if (G.loadout[k] === wid) G.loadout[k] = null;
    const x = p.x + (i - (lost.length - 1) / 2) * 12, y = p.y - 8;
    G.pickups.push({ kind: 'wpn', deathDrop: true, ownerId: 'self', noSelfPickup: true, id: wid, x, y, vx: 0, vy: 0, t: 18 });
    drops.push({ kind: 'wpn', id: wid, x, y });
    addTxt(p.x, p.y - 36, 'DROP ' + WPN[wid].name, RAR_COL[WPN[wid].rar]);
  }
  cycleSlot(0);
  if (drops.length && typeof window !== 'undefined' && window.NCPX_NET && window.NCPX_NET.playerDrop) {
    window.NCPX_NET.playerDrop({ x: p.x, y: p.y, drops });
  }
}

function xpGain(n) {
  n = Math.round(n * G.p.xpMult * (G.p.joyT > 0 ? 1.15 : 1));
  G.xp += n;
  addTxt(G.p.x, G.p.y - 18, '+' + n + ' XP', '#05d9e8');
  while (G.xp >= xpFor(G.lvl)) {
    G.xp -= xpFor(G.lvl);
    G.lvl++;
    recalcStats();
    G.p.hp = Math.min(G.p.maxhp, G.p.hp + G.p.maxhp * 0.4);
    banner('STREET CRED LÊN — CẤP ' + G.lvl, 'TRANG BỊ MỚI ĐÃ MỞ KHÓA TẠI CỬA HÀNG', '#f9f002');
    SFX.levelup();
    NCPX.emit('levelup', { lvl: G.lvl });
    saveGame();
  }
}

function alertNearby(x, y, r) {
  for (const e of G.enemies) if (!e.dead && distPx(x, y, e.x, e.y) < r) {
    e.alerted = true; e.alertT = Math.max(e.alertT, 3.5);
    e.lkx = x; e.lky = y; // they heard it — investigate the noise
  }
  for (const cv of G.civs) if (distPx(x, y, cv.x, cv.y) < r) cv.fleeT = 3;
}

// =================== enemies ===================
function factionColor(fac) {
  if (fac === 'player') return '#00ff9f';
  return (FACTIONS[fac] && FACTIONS[fac].pal && FACTIONS[fac].pal.T) || '#ff2a3c';
}

function rivalFaction(fac) {
  const order = ['scavs', 'maelstrom', 'tygers', 'sixth', 'voodoo', 'barghest', 'valentinos', 'mox', 'wraiths', 'arasaka'];
  const i = Math.max(0, order.indexOf(fac));
  return order[(i + 1 + (Math.random() * (order.length - 1) | 0)) % order.length] || 'scavs';
}

function factionHostile(a, b) {
  return a && b && a !== b;
}

function findGangTarget(e) {
  if (!e.war && !e.ally) return null;
  const px = G.driving && G.car ? G.car.x : G.p.x, py = G.driving && G.car ? G.car.y : G.p.y;
  const pDist = distPx(e.x, e.y, px, py);
  const playerHostile = !e.ally && G.gang !== e.fac;
  const playerVisible = playerHostile && pDist < 260 && WORLD.losClear(e.x, e.y - 4, px, py - 4);

  let best = null, bd = 1e9;
  for (const o of G.enemies) {
    if (o === e || o.dead || !factionHostile(e.fac, o.fac)) continue;
    if (e.war && !o.war) continue;
    if (e.ally && (o.ally || distPx(o.x, o.y, G.p.x, G.p.y) > 360)) continue;
    const d = distPx(e.x, e.y, o.x, o.y);
    if (d < bd && d < 260 && WORLD.losClear(e.x, e.y - 4, o.x, o.y - 4)) { best = o; bd = d; }
  }

  if (playerVisible && (pDist < bd || (e.alerted && e.lkx != null && distPx(e.lkx, e.lky, px, py) < 48))) {
    return null;
  }
  return best;
}

function enemyName(fac) {
  const pool = GANG_NPC_NAMES && GANG_NPC_NAMES[fac];
  return pool && pool.length ? pick(pool) : gangLabel(fac);
}

function makeEnemy(x, y, tier, fac, kind, opts) {
  const hp = Math.round((26 + tier * 22) * (kind === 'heavy' ? 1.8 : 1) * ((opts && opts.psycho) ? 16 : 1));
  return Object.assign({
    id: opts && opts.id ? opts.id : 'e' + ((G.enemySeq = (G.enemySeq || 0) + 1).toString(36)),
    x, y, vx: 0, vy: 0, hp, maxhp: hp, tier, fac, kind,
    state: 'idle', alerted: false, aimT: 0, shootCd: rnd(0.5, 1.5), wanderT: 0,
    face: 'down', flip: false, anim: 0, hitT: 0, kbx: 0, kby: 0, burnT: 0, burnTick: 0, roCd: 0,
    dead: false, bounty: false, psycho: false, name: (opts && opts.name) || enemyName(fac),
    chargeT: 0, burstT: 0,
    lookA: rnd(0, Math.PI * 2), detect: 0, seen: false, lkx: null, lky: null, alertT: 0, flashT: 0,
  }, opts || {});
}

function updateEnemies(dt) {
  const p = G.p;
  const px = G.driving && G.car ? G.car.x : p.x, py = G.driving && G.car ? G.car.y : p.y;
  for (const e of G.enemies) {
    if (e.dead) continue;
    e.hitT = Math.max(0, e.hitT - dt);
    e.roCd = Math.max(0, e.roCd - dt);
    e.shootCd -= dt; e.aimT = Math.max(0, e.aimT - dt);
    // burn dot
    if (e.burnT > 0) {
      e.burnT -= dt; e.burnTick -= dt;
      if (e.burnTick <= 0) { e.burnTick = 0.4; damageEnemy(e, 4, false); addP(2, e.x, e.y - 6, { col: '#ff9f1c', sp: 30, life: 0.3, grav: -60 }); }
      if (e.dead) continue;
    }
    // knockback decay
    if (e.kbx || e.kby) {
      moveCollide(e, e.kbx * dt, e.kby * dt, 5);
      e.kbx *= Math.max(0, 1 - 8 * dt); e.kby *= Math.max(0, 1 - 8 * dt);
      if (Math.abs(e.kbx) < 4) e.kbx = 0; if (Math.abs(e.kby) < 4) e.kby = 0;
    }
    const pdx = e.x - px, pdy = e.y - py;
    const playerD2 = pdx * pdx + pdy * pdy;
    const playerD = Math.sqrt(playerD2);
    // despawn strays (den dwellers stay home)
    if (playerD > 950 && !e.bounty && !e.psycho && e.denId == null && !e.war && !e.mapSpawn) { e.dead = true; e.silent = true; continue; }
    // Map-wide patrols exist to populate districts, but far-away AI should not
    // run vision, LOS, pathing and pack separation every frame.
    if (playerD2 > 760 * 760 && e.mapSpawn && !e.bounty && !e.psycho && !e.war && !e.ally && !e.alerted && !e.burnT && !e.kbx && !e.kby) {
      e.sleepT = (e.sleepT || 0) - dt;
      if (e.sleepT <= 0) {
        e.sleepT = rnd(1.5, 3.5);
        e.lookA += rnd(-0.5, 0.5);
      }
      continue;
    }
    const gangTarget = findGangTarget(e);
    const escortPlayer = !gangTarget && e.ally; // ally bots always escort player when no target
    const friendlyPlayer = !gangTarget && !escortPlayer && G.gang && e.fac === G.gang;
    const tx = gangTarget ? gangTarget.x : px, ty = gangTarget ? gangTarget.y : py;
    const targetIsPlayer = !gangTarget && !friendlyPlayer && !escortPlayer;
    const d = distPx(e.x, e.y, tx, ty);

    const isRival = !e.ally && G.gang !== e.fac;

    // ---- field of view: facing cone + wall occlusion + proximity sense ----
    const aToV = Math.atan2(ty - e.y, tx - e.x);
    const range = enemyRange(e);
    let seen = false;
    if (friendlyPlayer) {
      seen = false; e.detect = 0; e.alerted = false; e.alertT = 0;
    } else if (escortPlayer) {
      seen = d > 78;
      e.detect = 1;
      e.alerted = d > 78;
      e.alertT = e.alerted ? 0.4 : 0;
      e.lkx = tx; e.lky = ty;
    } else if (!targetIsPlayer) {
      seen = true;
    } else if (p.camoT <= 0) {
      const prox = G.driving ? 55 : (isRival ? 45 : 30);
      const fov = isRival ? 1.4 : FOV_HALF;
      const da = Math.abs(((aToV - e.lookA) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
      const inCone = d < prox || (d < range && (da < fov || e.psycho)) || (G.driving && (G.carSpd || 0) > 140 && d < 230);
      if (inCone) seen = WORLD.losClear(e.x, e.y - 4, px, py - 4);
      if (seen && !G.driving && G.pHidden && d > 26) seen = false; // V is in the bushes
    }
    e.seen = seen;
    if (seen) {
      e.detect = (e.psycho || isRival) ? 1 : Math.min(1, e.detect + dt * (1.2 + (1 - Math.min(1, d / range)) * 2.2));
      if (!e.alerted && !e.ally && e.detect < 1) {
        console.log(`[AI-DETECT] Enemy ${e.name} (${e.fac}) saw player but did not alert. G.gang=${G.gang}, isRival=${isRival}, detect=${e.detect}`);
      }
      e.lookA = turnToward(e.lookA, aToV, 3.5 * dt); // suspicion: turn toward V
      if (e.detect >= 1) {
        if (!e.alerted) {
          e.alerted = true; e.flashT = 0.7; SFX.spot();
          for (const o of G.enemies) if (!o.dead && o !== e && o.fac === e.fac && distPx(e.x, e.y, o.x, o.y) < 90) { o.alerted = true; o.alertT = 4; o.lkx = tx; o.lky = ty; }
        }
        e.lkx = tx; e.lky = ty; e.alertT = 4.5;
      }
    } else {
      e.detect = Math.max(0, e.detect - dt * 0.45);
      if (e.alerted) { e.alertT -= dt; if (e.alertT <= 0) e.alerted = false; }
    }
    e.flashT = Math.max(0, e.flashT - dt);

    let mvx = 0, mvy = 0, spd = e.psycho ? 75 : e.kind === 'heavy' ? 42 : 58;

    if (escortPlayer) {
      const aTo = Math.atan2(ty - e.y, tx - e.x);
      e.lookA = turnToward(e.lookA, aTo, 6 * dt);
      if (d > 82) { mvx = Math.cos(aTo); mvy = Math.sin(aTo); }
      else if (d < 34) { mvx = -Math.cos(aTo); mvy = -Math.sin(aTo); }
      else if ((e.wanderT || 0) <= 0) {
        e.wanderT = rnd(1.2, 2.8);
        const a = aTo + rnd(-1.8, 1.8);
        e.wx = Math.cos(a) * 0.25; e.wy = Math.sin(a) * 0.25;
      } else {
        e.wanderT -= dt;
        mvx = e.wx || 0; mvy = e.wy || 0;
      }
    } else if (!e.alerted) {
      if (e.detect > 0.12) { /* freeze and stare toward the noise */ }
      else {
        e.wanderT -= dt;
        if (e.wanderT <= 0) { e.wanderT = rnd(1.5, 4); const a = rnd(0, Math.PI * 2); e.wx = Math.cos(a); e.wy = Math.sin(a); if (Math.random() < 0.4) { e.wx = 0; e.wy = 0; } }
        mvx = (e.wx || 0) * 0.4; mvy = (e.wy || 0) * 0.4;
      }
    } else {
      // chase what they can see; otherwise sweep to the last known position
      const tx2 = seen ? tx : (e.lkx != null ? e.lkx : tx);
      const ty2 = seen ? ty : (e.lky != null ? e.lky : ty);
      const aTo = Math.atan2(ty2 - e.y, tx2 - e.x);
      const dT = distPx(e.x, e.y, tx2, ty2);
      e.lookA = turnToward(e.lookA, aTo, 6 * dt);
      if (e.psycho) {
        e.chargeT -= dt; e.burstT -= dt;
        if (e.chargeT <= 0 && dT < 360 && dT > 60) { e.chargeT = 5; e.kbx = Math.cos(aTo) * 320; e.kby = Math.sin(aTo) * 320; SFX.dash(); }
        if (seen && e.burstT <= 0 && d < 320) {
          e.burstT = 3.6;
          for (let k = 0; k < 14; k++) {
            const a = k / 14 * Math.PI * 2;
            G.bullets.push({ x: e.x, y: e.y - 4, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, dmg: 8 + 2 * e.tier, from: 'e', life: 2, col: '#bd00ff', pierce: 0, turn: 0 });
          }
          SFX.shoot('shotgun');
        }
        if (targetIsPlayer && d < 24 && p.iframes <= 0 && !G.driving) damagePlayer(14 + 2 * e.tier);
        else if (gangTarget && d < 28) damageEnemy(gangTarget, 10 + 2 * e.tier, false, aToV, 160);
        mvx = Math.cos(aTo); mvy = Math.sin(aTo);
      } else if (e.kind !== 'melee') {
        // gunner: keep distance band when V is visible, else sweep to last known
        if (!seen) {
          if (dT > 16) { mvx = Math.cos(aTo); mvy = Math.sin(aTo); }
          else e.lookA += 1.5 * dt; // reached it: scan around
        } else {
          if (d > 180) { mvx = Math.cos(aTo); mvy = Math.sin(aTo); }
          else if (d < 90) { mvx = -Math.cos(aTo); mvy = -Math.sin(aTo); }
          else { mvx = Math.cos(aTo + Math.PI / 2) * 0.4 * (e.strafe || (e.strafe = Math.random() < 0.5 ? 1 : -1)); mvy = Math.sin(aTo + Math.PI / 2) * 0.4 * e.strafe; }
          if (d < 260 && e.shootCd <= 0) {
            if (e.aimT <= 0 && !e.aiming) { e.aiming = true; e.aimT = 0.4; }
            else if (e.aiming && e.aimT <= 0) {
              e.aiming = false;
              e.shootCd = e.kind === 'heavy' ? 2.2 : rnd(1.2, 2);
              const shots = e.kind === 'heavy' ? 5 : 3;
              for (let k = 0; k < shots; k++) {
                const a = aToV + rnd(-8, 8) * Math.PI / 180;
                if (targetIsPlayer) G.bullets.push({ x: e.x, y: e.y - 4, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, dmg: (e.kind === 'heavy' ? 7 : 5) + 2 * e.tier, from: 'e', life: 1.6, col: '#ff5a7a', pierce: 0, turn: 0 });
                else damageEnemy(gangTarget, (e.kind === 'heavy' ? 5 : 3) + e.tier, false, a, 35);
              }
              SFX.shoot(e.kind === 'heavy' ? 'shotgun' : 'smg');
            }
          }
        }
      } else {
        // melee rusher
        mvx = Math.cos(aTo); mvy = Math.sin(aTo);
        if (d < 20) {
          if (e.aimT <= 0 && !e.aiming) { e.aiming = true; e.aimT = 0.28; }
          else if (e.aiming && e.aimT <= 0) {
            e.aiming = false;
            if (targetIsPlayer && distPx(e.x, e.y, px, py) < 26 && p.iframes <= 0 && !G.driving) damagePlayer(7 + 2.5 * e.tier);
            else if (gangTarget && distPx(e.x, e.y, gangTarget.x, gangTarget.y) < 26) damageEnemy(gangTarget, 5 + 1.5 * e.tier, false, aToV, 90);
            G.slashes.push({ x: e.x, y: e.y, a: aToV, t: 0.12, range: 20, col: '#ff5a7a' });
          }
          mvx = 0; mvy = 0;
        } else if (!seen && dT < 16) { mvx = 0; mvy = 0; e.lookA += 1.5 * dt; }
      }
    }
    const ml = Math.hypot(mvx, mvy);
    if (ml > 0) {
      moveCollide(e, mvx / ml * spd * dt, mvy / ml * spd * dt, 5);
      e.anim += dt * 8;
      if (!e.alerted && !seen) e.lookA = Math.atan2(mvy, mvx); // look where you walk
      if (Math.abs(mvx) > Math.abs(mvy)) { e.face = 'side'; e.flip = mvx > 0; }
      else e.face = mvy > 0 ? 'down' : 'up';
    }
  }
  // soft separation so packs don't stack into one blob
  for (let i = 0; i < G.enemies.length; i++) {
    const a = G.enemies[i]; if (a.dead) continue;
    const adx = a.x - px, ady = a.y - py;
    if (a.mapSpawn && adx * adx + ady * ady > 760 * 760) continue;
    for (let j = i + 1; j < G.enemies.length; j++) {
      const b = G.enemies[j]; if (b.dead) continue;
      if ((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y) > 100) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d > 0.01 && d < 9) {
        const push = (9 - d) / 2, nx = dx / d, ny = dy / d;
        moveCollide(a, -nx * push, -ny * push, 4);
        moveCollide(b, nx * push, ny * push, 4);
      }
    }
  }
  // clean dead
  G.enemies = G.enemies.filter(e => !e.dead);
}

function findSpot(cx, cy, rMin, rMax) {
  for (let k = 0; k < 30; k++) {
    const a = rnd(0, Math.PI * 2), r = rnd(rMin, rMax);
    const x = clamp(cx + Math.cos(a) * r, 100, WORLD.W * TILE - 100);
    const y = clamp(cy + Math.sin(a) * r, 100, WORLD.H * TILE - 100);
    if (!WORLD.solidPx(x, y) && WORLD.tileAt(x, y) < 5) return { x, y }; // outdoors only
  }
  return null;
}

function findRandomSpot(minDanger) {
  for (let k = 0; k < 120; k++) {
    const x = rnd(100, WORLD.W * TILE - 100), y = rnd(100, WORLD.H * TILE - 100);
    if (WORLD.solidPx(x, y) || WORLD.tileAt(x, y) >= 5) continue;
    const dist = DISTRICTS[WORLD.districtAt(x, y)];
    if (minDanger && dist.danger < minDanger) continue;
    return { x, y, dist };
  }
  return null;
}

// =================== airdrops (Dogtown) ===================
function spawnAirdrop() {
  for (let k = 0; k < 80; k++) {
    const tx = irnd(8, 40), ty = irnd(80, 114);
    if (WORLD.solidAt(tx, ty) || WORLD.t[ty * WORLD.W + tx] >= 5) continue;
    const x = tx * TILE + 8, y = ty * TILE + 8;
    if (WORLD.districtAt(x, y) !== 'dogtown') continue;
    G.airdrop = { x, y, alt: 360, state: 'falling', t: 0 };
    banner('AIRDROP ĐẾN', 'MILITECH THẢ HÀNG TIẾP TẾ Ở DOGTOWN — ĐỪNG ĐỂ BARGHEST CƯỚP MẤT', '#ff6a00');
    msg('REGINA: AIRDROP ON MILITECH FREQUENCIES. SOUTH-WEST, MOVE', '#ff6a00');
    SFX.msg();
    return;
  }
  G.airdropT = 30; // no spot found, retry soon
}

function updateAirdrop(dt, dtW) {
  if (!G.airdrop) {
    G.airdropT -= dt;
    if (G.airdropT <= 0) spawnAirdrop();
    return;
  }
  const a = G.airdrop;
  if (a.state === 'falling') {
    a.alt -= 65 * dtW;
    if (a.alt <= 0) {
      a.alt = 0; a.state = 'landed'; a.t = 90;
      SFX.explode(); G.shake = Math.max(G.shake, 3);
      addP(14, a.x, a.y, { col: '#8a7a5a', sp: 80, life: 0.5 });
      msg('SUPPLY DROP LANDED — 90S BEFORE BARGHEST SECURES IT', '#ff6a00');
    }
  } else {
    a.t -= dt;
    // the welcome squad shows up when V closes in (spawning earlier would despawn as strays)
    if (!a.guarded && distPx(G.p.x, G.p.y, a.x, a.y) < 520) {
      a.guarded = true;
      spawnPack(a.x, a.y, irnd(3, 4), { alerted: true, alertT: 12, lkx: a.x, lky: a.y }, 30, 170);
      msg('BARGHEST CONVERGING ON THE DROP', '#ff6a00');
    }
    if (a.t <= 0) {
      G.airdrop = null; G.airdropT = rnd(150, 240);
      msg('BARGHEST SECURED THE AIRDROP. NEXT TIME, MERC', '#8a93a6');
    }
  }
}

function openAirdrop() {
  const a = G.airdrop;
  G.airdrop = null; G.airdropT = rnd(150, 240);
  G.stats.airdrops = (G.stats.airdrops || 0) + 1;
  for (let k = 0; k < 5; k++)
    G.pickups.push({ kind: 'ed', amt: Math.round((60 + 10 * G.lvl) * rnd(0.8, 1.3)), x: a.x + rnd(-8, 8), y: a.y + rnd(-8, 8), vx: rnd(-30, 30), vy: rnd(-30, 30), t: 60 });
  G.pickups.push({ kind: 'doc', x: a.x, y: a.y - 6, vx: 0, vy: 0, t: 60 });
  // rarity-boosted gear
  const pool = WEAPONS.filter(w => !w.iconic && !w.granted && !w.hidden && w.price > 0 && w.lvl <= G.lvl + 5);
  const un = pool.filter(w => !G.weapons[w.id]);
  const hi = (un.length ? un : pool).filter(w => w.rar >= 2);
  const w = pick(hi.length ? hi : (un.length ? un : pool));
  if (w) G.pickups.push({ kind: 'wpn', id: w.id, x: a.x, y: a.y + 6, vx: 0, vy: 0, t: 90 });
  addP(16, a.x, a.y, { col: '#ff9f1c', sp: 90, life: 0.5 });
  banner('ĐÃ LẤY ĐƯỢC AIRDROP', 'TIẾP TẾ MILITECH: TRANG BỊ + EDDIES', '#ff6a00');
  SFX.buy(); SFX.levelup();
  xpGain(25 + 8 * G.lvl);
  saveGame();
}

function buyWardrobeOutfit(row) {
  const isVi = window.NCPX_I18N && window.NCPX_I18N.lang() === 'vi';
  if (G.skin === row) {
    SFX.deny();
    return;
  }
  const price = 100;
  if (G.eddies < price) { msg(isVi ? 'KHÔNG ĐỦ EDDIES' : 'NOT ENOUGH EDDIES', '#ff5a5a'); SFX.deny(); return; }
  G.eddies -= price;
  G.ui = null;
  G.skin = row;
  recalcStats();
  saveGame();
  const label = isVi
    ? (G.skin === null ? 'MẶC ĐỊNH' : 'TRANG PHỤC #' + (G.skin + 1))
    : (G.skin === null ? 'DEFAULT V' : 'OUTFIT #' + (G.skin + 1));
  G.fade = { t: 0, dur: 1.5, label: isVi ? 'DIỆN MẠO MỚI: ' + label : 'NEW APPEARANCE: ' + label };
  SFX.install();
  msg(isVi ? 'ĐÃ THAY ĐỔI TRANG PHỤC: ' + label : 'OUTFIT UPDATED: ' + label, '#00ff9f');
}

// =================== joytoys & dolls ===================
function openTalk(n) {
  G.ui = 'talk';
  G.uiS = { sel: 0, scroll: 0, tab: 0, confirm: false };
  G.talk = { npc: n, text: n.kind === 'stylist' ? localText('WAKE UP, MERC. WANT A NEW SKIN? IT COSTS $100.') : pick(n.kind === 'doll' ? DOLL_GREET : JOY_GREET) };
  SFX.ui();
}
function talkOptions(n) {
  if (n.kind === 'stylist') {
    const isVi = window.NCPX_I18N && window.NCPX_I18N.lang() === 'vi';
    const opts = [];
    opts.push(isVi ? 'MẶC ĐỊNH' : 'DEFAULT V');
    for (let i = 1; i <= 10; i++) {
      opts.push((isVi ? 'TRANG PHỤC #' : 'OUTFIT #') + i + ' — $100');
    }
    opts.push(isVi ? 'RỜI KHỎI' : 'LEAVE');
    return opts;
  }
  return n.kind === 'doll' ? ['TALK', 'BRAINDANCE BLISS — $300', 'LEAVE'] : ['FLIRT', 'GOOD TIME — $100', 'LEAVE'];
}
function talkSelect(i) {
  const n = G.talk.npc;
  if (n.kind === 'stylist') {
    const isVi = window.NCPX_I18N && window.NCPX_I18N.lang() === 'vi';
    if (i === 11) {
      G.ui = null; G.talk = null; SFX.ui();
      return;
    }
    const targetSkin = i === 0 ? null : (i - 1);
    if (G.skin === targetSkin) {
      msg(isVi ? 'BẠN ĐANG MẶC TRANG PHỤC NÀY RỒI!' : 'ALREADY WEARING THIS OUTFIT!', '#ff9f1c');
      SFX.deny();
      return;
    }
    const price = 100;
    if (G.eddies < price) { msg(isVi ? 'KHÔNG ĐỦ EDDIES' : 'NOT ENOUGH EDDIES', '#ff5a5a'); SFX.deny(); return; }
    G.eddies -= price;
    G.ui = null; G.talk = null;
    G.skin = targetSkin;
    recalcStats();
    saveGame();
    const label = isVi
      ? (G.skin === null ? 'MẶC ĐỊNH' : 'TRANG PHỤC #' + (G.skin + 1))
      : (G.skin === null ? 'DEFAULT V' : 'OUTFIT #' + (G.skin + 1));
    G.fade = { t: 0, dur: 1.5, label: isVi ? 'DIỆN MẠO MỚI: ' + label : 'NEW APPEARANCE: ' + label };
    SFX.install();
    msg(isVi ? 'ĐÃ THAY ĐỔI TRANG PHỤC: ' + label : 'OUTFIT UPDATED: ' + label, '#00ff9f');
    return;
  }
  if (i === 0) { G.talk.text = pick(n.kind === 'doll' ? DOLL_LINES : JOY_LINES); SFX.ui(); return; }
  if (i === 1) {
    const price = n.kind === 'doll' ? 300 : 100;
    if (G.eddies < price) { msg('NOT ENOUGH EDDIES', '#ff5a5a'); SFX.deny(); return; }
    G.eddies -= price;
    G.ui = null; G.talk = null;
    G.fade = { t: 0, dur: 2.8, label: 'SOME TIME LATER...' };
    const p = G.p;
    p.hp = p.maxhp; p.iframes = 4;
    p.joyT = n.kind === 'doll' ? 120 : 60;
    msg((n.kind === 'doll' ? 'CLOUD NINE' : 'EUPHORIA') + ': +CRIT +XP, FULLY RESTED', '#ff2a6d');
    SFX.heal();
    saveGame();
    return;
  }
  G.ui = null; G.talk = null; SFX.ui();
}

function triggerDen(dn) {
  dn.done = true;
  const wx = (dn.tx0 + 1) * TILE, wy = (dn.ty0 + 1) * TILE;
  const dist = DISTRICTS[WORLD.districtAt(wx, wy)];
  const tier = dist.danger + Math.floor(G.lvl / 4);
  const spots = [];
  for (let ty = dn.ty0 + 1; ty < dn.ty1; ty++) for (let tx = dn.tx0 + 1; tx < dn.tx1; tx++)
    if (WORLD.t[ty * WORLD.W + tx] === 5) spots.push({ x: tx * TILE + 8, y: ty * TILE + 8 });
  const want = Math.min(spots.length, irnd(2, 4));
  dn.left = 0;
  for (let k = 0; k < want && spots.length; k++) {
    const s = spots.splice(Math.random() * spots.length | 0, 1)[0];
    if (distPx(s.x, s.y, G.p.x, G.p.y) < 26) continue; // never on top of V
    if (WORLD.blockedPx(s.x, s.y)) continue;           // never inside furniture
    G.enemies.push(makeEnemy(s.x, s.y, tier, dist.fac, Math.random() < 0.5 ? 'gun' : 'melee', { denId: dn.id }));
    dn.left++;
  }
  if (dn.left > 0) { msg('GANG HIDEOUT — TAKE THEM OUT, CLAIM THE BONUS', '#ff9f1c'); SFX.msg(); }
  else dn.cleared = true;
}

function spawnPack(x, y, n, opts, rMin, rMax) {
  const fac = (opts && opts.fac) || DISTRICTS[WORLD.districtAt(x, y)].fac;
  const danger = DISTRICTS[WORLD.districtAt(x, y)].danger;
  const tier = danger + Math.floor(G.lvl / 4);
  for (let i = 0; i < n; i++) {
    const s = findSpot(x, y, rMin || 8, rMax || 60); if (!s) continue;
    const gun = Math.random() < FACTIONS[fac].gun;
    const heavy = tier >= 3 && Math.random() < 0.18;
    G.enemies.push(makeEnemy(s.x, s.y, tier, fac, heavy ? 'heavy' : gun ? 'gun' : 'melee', opts));
  }
  return tier;
}

function spawnMapGangPack(minDanger) {
  const wantDanger = minDanger || (Math.random() < 0.72 ? 3 : 0);
  for (let tries = 0; tries < 8; tries++) {
    const s = findRandomSpot(wantDanger);
    if (!s) continue;
    const danger = s.dist.danger;
    const n = minDanger ? irnd(3, 4) : danger >= 3 ? irnd(2, 3) : irnd(1, 2);
    const tier = danger + Math.floor(G.lvl / 4);
    const before = G.enemies.length;
    for (let i = 0, guard = 0; i < n && guard < n * 5; guard++) {
      const spot = findSpot(s.x, s.y, 8, danger >= 3 ? 92 : 64);
      if (!spot) continue;
      const dk = WORLD.districtAt(spot.x, spot.y);
      const dist = DISTRICTS[dk];
      if (wantDanger && dist.danger < wantDanger) continue;
      const fac = dist.fac || s.dist.fac;
      const gun = Math.random() < FACTIONS[fac].gun;
      const heavy = tier >= 3 && Math.random() < 0.18;
      G.enemies.push(makeEnemy(spot.x, spot.y, tier, fac, heavy ? 'heavy' : gun ? 'gun' : 'melee', { fac, mapSpawn: true }));
      i++;
    }
    if (G.enemies.length > before) return G.enemies.length - before;
  }
  return 0;
}

function updateGangWars(dt) {
  if (G.gangInvite && press('KeyJ')) {
    G.gang = G.gangInvite;
    const name = gangLabel(G.gang);
    G.gangInvite = null;
    banner('GIA NHẬP BĂNG', name, factionColor(G.gang));
    msg('BẠN ĐÃ VÀO BĂNG ' + name + ' — ĐỒNG BĂNG KHÔNG BẮN NHAU', factionColor(G.gang));
    saveGame();
  }
  G.gangWarT -= dt;
  if (G.gangWarT > 0) return;
  G.gangWarT = rnd(90, 150);
  const s = findSpot(G.p.x, G.p.y, 360, 620);
  if (!s) return;
  const facA = DISTRICTS[WORLD.districtAt(s.x, s.y)].fac;
  const facB = rivalFaction(facA);
  const tier = DISTRICTS[WORLD.districtAt(s.x, s.y)].danger + Math.floor(G.lvl / 4);
  spawnPack(s.x - 28, s.y, irnd(1, 2), { fac: facA, war: true, alerted: true, alertT: 20, lkx: s.x + 30, lky: s.y }, 6, 60);
  spawnPack(s.x + 28, s.y, irnd(1, 2), { fac: facB, war: true, alerted: true, alertT: 20, lkx: s.x - 30, lky: s.y }, 6, 60);
  G.gangWar = { x: s.x, y: s.y, a: facA, b: facB, t: 28, tier };
  banner('GIAO TRANH BĂNG ĐẢNG', gangLabel(facA) + ' VS ' + gangLabel(facB), '#f9f002');
}

function updateGangBots(dt) {
  const profile = playerProfile();
  const hasGang = G.gang && profile.gang && profile.gang !== 'SOLO';
  if (!hasGang || isRealtimeNpcReplica()) {
    G.enemies = G.enemies.filter(e => !e.ally);
    G.gangBotT = 1;
    return;
  }
  const allies = G.enemies.filter(e => !e.dead && e.ally);
  const want = Math.min(2, Math.max(1, MAX_GANG_MEMBERS - 1));
  for (const e of allies) {
    const d = distPx(e.x, e.y, G.p.x, G.p.y);
    if (d > 760) { e.dead = true; e.silent = true; continue; }
    if (!findGangTarget(e)) {
      e.alerted = false; e.alertT = 0;
      if (d > 92) { e.alerted = true; e.alertT = 0.25; e.lkx = G.p.x + rnd(-24, 24); e.lky = G.p.y + rnd(-24, 24); }
    }
  }
  G.gangBotT = (G.gangBotT || 0) - dt;
  if (G.gangBotT > 0) return;
  G.gangBotT = 10;
  const live = G.enemies.filter(e => !e.dead && e.ally).length;
  for (let i = live; i < want; i++) {
    const s = findSpot(G.p.x, G.p.y, 52, 160);
    if (!s) break;
    const bot = makeEnemy(s.x, s.y, Math.max(1, Math.floor(G.lvl / 4) + 1), 'player', Math.random() < 0.65 ? 'gun' : 'melee', {
      ally: true,
      name: profile.gang,
      alerted: true,
      alertT: 0.25,
      lkx: G.p.x,
      lky: G.p.y,
    });
    G.enemies.push(bot);
  }
}

function updateMarketWar(dt) {
  if (!G.p) return;
  const isFast = (typeof window !== 'undefined' && window.location && window.location.search && window.location.search.includes('fastmarket'));
  const PEACE_TIME = isFast ? 30 : 7200;
  const WAR_TIME = isFast ? 30 : 1800;

  G.marketWarT -= dt;
  if (G.marketWarT <= 0) {
    if (!G.marketWarActive) {
      G.marketWarActive = true;
      G.marketWarT = WAR_TIME;
      banner('ĐẠI CHIẾN BĂNG ĐẢNG', '4 KHU CHỢ ĐÃ MỞ CỬA TRANH CHẤP!', '#ff2a6d');
      if (typeof SFX !== 'undefined' && SFX.msg) SFX.msg();
    } else {
      G.marketWarActive = false;
      G.marketWarT = PEACE_TIME;
      for (let i = 0; i < G.marketStates.length; i++) {
        G.marketStates[i] = { winner: null, members: 0 };
      }
      banner('KẾT THÚC ĐẠI CHIẾN', 'CÁC KHU CHỢ ĐÃ NGỪNG TRANH CHẤP', '#00ff9f');
      if (typeof SFX !== 'undefined' && SFX.msg) SFX.msg();
    }
    saveGame();
  }

  if (WORLD.markets) {
    const onlinePlayers = [];
    const myProfile = playerProfile();
    if (myProfile.gang && myProfile.gang !== 'SOLO') {
      onlinePlayers.push({
        gang: myProfile.gang,
        isLeader: !!G.isGangLeader,
        x: G.p.x,
        y: G.p.y
      });
    }
    for (const rp of G.remotePlayers || []) {
      if (rp.gang && rp.gang !== 'SOLO') {
        onlinePlayers.push({
          gang: String(rp.gang).toUpperCase(),
          isLeader: !!rp.isLeader,
          x: rp.x,
          y: rp.y
        });
      }
    }

    for (const m of WORLD.markets) {
      const counts = {};
      const bosses = {};

      for (const op of onlinePlayers) {
        const dist = Math.hypot(op.x / TILE - m.tx, op.y / TILE - m.ty);
        if (dist <= m.r) {
          counts[op.gang] = (counts[op.gang] || 0) + 1;
          if (op.isLeader) {
            bosses[op.gang] = true;
          }
        }
      }

      let winningGang = null;
      let maxMembers = 0;
      let tie = false;

      for (const gang in counts) {
        const cnt = counts[gang];
        if (cnt > maxMembers) {
          maxMembers = cnt;
          winningGang = gang;
          tie = false;
        } else if (cnt === maxMembers) {
          tie = true;
        }
      }

      let newWinner = null;
      if (winningGang && !tie && bosses[winningGang]) {
        newWinner = winningGang;
      }

      const state = G.marketStates[m.id] || { winner: null, members: 0 };
      const oldWinner = state.winner;
      G.marketStates[m.id] = { winner: newWinner, members: maxMembers };

      if (G.marketWarActive && newWinner !== oldWinner) {
        if (newWinner) {
          msg(m.name + ' ĐÃ BỊ CHIẾM BỞI BĂNG ' + newWinner, '#00ff9f');
        } else if (oldWinner) {
          msg(m.name + ' TRỞ LẠI TRẠNG THÁI TRANH CHẤP', '#ff2a6d');
        }
        if (typeof SFX !== 'undefined' && SFX.msg) SFX.msg();
      }
    }
  }

  if (G.marketWarActive) {
    G.marketPayoutT -= dt;
    if (G.marketPayoutT <= 0) {
      G.marketPayoutT = 5;
      const myGang = playerProfile().gang;
      if (myGang && myGang !== 'SOLO') {
        let wonCount = 0;
        for (const state of G.marketStates) {
          if (state.winner && state.winner === myGang) {
            wonCount++;
          }
        }
        if (wonCount > 0) {
          const reward = wonCount * 50;
          G.eddies += reward;
          msg('THU NHẬP CHIẾM CHỢ: +' + reward + ' EDDIES', '#00ff9f');
          if (typeof SFX !== 'undefined' && SFX.buy) SFX.buy();
          saveGame();
        }
      }
    }
  }
}

function updateSpawns(dt) {
  // ambient packs
  G.ambientT = (G.ambientT || 0) - dt;
  if (G.ambientT <= 0) {
    const localDanger = DISTRICTS[WORLD.districtAt(G.p.x, G.p.y)].danger;
    G.ambientT = Math.max(5.5, 9 - localDanger * 0.55);
    const ambient = G.enemies.filter(e => !e.bounty && !e.psycho && !e.ally && !e.mapSpawn).length;
    const cap = localDanger >= 3 ? 7 + localDanger : 4 + localDanger;
    if (ambient < cap) {
      const s = findSpot(G.p.x, G.p.y, 420, 640);
      if (s) spawnPack(s.x, s.y, localDanger >= 3 ? irnd(2, 3) : irnd(1, 2));
    }
  }
  // map-wide gang patrols: dangerous districts seed more bodies even before V arrives
  G.mapSpawnT = (G.mapSpawnT || 0) - dt;
  if (G.mapSpawnT <= 0) {
    G.mapSpawnT = 8.5;
    const mapBots = G.enemies.filter(e => !e.dead && e.mapSpawn).length;
    const mapCap = 10 + Math.min(6, Math.ceil(G.lvl / 2));
    if (mapBots < mapCap) spawnMapGangPack();
  }
  // bounties
  if (!G.bounty) {
    G.bountyT -= dt;
    if (G.bountyT <= 0) {
      if (G.psychoPending > 0) { G.psychoPending = 0; spawnPsycho(); }
      else spawnBounty();
    }
  } else if (G.bounty.psycho) {
    const ps = G.enemies.find(e => e.psycho);
    if (ps) { G.bounty.x = ps.x; G.bounty.y = ps.y; }
    else if (!G.enemies.some(e => e.psycho)) { /* killed; completeBounty handled via left */ }
  }
}

function spawnBounty() {
  const s = findSpot(G.p.x, G.p.y, 520, 900);
  if (!s) { G.bountyT = 5; return; }
  const n = 4 + Math.min(6, Math.floor(G.lvl / 2));
  const tier = spawnPack(s.x, s.y, n, { bounty: true });
  const danger = DISTRICTS[WORLD.districtAt(s.x, s.y)].danger;
  G.bounty = { x: s.x, y: s.y, left: G.enemies.filter(e => e.bounty).length, reward: Math.round(280 * danger + 45 * G.lvl), psycho: false };
  msg('REGINA: BOUNTY POSTED — ' + G.bounty.left + ' TARGETS, $' + fmt(G.bounty.reward), '#ff9f1c');
  SFX.msg();
}

function spawnPsycho() {
  const s = findSpot(G.p.x, G.p.y, 420, 700);
  if (!s) { G.bountyT = 5; return; }
  const danger = DISTRICTS[WORLD.districtAt(s.x, s.y)].danger;
  const tier = danger + 2 + Math.floor(G.lvl / 4);
  const name = PSYCHO_NAMES[G.stats.psychos % PSYCHO_NAMES.length];
  G.enemies.push(makeEnemy(s.x, s.y, tier, 'maelstrom', 'gun', { psycho: true, bounty: true, name, alerted: true }));
  G.bounty = { x: s.x, y: s.y, left: 1, reward: 1200 + 400 * danger, psycho: true };
  banner('PHÁT HIỆN CYBERPSYCHO', name + ' — TIẾP CẬN VỚI TẤT CẢ VŨ KHÍ BẠN CÓ', '#bd00ff');
  SFX.psycho();
}

function completeBounty() {
  const b = G.bounty;
  G.bounty = null;
  G.bountyT = rnd(26, 40);
  G.bountyCount++;
  G.stats.bounties++;
  G.eddies += b.reward;
  xpGain(40 + 20 * G.lvl);
  msg('BOUNTY COMPLETE: +$' + fmt(b.reward), '#2ecc71');
  SFX.buy();
  if (!b.psycho) {
    // guaranteed gear drop at site
    const pool = WEAPONS.filter(w => !w.iconic && !w.granted && !w.hidden && w.lvl <= G.lvl + 3 && w.price > 0);
    const unowned = pool.filter(w => !G.weapons[w.id]);
    const w = pick(unowned.length ? unowned : pool);
    if (w) G.pickups.push({ kind: 'wpn', id: w.id, x: b.x, y: b.y, vx: 0, vy: 0, t: 90 });
    if (G.bountyCount % 3 === 0) { G.psychoPending = 1; G.bountyT = 7; msg('REGINA: PICKING UP A PSYCHO SIGNAL... STAND BY', '#bd00ff'); }
  }
  NCPX.emit('bounty', { reward: b.reward, psycho: b.psycho });
  saveGame();
}

// =================== pickups / crates / civs ===================
function updatePickups(dt) {
  const p = G.p;
  for (const pk of G.pickups) {
    pk.t -= dt;
    if (pk.noSelfPickup || pk.ownerId === 'self') continue;
    const dx = p.x - pk.x, dy = p.y - pk.y, d2 = dx * dx + dy * dy;
    if (d2 > 90 * 90 && !pk.vx && !pk.vy) continue;
    const d = Math.sqrt(d2);
    if (d < 52 && d > 1 && !G.driving) { pk.vx = dx / d * 130; pk.vy = dy / d * 130; }
    if (pk.vx || pk.vy) {
      pk.x += (pk.vx || 0) * dt; pk.y += (pk.vy || 0) * dt;
      pk.vx *= Math.max(0, 1 - 3 * dt); pk.vy *= Math.max(0, 1 - 3 * dt);
      if (Math.abs(pk.vx) < 0.5) pk.vx = 0;
      if (Math.abs(pk.vy) < 0.5) pk.vy = 0;
    }
    if (d2 < 12 * 12 && !G.driving) {
      pk.t = -1;
      if (pk.kind === 'ed') { G.eddies += pk.amt; addTxt(p.x, p.y - 16, '+$' + fmt(pk.amt), '#f9f002'); SFX.coin(); }
      else if (pk.kind === 'doc') {
        if (G.maxdocs < 5) { G.maxdocs++; msg('MAXDOC +1', '#2ecc71'); }
        else { G.eddies += 25; addTxt(p.x, p.y - 16, '+$25', '#f9f002'); }
        SFX.coin();
      } else if (pk.kind === 'wpn') giveWeapon(pk.id);
    }
  }
  G.pickups = G.pickups.filter(pk => pk.t > 0);
}

function breakCrate(cr) {
  if (cr.hp <= 0) return;
  cr.hp = 0; cr.respT = 90;
  G.stats.crates++;
  addP(8, cr.x, cr.y, { col: '#5a4632', sp: 80, life: 0.4, grav: 140 });
  SFX.hit();
  const r = Math.random();
  if (r < 0.72) G.pickups.push({ kind: 'ed', amt: irnd(15, 60), x: cr.x, y: cr.y, vx: rnd(-10, 10), vy: rnd(-10, 10), t: 30 });
  else if (r < 0.85) G.pickups.push({ kind: 'doc', x: cr.x, y: cr.y, vx: 0, vy: 0, t: 30 });
  else {
    const pool = WEAPONS.filter(w => !w.iconic && !w.granted && !w.hidden && w.lvl <= G.lvl + 2 && w.price > 0 && !G.weapons[w.id]);
    if (pool.length && Math.random() < 0.4) G.pickups.push({ kind: 'wpn', id: pick(pool).id, x: cr.x, y: cr.y, vx: 0, vy: 0, t: 60 });
    else G.pickups.push({ kind: 'ed', amt: irnd(30, 90), x: cr.x, y: cr.y, vx: 0, vy: 0, t: 30 });
  }
}

function updateCrates(dt) {
  G.crateStepT = (G.crateStepT || 0) + dt;
  if (G.crateStepT < 0.2) return;
  const tick = G.crateStepT;
  G.crateStepT = 0;
  for (const cr of G.crates) {
    if (cr.hp <= 0) { cr.respT -= tick; if (cr.respT <= 0) cr.hp = 1; }
  }
}

function maintainCivs() {
  while (G.civs.length < 10) {
    const s = findSpot(G.p.x, G.p.y, 180, 460);
    if (!s) break;
    G.civs.push({ id: 'c' + ((G.civSeq = (G.civSeq || 0) + 1).toString(36)), x: s.x, y: s.y, i: irnd(0, 5), anim: 0, face: 'down', flip: false, wanderT: 0, fleeT: 0, wx: 0, wy: 0 });
  }
}

function updateCivs(dt) {
  const p = G.p;
  for (const cv of G.civs) {
    if (distPx(cv.x, cv.y, p.x, p.y) > 700) { cv.gone = true; continue; }
    cv.fleeT = Math.max(0, cv.fleeT - dt);
    cv.wanderT -= dt;
    if (cv.wanderT <= 0) { cv.wanderT = rnd(2, 5); const a = rnd(0, Math.PI * 2); cv.wx = Math.cos(a); cv.wy = Math.sin(a); if (Math.random() < 0.35) { cv.wx = 0; cv.wy = 0; } }
    let vx = cv.wx * 28, vy = cv.wy * 28;
    if (cv.fleeT > 0) { const a = Math.atan2(cv.y - p.y, cv.x - p.x); vx = Math.cos(a) * 95; vy = Math.sin(a) * 95; }
    if (vx || vy) {
      moveCollide(cv, vx * dt, vy * dt, 4);
      cv.anim += dt * 7;
      if (Math.abs(vx) > Math.abs(vy)) { cv.face = 'side'; cv.flip = vx > 0; } else cv.face = vy > 0 ? 'down' : 'up';
    }
  }
  G.civs = G.civs.filter(cv => !cv.gone);
  G.civT = (G.civT || 0) - dt;
  if (G.civT <= 0) { G.civT = 3; maintainCivs(); }
}

// =================== vehicles ===================
function vehicleKey() {
  if (G.driving) { exitCar(); return; }
  if (G.car && !G.car.dead && distPx(G.p.x, G.p.y, G.car.x, G.car.y) < 34) { enterCar(); return; }
  summonCar();
}

function summonCar() {
  if (!G.activeCar) { msg('NO VEHICLE OWNED — VISIT NC AUTOFIXER [A]', '#ff5a5a'); SFX.deny(); return; }
  if (G.summonCd > 0) { msg('VEHICLE INBOUND IN ' + Math.ceil(G.summonCd) + 'S', '#8a93a6'); return; }
  // find nearest road px
  let best = null, bd = 1e9;
  for (let r = 1; r < 30; r++) {
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * Math.PI * 2;
      const x = G.p.x + Math.cos(a) * r * 16, y = G.p.y + Math.sin(a) * r * 16;
      const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
      if (tx >= 0 && ty >= 0 && tx < WORLD.W && ty < WORLD.H && WORLD.t[ty * WORLD.W + tx] === 0) {
        const d = distPx(x, y, G.p.x, G.p.y);
        if (d < bd) { bd = d; best = { x: tx * TILE + 8, y: ty * TILE + 8 }; }
      }
    }
    if (best) break;
  }
  if (!best) { msg('NO ROAD ACCESS HERE', '#ff5a5a'); return; }
  G.car = { id: G.activeCar, x: best.x, y: best.y, a: -Math.PI / 2, vx: 0, vy: 0, hp: CARD[G.activeCar].hp, dead: false };
  G.summonCd = 15;
  addP(10, best.x, best.y, { col: '#05d9e8', sp: 60, life: 0.4 });
  msg(CARD[G.activeCar].name + ' DELIVERED', '#00ff9f');
  SFX.buy();
}

function enterCar() { G.driving = true; SFX.ui(); }

function exitCar() {
  const c = G.car;
  G.driving = false;
  if (!c) return;
  const a = c.a + Math.PI / 2;
  for (const off of [a, a + Math.PI, c.a, c.a + Math.PI]) {
    const x = c.x + Math.cos(off) * 22, y = c.y + Math.sin(off) * 22;
    if (!WORLD.blockedPx(x, y)) { G.p.x = x; G.p.y = y; break; }
  }
  SFX.engine(false, 0);
}

function runOverHit(e, sp, dir) {
  if (e.roCd > 0) return; // one big hit per pass, not 60 ticks of contact
  e.roCd = 0.5;
  SFX.squish();
  G.shake = Math.max(G.shake, Math.min(6, sp / 55));
  addP(Math.round(10 + sp / 22), e.x, e.y - 4, { col: '#a01828', sp: sp * 0.55, life: 0.6, grav: 140, dir, cone: 0.85 });
  addP(7, e.x, e.y - 4, { col: '#ff2a3c', sp: sp * 0.35, life: 0.35, dir, cone: 1.1 });
  bloodStain(e.x, e.y, dir, Math.min(1.6, sp / 200));
  if (G.car) G.car.bloodT = 0.9;
  if (e.psycho) damageCar(35); // hitting a cyberpsycho hurts the ride too
  damageEnemy(e, sp * 0.45, sp > 240, dir, Math.min(420, sp * 1.2));
}

function damageCar(dmg) {
  if (!G.car || G.car.dead) return;
  G.car.hp -= dmg;
  if (G.car.hp <= 0) {
    G.car.dead = true;
    explode(G.car.x, G.car.y, 60, 50, 'e');
    if (G.driving) { G.driving = false; G.p.x = G.car.x; G.p.y = G.car.y; G.p.iframes = 1; damagePlayer(30); }
    msg('VEHICLE DESTROYED — RESUMMON WHEN READY', '#ff5a5a');
    G.car = null;
    SFX.engine(false, 0);
  }
}

function updateCar(dt, rdt) {
  const c = G.car;
  if (!c || c.dead) { SFX.engine(false, 0); return; }
  const def = CARD[c.id];
  if (G.driving) {
    const fwdIn = (G.keys.has('KeyW') ? 1 : 0) - (G.keys.has('KeyS') ? 0.6 : 0);
    const steer = (G.keys.has('KeyD') ? 1 : 0) - (G.keys.has('KeyA') ? 1 : 0);
    const hb = G.keys.has('Space');
    const hx = Math.cos(c.a), hy = Math.sin(c.a);
    let fwd = hx * c.vx + hy * c.vy, lat = -hy * c.vx + hx * c.vy;
    fwd += def.acc * fwdIn * dt;
    fwd *= Math.max(0, 1 - 0.5 * dt);
    fwd = clamp(fwd, -def.top * 0.3, def.top);
    lat *= Math.max(0, 1 - (hb ? 3.2 : def.grip * 13) * dt);
    c.a += steer * 2.5 * dt * clamp(Math.abs(fwd) / 130, 0, 1) * Math.sign(fwd || 1) * (hb ? 1.5 : 1);
    c.vx = hx * fwd - hy * lat; c.vy = hy * fwd + hx * lat;
    const nx = c.x + c.vx * dt, ny = c.y + c.vy * dt;
    // corner collision
    const hw = def.bike ? 4 : 7, hl = def.bike ? 10 : 13;
    let blocked = false;
    for (const [ox, oy] of [[hl, 0], [-hl, 0], [0, hw], [0, -hw]]) {
      const wx2 = nx + hx * ox - hy * oy, wy2 = ny + hy * ox + hx * oy;
      if (WORLD.blockedPx(wx2, wy2)) { blocked = true; break; }
    }
    if (blocked) {
      const sp = Math.hypot(c.vx, c.vy);
      if (sp > 130) { damageCar(sp * 0.16); G.shake = Math.max(G.shake, 3); addP(8, c.x + hx * hl, c.y + hy * hl, { col: '#ffd27a', sp: 90, life: 0.3 }); SFX.hit(); }
      c.vx *= -0.32; c.vy *= -0.32;
    } else { c.x = nx; c.y = ny; }
    G.stats.dist += Math.hypot(c.vx, c.vy) * dt;
    // mow down enemies — hit test against the car's oriented body, not a point
    const sp = Math.hypot(c.vx, c.vy);
    G.carSpd = sp;
    const rhw = (def.bike ? 4 : 8), rhl = (def.bike ? 11 : 15);
    for (const e of G.enemies) {
      if (e.dead) continue;
      const dx = e.x - c.x, dy = e.y - c.y;
      if (dx * dx + dy * dy > 1100) continue;
      const lx = hx * dx + hy * dy, ly = -hy * dx + hx * dy; // into car-local frame
      if (Math.abs(lx) < rhl && Math.abs(ly) < rhw) {
        if (sp > 70) {
          runOverHit(e, sp, Math.atan2(c.vy, c.vx));
          c.vx *= e.psycho ? 0.75 : 0.93; c.vy *= e.psycho ? 0.75 : 0.93;
        } else {
          const a = Math.atan2(dy, dx);
          e.kbx += Math.cos(a) * 120; e.kby += Math.sin(a) * 120; // low speed: shove aside
        }
      }
    }
    // civilians dive out of the way instead of clipping through
    for (const cv2 of G.civs) {
      const dx = cv2.x - c.x, dy = cv2.y - c.y;
      if (dx * dx + dy * dy > 1100) continue;
      const lx = hx * dx + hy * dy, ly = -hy * dx + hx * dy;
      if (Math.abs(lx) < rhl && Math.abs(ly) < rhw) {
        const a = Math.atan2(dy, dx);
        cv2.x += Math.cos(a) * 3; cv2.y += Math.sin(a) * 3;
        cv2.fleeT = 3;
      }
    }
    if (sp > 110) alertNearby(c.x, c.y, 200);
    // bloody tire tracks for a moment after a run-over; smear fades as blood wears off
    if ((c.bloodT || 0) > 0) {
      c.bloodT -= dt;
      if (sp > 50) {
        const nx = -hy, ny = hx;
        const col = 'rgba(110,12,22,' + (0.42 * Math.min(1, c.bloodT / 0.6)).toFixed(2) + ')';
        const span = sp * dt, n2 = Math.max(1, Math.round(span / 2));
        if (!G.decals) G.decals = [];
        for (let k = 0; k < n2; k++) {
          const back = 9 + (k / n2) * span;
          const bx = c.x - hx * back, by = c.y - hy * back;
          const px1 = Math.round(bx + nx * 4 + rnd(-0.6, 0.6));
          const py1 = Math.round(by + ny * 4);
          const px2 = Math.round(bx - nx * 4);
          const py2 = Math.round(by - ny * 4 + rnd(-0.6, 0.6));
          G.decals.push({ x: px1, y: py1, rect: true, w: 2, h: 2, col: col });
          G.decals.push({ x: px2, y: py2, rect: true, w: 2, h: 2, col: col });
        }
        if (G.decals.length > 500) {
          G.decals.splice(0, G.decals.length - 500);
        }
      }
    }
    // skids
    if (hb && sp > 90) addP(1, c.x - hx * 10, c.y - hy * 10, { col: '#0c0c10', sp: 4, life: 1.2 });
    SFX.engine(true, clamp(sp / def.top, 0, 1));
    G.p.x = c.x; G.p.y = c.y; // keep player synced under the hood
  } else {
    G.carSpd = 0;
    c.vx *= Math.max(0, 1 - 3 * dt); c.vy *= Math.max(0, 1 - 3 * dt);
    c.x += c.vx * dt; c.y += c.vy * dt;
    SFX.engine(false, 0);
  }
}

// =================== economy ===================
function giveWeapon(id, silent) {
  const w = WPN[id];
  if (!w) return;
  if (G.weapons[id]) {
    const scrap = Math.max(10, Math.round(w.price * 0.25));
    G.eddies += scrap;
    if (!silent) msg('DUPLICATE ' + w.name + ' SCRAPPED: +$' + fmt(scrap), '#8a93a6');
    return;
  }
  G.weapons[id] = { mag: w.mag || 0 };
  const slot = G.loadout.indexOf(null);
  if (slot >= 0) G.loadout[slot] = id;
  if (!silent) {
    msg('ACQUIRED: ' + w.name + ' [' + RAR_NAME[w.rar] + ']', RAR_COL[w.rar]);
    SFX.buy();
    const owned = WEAPONS.filter(x => G.weapons[x.id]).length;
    if (owned === WEAPONS.length) banner('BỘ SƯU TẬP HOÀN CHỈNH', 'MỌI VŨ KHÍ Ở NIGHT CITY ĐỀU LÀ CỦA BẠN', '#f9f002');
  }
}

function buyWeapon(id) {
  const w = WPN[id];
  if (G.weapons[id]) { SFX.deny(); return; }
  if (G.lvl < w.lvl) { msg('REQUIRES LEVEL ' + w.lvl, '#ff5a5a'); SFX.deny(); return; }
  if (G.eddies < w.price) { msg('NOT ENOUGH EDDIES', '#ff5a5a'); SFX.deny(); return; }
  G.eddies -= w.price;
  giveWeapon(id);
  saveGame();
}

function buyCar(id) {
  const car = CARD[id];
  if (G.cars[id]) { setActiveCar(id); return; }
  if (G.eddies < car.price) { msg('NOT ENOUGH EDDIES', '#ff5a5a'); SFX.deny(); return; }
  G.eddies -= car.price;
  G.cars[id] = 1;
  G.activeCar = id;
  msg('PURCHASED: ' + car.name + ' — [V] TO SUMMON', '#00ff9f');
  SFX.buy();
  const owned = CARS.filter(x => G.cars[x.id]).length;
  if (owned === CARS.length) banner('GARAGE HOÀN CHỈNH', 'MỌI XE Ở NIGHT CITY ĐỀU LÀ CỦA BẠN', '#00ff9f');
  saveGame();
}

function setActiveCar(id) {
  if (!G.cars[id]) return;
  G.activeCar = id;
  msg('ACTIVE VEHICLE: ' + CARD[id].name, '#00ff9f');
  SFX.ui();
  saveGame();
}

function buyCyber(id) {
  const cy = CYB[id];
  const tier = G.cyber[id] || 0;
  if (cy.os && tier && G.os !== id) {
    G.os = id; msg('OS ACTIVE: ' + cy.name, '#05d9e8'); SFX.install(); recalcStats(); saveGame(); return;
  }
  if (tier >= cy.tiers.length) { SFX.deny(); return; }
  const t = cy.tiers[tier];
  if (G.lvl < t.lvl) { msg('REQUIRES LEVEL ' + t.lvl, '#ff5a5a'); SFX.deny(); return; }
  if (G.eddies < t.price) { msg('NOT ENOUGH EDDIES', '#ff5a5a'); SFX.deny(); return; }
  G.eddies -= t.price;
  G.cyber[id] = tier + 1;
  if (cy.os && !tier) G.os = id;
  if (cy.grants) giveWeapon(cy.grants);
  msg('INSTALLED: ' + cy.name + ' MK.' + (tier + 1), '#05d9e8');
  SFX.install();
  recalcStats();
  saveGame();
}

function assignSlot(id, k) {
  if (!G.weapons[id]) return;
  const old = G.loadout.indexOf(id);
  if (old >= 0) G.loadout[old] = G.loadout[k];
  G.loadout[k] = id;
  G.slot = k;
  msg('SLOT ' + (k + 1) + ': ' + WPN[id].name, RAR_COL[WPN[id].rar]);
  SFX.ui();
}

function recalcStats() {
  const p = G.p;
  if (!p) return;
  const T = id => G.cyber[id] || 0;
  const tv = (id, f) => T(id) ? CYB[id].tiers[T(id) - 1][f] : null;
  const oldMax = p.maxhp;
  p.maxhp = 100 + (G.lvl - 1) * 6 + (tv('titanium', 'hp') || 0);
  p.hp = clamp(p.hp + Math.max(0, p.maxhp - oldMax), 1, p.maxhp);
  p.armor = (tv('subdermal', 'armor') || 0);
  p.speedMult = tv('tendons', 'spd') || 1;
  p.dashCdMult = tv('tendons', 'dash') || 1;
  p.rofMult = tv('microrotor', 'rof') || 1;
  p.xpMult = tv('memboost', 'xp') || 1;
  p.critCh = 0.05 + (tv('kiroshi', 'crit') || 0);
  p.smartTurn = tv('smartlink', 'turn') || 0;
}

// =================== fx & messages ===================
function addP(n, x, y, o) {
  for (let i = 0; i < n; i++) {
    // o.dir + o.cone spray particles in a direction; omit for a radial burst
    const a = o.dir != null ? o.dir + rnd(-(o.cone || 0.5), o.cone || 0.5) : rnd(0, Math.PI * 2);
    const sp = rnd(0.3, 1) * (o.sp || 60);
    G.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.grav ? 20 : 0), t: rnd(0.5, 1) * (o.life || 0.4), col: o.col || '#fff', sz: o.sz || 1, grav: o.grav || 0 });
  }
}

// ---- gore decals: stored in G.decals array for high performance (avoids marking giant WORLD.cv canvas dirty) ----
function bloodStain(x, y, dir, power) {
  if (!G.decals) G.decals = [];
  const splatters = [];
  const n = Math.round(5 + power * 14);
  for (let i = 0; i < n; i++) {
    const a = dir != null ? dir + rnd(-0.75, 0.75) : rnd(0, Math.PI * 2);
    const d = rnd(1, 7 + power * 18);
    const s = Math.random() < 0.3 ? 2 : 1;
    const col = Math.random() < 0.5 ? 'rgba(122,14,28,0.55)' : 'rgba(160,24,40,0.45)';
    splatters.push({
      dx: Math.round(Math.cos(a) * d),
      dy: Math.round(Math.sin(a) * d * 0.7),
      sz: s,
      col: col
    });
  }

  G.decals.push({
    x: x, y: y,
    splatters: splatters,
    ellipse: {
      rx: 1.5 + power * 3.5,
      ry: 1 + power * 2.2,
      col: 'rgba(110,12,24,0.5)'
    }
  });

  if (G.decals.length > 500) {
    G.decals.shift();
  }
}
function addTxt(x, y, text, col) { G.texts.push({ x, y, text, col, t: 0.8 }); }
function msg(text, col) {
  G.msgs.push({ text, col: col || '#cfd6e4', t: 5 });
  if (G.msgs.length > 8) G.msgs.shift();
}
function banner(text, sub, col) { G.bannerO = { text, sub, col: col || '#f9f002', t: 3 }; }

function updateRain(dt) {
  if (!G.rain.length) for (let i = 0; i < 160; i++) G.rain.push({ x: rnd(0, VIEW_W), y: rnd(0, VIEW_H), s: rnd(220, 380), l: rnd(4, 9) });
  for (const r of G.rain) {
    r.y += r.s * dt; r.x -= r.s * 0.18 * dt;
    if (r.y > VIEW_H) { r.y = -10; r.x = rnd(0, VIEW_W + 60); }
  }
  if (!G.fogBlobs.length) for (let i = 0; i < 9; i++) G.fogBlobs.push({ x: rnd(0, VIEW_W), y: rnd(0, VIEW_H), vx: rnd(4, 14), r: rnd(60, 110) });
  for (const f of G.fogBlobs) {
    f.x += f.vx * dt;
    if (f.x - f.r > VIEW_W) { f.x = -f.r; f.y = rnd(0, VIEW_H); }
  }
}

function drawRain(c) {
  const W = WEATHERS[G.weather.kind];
  const n = Math.min(G.rain.length, Math.round(G.wfx.density));
  if (n > 0) {
    c.strokeStyle = W.rainCol || 'rgba(150,190,230,0.20)';
    c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i < n; i++) { const r = G.rain[i]; c.moveTo(r.x, r.y); c.lineTo(r.x - r.l * 0.18, r.y - r.l); }
    c.stroke();
  }
  if (G.wfx.fog > 0.02) {
    const fcol = W.fogCol || '#aeb6c4';
    for (const f of G.fogBlobs) {
      c.globalAlpha = 0.14 * G.wfx.fog;
      c.drawImage(SPR.glowS(fcol, Math.round(f.r)), f.x - f.r, f.y - f.r);
    }
    c.globalAlpha = 1;
  }
  if (W.tint) { c.fillStyle = W.tint; c.fillRect(0, 0, VIEW_W, VIEW_H); }
}

// =================== render ===================
const WORLD_PED_SCALE = 1.6;

function drawPed(c, ped, face, flip, frame, x, y, alpha, scale) {
  scale = scale == null ? WORLD_PED_SCALE : scale;
  const spr = ped[face === 'side' ? 'side' : face][frame % 2];
  c.save();
  if (alpha != null) c.globalAlpha = alpha;
  c.translate(Math.round(x), Math.round(y));
  // shadow
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.fillRect(-3 * scale, -2, 6 * scale, 2);
  if (face === 'side' && flip) c.scale(-scale, scale); else c.scale(scale, scale);
  c.drawImage(spr, -4, -14);
  c.restore();
  c.globalAlpha = 1;
}

function visible(x, y, m) {
  m = m || 40;
  if (G && G.view) return x > G.view.x0 - m && x < G.view.x1 + m && y > G.view.y0 - m && y < G.view.y1 + m;
  const wv_w = VIEW_W / WORLD_ZOOM, wv_h = VIEW_H / WORLD_ZOOM;
  return x > G.cam.x - m && x < G.cam.x + wv_w + m && y > G.cam.y - m && y < G.cam.y + wv_h + m;
}

function indoorAt(x, y) { return WORLD.tileAt(x, y) >= 5; } // FLOOR or DOOR

function prepRenderView(camX, camY, wvW, wvH) {
  G.view = { x0: camX, y0: camY, x1: camX + wvW, y1: camY + wvH };
  const vis = G.vis || (G.vis = {});
  collectVisible(vis.bushes || (vis.bushes = []), WORLD.bushes, 40);
  collectVisible(vis.signs || (vis.signs = []), WORLD.signs, 60);
  collectVisible(vis.holos || (vis.holos = []), WORLD.holos, 60);
  collectVisible(vis.vends || (vis.vends = []), WORLD.vends, 40);
  collectVisible(vis.lights || (vis.lights = []), WORLD.lights, 30);
  collectVisible(vis.displays || (vis.displays = []), WORLD.displays, 40);
  collectVisible(vis.pickups || (vis.pickups = []), G.pickups, 40);
  collectVisible(vis.crates || (vis.crates = []), G.crates, 40, cr => cr.hp > 0);
}

function collectVisible(out, list, m, keep) {
  out.length = 0;
  const v = G.view;
  for (let i = 0; i < list.length; i++) {
    const o = list[i];
    if (keep && !keep(o)) continue;
    if (o.x > v.x0 - m && o.x < v.x1 + m && o.y > v.y0 - m && o.y < v.y1 + m) out.push(o);
  }
  return out;
}

// One pass per depth layer: indoor entities draw under the roof canvases,
// outdoor entities draw over them (you stand in FRONT of a south facade).
function drawWorldEntities(c, indoor) {
  const p = G.p;
  const vis = G.vis || {};
  // pickups
  for (const pk of vis.pickups || G.pickups) {
    if (indoorAt(pk.x, pk.y) !== indoor) continue;
    const bob = Math.sin(G.rt * 4 + pk.x) * 1.5;
    if (pk.kind === 'ed') {
      c.fillStyle = '#f9f002'; c.fillRect(pk.x - (pk.deathDrop ? 2 : 1), pk.y - (pk.deathDrop ? 2 : 1) + bob, pk.deathDrop ? 5 : 3, pk.deathDrop ? 5 : 3);
      if (pk.deathDrop) drawWorldTextC(c, '$' + fmt(pk.amt), pk.x, pk.y - 16 + bob, '#f9f002', 0.68);
    }
    else if (pk.kind === 'doc') { c.fillStyle = '#fff'; c.fillRect(pk.x - 3, pk.y - 1 + bob, 6, 2); c.fillRect(pk.x - 1, pk.y - 3 + bob, 2, 6); }
    else {
      const w = WPN[pk.id];
      c.drawImage(SPR.wicon(w.cls, KIND_COL[w.kind]), pk.x - 8, pk.y - 4 + bob, 16, 7);
      if (pk.deathDrop) drawWorldTextC(c, trunc(w.name, 16), pk.x, pk.y - 17 + bob, RAR_COL[w.rar], 0.62);
    }
  }
  // player car
  if (G.car && !G.car.dead && visible(G.car.x, G.car.y) && indoorAt(G.car.x, G.car.y) === indoor) {
    c.save(); c.translate(Math.round(G.car.x), Math.round(G.car.y)); c.rotate(G.car.a + Math.PI / 2);
    c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(-7, -13, 14, 26);
    c.drawImage(SPR.car(G.car.id), -8, -15);
    c.restore();
  }
  // realtime players
  const me = playerProfile();
  for (const rp of G.remotePlayers || []) {
    if (Number(rp.hp) <= 0) continue;
    if (!visible(rp.x, rp.y) || indoorAt(rp.x, rp.y) !== indoor) continue;
    const ally = sameGangProfile(rp, me);
    c.globalAlpha = ally ? 0.92 : 0.86;
    c.strokeStyle = ally ? '#00ff9f' : '#bd00ff';
    c.beginPath(); c.ellipse(rp.x, rp.y - 2, 7, 4, 0, 0, Math.PI * 2); c.stroke();
    drawPed(c, SPR.player.m, rp.face || 'down', !!rp.flip, Math.floor(G.rt * 6), rp.x, rp.y, c.globalAlpha);
    c.globalAlpha = 1;
    if (Number.isFinite(rp.hp) && ((rp.hp < (rp.maxhp || 100)) || rp.hitT > 0)) {
      const pct = clamp(rp.hp / (rp.maxhp || 100), 0, 1);
      c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(rp.x - 9, rp.y - 26, 18, 3);
      c.fillStyle = ally ? '#00ff9f' : '#ff2a6d'; c.fillRect(rp.x - 9, rp.y - 26, 18 * pct, 3);
    }
    if (rp.gang && rp.gang !== 'SOLO') drawGangWorldLabel(c, rp.gang, rp.gangIcon, rp.gangIconCol, rp.x, rp.y - 43, rp.gangIconCol || (ally ? '#00ff9f' : '#bd00ff'));
    drawWorldTextC(c, trunc(rp.name || 'MERC', 10), rp.x, rp.y - 32, ally ? '#00ff9f' : '#bd00ff', 0.62);
  }
  // enemies
  for (const e of G.enemies) {
    if (e.dead || !visible(e.x, e.y) || indoorAt(e.x, e.y) !== indoor) continue;
    // Kiroshi optics: visualize unaware enemies' view cones
    if (G.cyber.kiroshi && !e.alerted) {
      c.globalAlpha = 0.05 + e.detect * 0.08;
      c.fillStyle = e.detect > 0.05 ? '#ff9f1c' : '#f9f002';
      c.beginPath(); c.moveTo(e.x, e.y - 4);
      c.arc(e.x, e.y - 4, enemyRange(e) * 0.45, e.lookA - FOV_HALF, e.lookA + FOV_HALF);
      c.closePath(); c.fill();
      c.globalAlpha = 1;
    }
    if (e.psycho) {
      c.globalAlpha = 0.5 + 0.3 * Math.sin(G.rt * 6);
      c.drawImage(SPR.glowS('#bd00ff', 18), e.x - 18, e.y - 22);
      c.globalAlpha = 1;
    }
    drawPed(c, e.psycho ? SPR.psycho : SPR.ped(e.fac), e.face, e.flip, Math.floor(e.anim), e.x, e.y, e.hitT > 0 ? 0.55 : 1, e.psycho ? 2.05 : undefined);
    if (e.war || e.bounty || e.psycho || (G.cyber.kiroshi && e.alerted)) drawWorldTextC(c, gangLabel(e.fac), e.x, e.y - (e.psycho ? 60 : 38), e.war ? '#f9f002' : factionColor(e.fac), 0.7);
    if ((G.cyber.kiroshi || e.bounty || e.psycho) && e.hp < e.maxhp) {
      c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(e.x - 7, e.y - (e.psycho ? 30 : 18), 14, 2);
      c.fillStyle = e.psycho ? '#bd00ff' : '#ff2a3c'; c.fillRect(e.x - 7, e.y - (e.psycho ? 30 : 18), 14 * e.hp / e.maxhp, 2);
    }
    if (e.bounty && !e.psycho) { c.fillStyle = '#ff2a3c'; c.fillRect(e.x - 1, e.y - (G.cyber.kiroshi ? 23 : 19), 2, 2); }
    // detection state: '?' suspicion meter, '!' on full alert
    if (e.flashT > 0) drawTextC(c, '!', e.x, e.y - (e.psycho ? 52 : 40), '#ff2a3c', 1);
    else if (!e.alerted && e.detect > 0.05) {
      drawTextC(c, '?', e.x, e.y - 40, '#f9f002', 1);
      c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(e.x - 5, e.y - 19, 10, 2);
      c.fillStyle = e.detect > 0.6 ? '#ff9f1c' : '#f9f002'; c.fillRect(e.x - 5, e.y - 19, 10 * e.detect, 2);
    }
  }
  // civs
  for (const cv2 of G.civs) {
    if (!visible(cv2.x, cv2.y) || indoorAt(cv2.x, cv2.y) !== indoor) continue;
    drawPed(c, SPR.civ(cv2.i), cv2.face, cv2.flip, Math.floor(cv2.anim), cv2.x, cv2.y);
  }
  // shop vendors, joytoys, dolls
  for (const n of WORLD.npcs) {
    if (!visible(n.x, n.y) || indoorAt(n.x, n.y) !== indoor) continue;
    drawPed(c, SPR.civ(n.i), 'down', false, 0, n.x, n.y);
    const shopNpc = n.kind === 'stylist' || n.kind === 'casino' || ['VŨ KHÍ','CYBER','XE','BAR','THỜI TRANG'].indexOf(n.name) >= 0;
    drawWorldTextC(c, n.name, n.x, n.y - (shopNpc ? 30 : 34), n.kind === 'joy' || n.kind === 'doll' ? '#ff2a6d' : '#5a6372', shopNpc ? 0.5 : 0.66);
  }
  // airdrop: chute on the way down, beacon container on the ground
  if (!indoor && G.airdrop && visible(G.airdrop.x, G.airdrop.y, 80)) {
    const a = G.airdrop, prog = 1 - Math.min(1, a.alt / 360), cy2 = a.y - a.alt;
    c.fillStyle = 'rgba(0,0,0,' + (0.12 + 0.26 * prog).toFixed(2) + ')';
    c.beginPath(); c.ellipse(a.x, a.y, 4 + 7 * prog, 2 + 3.5 * prog, 0, 0, Math.PI * 2); c.fill();
    if (a.state === 'falling') {
      c.fillStyle = '#ff6a00';
      c.beginPath(); c.arc(a.x, cy2 - 14, 10, Math.PI, 0); c.fill();
      c.fillStyle = '#c24e00'; c.fillRect(a.x - 10, cy2 - 14, 20, 2);
      c.strokeStyle = 'rgba(200,200,210,0.7)';
      c.beginPath();
      c.moveTo(a.x - 9, cy2 - 13); c.lineTo(a.x - 5, cy2 - 3);
      c.moveTo(a.x + 9, cy2 - 13); c.lineTo(a.x + 5, cy2 - 3);
      c.stroke();
      c.drawImage(SPR.crate, a.x - 6, cy2 - 4);
    } else {
      c.fillStyle = '#5a2c0c'; c.fillRect(a.x - 7, a.y - 9, 14, 11);
      c.fillStyle = '#ff6a00'; c.fillRect(a.x - 7, a.y - 9, 14, 2); c.fillRect(a.x - 1, a.y - 9, 2, 11);
      c.fillStyle = '#2c1606'; c.fillRect(a.x - 7, a.y + 1, 14, 1);
      if ((G.frame / 12 | 0) % 2) { c.fillStyle = '#ffd27a'; c.fillRect(a.x - 6, a.y - 8, 1, 1); }
    }
  }
  // player
  if (G.state !== 'dead' && !G.driving && indoorAt(p.x, p.y) === indoor) {
    const pedSpr = (G.skin !== null && G.skin !== undefined) ? SPR.playerCiv(G.skin, G.gender) : (SPR.player[G.gender] || SPR.player.m);
    for (const tr of p.trail) drawPed(c, pedSpr, tr.face, tr.flip, 0, tr.x, tr.y, tr.t * 1.2);
    drawPed(c, pedSpr, p.face, p.flip, p.moving ? Math.floor(p.anim) : 0, p.x, p.y, p.camoT > 0 ? 0.25 : G.pHidden ? 0.8 : 1);
    if (p.camoT <= 0) {
      const prof = playerProfile();
      if (G.gang) drawGangWorldLabel(c, prof.gang, prof.gangIcon, prof.gangIconCol, p.x, p.y - 43, prof.gangIconCol || '#00ff9f');
      drawWorldTextC(c, trunc(cleanPlayerName(G.playerName), 10), p.x, p.y - 32, '#f9f002', 0.62);
    }
    // held gun
    const w = curWpn();
    if (w && !MELEE_CLS[w.cls] && p.camoT <= 0) {
      const len = { pistol: 6, revolver: 7, smg: 8, rifle: 10, shotgun: 9, sniper: 12, lmg: 11, launcher: 8 }[w.cls] || 7;
      c.save(); c.translate(p.x, p.y - 4); c.rotate(p.aim);
      c.fillStyle = '#1a1c24'; c.fillRect(2, 0, len, 2);
      c.fillStyle = KIND_COL[w.kind]; c.fillRect(2 + len - 2, 0, 2, 1);
      c.restore();
    }
  }
  // slashes
  for (const s of G.slashes) {
    if (indoorAt(s.x, s.y) !== indoor) continue;
    c.strokeStyle = s.col; c.globalAlpha = clamp(s.t / (s.dur || 0.16), 0, 1); c.lineWidth = 2;
    c.beginPath(); c.arc(s.x, s.y - 3, s.range, s.a - 0.9, s.a + 0.9); c.stroke();
    c.globalAlpha = 1; c.lineWidth = 1;
  }
  // bullets
  for (const b of G.bullets) {
    if (indoorAt(b.x, b.y) !== indoor) continue;
    c.strokeStyle = b.col; c.lineWidth = b.from === 'p' ? 1.5 : 1;
    c.beginPath(); c.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02); c.lineTo(b.x, b.y); c.stroke();
  }
  c.lineWidth = 1;
  // particles
  for (const pa of G.parts) {
    if (indoorAt(pa.x, pa.y) !== indoor) continue;
    c.fillStyle = pa.col; c.fillRect(pa.x, pa.y, pa.sz, pa.sz);
  }
}

function render() {
  const c = C;
  c.fillStyle = '#06060a'; c.fillRect(0, 0, VIEW_W, VIEW_H);
  if (G.state === 'title') { drawTitle(c); drawScanOverlay(c); return; }
  const p = G.p, camX = Math.round(G.cam.x), camY = Math.round(G.cam.y);
  c.save();
  c.scale(WORLD_ZOOM, WORLD_ZOOM);
  c.translate(-camX, -camY);
  // ground
  const wv_w = VIEW_W / WORLD_ZOOM;
  const wv_h = VIEW_H / WORLD_ZOOM;
  prepRenderView(camX, camY, wv_w, wv_h);
  const vis = G.vis;
  c.drawImage(WORLD.cv, camX, camY, wv_w, wv_h, camX, camY, wv_w, wv_h);

  // blood decals
  if (G.decals) {
    for (let i = 0; i < G.decals.length; i++) {
      const d = G.decals[i];
      if (d.x > camX - 30 && d.x < camX + wv_w + 30 && d.y > camY - 30 && d.y < camY + wv_h + 30) {
        if (d.rect) {
          c.fillStyle = d.col;
          c.fillRect(d.x - 1, d.y - 1, d.w, d.h);
        } else if (d.splatters) {
          for (let j = 0; j < d.splatters.length; j++) {
            const sp = d.splatters[j];
            c.fillStyle = sp.col;
            c.fillRect(d.x + sp.dx, d.y + sp.dy, sp.sz, sp.sz);
          }
          if (d.ellipse) {
            c.fillStyle = d.ellipse.col;
            c.beginPath();
            c.ellipse(d.x, d.y, d.ellipse.rx, d.ellipse.ry, 0, 0, Math.PI * 2);
            c.fill();
          }
        }
      }
    }
  }

  // market territories on the ground
  for (const m of WORLD.markets || []) {
    const mx = m.tx * TILE, my = m.ty * TILE;
    if (mx > camX - 200 && mx < camX + VIEW_W + 200 && my > camY - 200 && my < camY + VIEW_H + 200) {
      const state = G.marketStates && G.marketStates[m.id];
      let col = 'rgba(255,255,255,0.06)';
      let lineCol = 'rgba(255,255,255,0.12)';
      if (G.marketWarActive) {
        if (state && state.winner) {
          const isPlayerGang = (state.winner === playerProfile().gang);
          col = isPlayerGang ? 'rgba(0,255,159,0.04)' : 'rgba(255,42,109,0.04)';
          lineCol = isPlayerGang ? 'rgba(0,255,159,0.3)' : 'rgba(255,42,109,0.3)';
        } else if (state && state.members > 0) {
          col = 'rgba(249,240,2,0.04)';
          lineCol = 'rgba(249,240,2,0.3)';
        }
      }
      c.strokeStyle = lineCol;
      c.fillStyle = col;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(mx, my, m.r * TILE, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.lineWidth = 1;

      if (G.marketWarActive) {
        let label = 'CHIẾM GIỮ: ';
        if (state && state.winner) {
          label += state.winner;
        } else if (state && state.members > 0) {
          label += 'TRANH CHẤP (' + state.members + ')';
        } else {
          label += 'TRỐNG';
        }
        drawTextC(c, label, mx, my - 24, lineCol, 1);
      }
    }
  }

  // puddle shimmer
  for (const pd of WORLD.puddles) {
    if (!visible(pd.x, pd.y, 20)) continue;
    c.globalAlpha = 0.06 + 0.04 * Math.sin(G.rt * 2 + pd.x);
    c.fillStyle = pd.col;
    c.beginPath(); c.ellipse(pd.x, pd.y, pd.w / 2, pd.h / 2, 0, 0, Math.PI * 2); c.fill();
  }
  c.globalAlpha = 1;
  // crates & vends & displays
  for (const cr of vis.crates) c.drawImage(SPR.crate, cr.x - 6, cr.y - 6);
  for (const v of vis.vends) c.drawImage(SPR.vend, v.x - 6, v.y - 12);
  for (const d of vis.displays) c.drawImage(SPR.car(d.id), d.x - 8, d.y - 15);
  for (const b of vis.bushes) c.drawImage(SPR.bush(b.kind), b.x - 8, b.y - 10);
  // entities under roofs (indoors) — hidden until the roof fades
  drawWorldEntities(c, true);
  // roofs of enterable buildings (fade away when V is inside)
  for (const r of WORLD.roofs) {
    if (r.a < 0.02) continue;
    if (r.x > camX + VIEW_W + 8 || r.y > camY + VIEW_H + 8 || r.x + r.w < camX - 8 || r.y + r.h < camY - 8) continue;
    c.globalAlpha = r.a;
    c.drawImage(r.cv, r.x, r.y);
  }
  c.globalAlpha = 1;
  // neon signs sit on the exterior walls: drawn over the roof layer, fading with it indoors
  for (const s of vis.signs) {
    const flick = Math.random() < 0.02 ? 0.4 : 1;
    const rfA = s.roof != null && WORLD.roofs[s.roof] ? WORLD.roofs[s.roof].a : 1;
    c.globalAlpha = (0.75 + 0.25 * Math.sin(G.rt * 3 + s.x)) * flick * rfA;
    drawTextC(c, s.text, s.x, s.y, s.col, s.big ? 2 : 1);
    c.globalAlpha = 1;
  }
  // entities in the open air — in FRONT of facades and roofs, never covered by them
  drawWorldEntities(c, false);
  // foliage canopy: drawn back over entities so whoever stands in a bush is shrouded
  c.globalAlpha = 0.85;
  for (const b of vis.bushes) c.drawImage(SPR.bush(b.kind), b.x - 8, b.y - 10);
  c.globalAlpha = 1;
  // glow pass
  c.globalCompositeOperation = 'lighter';
  for (const g of G.glows) {
    c.globalAlpha = Math.min(1, g.t * 8);
    c.drawImage(SPR.glowS(g.col, Math.round(g.r)), g.x - g.r, g.y - g.r);
  }
  for (const s of vis.signs) {
    const rfA = s.roof != null && WORLD.roofs[s.roof] ? WORLD.roofs[s.roof].a : 1;
    const gr = s.big ? 32 : 22;
    c.globalAlpha = (s.big ? 0.22 : 0.16) + 0.05 * Math.sin(G.rt * 3 + s.x);
    c.globalAlpha *= rfA;
    c.drawImage(SPR.glowS(s.col, gr), s.x - gr, s.y - gr + 4);
  }
  for (const L of vis.lights) {
    c.globalAlpha = 0.25;
    c.drawImage(SPR.glowS('#ffd9a0', 10), L.x - 10, L.y - 10);
  }
  for (const v of vis.vends) {
    c.globalAlpha = 0.3 + 0.1 * Math.sin(G.rt * 2 + v.x);
    c.drawImage(SPR.glowS('#05d9e8', 12), v.x - 12, v.y - 16);
  }
  for (const r of WORLD.roofs) { // interior mood lights, revealed with the room
    if (r.a > 0.6 || !r.lights.length) continue;
    for (const L of r.lights) {
      c.globalAlpha = 0.32 * (1 - r.a);
      c.drawImage(SPR.glowS(L.col, 18), L.x - 18, L.y - 18);
    }
  }
  for (const cr of vis.crates) { // loot crates pulse so they read as breakable
    c.globalAlpha = 0.12 + 0.07 * Math.sin(G.rt * 3 + cr.x);
    c.drawImage(SPR.glowS('#f9f002', 9), cr.x - 9, cr.y - 13);
  }
  if (G.airdrop && visible(G.airdrop.x, G.airdrop.y, 80)) {
    c.globalAlpha = 0.4 + 0.1 * Math.sin(G.rt * 5);
    c.drawImage(SPR.glowS('#ff6a00', 14), G.airdrop.x - 14, G.airdrop.y - G.airdrop.alt - 18);
  }
  for (const b of G.bullets) {
    c.globalAlpha = 0.5;
    c.drawImage(SPR.glowS(b.col, 5), b.x - 5, b.y - 5);
  }
  if (G.car && !G.car.dead && G.driving) {
    const hx = Math.cos(G.car.a), hy = Math.sin(G.car.a);
    c.globalAlpha = 0.3;
    c.drawImage(SPR.glowS('#ffe9c0', 26), G.car.x + hx * 26 - 26, G.car.y + hy * 26 - 26);
  }
  for (const pk of vis.pickups) {
    c.globalAlpha = 0.35 + 0.15 * Math.sin(G.rt * 5);
    const col = pk.kind === 'wpn' ? RAR_COL[WPN[pk.id].rar] : pk.kind === 'ed' ? '#f9f002' : '#2ecc71';
    c.drawImage(SPR.glowS(col, 9), pk.x - 9, pk.y - 9);
  }
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  // holo billboards
  for (const h of vis.holos) {
    const bob = Math.sin(G.rt * 1.2 + h.x * 0.1) * 2;
    const hw = Math.max(34, textW(h.text) + 10);
    c.globalAlpha = 0.82 + 0.1 * Math.sin(G.rt * 7 + h.x);
    c.fillStyle = 'rgba(8,12,20,0.85)';
    c.fillRect(h.x - hw / 2, h.y - 30 + bob, hw, 13);
    c.strokeStyle = h.col; c.strokeRect(h.x - hw / 2 + 0.5, h.y - 30 + bob + 0.5, hw - 1, 12);
    drawTextC(c, h.text, h.x, h.y - 26 + bob, h.col, 1);
    c.globalAlpha = 1;
  }
  // floating combat text
  for (const tx of G.texts) drawText(c, tx.text, tx.x - 4, tx.y, tx.col, 1);
  c.restore();

  // screen-space overlays
  drawRain(c);
  if (G.flashT > 0) { c.fillStyle = 'rgba(200,220,255,' + (G.flashT * 0.35) + ')'; c.fillRect(0, 0, VIEW_W, VIEW_H); }
  if (G.os === 'sandevistan' && p.osT > 0) {
    c.fillStyle = 'rgba(0,255,159,0.07)'; c.fillRect(0, 0, VIEW_W, VIEW_H);
    c.fillStyle = '#00ff9f'; c.fillRect(0, 0, 3, VIEW_H); c.fillRect(VIEW_W - 3, 0, 3, VIEW_H);
  }
  if (G.os === 'berserk' && p.osT > 0) { c.fillStyle = 'rgba(255,42,60,0.08)'; c.fillRect(0, 0, VIEW_W, VIEW_H); }
  if (p.kzT > 0 && G.timeScale < 1 && !(G.os === 'sandevistan' && p.osT > 0)) { c.fillStyle = 'rgba(5,217,232,0.06)'; c.fillRect(0, 0, VIEW_W, VIEW_H); }
  if (p.camoT > 0) { c.strokeStyle = 'rgba(5,217,232,0.5)'; c.strokeRect(1.5, 1.5, VIEW_W - 3, VIEW_H - 3); }
  if (G.hurtT > 0) {
    const g = c.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H / 3, VIEW_W / 2, VIEW_H / 2, VIEW_W / 1.4);
    g.addColorStop(0, 'rgba(255,0,30,0)'); g.addColorStop(1, 'rgba(255,0,30,' + (0.3 * G.hurtT) + ')');
    c.fillStyle = g; c.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  if (G.state === 'dead') drawDead(c);
  else {
    drawHUD(c);
    if (!G.ui) drawCrosshair(c);
  }
  if (TOUCH.on) drawTouchControls(c);

  // fade-to-black interludes
  if (G.fade) {
    const a = Math.sin(Math.PI * Math.min(1, G.fade.t / G.fade.dur));
    c.fillStyle = 'rgba(4,2,8,' + (0.97 * a).toFixed(2) + ')';
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    if (a > 0.6) drawTextC(c, G.fade.label, VIEW_W / 2, 172, '#ff2a6d', 1);
  }

  drawScanOverlay(c);
}

// boot
if (!window.__NCPX_MANUAL_BOOT) window.addEventListener('load', boot);
window.__boot = boot;
window.__step = step;
window.startGame = startGame;

window.buyWeapon = buyWeapon;
window.buyCar = buyCar;
window.setActiveCar = setActiveCar;
window.buyCyber = buyCyber;
window.barSelect = barSelect;
window.talkSelect = talkSelect;
window.talkOptions = talkOptions;
window.buyWardrobeOutfit = buyWardrobeOutfit;
window.assignSlot = assignSlot;
window.drawPed = drawPed;
window.msg = msg;
window.saveGame = saveGame;
window.wipeSave = wipeSave;
window.nearestRemotePlayer = nearestRemotePlayer;
window.playerProfile = playerProfile;
window.sameGangProfile = sameGangProfile;
window.gangLabel = gangLabel;
window.gangIconObj = gangIconObj;
window.factionColor = factionColor;
window.cleanPlayerName = cleanPlayerName;
