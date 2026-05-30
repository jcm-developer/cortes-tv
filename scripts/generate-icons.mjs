// Genera iconos PNG (sin dependencias) para PWA / apple-touch-icon.
// Dibuja un cuadrado redondeado con degradado azul→morado y un play blanco.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

// --- CRC32 ------------------------------------------------------------------
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(size, pixels /* Uint8Array RGBA */) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // rest 0 (compression, filter, interlace)
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter none
    pixels.subarray(y * stride, y * stride + stride).forEach((v, i) => {
      raw[y * (stride + 1) + 1 + i] = v;
    });
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Dibujo ------------------------------------------------------------------
function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}
function draw(size) {
  const px = new Uint8Array(size * size * 4);
  const c1 = [10, 132, 255]; // accent blue
  const c2 = [94, 92, 230]; // purple
  const radius = size * 0.225; // esquina redondeada
  const cx = size * 0.52;
  const cy = size * 0.5;
  const triR = size * 0.2;

  function roundedAlpha(x, y) {
    // distancia a la caja redondeada
    const dx = Math.max(radius - x, x - (size - radius), 0);
    const dy = Math.max(radius - y, y - (size - radius), 0);
    const d = Math.sqrt(dx * dx + dy * dy);
    return Math.max(0, Math.min(1, radius - d + 0.5));
  }
  // triángulo "play"
  function inPlay(x, y) {
    const ax = cx - triR * 0.85,
      ay = cy - triR;
    const bx = cx - triR * 0.85,
      by = cy + triR;
    const dx = cx + triR,
      dy = cy;
    const sign = (px1, py1, px2, py2, pxp, pyp) =>
      (pxp - px2) * (py1 - py2) - (px1 - px2) * (pyp - py2);
    const d1 = sign(ax, ay, bx, by, x, y);
    const d2 = sign(bx, by, dx, dy, x, y);
    const d3 = sign(dx, dy, ax, ay, x, y);
    const neg = d1 < 0 || d2 < 0 || d3 < 0;
    const pos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(neg && pos);
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const t = (x + y) / (size * 2);
      const [r, g, b] = mix(c1, c2, t);
      const a = roundedAlpha(x + 0.5, y + 0.5);
      if (inPlay(x + 0.5, y + 0.5)) {
        px[i] = 255;
        px[i + 1] = 255;
        px[i + 2] = 255;
        px[i + 3] = Math.round(255 * a);
      } else {
        px[i] = r;
        px[i + 1] = g;
        px[i + 2] = b;
        px[i + 3] = Math.round(255 * a);
      }
    }
  }
  return px;
}

for (const size of [180, 192, 512]) {
  const png = encodePNG(size, draw(size));
  writeFileSync(join(OUT, `icon-${size}.png`), png);
  console.log(`icons/icon-${size}.png (${png.length} bytes)`);
}

// SVG escalable para favicon
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#0a84ff"/><stop offset="1" stop-color="#5e5ce6"/>
  </linearGradient></defs>
  <rect width="512" height="512" rx="115" fill="url(#g)"/>
  <path d="M198 150 L380 256 L198 362 Z" fill="#fff"/>
</svg>`;
writeFileSync(join(OUT, 'icon.svg'), svg);
console.log('icons/icon.svg');
