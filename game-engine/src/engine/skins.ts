import Phaser from 'phaser';
import { TX } from './registry';
import { CHARACTERS } from '../config/characters';
import { ROLES, type Role } from '../config/roles';
import { SKINS, ROBOT_SRC, BANNER } from '../config/assets';

// =====================================================================
//  skins.ts — the real-art drop-in. The first mural art (the sliced Super
//  Stories Kinderhook mural) is loaded here and baked, at the engine's
//  expected size, into the SAME texture keys the placeholders use. Because
//  bake() (placeholders.ts) skips keys that already exist, baking these first
//  means real art wins and the generated skeleton fills only the rest.
//
//  Baking to size (rather than scaling sprites at runtime) keeps every entity
//  + the physics body untouched: a 44x40 cat is a 44x40 texture, exactly like
//  the placeholder it replaces. The robot is baked per-character with a CSS
//  `hue-rotate` so one drawing yields four distinct robots — a baked raster, so
//  it works on Canvas and WebGL alike (no per-frame shader, motion-safe).
// =====================================================================

const LOAD_ROBOT = 'load:robot';
const loadSkinKey = (role: string) => `load:skin:${role}`;

/** robot height = size * this — the mural robot is taller than the square placeholder. */
const ROBOT_H_MUL = 1.3;

/** Queue the real-art image loads. Call in Boot.preload(). */
export function queueSkinLoads(scene: Phaser.Scene): void {
  for (const [role, path] of Object.entries(SKINS)) {
    if (path) scene.load.image(loadSkinKey(role), path);
  }
  scene.load.image(LOAD_ROBOT, ROBOT_SRC);
  scene.load.image('banner:k', BANNER.k);
  scene.load.image('banner:word', BANNER.word);
  // A missing file 404s and is simply absent below -> the placeholder fills in.
  scene.load.on('loaderror', () => {
    /* skeleton invariant: art is optional, the game runs without it */
  });
}

/** Bake loaded art into the engine's texture keys. Call in Boot.create(), BEFORE buildPlaceholders. */
export function bakeSkins(scene: Phaser.Scene): void {
  // object-lane role skins (the cats) -> fitted into each role's frame box
  for (const role of Object.keys(SKINS)) {
    const srcKey = loadSkinKey(role);
    if (!scene.textures.exists(srcKey)) continue;
    const frame = (ROLES as Record<string, Role>)[role]?.frame ?? { w: 40, h: 40 };
    bakeFit(scene, TX.role(role), srcKey, frame.w, frame.h, 0);
  }

  // the robot -> one hue-rotated texture per character
  if (scene.textures.exists(LOAD_ROBOT)) {
    const img = scene.textures.get(LOAD_ROBOT).getSourceImage() as HTMLImageElement;
    const aspect = img.width && img.height ? img.width / img.height : 0.6;
    for (const ch of CHARACTERS) {
      if (!ch.src) continue;
      const h = Math.round(ch.size * ROBOT_H_MUL);
      const w = Math.round(h * aspect);
      bakeFit(scene, TX.char(ch.key), LOAD_ROBOT, w, h, ch.hue ?? 0);
    }
  }
}

/** Draw a loaded image into a w×h canvas texture, aspect-fit + centered, with optional hue rotation. */
function bakeFit(
  scene: Phaser.Scene,
  destKey: string,
  srcKey: string,
  w: number,
  h: number,
  hueDeg: number,
): void {
  if (scene.textures.exists(destKey)) return;
  const src = scene.textures.get(srcKey).getSourceImage() as HTMLImageElement;
  if (!src || !src.width) return;
  const tex = scene.textures.createCanvas(destKey, w, h);
  if (!tex) return;
  const ctx = tex.context;
  ctx.clearRect(0, 0, w, h);
  ctx.filter = hueDeg ? `hue-rotate(${hueDeg}deg)` : 'none';
  const scale = Math.min(w / src.width, h / src.height);
  const dw = src.width * scale;
  const dh = src.height * scale;
  ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
  ctx.filter = 'none';
  tex.refresh();
}
