import Phaser from 'phaser';
import { ROLES, type Role } from '../config/roles';
import { CHARACTERS, type CharacterDef } from '../config/characters';
import { THEME } from '../config/theme';
import { TX } from './registry';

// =====================================================================
//  placeholders.ts — generates every gray stand-in texture procedurally
//  from roles.ts, so the whole game runs with ZERO real art (the core
//  invariant). Real art is pure drop-in later: load a real texture under
//  the same TX key and nothing else changes.
//
//  Readability is shape + motion FIRST (a motion glyph is baked into each
//  platform tile), color is reinforcement — never color alone.
// =====================================================================

function lighten(c: number, p: number): number {
  const col = Phaser.Display.Color.IntegerToColor(c);
  col.lighten(p);
  return col.color;
}
function darken(c: number, p: number): number {
  const col = Phaser.Display.Color.IntegerToColor(c);
  col.darken(p);
  return col.color;
}

function starPoints(cx: number, cy: number, outer: number, inner: number, n = 5) {
  const pts: { x: number; y: number }[] = [];
  const step = Math.PI / n;
  let a = -Math.PI / 2;
  for (let i = 0; i < 2 * n; i++) {
    const r = i % 2 === 0 ? outer : inner;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    a += step;
  }
  return pts;
}

/** Make a fresh transient Graphics, draw into it, bake a texture, discard. */
function bake(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (g: Phaser.GameObjects.Graphics) => void,
): void {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

// ---- platform tiles (32x32, tiled by the factory) -------------------
// Each carries a baked motion glyph so behavior reads without color.
function drawPlatformTile(g: Phaser.GameObjects.Graphics, role: Role): void {
  const s = 32;
  const c = role.color;
  // body + a lighter top edge ("stand on top") + a darker base
  g.fillStyle(c, 1);
  if (role.shape === 'pad') {
    g.fillRoundedRect(1, 4, s - 2, s - 6, 7);
  } else {
    g.fillRect(0, 0, s, s);
  }
  g.fillStyle(lighten(c, 22), 1);
  g.fillRect(0, 0, s, 4);
  g.fillStyle(darken(c, 18), 1);
  g.fillRect(0, s - 3, s, 3);

  const glyph = lighten(c, 36);
  const shadow = darken(c, 28);
  g.lineStyle(2, glyph, 0.95);
  switch (role.motion) {
    case 'oneway': {
      // perforated underside + up chevron: jump up through, land on top
      g.lineStyle(2, shadow, 0.8);
      for (let x = 3; x < s; x += 8) g.lineBetween(x, s - 6, x + 4, s - 6);
      g.lineStyle(2, glyph, 0.95);
      g.lineBetween(s / 2 - 5, 16, s / 2, 10);
      g.lineBetween(s / 2, 10, s / 2 + 5, 16);
      break;
    }
    case 'crumble': {
      // cracks
      g.lineStyle(2, shadow, 0.9);
      g.lineBetween(8, 6, 13, 16);
      g.lineBetween(13, 16, 9, 26);
      g.lineBetween(22, 5, 19, 15);
      g.lineBetween(19, 15, 24, 27);
      break;
    }
    case 'flow': {
      // right-pointing chevrons (a current)
      for (let x = 2; x < s; x += 12) {
        g.lineBetween(x, 11, x + 6, 16);
        g.lineBetween(x + 6, 16, x, 21);
      }
      break;
    }
    case 'carry-x': {
      // left-right arrows
      g.lineBetween(6, 16, 26, 16);
      g.lineBetween(6, 16, 11, 11);
      g.lineBetween(6, 16, 11, 21);
      g.lineBetween(26, 16, 21, 11);
      g.lineBetween(26, 16, 21, 21);
      break;
    }
    case 'lift-y': {
      // up-down arrows
      g.lineBetween(16, 6, 16, 26);
      g.lineBetween(16, 6, 11, 11);
      g.lineBetween(16, 6, 21, 11);
      g.lineBetween(16, 26, 11, 21);
      g.lineBetween(16, 26, 21, 21);
      break;
    }
    case 'launch': {
      // spring coil hint
      g.lineBetween(8, 24, 13, 12);
      g.lineBetween(13, 12, 18, 24);
      g.lineBetween(18, 24, 23, 12);
      break;
    }
    default: {
      // static: a quiet seam so the tile isn't a flat void
      g.lineStyle(1, shadow, 0.5);
      g.lineBetween(0, 16, s, 16);
    }
  }
}

// ---- object-lane sprites -------------------------------------------
function drawObject(g: Phaser.GameObjects.Graphics, role: Role): void {
  const { w, h } = role.frame;
  const c = role.color;
  const cx = w / 2;
  const cy = h / 2;

  switch (role.key) {
    case 'collectible': {
      // a little gear/coin so the spin reads
      g.fillStyle(darken(c, 20), 1);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.fillCircle(cx + Math.cos(a) * (cx - 2), cy + Math.sin(a) * (cy - 2), 3);
      }
      g.fillStyle(c, 1);
      g.fillCircle(cx, cy, cx - 4);
      g.fillStyle(lighten(c, 30), 1);
      g.fillCircle(cx, cy, cx - 9);
      g.fillStyle(darken(c, 15), 1);
      g.fillCircle(cx, cy, 3);
      break;
    }
    case 'hazard': {
      // a row of spikes
      g.fillStyle(c, 1);
      const n = 3;
      const bw = w / n;
      for (let i = 0; i < n; i++) {
        const x0 = i * bw;
        g.fillTriangle(x0, h - 2, x0 + bw / 2, 4, x0 + bw, h - 2);
      }
      g.fillStyle(lighten(c, 25), 1);
      for (let i = 0; i < n; i++) {
        const x0 = i * bw;
        g.fillTriangle(x0 + bw / 2 - 2, h - 2, x0 + bw / 2, 8, x0 + bw / 2 + 2, h - 2);
      }
      break;
    }
    case 'groundPatroller': {
      g.fillStyle(c, 1);
      g.fillRoundedRect(2, 4, w - 4, h - 6, 8);
      // feet
      g.fillStyle(darken(c, 25), 1);
      g.fillRect(6, h - 4, 8, 4);
      g.fillRect(w - 14, h - 4, 8, 4);
      // angry eyes
      g.fillStyle(THEME.white, 1);
      g.fillCircle(w * 0.36, h * 0.42, 4);
      g.fillCircle(w * 0.64, h * 0.42, 4);
      g.fillStyle(THEME.ink, 1);
      g.fillCircle(w * 0.36, h * 0.44, 2);
      g.fillCircle(w * 0.64, h * 0.44, 2);
      break;
    }
    case 'airPatroller': {
      // a flyer: diamond body + wings
      g.fillStyle(lighten(c, 18), 1);
      g.fillTriangle(0, cy, cx, cy - 6, cx, cy + 6); // left wing
      g.fillTriangle(w, cy, cx, cy - 6, cx, cy + 6); // right wing
      g.fillStyle(c, 1);
      g.fillPoints(
        [
          { x: cx, y: cy - h / 2 + 2 },
          { x: cx + 9, y: cy },
          { x: cx, y: cy + h / 2 - 2 },
          { x: cx - 9, y: cy },
        ],
        true,
      );
      g.fillStyle(THEME.white, 1);
      g.fillCircle(cx, cy - 2, 3);
      break;
    }
    case 'bouncePad': {
      g.fillStyle(darken(c, 20), 1);
      g.fillRect(4, h - 6, w - 8, 6); // base
      g.fillStyle(c, 1);
      g.fillRoundedRect(2, 2, w - 4, h - 8, 8); // cushion
      g.fillStyle(lighten(c, 30), 1);
      // up arrows
      for (let x = 10; x < w - 6; x += 18) {
        g.fillTriangle(x, 14, x + 6, 6, x + 12, 14);
      }
      break;
    }
    case 'goal': {
      // a flag on a pole — unmistakable "finish"
      g.fillStyle(THEME.box, 1);
      g.fillRect(8, 4, 4, h - 6); // pole
      g.fillStyle(c, 1);
      g.fillPoints(
        [
          { x: 12, y: 6 },
          { x: w - 4, y: 16 },
          { x: 12, y: 30 },
        ],
        true,
      );
      g.fillStyle(darken(c, 22), 1);
      g.fillRect(4, h - 6, 16, 4); // base
      break;
    }
    case 'powerup': {
      g.fillStyle(darken(c, 18), 1);
      g.fillCircle(cx, cy, cx - 1);
      g.fillStyle(c, 1);
      g.fillPoints(starPoints(cx, cy, cx - 3, (cx - 3) * 0.45), true);
      g.fillStyle(lighten(c, 35), 1);
      g.fillPoints(starPoints(cx, cy, (cx - 3) * 0.55, (cx - 3) * 0.25), true);
      break;
    }
    default:
      g.fillStyle(c, 1);
      g.fillRoundedRect(2, 2, w - 4, h - 4, 6);
  }
}

