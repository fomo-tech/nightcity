const { createServer: createHttpServer } = require('http');
const { createServer: createProbeServer } = require('net');
const next = require('next');
const { WebSocketServer } = require('ws');
const os = require('os');

// Prevent server crashes from harmless TCP connection resets (browser tab close, mobile network switch, etc.)
process.on('uncaughtException', (err) => {
  if (err.code === 'ECONNRESET' || err.code === 'EPIPE') return;
  console.error('[Fatal]', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection]', reason);
});


function getLocalIp() {
  const nets = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      const isIPv4 = net.family === 'IPv4' || net.family === 4;
      if (isIPv4 && !net.internal) {
        let score = 0;
        const lowerName = name.toLowerCase();
        if (lowerName.startsWith('en') || lowerName.startsWith('wlan') || lowerName.startsWith('eth')) {
          score = 10;
        } else if (lowerName.includes('docker') || lowerName.includes('vbox') || lowerName.includes('vmnet') || lowerName.includes('vpn')) {
          score = -10;
        }
        candidates.push({ address: net.address, score });
      }
    }
  }
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].address;
  }
  return '127.0.0.1';
}

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 3000);
const maxPort = port + 10;

function cleanText(value, fallback, max) {
  return String(value || fallback).replace(/[^\p{L}\p{N}_ -]/gu, '').trim().slice(0, max) || fallback;
}

function cleanIcon(value, fallback) {
  return String(value || fallback || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 4) || fallback || '';
}

function cleanRoom(value) {
  return String(value || 'default').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'default';
}

function cleanColor(value, fallback) {
  const s = String(value || fallback || '').trim();
  return /^#[0-9a-f]{6}$/i.test(s) ? s : fallback;
}

function canListen(nextPort) {
  return new Promise((resolve, reject) => {
    const probe = createProbeServer();
    probe.once('error', error => {
      if (error.code === 'EADDRINUSE') resolve(false);
      else reject(error);
    });
    probe.once('listening', () => probe.close(() => resolve(true)));
    probe.listen(nextPort, hostname);
  });
}

async function findPort(startPort) {
  for (let nextPort = startPort; nextPort <= maxPort; nextPort++) {
    if (await canListen(nextPort)) return nextPort;
    console.log(`> Port ${nextPort} busy, trying ${nextPort + 1}`);
  }
  throw new Error(`No available port from ${startPort} to ${maxPort}`);
}

