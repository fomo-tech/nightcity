'use strict';
// Tiny proportional bitmap font (5px tall). All in-game text uses this so it stays pixel-pure.
const GLYPHS = {
  ' ': ['00','00','00','00','00'],
  'A': ['010','101','111','101','101'],
  'B': ['110','101','110','101','110'],
  'C': ['011','100','100','100','011'],
  'D': ['110','101','101','101','110'],
  'E': ['111','100','110','100','111'],
  'F': ['111','100','110','100','100'],
  'G': ['011','100','100','101','011'],
  'H': ['101','101','111','101','101'],
  'I': ['111','010','010','010','111'],
  'J': ['011','001','001','101','010'],
  'K': ['101','101','110','101','101'],
  'L': ['100','100','100','100','111'],
  'M': ['10001','11011','10101','10001','10001'],
  'N': ['1001','1101','1011','1001','1001'],
  'O': ['010','101','101','101','010'],
  'P': ['110','101','110','100','100'],
  'Q': ['010','101','101','011','001'],
  'R': ['110','101','110','101','101'],
  'S': ['011','100','010','001','110'],
  'T': ['111','010','010','010','010'],
  'U': ['101','101','101','101','111'],
  'V': ['101','101','101','101','010'],
  'W': ['10001','10001','10101','11011','10001'],
  'X': ['101','101','010','101','101'],
  'Y': ['101','101','010','010','010'],
  'Z': ['111','001','010','100','111'],
  '0': ['111','101','101','101','111'],
  '1': ['010','110','010','010','111'],
  '2': ['111','001','111','100','111'],
  '3': ['111','001','111','001','111'],
  '4': ['101','101','111','001','001'],
  '5': ['111','100','111','001','111'],
  '6': ['111','100','111','101','111'],
  '7': ['111','001','001','010','010'],
  '8': ['111','101','111','101','111'],
  '9': ['111','101','111','001','111'],
  '.': ['0','0','0','0','1'],
  ',': ['00','00','00','01','10'],
  ':': ['0','1','0','1','0'],
  ';': ['00','01','00','01','10'],
  '!': ['1','1','1','0','1'],
  '?': ['111','001','011','000','010'],
  "'": ['1','1','0','0','0'],
  '"': ['101','101','000','000','000'],
  '-': ['000','000','111','000','000'],
  '—': ['00000','00000','11111','00000','00000'],
  '×': ['000','101','010','101','000'],
  '_': ['000','000','000','000','111'],
  '+': ['000','010','111','010','000'],
  '/': ['001','001','010','100','100'],
  '\\': ['100','100','010','001','001'],
  '(': ['01','10','10','10','01'],
  ')': ['10','01','01','01','10'],
  '[': ['11','10','10','10','11'],
  ']': ['11','01','01','01','11'],
  '<': ['001','010','100','010','001'],
  '>': ['100','010','001','010','100'],
  '=': ['000','111','000','111','000'],
  '%': ['101','001','010','100','101'],
  '$': ['011','110','010','011','110'],
  '€': ['011','110','100','110','011'],
  '#': ['101','111','101','111','101'],
  '&': ['010','101','010','101','011'],
  '*': ['000','101','010','101','000'],
  '@': ['010','101','111','100','011'],
  '|': ['1','1','1','1','1'],
  '★': ['010','111','010','101','101'],
  '♥': ['000','101','111','010','000'],
  '·': ['000','000','010','000','000'],
  'Đ': ['110','101','111','101','110'],
};
const _NOGLYPH = ['111','101','101','101','111'];

function isCombiningMark(ch) {
  const code = ch.charCodeAt(0);
  return code >= 0x0300 && code <= 0x036F;
}

function glyphOf(ch) {
  return GLYPHS[ch] || GLYPHS[ch.toUpperCase()] || _NOGLYPH;
}

function pixelTextOnly(s) {
  return false;
}

function textW(s, sc) {
  s = localText(s).toUpperCase();
  sc = sc || 1;
  if (typeof document !== 'undefined') {
    try {
      const cv = document.createElement('canvas');
      const c = cv.getContext('2d');
      c.font = gameFont(sc);
      const m = c.measureText(s);
      if (m && typeof m.width === 'number') {
        return Math.ceil(m.width);
      }
    } catch (e) {}
  }
  return Math.ceil(s.length * GAME_FONT_BASE * sc);
}

const _txtCache = new Map();
const GAME_FONT_FAMILY = '"Chakra Petch", "Orbitron", "Share Tech Mono", "Segoe UI", Arial, sans-serif';
const GAME_FONT_BASE = 12;
const gameFont = sc => '900 ' + Math.max(GAME_FONT_BASE, GAME_FONT_BASE * sc) + 'px ' + GAME_FONT_FAMILY;

if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => _txtCache.clear()).catch(() => {});
}

