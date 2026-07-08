/**
 * Regenerates the "tasted" wordmark SVGs in assets/logo/ from the shipped
 * Baloo 2 ExtraBold glyphs. Run: `npm i --no-save fontkit && node scripts/make-logo.mjs`
 * (fontkit parses this TTF correctly where opentype.js emits NaN points.)
 */
import { writeFileSync } from 'node:fs';
import * as fontkit from 'fontkit';

const font = fontkit.openSync(
  'node_modules/@expo-google-fonts/baloo-2/800ExtraBold/Baloo2_800ExtraBold.ttf',
);

const SIZE = 200;
const scale = SIZE / font.unitsPerEm;
const run = font.layout('tasted');

const pad = 12;
const baselineY = 0; // crop to ink below; baseline is just a reference line

let x = 0;
let ink = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
const glyphPaths = [];
for (let i = 0; i < run.glyphs.length; i++) {
  const glyph = run.glyphs[i];
  const pos = run.positions[i];
  const gx = x + pos.xOffset * scale;
  const gy = baselineY - pos.yOffset * scale;
  // Font paths are y-up in font units; flip and scale into SVG space.
  glyphPaths.push(
    `<g transform="translate(${gx.toFixed(2)} ${gy.toFixed(2)}) scale(${scale.toFixed(5)} ${-scale.toFixed(5)})"><path d="${glyph.path.toSVG()}"/></g>`,
  );
  const b = glyph.bbox;
  ink.x1 = Math.min(ink.x1, gx + b.minX * scale);
  ink.x2 = Math.max(ink.x2, gx + b.maxX * scale);
  ink.y1 = Math.min(ink.y1, gy - b.maxY * scale);
  ink.y2 = Math.max(ink.y2, gy - b.minY * scale);
  x += pos.xAdvance * scale;
}

const VX = (ink.x1 - pad).toFixed(1);
const VY = (ink.y1 - pad).toFixed(1);
const W = (ink.x2 - ink.x1 + pad * 2).toFixed(1);
const H = (ink.y2 - ink.y1 + pad * 2).toFixed(1);

function svg(fill, bg) {
  const rect = bg
    ? `<rect x="${VX}" y="${VY}" width="${W}" height="${H}" rx="48" fill="${bg}"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VX} ${VY} ${W} ${H}" role="img" aria-label="tasted">${rect}<g fill="${fill}">${glyphPaths.join('')}</g></svg>\n`;
}

writeFileSync('assets/logo/tasted-coral.svg', svg('#FF5A36'));
writeFileSync('assets/logo/tasted-cream-on-candy.svg', svg('#FAF7F2', '#F290B9'));
writeFileSync('assets/logo/tasted-charcoal.svg', svg('#17150F'));
console.log(`done: ${W}x${H}, ${run.glyphs.length} glyphs`);