async function main() {
  const actualPort = await findPort(port);
  const localIp = getLocalIp();
  const app = next({ dev, hostname: localIp, port: actualPort, ...(dev ? { webpack: true } : {}) });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server = createHttpServer((req, res) => handle(req, res));
  const wss = new WebSocketServer({ noServer: true });
  const players = new Map();
  const rooms = new Map();
  const roomMeta = new Map();
  const PLAYER_STALE_MS = 6000;
  const HEARTBEAT_MS = 2000;

  function roomPlayers(room) {
    if (!rooms.has(room)) rooms.set(room, new Set());
    if (!roomMeta.has(room)) roomMeta.set(room, { hostId: null, npcSnapshot: null });
    return rooms.get(room);
  }

  function roomInfo(room) {
    if (!roomMeta.has(room)) roomMeta.set(room, { hostId: null, npcSnapshot: null });
    return roomMeta.get(room);
  }

  function electHost(roomName) {
    const ids = rooms.get(roomName) || new Set();
    const meta = roomInfo(roomName);
    // Dead players (hp=0) cannot be host — they may be in a death screen and not sending npcState
    const currentP = meta.hostId ? players.get(meta.hostId) : null;
    if (meta.hostId && ids.has(meta.hostId) && currentP && currentP.hp > 0) return meta.hostId;
    const oldHost = meta.hostId;
    // Prefer an alive player; fall back to any player in the room
    const aliveId = [...ids].find(id => { const p = players.get(id); return p && p.hp > 0; });
    meta.hostId = aliveId || ids.values().next().value || null;
    if (oldHost !== meta.hostId) meta.npcSnapshot = null;
    return meta.hostId;
  }

  function forgetPlayer(id) {
    const p = players.get(id);
    if (!p) return;
    players.delete(id);
    const room = rooms.get(p.room);
    if (room) {
      room.delete(id);
      if (room.size === 0) {
        rooms.delete(p.room);
        roomMeta.delete(p.room);
      } else {
        const prevHost = roomInfo(p.room).hostId;
        const newHostId = electHost(p.room);
        // Immediately notify new host so gang AI resumes without waiting for next broadcast cycle
        if (prevHost !== newHostId && newHostId) {
          const hw = [...wss.clients].find(c => c.playerId === newHostId && c.readyState === c.OPEN);
          if (hw) try { hw.send(JSON.stringify({ type: 'hostChanged', hostId: newHostId, isHost: true })); } catch (e) {}
        }
      }
    }
  }

  function broadcast(roomName) {
    const ids = rooms.get(roomName) || new Set();
    const prevHost = roomInfo(roomName).hostId;
    const newHostId = electHost(roomName);
    // When host changes (e.g. old host died), immediately notify new host so gang AI resumes instantly
    if (prevHost !== newHostId && newHostId) {
      const hw = [...wss.clients].find(c => c.playerId === newHostId && c.readyState === c.OPEN);
      if (hw) try { hw.send(JSON.stringify({ type: 'hostChanged', hostId: newHostId, isHost: true })); } catch (e) {}
    }
    const payload = JSON.stringify({
      type: 'players',
      room: roomName,
      hostId: newHostId,
      serverT: Date.now(),
      players: [...ids].map(id => players.get(id)).filter(p => p && p.hp > 0).map(p => ({
        id: p.id, name: p.name, gang: p.gang, gangKey: p.gangKey, gangIcon: p.gangIcon, gangIconCol: p.gangIconCol, x: p.x, y: p.y, vx: p.vx || 0, vy: p.vy || 0, face: p.face, flip: p.flip, hp: p.hp, seq: p.seq, t: p.lastSeen, isLeader: p.isLeader, act: p.act || null,
      })),
    });
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN && client.room === roomName) {
        try { client.send(payload); } catch (e) {}
      }
    }
  }

  function cleanFxShots(value, fallbackCol) {
    return Array.isArray(value) ? value.slice(0, 12).map(sh => ({
      x: Number.isFinite(Number(sh && sh.x)) ? Number(sh.x) : 0,
      y: Number.isFinite(Number(sh && sh.y)) ? Number(sh.y) : 0,
      vx: Number.isFinite(Number(sh && sh.vx)) ? Math.max(-1200, Math.min(1200, Number(sh.vx))) : 0,
      vy: Number.isFinite(Number(sh && sh.vy)) ? Math.max(-1200, Math.min(1200, Number(sh.vy))) : 0,
      life: Math.max(0.2, Math.min(1.5, Number(sh && sh.life) || 0.75)),
      col: cleanColor(sh && sh.col, fallbackCol),
    })).filter(sh => sh.vx || sh.vy) : [];
  }

  server.on('upgrade', (req, socket, head) => {
    if (req.url.startsWith('/ws')) {
      wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
    } else if (req.url.startsWith('/_next/')) {
      // Pass HMR WebSockets to Next.js
      if (app && typeof app.getUpgradeHandler === 'function') {
        app.getUpgradeHandler()(req, socket, head);
      }
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws, req) => {
    const id = Math.random().toString(36).slice(2, 10);
    let room = 'default';
    try {
      const url = new URL(req.url, 'http://localhost');
      room = cleanRoom(url.searchParams.get('room'));
    } catch (error) {}
    players.set(id, { id, room, name: 'MERC', gang: 'SOLO', gangKey: 'solo', gangIcon: '', gangIconCol: '#8a93a6', x: 0, y: 0, vx: 0, vy: 0, face: 'down', flip: false, hp: 100, isLeader: false, seq: 0, lastSeen: Date.now() });
    roomPlayers(room).add(id);
    const hostId = electHost(room);
    ws.playerId = id;
    ws.room = room;
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('error', err => {
      if (err.code !== 'ECONNRESET' && err.code !== 'EPIPE') {
        console.error(`[WS Error] Player ${id}:`, err);
      }
    });
    ws.send(JSON.stringify({ type: 'hello', id, room, hostId, isHost: hostId === id }));
    const cachedNpc = roomInfo(room).npcSnapshot;
    if (cachedNpc && hostId !== id) ws.send(JSON.stringify(cachedNpc));
    broadcast(room);

    ws.on('message', raw => {
      let msg = null;
      try { msg = JSON.parse(raw.toString()); } catch (error) { return; }
      const p = players.get(id);
      if (!p || !msg) return;
      if (msg.type === 'invite') {
        const to = cleanText(msg.to, '', 18);
        const target = [...wss.clients].find(client => client.playerId === to && client.room === p.room && client.readyState === client.OPEN);
        if (target) try { target.send(JSON.stringify({
          type: 'invite',
          from: id,
          fromName: p.name,
          gang: cleanText(msg.gang || p.gang, p.gang, 18).toUpperCase(),
          gangKey: cleanText(msg.gangKey || p.gangKey, p.gangKey, 18).toLowerCase(),
          gangIcon: cleanIcon(msg.gangIcon || p.gangIcon, p.gangIcon),
          gangIconCol: cleanColor(msg.gangIconCol || p.gangIconCol, p.gangIconCol),
        })); } catch (e) {}
        return;
      }
      if (msg.type === 'joinRequest') {
        const to = cleanText(msg.to, '', 18);
        const target = [...wss.clients].find(client => client.playerId === to && client.room === p.room && client.readyState === client.OPEN);
        if (target) try { target.send(JSON.stringify({
          type: 'joinRequest',
          from: id,
          fromName: p.name,
          gang: cleanText(msg.gang || p.gang, p.gang, 18).toUpperCase(),
        })); } catch (e) {}
        return;
      }
      if (msg.type === 'hit') {
        const to = cleanText(msg.to, '', 18);
        const target = [...wss.clients].find(client => client.playerId === to && client.room === p.room && client.readyState === client.OPEN);
        if (target) try { target.send(JSON.stringify({
          type: 'damage',
          from: id,
          fromName: p.name,
          dmg: Math.max(0, Math.min(999, Number(msg.dmg) || 0)),
          crit: !!msg.crit,
          weapon: cleanText(msg.weapon, 'WEAPON', 24).toUpperCase(),
        })); } catch (e) {}
        return;
      }
      if (msg.type === 'combatFx') {
        const kind = msg.kind === 'melee' ? 'melee' : msg.kind === 'fire' ? 'fire' : '';
        if (!kind) return;
        const payload = JSON.stringify({
          type: 'combatFx',
          from: id,
          kind,
          x: Number.isFinite(Number(msg.x)) ? Number(msg.x) : p.x,
          y: Number.isFinite(Number(msg.y)) ? Number(msg.y) : p.y,
          a: Number.isFinite(Number(msg.a)) ? Number(msg.a) : 0,
          pellets: Math.max(1, Math.min(12, Math.round(Number(msg.pellets) || 1))),
          spread: Math.max(0, Math.min(35, Number(msg.spread) || 0)),
          spd: Math.max(80, Math.min(900, Number(msg.spd) || 360)),
          range: Math.max(8, Math.min(64, Number(msg.range) || 24)),
          col: cleanColor(msg.col, kind === 'melee' ? '#dfe6f2' : '#ffe9a0'),
          shots: cleanFxShots(msg.shots, cleanColor(msg.col, '#ffe9a0')),
        });
        for (const client of wss.clients) {
          if (client.readyState === client.OPEN && client.room === p.room && client.playerId !== id) {
            try { client.send(payload); } catch (e) {}
          }
        }
        return;
      }
      if (msg.type === 'playerDrop') {
        const drops = Array.isArray(msg.drops) ? msg.drops.slice(0, 4).map(d => ({
          kind: d && d.kind === 'wpn' ? 'wpn' : 'ed',
          id: cleanText(d && d.id, '', 32),
          amt: Math.max(0, Math.min(9999999, Math.round(Number(d && d.amt) || 0))),
          x: Number.isFinite(Number(d && d.x)) ? Number(d.x) : p.x,
          y: Number.isFinite(Number(d && d.y)) ? Number(d.y) : p.y,
        })).filter(d => d.kind === 'wpn' ? d.id : d.amt > 0) : [];
        if (!drops.length) return;
        const payload = JSON.stringify({
          type: 'playerDrop',
          from: id,
          fromName: p.name,
          x: Number.isFinite(Number(msg.x)) ? Number(msg.x) : p.x,
          y: Number.isFinite(Number(msg.y)) ? Number(msg.y) : p.y,
          drops,
        });
        for (const client of wss.clients) {
          if (client.readyState === client.OPEN && client.room === p.room) {
            try { client.send(payload); } catch (e) {}
          }
        }
        return;
      }
      if (msg.type === 'npcState') {
        if (roomInfo(p.room).hostId !== id) return;
        const state = {
          type: 'npcState',
          from: id,
          seq: Number(msg.seq) || 0,
          enemies: Array.isArray(msg.enemies) ? msg.enemies.slice(0, 80) : [],
          civs: Array.isArray(msg.civs) ? msg.civs.slice(0, 16) : [],
        };
        roomInfo(p.room).npcSnapshot = state;
        const payload = JSON.stringify(state);
        for (const client of wss.clients) {
          if (client.readyState === client.OPEN && client.room === p.room && client.playerId !== id) {
            try { client.send(payload); } catch (e) {}
          }
        }
        return;
      }
      if (msg.type === 'npcHit') {
        const hostId = roomInfo(p.room).hostId;
        if (!hostId || hostId === id) return;
        const target = [...wss.clients].find(client => client.playerId === hostId && client.room === p.room && client.readyState === client.OPEN);
        if (target) try { target.send(JSON.stringify({
          type: 'npcHit',
          from: id,
          enemyId: cleanText(msg.enemyId, '', 24),
          dmg: Math.max(0, Math.min(9999, Number(msg.dmg) || 0)),
          crit: !!msg.crit,
          dir: Number.isFinite(Number(msg.dir)) ? Number(msg.dir) : 0,
          kb: Math.max(0, Math.min(1000, Number(msg.kb) || 0)),
          burn: Number.isFinite(Number(msg.burn)) ? Number(msg.burn) : 0,
        })); } catch (e) {}
        return;
      }
      if (msg.type !== 'state') return;
      p.name = cleanText(msg.name, 'MERC', 18).toUpperCase();
      p.gang = cleanText(msg.gang, 'SOLO', 18).toUpperCase();
      p.gangKey = cleanText(msg.gangKey, 'solo', 18).toLowerCase();
      p.gangIcon = cleanIcon(msg.gangIcon, '');
      p.gangIconCol = cleanColor(msg.gangIconCol, '#8a93a6');
      p.x = Number.isFinite(msg.x) ? msg.x : p.x;
      p.y = Number.isFinite(msg.y) ? msg.y : p.y;
      p.vx = Number.isFinite(Number(msg.vx)) ? Math.max(-800, Math.min(800, Number(msg.vx))) : p.vx;
      p.vy = Number.isFinite(Number(msg.vy)) ? Math.max(-800, Math.min(800, Number(msg.vy))) : p.vy;
      p.face = ['down', 'up', 'side'].includes(msg.face) ? msg.face : p.face;
      p.flip = !!msg.flip;
      p.hp = Number.isFinite(Number(msg.hp)) ? Math.max(0, Math.min(999, Number(msg.hp))) : p.hp;
      if (msg.act && (msg.act.kind === 'fire' || msg.act.kind === 'melee')) {
        p.act = {
          seq: Math.max(0, Math.min(1000000, Math.round(Number(msg.act.seq) || p.seq))),
          kind: msg.act.kind,
          x: Number.isFinite(Number(msg.act.x)) ? Number(msg.act.x) : p.x,
          y: Number.isFinite(Number(msg.act.y)) ? Number(msg.act.y) : p.y,
          a: Number.isFinite(Number(msg.act.a)) ? Number(msg.act.a) : 0,
          pellets: Math.max(1, Math.min(12, Math.round(Number(msg.act.pellets) || 1))),
          spread: Math.max(0, Math.min(35, Number(msg.act.spread) || 0)),
          spd: Math.max(80, Math.min(900, Number(msg.act.spd) || 360)),
          range: Math.max(8, Math.min(64, Number(msg.act.range) || 24)),
          col: cleanColor(msg.act.col, msg.act.kind === 'melee' ? '#dfe6f2' : '#ffe9a0'),
          shots: cleanFxShots(msg.act.shots, cleanColor(msg.act.col, '#ffe9a0')),
        };
      } else p.act = null;
      p.isLeader = !!msg.isLeader;
      p.seq = (p.seq + 1) % 1000000;
      p.lastSeen = Date.now();
      broadcast(p.room);
    });

    ws.on('close', () => { const p = players.get(id); forgetPlayer(id); if (p) broadcast(p.room); });
  });

  setInterval(() => {
    const now = Date.now();
    const changed = new Set();
    for (const [id, p] of players) {
      const ws = [...wss.clients].find(client => client.playerId === id);
      if (ws && ws.readyState === ws.OPEN) continue;
      if (now - p.lastSeen > PLAYER_STALE_MS) {
        changed.add(p.room);
        forgetPlayer(id);
      }
    }
    // Only broadcast rooms that actually had stale-player changes (not ALL rooms every 500ms)
    for (const room of changed) broadcast(room);
  }, 500);

  setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        const p = players.get(ws.playerId);
        forgetPlayer(ws.playerId);
        if (p) broadcast(p.room);
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      try { ws.ping(); } catch (error) {}
    }
  }, HEARTBEAT_MS);

  server.listen(actualPort, '0.0.0.0', () => {
    console.log(`> Ready locally on http://localhost:${actualPort}`);
    console.log(`> Test on mobile on http://${localIp}:${actualPort}`);
    console.log('> Realtime WebSocket on /ws');
  });
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
