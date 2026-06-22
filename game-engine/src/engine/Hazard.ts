import Phaser from 'phaser';
import { TX, prefersReducedMotion } from './registry';

// Object lane: static, touch = damage. Pulses so the threat reads by motion,
// not color alone (accessibility invariant).
export class Hazard extends Phaser.Physics.Arcade.Image {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TX.role('hazard'));
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body
    this.setDepth(7);

    if (!prefersReducedMotion()) {
      scene.tweens.add({
        targets: this,
        scaleX: 1.1,
        scaleY: 1.12,
        duration: 620,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }
}