// ---- character ------------------------------------------------------
// Same gray skeleton for everyone, distinguished only by an accent visor +
// antenna bulb, so the "it's just a placeholder until a drawing arrives"
// message stays honest while four robots remain tellable apart in the menu.
function drawCharacter(g: Phaser.GameObjects.Graphics, def: CharacterDef): void {
  const s = def.size;
  const body = THEME.box;
  const a = def.accent;
  // antenna
  g.fillStyle(darken(body, 10), 1);
  g.fillRect(s / 2 - 1, 2, 2, 6);
  g.fillStyle(a, 1);
  g.fillCircle(s / 2, 3, 3);
  // body
  g.fillStyle(body, 1);
  g.fillRoundedRect(3, 7, s - 6, s - 12, 9);
  // visor (accent band)
  g.fillStyle(a, 0.9);
  g.fillRoundedRect(7, s * 0.3, s - 14, s * 0.22, 5);
  // eyes
  g.fillStyle(THEME.white, 1);
  const eyeY = s * 0.41;
  g.fillCircle(s * 0.38, eyeY, 4);
  g.fillCircle(s * 0.62, eyeY, 4);
  g.fillStyle(THEME.ink, 1);
  g.fillCircle(s * 0.38, eyeY, 2);
  g.fillCircle(s * 0.62, eyeY, 2);
  // feet
  g.fillStyle(darken(body, 22), 1);
  g.fillRect(s * 0.26, s - 6, s * 0.18, 4);
  g.fillRect(s * 0.56, s - 6, s * 0.18, 4);
}

