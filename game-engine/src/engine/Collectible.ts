import Phaser from 'phaser';
import { TX, prefersReducedMotion } from './registry';

// Object lane: touch = score. Spins and bobs so the reward reads as alive
// (constitution #3 + #6 — optional depth the goal never requires).
export class Collectible extends Phaser.Physics.Arcade.Image {
  readonly value: number;

  constructor(scene: Phaser.Scene, x: number, y: number, value = 1) {
    super(scene, x, y, TX.role('collectible'));
    this.value = value;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.setDepth(8);

    if (!prefersReducedMotion()) {
      scene.tweens.add({
        targets: this,
        y: y - 6,
        duration: 1100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      scene.tweens.add({ targets: this, angle: 360, duration: 2600, repeat: -1, ease: 'Linear' });
    }
  }
}
