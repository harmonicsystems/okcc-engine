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
// Flat body + one lighter top edge (the "stand on top" affordance) + a single
// minimal motion glyph, so behavior reads by shape + motion, not color alone.
function drawPlatformTile(g: Phaser.GameObjects.Graphics, role: Role): void {
  const s = 32;
  const c = role.color;
  g.fillStyle(c, 1);
  if (role.shape === 'pad') g.fillRoundedRect(1, 5, s - 2, s - 8, 8);
  else g.fillRect(0, 0, s, s);
  g.fillStyle(lighten(c, 26), 1);
  if (role.shape === 'pad') g.fillRoundedRect(1, 5, s - 2, 5, 4);
  else g.fillRect(0, 0, s, 4);

  const glyph = darken(c, 32);
  g.lineStyle(2.5, glyph, 0.92);
  switch (role.motion) {
    case 'oneway':
      for (let x = 4; x < s; x += 8) g.lineBetween(x, s - 5, x + 4, s - 5);
      g.lineBetween(s / 2 - 5, 16, s / 2, 10);
      g.lineBetween(s / 2, 10, s / 2 + 5, 16);
      break;
    case 'crumble':
      g.lineBetween(9, 8, 13, 17);
      g.lineBetween(13, 17, 10, 26);
      g.lineBetween(21, 7, 19, 16);
      g.lineBetween(19, 16, 23, 26);
      break;
    case 'flow':
      for (let x = 3; x < s; x += 11) {
        g.lineBetween(x, 11, x + 6, 16);
        g.lineBetween(x + 6, 16, x, 21);
      }
      break;
    case 'carry-x':
      g.lineBetween(6, 16, 26, 16);
      g.lineBetween(6, 16, 11, 11);
      g.lineBetween(6, 16, 11, 21);
      g.lineBetween(26, 16, 21, 11);
      g.lineBetween(26, 16, 21, 21);
      break;
    case 'lift-y':
      g.lineBetween(16, 6, 16, 26);
      g.lineBetween(16, 6, 11, 11);
      g.lineBetween(16, 6, 21, 11);
      g.lineBetween(16, 26, 11, 21);
      g.lineBetween(16, 26, 21, 21);
      break;
    case 'launch':
      g.lineBetween(9, 24, 16, 11);
      g.lineBetween(16, 11, 23, 24);
      break;
    default:
      g.lineStyle(1.5, glyph, 0.4);
      g.lineBetween(3, 16, s - 3, 16);
  }
}

