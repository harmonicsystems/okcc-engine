import Phaser from 'phaser';
import { FEEL } from '../config/variables';
import { TX, prefersReducedMotion } from './registry';
import type { Player } from './Player';

// Object lane: a placeable launcher (the see-saw's cousin). Land on top -> fling
// up. Same primitive as the `bouncy` platform, wearing a separable drawing.
export class BouncePad extends Phaser.Physics.Arcade.Image {
  readonly power: number;

  constructor(scene: Phaser.Scene, x: number, y: number, power?: number) {
    super(scene, x, y, TX.role('bouncePad'));
    this.power = power ?? FEEL.bounce * 1.08;
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body
    this.setDepth(6);
  }

  launch(player: Player): void {
    player.bounce(this.power);
    if (prefersReducedMotion()) return;
    this.scene.tweens.killTweensOf(this);
    this.setScale(1, 0.7);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 180,
      ease: 'Back.easeOut',
    });
  }
}
