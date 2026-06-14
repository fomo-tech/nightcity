const { createServer: createHttpServer } = require('http');
const { createServer: createProbeServer } = require('net');
const next = require('next');
const { WebSocketServer } = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 3000);
const maxPort = port + 10;

function cleanText(value, fallback, max) {
  return String(value || fallback).replace(/[^\p{L}\p{N}_ -]/gu, '').trim().slice(0, max) || fallback;
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
  const app = next({ dev, hostname, port: actualPort, ...(dev ? { webpack: true } : {}) });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server = createHttpServer((req, res) => handle(req, res));
  const wss = new WebSocketServer({ noServer: true });
  const players = new Map();

  function broadcast() {
    const payload = JSON.stringify({
      type: 'players',
      players: [...players.values()].map(p => ({
        id: p.id, name: p.name, gang: p.gang, x: p.x, y: p.y, face: p.face, flip: p.flip, hp: p.hp, t: Date.now(),
      })),
    });
    for (const client of wss.clients) if (client.readyState === client.OPEN) client.send(payload);
  }

  server.on('upgrade', (req, socket, head) => {
    if (!req.url.startsWith('/ws')) return socket.destroy();
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
  });

  wss.on('connection', ws => {
    const id = Math.random().toString(36).slice(2, 10);
    players.set(id, { id, name: 'MERC', gang: 'SOLO', x: 0, y: 0, face: 'down', flip: false, hp: 100, lastSeen: Date.now() });
    ws.playerId = id;
    ws.send(JSON.stringify({ type: 'hello', id }));
    broadcast();

    ws.on('message', raw => {
      let msg = null;
      try { msg = JSON.parse(raw.toString()); } catch (error) { return; }
      const p = players.get(id);
      if (!p || !msg) return;
      if (msg.type === 'invite') {
        const to = cleanText(msg.to, '', 18);
        const target = [...wss.clients].find(client => client.playerId === to && client.readyState === client.OPEN);
        if (target) target.send(JSON.stringify({
          type: 'invite',
          from: id,
          fromName: p.name,
          gang: cleanText(msg.gang || p.gang, p.gang, 18).toUpperCase(),
        }));
        return;
      }
      if (msg.type !== 'state') return;
      p.name = cleanText(msg.name, 'MERC', 18).toUpperCase();
      p.gang = cleanText(msg.gang, 'SOLO', 18).toUpperCase();
      p.x = Number.isFinite(msg.x) ? msg.x : p.x;
      p.y = Number.isFinite(msg.y) ? msg.y : p.y;
      p.face = ['down', 'up', 'side'].includes(msg.face) ? msg.face : p.face;
      p.flip = !!msg.flip;
      p.hp = Math.max(0, Math.min(999, Number(msg.hp) || p.hp));
      p.lastSeen = Date.now();
    });

    ws.on('close', () => { players.delete(id); broadcast(); });
  });

  setInterval(() => {
    const now = Date.now();
    for (const [id, p] of players) if (now - p.lastSeen > 15000) players.delete(id);
    broadcast();
  }, 250);

  server.listen(actualPort, hostname, () => {
    console.log(`> Ready on http://${hostname}:${actualPort}`);
    console.log('> Realtime WebSocket on /ws');
  });
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