// ---- fx + hud textures ----------------------------------------------
function drawSpark(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0xffffff, 1);
  g.fillCircle(6, 6, 5);
  g.fillStyle(0xffffff, 0.4);
  g.fillCircle(6, 6, 6);
}

function drawHeart(g: Phaser.GameObjects.Graphics, color: number): void {
  g.fillStyle(color, 1);
  g.fillCircle(7, 8, 6);
  g.fillCircle(17, 8, 6);
  g.fillTriangle(1, 9, 23, 9, 12, 21);
  g.fillStyle(lighten(color, 28), 0.8);
  g.fillCircle(5, 6, 2); // glint
}

/** Build every placeholder texture. Call once, in Boot, before any scene uses art. */
export function buildPlaceholders(scene: Phaser.Scene): void {
  // platforms (the seven primitives, color-coded by behavior)
  for (const role of Object.values(ROLES)) {
    if (role.lane === 'platform') {
      bake(scene, TX.role(role.key), 32, 32, (g) => drawPlatformTile(g, role));
    } else if (role.lane === 'object') {
      bake(scene, TX.role(role.key), role.frame.w, role.frame.h, (g) => drawObject(g, role));
    }
  }

  // characters (one texture each, accent-distinguished)
  for (const def of CHARACTERS) {
    bake(scene, TX.char(def.key), def.size, def.size, (g) => drawCharacter(g, def));
  }

  // fx + utility
  bake(scene, TX.spark, 12, 12, drawSpark);
  bake(scene, TX.dust, 8, 8, (g) => {
    g.fillStyle(THEME.boxInk, 1);
    g.fillCircle(4, 4, 3);
  });
  bake(scene, TX.pixel, 4, 4, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 4, 4);
  });

  // hud hearts
  bake(scene, TX.heart, 24, 22, (g) => drawHeart(g, 0xef4444));
  bake(scene, TX.heartEmpty, 24, 22, (g) => drawHeart(g, THEME.machine2));
}