function localText(s) {
  s = String(s);
  try {
    if (window.NCPX_I18N && window.NCPX_I18N.text) return window.NCPX_I18N.text(s);
  } catch (e) {}
  return s;
}

function drawCombiningMarks(c, marks, cx, lastX, lastW, sc) {
  const hasCircumflex = marks.includes('\u0302');
  const hasBreve = marks.includes('\u0306');
  const hasHorn = marks.includes('\u031B');
  const hasDotBelow = marks.includes('\u0323');
  
  const hasAcute = marks.includes('\u0301');
  const hasGrave = marks.includes('\u0300');
  const hasHook = marks.includes('\u0309');
  const hasTilde = marks.includes('\u0303');
  
  if (hasDotBelow) {
    c.fillRect(cx, 7 * sc, sc, sc);
  }
  
  if (hasHorn) {
    c.fillRect(lastX + lastW * sc, 1 * sc, sc, sc);
    c.fillRect(lastX + lastW * sc, 2 * sc, sc, sc);
  }
  
  if (hasCircumflex && (hasAcute || hasGrave || hasHook || hasTilde)) {
    c.fillRect(cx - sc, 1 * sc, sc, sc);
    c.fillRect(cx + sc, 1 * sc, sc, sc);
    if (hasAcute) {
      c.fillRect(cx + sc, 0, sc, sc);
    } else if (hasGrave) {
      c.fillRect(cx - sc, 0, sc, sc);
    } else if (hasHook) {
      c.fillRect(cx, 0, sc, sc);
      c.fillRect(cx + sc, 0, sc, sc);
    } else if (hasTilde) {
      c.fillRect(cx - sc, 0, sc, sc);
      c.fillRect(cx, 0, sc, sc);
    }
  } else if (hasBreve && (hasAcute || hasGrave || hasHook || hasTilde)) {
    c.fillRect(cx, 1 * sc, sc, sc);
    if (hasAcute) {
      c.fillRect(cx + sc, 0, sc, sc);
    } else if (hasGrave) {
      c.fillRect(cx - sc, 0, sc, sc);
    } else if (hasHook) {
      c.fillRect(cx + sc, 0, sc, sc);
    } else if (hasTilde) {
      c.fillRect(cx - sc, 0, sc, sc);
    }
  } else {
    if (hasCircumflex) {
      c.fillRect(cx, 0, sc, sc);
      c.fillRect(cx - sc, 1 * sc, sc, sc);
      c.fillRect(cx + sc, 1 * sc, sc, sc);
    } else if (hasBreve) {
      c.fillRect(cx - sc, 0, sc, sc);
      c.fillRect(cx + sc, 0, sc, sc);
      c.fillRect(cx, 1 * sc, sc, sc);
    } else if (hasAcute) {
      c.fillRect(cx + sc, 0, sc, sc);
      c.fillRect(cx, 1 * sc, sc, sc);
    } else if (hasGrave) {
      c.fillRect(cx - sc, 0, sc, sc);
      c.fillRect(cx, 1 * sc, sc, sc);
    } else if (hasHook) {
      c.fillRect(cx + sc, 0, sc, sc);
      c.fillRect(cx, 1 * sc, sc, sc);
    } else if (hasTilde) {
      c.fillRect(cx - sc, 0, sc, sc);
      c.fillRect(cx, 0, sc, sc);
      c.fillRect(cx + sc, 1 * sc, sc, sc);
    }
  }
}

function _renderText(s, col, sc) {
  s = s.normalize('NFC');
  const w = Math.max(1, textW(s, sc));
  const cv = document.createElement('canvas');
  cv.width = w + Math.ceil(6 * sc);
  
  const paddingY = Math.ceil(10 * sc);
  cv.height = Math.ceil(35 * sc);
  
  const c = cv.getContext('2d');
  c.font = gameFont(sc);
  c.textBaseline = 'top';
  c.fillStyle = '#02030a';
  c.globalAlpha = 0.75;
  c.fillText(s, sc, paddingY + sc);
  c.globalAlpha = 1;
  c.fillStyle = col;
  c.fillText(s, 0, paddingY);

  return cv;
}

function drawText(c, s, x, y, col, sc) {
  if (!s) return;
  s = localText(s).toUpperCase();
  col = col || '#cfd6e4'; sc = sc || 1;
  const key = s + ' ' + col + ' ' + sc;
  let cv = _txtCache.get(key);
  if (!cv) {
    if (_txtCache.size > 500) _txtCache.clear();
    cv = _renderText(s, col, sc);
    _txtCache.set(key, cv);
  }
  const dy = y - Math.ceil(10 * sc);
  c.drawImage(cv, Math.round(x), Math.round(dy));
}

function drawTextC(c, s, cx, y, col, sc) {
  drawText(c, s, cx - textW(localText(s), sc || 1) / 2, y, col, sc);
}

function drawTextR(c, s, rx, y, col, sc) {
  drawText(c, s, rx - textW(localText(s), sc || 1), y, col, sc);
}
