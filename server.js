const { createServer: createHttpServer } = require('http');
const { createServer: createProbeServer } = require('net');
const next = require('next');
const { WebSocketServer } = require('ws');
const os = require('os');

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

  function roomPlayers(room) {
    if (!rooms.has(room)) rooms.set(room, new Set());
    if (!roomMeta.has(room)) roomMeta.set(room, { hostId: null });
    return rooms.get(room);
  }

  function roomInfo(room) {
    if (!roomMeta.has(room)) roomMeta.set(room, { hostId: null });
    return roomMeta.get(room);
  }

  function electHost(roomName) {
    const ids = rooms.get(roomName) || new Set();
    const meta = roomInfo(roomName);
    if (meta.hostId && ids.has(meta.hostId)) return meta.hostId;
    meta.hostId = ids.values().next().value || null;
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
        electHost(p.room);
      }
    }
  }

  function broadcast(roomName) {
    const ids = rooms.get(roomName) || new Set();
    const payload = JSON.stringify({
      type: 'players',
      room: roomName,
      hostId: electHost(roomName),
      serverT: Date.now(),
      players: [...ids].map(id => players.get(id)).filter(Boolean).map(p => ({
        id: p.id, name: p.name, gang: p.gang, gangKey: p.gangKey, gangIcon: p.gangIcon, gangIconCol: p.gangIconCol, x: p.x, y: p.y, face: p.face, flip: p.flip, hp: p.hp, seq: p.seq, t: p.lastSeen, isLeader: p.isLeader,
      })),
    });
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN && client.room === roomName) client.send(payload);
    }
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
    players.set(id, { id, room, name: 'MERC', gang: 'SOLO', gangKey: 'solo', gangIcon: '', gangIconCol: '#8a93a6', x: 0, y: 0, face: 'down', flip: false, hp: 100, isLeader: false, seq: 0, lastSeen: Date.now() });
    roomPlayers(room).add(id);
    const hostId = electHost(room);
    ws.playerId = id;
    ws.room = room;
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.send(JSON.stringify({ type: 'hello', id, room, hostId, isHost: hostId === id }));
    broadcast(room);

    ws.on('message', raw => {
      let msg = null;
      try { msg = JSON.parse(raw.toString()); } catch (error) { return; }
      const p = players.get(id);
      if (!p || !msg) return;
      if (msg.type === 'invite') {
        const to = cleanText(msg.to, '', 18);
        const target = [...wss.clients].find(client => client.playerId === to && client.room === p.room && client.readyState === client.OPEN);
        if (target) target.send(JSON.stringify({
          type: 'invite',
          from: id,
          fromName: p.name,
          gang: cleanText(msg.gang || p.gang, p.gang, 18).toUpperCase(),
          gangKey: cleanText(msg.gangKey || p.gangKey, p.gangKey, 18).toLowerCase(),
          gangIcon: cleanText(msg.gangIcon || p.gangIcon, p.gangIcon, 4).toUpperCase(),
          gangIconCol: cleanColor(msg.gangIconCol || p.gangIconCol, p.gangIconCol),
        }));
        return;
      }
      if (msg.type === 'joinRequest') {
        const to = cleanText(msg.to, '', 18);
        const target = [...wss.clients].find(client => client.playerId === to && client.room === p.room && client.readyState === client.OPEN);
        if (target) target.send(JSON.stringify({
          type: 'joinRequest',
          from: id,
          fromName: p.name,
          gang: cleanText(msg.gang || p.gang, p.gang, 18).toUpperCase(),
        }));
        return;
      }
      if (msg.type === 'hit') {
        const to = cleanText(msg.to, '', 18);
        const target = [...wss.clients].find(client => client.playerId === to && client.room === p.room && client.readyState === client.OPEN);
        if (target) target.send(JSON.stringify({
          type: 'damage',
          from: id,
          fromName: p.name,
          dmg: Math.max(0, Math.min(999, Number(msg.dmg) || 0)),
          crit: !!msg.crit,
          weapon: cleanText(msg.weapon, 'WEAPON', 24).toUpperCase(),
        }));
        return;
      }
      if (msg.type === 'npcState') {
        if (roomInfo(p.room).hostId !== id) return;
        const payload = JSON.stringify({
          type: 'npcState',
          from: id,
          seq: Number(msg.seq) || 0,
          enemies: Array.isArray(msg.enemies) ? msg.enemies.slice(0, 80) : [],
          civs: Array.isArray(msg.civs) ? msg.civs.slice(0, 16) : [],
        });
        for (const client of wss.clients) {
          if (client.readyState === client.OPEN && client.room === p.room && client.playerId !== id) client.send(payload);
        }
        return;
      }
      if (msg.type === 'npcHit') {
        const hostId = roomInfo(p.room).hostId;
        if (!hostId || hostId === id) return;
        const target = [...wss.clients].find(client => client.playerId === hostId && client.room === p.room && client.readyState === client.OPEN);
        if (target) target.send(JSON.stringify({
          type: 'npcHit',
          from: id,
          enemyId: cleanText(msg.enemyId, '', 24),
          dmg: Math.max(0, Math.min(9999, Number(msg.dmg) || 0)),
          crit: !!msg.crit,
          dir: Number.isFinite(Number(msg.dir)) ? Number(msg.dir) : 0,
          kb: Math.max(0, Math.min(1000, Number(msg.kb) || 0)),
          burn: Number.isFinite(Number(msg.burn)) ? Number(msg.burn) : 0,
        }));
        return;
      }
      if (msg.type !== 'state') return;
      p.name = cleanText(msg.name, 'MERC', 18).toUpperCase();
      p.gang = cleanText(msg.gang, 'SOLO', 18).toUpperCase();
      p.gangKey = cleanText(msg.gangKey, 'solo', 18).toLowerCase();
      p.gangIcon = cleanText(msg.gangIcon, '', 4).toUpperCase();
      p.gangIconCol = cleanColor(msg.gangIconCol, '#8a93a6');
      p.x = Number.isFinite(msg.x) ? msg.x : p.x;
      p.y = Number.isFinite(msg.y) ? msg.y : p.y;
      p.face = ['down', 'up', 'side'].includes(msg.face) ? msg.face : p.face;
      p.flip = !!msg.flip;
      p.hp = Number.isFinite(Number(msg.hp)) ? Math.max(0, Math.min(999, Number(msg.hp))) : p.hp;
      p.isLeader = !!msg.isLeader;
      p.seq = (p.seq + 1) % 1000000;
      p.lastSeen = Date.now();
    });

    ws.on('close', () => { const p = players.get(id); forgetPlayer(id); if (p) broadcast(p.room); });
  });

  setInterval(() => {
    const now = Date.now();
    const changed = new Set();
    for (const [id, p] of players) {
      const ws = [...wss.clients].find(client => client.playerId === id);
      if (ws && ws.readyState === ws.OPEN) continue;
      if (now - p.lastSeen > 45000) {
        changed.add(p.room);
        forgetPlayer(id);
      }
    }
    for (const room of rooms.keys()) broadcast(room);
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
  }, 10000);

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
