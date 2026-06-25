// Extract the sliced Super Stories mural sprites from the POC HTML (its SKIN_DATA
// base64 data-URIs) into real PNG files under public/assets/. Run from game-engine/:
//   node scripts/extract-mural-skins.mjs <path-to-poc.html>
// e.g. node scripts/extract-mural-skins.mjs ../demo/kinderhook-poc.html
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const input = process.argv[2];
if (!input) {
  console.error('usage: node scripts/extract-mural-skins.mjs <poc.html>');
  process.exit(1);
}
const html = readFileSync(input, 'utf8');

// POC SKIN_DATA key -> destination (the keys the engine config points at).
const MAP = {
  player_robot: 'public/assets/characters/robot.png',
  enemy_cat_yellow: 'public/assets/objects/cat-yellow.png',
  enemy_cat_pink: 'public/assets/objects/cat-pink.png',
  letter_k: 'public/assets/scene/kinderhook-k.png',
  letter_inderhook: 'public/assets/scene/kinderhook-inderhook.png',
};

// Tolerant of raw HTML ("key": "data...") and JSON-escaped transcript (\"key\": \"data...).
const re = /\\?"([a-zA-Z0-9_]+)\\?"\s*:\s*\\?"data:image\/png;base64,([A-Za-z0-9+/=]+)/g;
const found = {};
let m;
while ((m = re.exec(html)) !== null) found[m[1]] = m[2];

let ok = 0;
for (const [key, out] of Object.entries(MAP)) {
  const b64 = found[key];
  if (!b64) {
    console.error('  MISSING in HTML:', key);
    continue;
  }
  const buf = Buffer.from(b64, 'base64');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buf);
  console.log('  wrote', out, '—', buf.length, 'bytes');
  ok++;
}
console.log(`done: ${ok}/${Object.keys(MAP).length} sprites written`);
