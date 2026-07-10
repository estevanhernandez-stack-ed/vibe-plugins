// Emits the vibe family icon set: <name>.svg (tiled hex, 96 viewBox) + <name>-24.svg (bare glyph).
// Language: Lucide dialect, 1.75px stroke, round joins; cyan structure + one magenta accent.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CYAN = '#17d4fa';
const MAGENTA = '#f22f89';
const TILE = '#13233a';

const GLYPHS = {
  'vibe-cartographer': `<path d="M5.5 18.5c2.6-1.1 2.9-5.2 5.4-6.2s4.6 1.1 6.1-1.9c1-2 1.3-3.6 1.5-4.9"/><circle cx="5.5" cy="18.5" r="1.6"/><circle cx="18.5" cy="5.5" r="1.9" fill="${MAGENTA}" stroke="none"/>`,
  'vibe-doc': `<path d="M7 3.5h6.5L18 8v12.5H7z"/><path d="M13.5 3.5V8H18"/><path d="M9.5 12.5h5.5"/><path d="M9.5 18h3.5"/><path d="M9.5 15.25h5.5" stroke="${MAGENTA}"/>`,
  'vibe-test': `<path d="M9.5 3.5h5"/><path d="M10.5 3.5v5l-4.3 7.7A2.4 2.4 0 0 0 8.3 19.7h7.4a2.4 2.4 0 0 0 2.1-3.5L13.5 8.5v-5"/><path d="M8.1 15.4h7.8" stroke="${MAGENTA}"/><circle cx="13.2" cy="17.7" r=".9" fill="${MAGENTA}" stroke="none"/>`,
  'vibe-sec': `<path d="M12 3.5l7 2.8v5c0 4.4-2.9 7.5-7 9-4.1-1.5-7-4.6-7-9v-5z"/><path d="M12 7.5v2.6" stroke="${MAGENTA}"/><circle cx="12" cy="12" r="1.5" stroke="${MAGENTA}"/><path d="M12 13.5v2.4" stroke="${MAGENTA}"/>`,
  'thesis-engine': `<path d="M5 4.5h14l-5.5 6v4.7l-3 2v-6.7z"/><circle cx="12" cy="20" r="1.2" fill="${MAGENTA}" stroke="none"/>`,
  'vibe-thesis': `<path d="M12 6.8C10.4 5.5 8 5 5 5v13.2c3 0 5.4.5 7 1.8 1.6-1.3 4-1.8 7-1.8V5c-3 0-5.4.5-7 1.8z"/><path d="M12 6.8V20"/><path d="M15.5 5.2v4.6l1.5-1.1 1.5 1.1V5.4" stroke="${MAGENTA}"/>`,
  'vibe-keystone': `<path d="M5 20v-6.5a7 7 0 0 1 14 0V20"/><path d="M5 20h3.2M15.8 20H19"/><path d="M10.3 6.4h3.4l1 3.1H9.3z" fill="${MAGENTA}" stroke="none"/>`,
  'vibe-iterate': `<path d="M20 12a8 8 0 1 1-2.3-5.6L20 8.5"/><path d="M20.2 3.8v4.7h-4.7" stroke="${MAGENTA}"/>`,
  'vibe-taker': `<path d="M4.5 9.8v7.7l7.5 3 7.5-3V9.8"/><path d="M4.5 9.8L12 6.8l7.5 3"/><path d="M12 20.5v-7.7"/><path d="M12 10.8V4.8" stroke="${MAGENTA}"/><path d="M9.8 6.8L12 4.6l2.2 2.2" stroke="${MAGENTA}"/>`,
  'vibe-walk': `<path d="M12 3.5a4.8 4.8 0 0 1 4.8 4.8c0 3.4-4.8 7.7-4.8 7.7s-4.8-4.3-4.8-7.7A4.8 4.8 0 0 1 12 3.5z"/><circle cx="12" cy="8.3" r="1.2"/><circle cx="7.5" cy="19.5" r="1" fill="${MAGENTA}" stroke="none"/><circle cx="12" cy="20.8" r="1" fill="${MAGENTA}" stroke="none"/><circle cx="16.5" cy="19.5" r="1" fill="${MAGENTA}" stroke="none"/>`,
  'vibe-insights': `<path d="M4 12s3-5.5 8-5.5S20 12 20 12s-3 5.5-8 5.5S4 12 4 12z"/><path d="M9 12.3h1.4l.9-2 1.4 3.8 1-1.8H15" stroke="${MAGENTA}"/>`,
  'vibe-wrap': `<path d="M20 12a8 8 0 1 1-3.1-6.3"/><path d="M9 12.4l2.2 2.2 4.6-5" stroke="${MAGENTA}"/>`,
  'vibe-prompt': `<path d="M5.5 7.5l4.8 4.5-4.8 4.5"/><path d="M13 16.5h5.5" stroke="${MAGENTA}"/>`,
  'vibe-lingual': `<path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-8.5L7 19v-3.5H5A1.5 1.5 0 0 1 3.5 14V7A1.5 1.5 0 0 1 5 5.5z"/><path d="M7.8 12.7l1.5-4.2 1.5 4.2M8.2 11.4h2.2"/><path d="M13.8 11.3c.8-1.9 2.5-1.9 3.3 0" stroke="${MAGENTA}"/>`,
  'vibe-access': `<path d="M16 5.5h3.5v13H16"/><path d="M4 7h5.5"/><path d="M4 12h6.5"/><path d="M4 17h5.5"/><circle cx="13.5" cy="12" r="1.7" fill="${MAGENTA}" stroke="none"/>`,
};

const HEX = 'M48 7 L83 27.5 V68.5 L48 89 L13 68.5 V27.5 Z';

const tiled = (glyph) => `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <path d="${HEX}" fill="${TILE}" stroke="${TILE}" stroke-width="6" stroke-linejoin="round"/>
  <path d="${HEX}" fill="none" stroke="rgba(255,255,255,.09)" stroke-width="1.5" stroke-linejoin="round"/>
  <g transform="translate(24,24) scale(2)" fill="none" stroke="${CYAN}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>
</svg>
`;

const bare = (glyph) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${CYAN}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${glyph}</svg>
`;

const outDir = process.argv[2];
if (!outDir) throw new Error('usage: node gen-icons.mjs <outDir>');
mkdirSync(outDir, { recursive: true });
for (const [name, glyph] of Object.entries(GLYPHS)) {
  writeFileSync(join(outDir, `${name}.svg`), tiled(glyph));
  writeFileSync(join(outDir, `${name}-24.svg`), bare(glyph));
}
console.log(`wrote ${Object.keys(GLYPHS).length * 2} SVGs to ${outDir}`);
