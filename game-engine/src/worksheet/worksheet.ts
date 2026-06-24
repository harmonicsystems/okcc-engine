import './print.css';
import { ROLES, type Role } from '../config/roles';
import { CHARACTERS } from '../config/characters';
import { makeTile } from './frame';
import { robotGuide, POSES } from './robot';

// =====================================================================
//  worksheet.ts — the printable paper↔engine bridge (Phase 2).
//  A Phaser-free page that reads config/roles.ts + config/characters.ts (the
//  single source of truth) and prints worksheets kids draw inside. This cut:
//  object/platform tiles + the character animation spread. (Scene pages +
//  title cards are next.)
//
//  Manifest path convention (where a scan of each box is saved, and where the
//  future ingest + Boot will look for real art):
//    objects/platforms -> assets/objects/<roleKey>.png
//    characters        -> assets/characters/<charKey>.png
// =====================================================================

const app = document.getElementById('app')!;

// ---- toolbar (screen only) ----
const toolbar = document.createElement('header');
toolbar.className = 'toolbar';
toolbar.innerHTML = `
  <div class="brand">OK Code Camp<small>worksheets</small></div>
  <nav class="tnav">
    <a href="#platforms">Platforms</a>
    <a href="#objects">Objects</a>
    <a href="#characters">Characters</a>
  </nav>
  <button id="print" class="print-btn">Print these</button>
`;
app.appendChild(toolbar);
toolbar.querySelector('#print')!.addEventListener('click', () => window.print());

const sheets = document.createElement('main');
sheets.className = 'sheets';
app.appendChild(sheets);

const objectsPath = (role: Role): string => `assets/objects/${role.key}.png`;
const rolesIn = (lane: Role['lane']): Role[] =>
  Object.values(ROLES).filter((r) => r.lane === lane);

function sheet(id: string, title: string, sub: string): HTMLElement {
  const s = document.createElement('section');
  s.className = 'sheet';
  s.id = id;
  s.innerHTML = `<div class="sheet-head"><h2>${title}</h2><p>${sub}</p></div>`;
  sheets.appendChild(s);
  return s;
}

function tileGrid(roles: Role[]): HTMLElement {
  const grid = document.createElement('div');
  grid.className = 'grid';
  for (const role of roles) {
    grid.appendChild(
      makeTile({
        title: role.label,
        prompt: role.prompt,
        color: role.color,
        aspectW: role.frame.w,
        aspectH: role.frame.h,
        manifestPath: objectsPath(role),
      }),
    );
  }
  return grid;
}

// ---- platform tiles ----
sheet(
  'platforms',
  'Platforms',
  'Things to stand on. The colour tells the builder how each one behaves (springy, crumbly, moving…) — keep the colour you see here.',
).appendChild(tileGrid(rolesIn('platform')));

// ---- object tiles ----
sheet(
  'objects',
  'Objects',
  'Treasures to grab, dangers to dodge, critters, the finish, and power-ups. One drawing per box, inside the corner marks.',
).appendChild(tileGrid(rolesIn('object')));

// ---- character spreads (one page each) ----
const KEY = ['body', 'face', 'eyes', 'accent'];
CHARACTERS.forEach((ch, i) => {
  const s = document.createElement('section');
  s.className = 'sheet character';
  if (i === 0) s.id = 'characters'; // section anchor for the toolbar nav

  const keyHtml = KEY.map((k) => `<div class="key"><span class="dot"></span><span>${k}</span></div>`).join('');
  s.innerHTML = `
    <div class="sheet-head">
      <h2>${ch.name} <span class="dim">— ${ch.blurb}</span></h2>
      <p>Draw the same robot in all five poses. Fill the colour key first, then keep those colours.</p>
    </div>
    <div class="color-key">${keyHtml}</div>`;

  const row = document.createElement('div');
  row.className = 'pose-row';
  for (const pose of POSES) {
    row.appendChild(
      makeTile({
        title: pose,
        aspectW: 1,
        aspectH: 1,
        boxMaxMm: 50,
        guideSvg: robotGuide(pose),
      }),
    );
  }
  s.appendChild(row);

  const path = document.createElement('div');
  path.className = 'sheet-path';
  path.textContent = `assets/characters/${ch.key}.png`;
  s.appendChild(path);

  sheets.appendChild(s);
});
