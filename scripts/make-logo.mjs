/**
 * Regenerates the "tasted" wordmark assets in assets/logo/ from the shipped
 * Baloo 2 ExtraBold glyphs.
 *   npm i --no-save fontkit sharp && node scripts/make-logo.mjs
 * (fontkit parses this TTF where opentype.js emits NaN points; sharp rasterizes
 * the SVGs to JPEG.)
 *
 * Outputs, in assets/logo/:
 *   wordmark (wide)   tasted-{coral,cream-on-candy,charcoal}.svg + .jpg
 *   profile pic (1:1) tasted-pfp-{candy,cream}.svg + .jpg  — padded for the
 *                     circle crop most social platforms apply
 */
import { writeFileSync } from 'node:fs';
import * as fontkit from 'fontkit';
import sharp from 'sharp';

const CREAM = '#FAF7F2';
const CANDY = '#F290B9';
const CORAL = '#FF5A36';
const CHARCOAL = '#17150F';

const font = fontkit.openSync(
  'node_modules/@expo-google-fonts/baloo-2/800ExtraBold/Baloo2_800ExtraBold.ttf',
);

const SIZE = 200;
const scale = SIZE / font.unitsPerEm;
const run = font.layout('tasted');

let x = 0;
const ink = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
const glyphPaths = [];
for (let i = 0; i < run.glyphs.length; i++) {
  const glyph = run.glyphs[i];
  const pos = run.positions[i];
  const gx = x + pos.xOffset * scale;
  const gy = -pos.yOffset * scale; // baseline at y=0
  // Font paths are y-up in font units; flip and scale into SVG space.
  glyphPaths.push(
    `<g transform="translate(${gx.toFixed(2)} ${gy.toFixed(2)}) scale(${scale.toFixed(5)} ${(-scale).toFixed(5)})"><path d="${glyph.path.toSVG()}"/></g>`,
  );
  const b = glyph.bbox;
  ink.x1 = Math.min(ink.x1, gx + b.minX * scale);
  ink.x2 = Math.max(ink.x2, gx + b.maxX * scale);
  ink.y1 = Math.min(ink.y1, gy - b.maxY * scale);
  ink.y2 = Math.max(ink.y2, gy - b.minY * scale);
  x += pos.xAdvance * scale;
}

const iw = ink.x2 - ink.x1;
const ih = ink.y2 - ink.y1;
const cx = (ink.x1 + ink.x2) / 2;
const cy = (ink.y1 + ink.y2) / 2;

const inner = (fill) => `<g fill="${fill}">${glyphPaths.join('')}</g>`;
const n = (v) => v.toFixed(2);

/** Tight crop with even padding around the ink. */
function wideBox(pad = 12) {
  return { vx: ink.x1 - pad, vy: ink.y1 - pad, w: iw + pad * 2, h: ih + pad * 2 };
}

/**
 * Square canvas with the wordmark centered. widthFraction is how much of the
 * width the wordmark spans — smaller = more side space (safer under a circle
 * crop). 0.60 leaves ~20% margin each side.
 */
function squareBox(widthFraction = 0.6) {
  const s = iw / widthFraction;
  return { vx: cx - s / 2, vy: cy - s / 2, w: s, h: s };
}

function svg(box, fill, { bg, rx = 0 } = {}) {
  const rect = bg
    ? `<rect x="${n(box.vx)}" y="${n(box.vy)}" width="${n(box.w)}" height="${n(box.h)}"${rx ? ` rx="${rx}"` : ''} fill="${bg}"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(box.vx)} ${n(box.vy)} ${n(box.w)} ${n(box.h)}" role="img" aria-label="tasted">${rect}${inner(fill)}</svg>\n`;
}

/** Rasterize an SVG string to a crisp JPEG (flattened onto cream — JPEG has no alpha). */
async function jpeg(svgStr, file, targetW) {
  const buf = Buffer.from(svgStr);
  await sharp(buf, { density: 384 })
    .resize({ width: targetW })
    .flatten({ background: CREAM })
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toFile(`assets/logo/${file}`);
}

const wide = wideBox();
const pfp = squareBox();

const assets = [
  { file: 'tasted-coral', box: wide, fill: CORAL, opts: {}, jpgW: 1200 },
  { file: 'tasted-cream-on-candy', box: wide, fill: CREAM, opts: { bg: CANDY, rx: 48 }, jpgW: 1200 },
  { file: 'tasted-charcoal', box: wide, fill: CHARCOAL, opts: {}, jpgW: 1200 },
  { file: 'tasted-pfp-candy', box: pfp, fill: CREAM, opts: { bg: CANDY }, jpgW: 1024 },
  { file: 'tasted-pfp-cream', box: pfp, fill: CORAL, opts: { bg: CREAM }, jpgW: 1024 },
];

for (const a of assets) {
  const s = svg(a.box, a.fill, a.opts);
  writeFileSync(`assets/logo/${a.file}.svg`, s);
  await jpeg(s, `${a.file}.jpg`, a.jpgW);
}

console.log(`done: ${assets.length} logos (svg + jpg) · wide ${n(wide.w)}x${n(wide.h)} · pfp ${n(pfp.w)}²`);
