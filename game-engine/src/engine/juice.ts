import Phaser from 'phaser';
import { THEME, FONT, css } from '../config/theme';
import { TX, prefersReducedMotion } from './registry';

// =====================================================================
//  juice.ts — constitution #5: every verb gets immediate confirmation.
//  collect bursts into copies of itself, landings puff dust, hits shake the
//  camera, wins throw fireworks made of the kids' own drawings.
//
//  Accessibility is first-class, not bolted on: when prefers-reduced-motion
//  is set, particle counts drop, screen shake is skipped, and pops stop
//  moving — the game stays fully playable and legible, never off-putting.
// =====================================================================

export class Juice {
  private scene: Phaser.Scene;
  private reduced: boolean;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.reduced = prefersReducedMotion();
  }

  /** The collectible bursts into copies of itself (textured with its own drawing). */
  collectBurst(x: number, y: number, textureKey: string): void {
    if (this.reduced) return;
    const p = this.scene.add.particles(x, y, textureKey, {
      speed: { min: 70, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.55, end: 0 },
      rotate: { start: 0, end: 180 },
      lifespan: 480,
      quantity: 10,
      emitting: false,
    });
    p.setDepth(40);
    p.explode(12, x, y);
    this.scene.time.delayedCall(560, () => p.destroy());
  }

  /** A small puff of dust on landing / launching. */
  puff(x: number, y: number, count = 6): void {
    if (this.reduced) return;
    const p = this.scene.add.particles(x, y, TX.dust, {
      speedX: { min: -60, max: 60 },
      speedY: { min: -90, max: -20 },
      scale: { start: 0.9, end: 0 },
      lifespan: 360,
      quantity: count,
      emitting: false,
    });
    p.setDepth(9);
    p.explode(count, x, y);
    this.scene.time.delayedCall(420, () => p.destroy());
  }

  /** A floating score / status pop that rises and fades. */
  pop(x: number, y: number, text: string, color: number = THEME.teal): void {
    const t = this.scene.add
      .text(x, y, text, {
        fontFamily: FONT.display,
        fontSize: '20px',
        color: css(color),
        stroke: css(THEME.machine),
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(50);
    if (this.reduced) {
      this.scene.time.delayedCall(550, () => t.destroy());
      return;
    }
    this.scene.tweens.add({
      targets: t,
      y: y - 36,
      alpha: 0,
      duration: 680,
      ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  shake(intensity = 0.008, duration = 160): void {
    if (this.reduced) return;
    this.scene.cameras.main.shake(duration, intensity);
  }

  flash(color: number = 0xffffff, duration = 140): void {
    if (this.reduced) return;
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    this.scene.cameras.main.flash(duration, r, g, b);
  }

  /** Win moment: fireworks made of the given drawings (player + collectible textures). */
  fireworks(textureKeys: string[]): void {
    const cam = this.scene.cameras.main;
    const keys = textureKeys.length ? textureKeys : [TX.spark];
    const count = this.reduced ? 1 : 5;
    for (let i = 0; i < count; i++) {
      const delay = i * 220;
      this.scene.time.delayedCall(delay, () => {
        const x = cam.scrollX + cam.width * (0.2 + Math.random() * 0.6);
        const y = cam.scrollY + cam.height * (0.2 + Math.random() * 0.4);
        const key = keys[i % keys.length];
        const p = this.scene.add.particles(x, y, key, {
          speed: { min: 80, max: 260 },
          angle: { min: 0, max: 360 },
          scale: { start: 0.6, end: 0 },
          lifespan: 700,
          quantity: this.reduced ? 6 : 16,
          emitting: false,
        });
        p.setDepth(60);
        p.explode(this.reduced ? 6 : 16, x, y);
        this.scene.time.delayedCall(800, () => p.destroy());
      });
    }
  }

  /** A soft glow on a sprite — WebGL only; degrades to nothing on Canvas. */
  addGlow(obj: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image, color: number): void {
    if (this.scene.renderer.type !== Phaser.WEBGL) return;
    try {
      // postFX exists on WebGL game objects
      (obj as unknown as { postFX: Phaser.GameObjects.Components.FX }).postFX.addGlow(
        color,
        4,
        0,
        false,
        0.1,
        12,
      );
    } catch {
      /* no-op: glow is pure polish */
    }
  }
}
