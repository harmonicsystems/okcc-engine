import Phaser from 'phaser';
import { TX, prefersReducedMotion } from './registry';

// Object lane: the finish. Touch = level complete. Always reachable without any
// collectible or secret (constitution #6). Pulses to read as the objective.
export class Goal extends Phaser.Physics.Arcade.Image {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TX.role('goal'));
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body
    this.setDepth(7);

    if (!prefersReducedMotion()) {
      scene.tweens.add({
        targets: this,
        scaleY: 1.08,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }
}
