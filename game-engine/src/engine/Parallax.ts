import Phaser from 'phaser';
import { THEME, css } from '../config/theme';

// =====================================================================
//  Parallax.ts — the scene lane: a continuous, colorable backdrop that only
//  scrolls (no collision — keep the lanes separate). With no real scene page,
//  it generates gentle gradient + hill layers from the level's motif hue, so
//  the world reads as a place, not a void. Real art is pure drop-in later.
//
//  Layers are pinned to the camera (scrollFactor 0) and offset by tilePosition
//  each frame — robust, seamless, and works at any level width.
// =====================================================================

interface Layer {
  ts: Phaser.GameObjects.TileSprite;
  factor: number;
}

export class Parallax {
  private layers: Layer[] = [];

  constructor(scene: Phaser.Scene, motif: number, viewW: number, viewH: number) {
    const farKey = `px:far:${motif}`;
    const midKey = `px:mid:${motif}`;
    const nearKey = `px:near:${motif}`;

    this.makeGradient(scene, farKey, 16, viewH, motif);
    this.makeHills(scene, midKey, motif, 18, 0.85, 0.74, 22, 2, viewH);
    this.makeHills(scene, nearKey, motif, 40, 0.95, 0.86, 32, 3, viewH);

    const add = (key: string, factor: number, depth: number) => {
      const ts = scene.add
        .tileSprite(0, 0, viewW, viewH, key)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(depth);
      this.layers.push({ ts, factor });
    };
    add(farKey, 0.08, -30);
    add(midKey, 0.3, -20);
    add(nearKey, 0.55, -12);
  }

  update(cam: Phaser.Cameras.Scene2D.Camera): void {
    for (const l of this.layers) {
      l.ts.tilePositionX = cam.scrollX * l.factor;
      l.ts.tilePositionY = cam.scrollY * l.factor * 0.4;
    }
  }

  private makeGradient(
    scene: Phaser.Scene,
    key: string,
    w: number,
    h: number,
    motif: number,
  ): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, w, h);
    if (!tex) return;
    const ctx = tex.context;
    const sky = Phaser.Display.Color.IntegerToColor(motif);
    sky.darken(35);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, css(sky.color)); // motif-tinted high up
    grad.addColorStop(1, css(THEME.machine)); // into the machine dark below
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    tex.refresh();
  }

  private makeHills(
    scene: Phaser.Scene,
    key: string,
    motif: number,
    darkenPct: number,
    alpha: number,
    baseFrac: number,
    amp: number,
    k: number,
    viewH: number,
  ): void {
    if (scene.textures.exists(key)) return;
    const w = 320;
    const h = viewH;
    const tex = scene.textures.createCanvas(key, w, h);
    if (!tex) return;
    const ctx = tex.context;
    ctx.clearRect(0, 0, w, h);

    const c = Phaser.Display.Color.IntegerToColor(motif);
    c.darken(darkenPct);
    ctx.fillStyle = `rgba(${c.red},${c.green},${c.blue},${alpha})`;

    // k full sine periods across the width => the left and right edges match,
    // so the tileSprite wraps seamlessly.
    const baseY = h * baseFrac;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    for (let x = 0; x <= w; x += 6) {
      const y = baseY - amp * (0.5 + 0.5 * Math.sin((2 * Math.PI * k * x) / w));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
    tex.refresh();
  }
}
