const fs = require('fs');
const vm = require('vm');

global.window = global;
global.addEventListener = () => {};
global.removeEventListener = () => {};
const ctxHandler = {
  get(t, k) {
    if (k === Symbol.toPrimitive) return () => '[ctx]';
    if (!(k in t)) t[k] = (...args) => new Proxy({}, ctxHandler);
    return t[k];
  },
  set(t, k, v) { t[k] = v; return true; },
};
function makeCanvas() {
  return {
    width: 0, height: 0, style: {},
    getContext: () => new Proxy({}, ctxHandler),
    addEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 360 }),
  };
}
global.document = {
  createElement: () => makeCanvas(),
  getElementById: () => makeCanvas(),
};
global.AudioContext = class {};

const files = [
  'js/font.js',
  'js/i18n.js',
  'js/data.js',
  'js/sfx.js',
  'js/sprites.js',
  'js/world.js',
  'js/game.js'
];

let code = '';
for (const f of files) {
  code += fs.readFileSync(f, 'utf8') + '\n';
}

const sandbox = vm.createContext(global);
vm.runInContext(code, sandbox);

const WORLD = vm.runInContext('genWorld()', sandbox);
console.log('npcs count:', WORLD.npcs.length);
for (const n of WORLD.npcs) {
  const tileVal = WORLD.tileAt(n.x, n.y);
  console.log(`NPC: ${n.name}, kind: ${n.kind}, x: ${n.x}, y: ${n.y}, tileVal: ${tileVal}, indoorAt: ${tileVal >= 5}`);
}