// ---- object-lane sprites --------------------------------------------
// Basic, iconographic shapes in the spirit of the role-card legend: one clean
// shape per role + a single glyph. Legible by shape + motion, color reinforces.
function drawObject(g: Phaser.GameObjects.Graphics, role: Role): void {
  const { w, h } = role.frame;
  const c = role.color;
  const cx = w / 2;
  const cy = h / 2;

  switch (role.key) {
    case 'collectible': {
      // a coin with a plus — "a treat to grab"
      g.fillStyle(c, 1);
      g.fillCircle(cx, cy, cx - 2);
      g.fillStyle(THEME.panel, 1);
      const t = 2.4;
      const r = (cx - 2) * 0.5;
      g.fillRect(cx - t, cy - r, t * 2, r * 2);
      g.fillRect(cx - r, cy - t, r * 2, t * 2);
      break;
    }
    case 'hazard': {
      // one warning triangle with a bang — "hurts, never moves"
      g.fillStyle(c, 1);
      g.fillTriangle(2, h - 3, cx, 4, w - 2, h - 3);
      g.fillStyle(THEME.white, 1);
      g.fillRect(cx - 1.5, h * 0.36, 3, h * 0.26);
      g.fillCircle(cx, h * 0.78, 2);
      break;
    }
    case 'groundPatroller': {
      // a rounded face + eyes + a side-to-side arrow — "walks a path"
      g.fillStyle(c, 1);
      g.fillRoundedRect(3, 2, w - 6, h - 10, 9);
      g.fillStyle(THEME.white, 1);
      g.fillCircle(w * 0.38, h * 0.4, 3.5);
      g.fillCircle(w * 0.62, h * 0.4, 3.5);
      g.fillStyle(THEME.ink, 1);
      g.fillCircle(w * 0.38, h * 0.4, 1.8);
      g.fillCircle(w * 0.62, h * 0.4, 1.8);
      const my = h - 5;
      g.lineStyle(2, darken(c, 28), 0.95);
      g.lineBetween(w * 0.3, my, w * 0.7, my);
      g.lineBetween(w * 0.3, my, w * 0.3 + 4, my - 3);
      g.lineBetween(w * 0.3, my, w * 0.3 + 4, my + 3);
      g.lineBetween(w * 0.7, my, w * 0.7 - 4, my - 3);
      g.lineBetween(w * 0.7, my, w * 0.7 - 4, my + 3);
      break;
    }
    case 'airPatroller': {
      // a rounded face + eyes + a wavy line — "flies a path"
      g.fillStyle(c, 1);
      g.fillRoundedRect(3, 2, w - 6, h - 9, 9);
      g.fillStyle(THEME.white, 1);
      g.fillCircle(w * 0.38, h * 0.42, 3.2);
      g.fillCircle(w * 0.62, h * 0.42, 3.2);
      g.fillStyle(THEME.ink, 1);
      g.fillCircle(w * 0.38, h * 0.42, 1.6);
      g.fillCircle(w * 0.62, h * 0.42, 1.6);
      const wy = h - 5;
      g.lineStyle(2, darken(c, 26), 0.95);
      g.lineBetween(w * 0.28, wy, w * 0.42, wy - 3);
      g.lineBetween(w * 0.42, wy - 3, w * 0.56, wy);
      g.lineBetween(w * 0.56, wy, w * 0.7, wy - 3);
      break;
    }
    case 'bouncePad': {
      // a pad + up chevrons — "land on it = launch up"
      g.fillStyle(c, 1);
      g.fillRoundedRect(2, 4, w - 4, h - 6, 7);
      g.fillStyle(lighten(c, 28), 1);
      g.fillRoundedRect(2, 4, w - 4, 5, 4);
      g.lineStyle(2.5, darken(c, 30), 0.95);
      for (let x = 12; x < w - 10; x += 18) {
        g.lineBetween(x, 16, x + 6, 9);
        g.lineBetween(x + 6, 9, x + 12, 16);
      }
      break;
    }
    case 'goal': {
      // a clean flag — "reach it to win"
      g.fillStyle(THEME.boxInk, 1);
      g.fillRect(9, 4, 3, h - 6); // pole
      g.fillStyle(c, 1);
      g.fillTriangle(12, 6, w - 4, 15, 12, 26); // flag
      g.fillStyle(darken(c, 20), 1);
      g.fillRect(5, h - 6, 14, 4); // base
      break;
    }
    case 'speedPower': {
      // a plain orb with a bright core
      g.fillStyle(c, 1);
      g.fillCircle(cx, cy, cx - 2);
      g.fillStyle(THEME.white, 1);
      g.fillCircle(cx, cy, Math.max(3, cx * 0.34));
      break;
    }
    case 'starPower': {
      // a plain star
      g.fillStyle(c, 1);
      g.fillPoints(starPoints(cx, cy, cx - 2, (cx - 2) * 0.46), true);
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
  // tiny antenna (accent)
  g.fillStyle(a, 1);
  g.fillRect(s / 2 - 1, 3, 2, 4);
  g.fillCircle(s / 2, 3, 2.5);
  // rounded body
  g.fillStyle(body, 1);
  g.fillRoundedRect(4, 8, s - 8, s - 12, 9);
  // two eyes + an accent smile
  g.fillStyle(THEME.ink, 1);
  g.fillCircle(s * 0.4, s * 0.42, 3);
  g.fillCircle(s * 0.6, s * 0.42, 3);
  g.lineStyle(2, a, 1);
  g.lineBetween(s * 0.38, s * 0.58, s * 0.62, s * 0.58);
  // feet
  g.fillStyle(darken(body, 20), 1);
  g.fillRect(s * 0.3, s - 5, s * 0.14, 4);
  g.fillRect(s * 0.56, s - 5, s * 0.14, 4);
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
