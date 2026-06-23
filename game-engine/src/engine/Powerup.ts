import Phaser from 'phaser';
import { TX, prefersReducedMotion } from './registry';

export type PowerKind = 'speed' | 'star';

// Object lane, optional depth (constitution #6): touch = grant a timed power.
// `speed` = the cyan orb (boost + afterimages); `star` = invincibility
// (hue-rotation + smash-through-enemies). One entity, two skins + effects.
export class Powerup extends Phaser.Physics.Arcade.Image {
  readonly kind: PowerKind;
  readonly duration: number;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: PowerKind, duration: number) {
    super(scene, x, y, TX.role(kind === 'speed' ? 'speedPower' : 'starPower'));
    this.kind = kind;
    this.duration = duration;
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body
    this.setDepth(8);

    if (!prefersReducedMotion()) {
      if (kind === 'speed') {
        scene.tweens.add({
          targets: this,
          scale: 1.22,
          duration: 520,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      } else {
        scene.tweens.add({ targets: this, angle: 360, duration: 1200, repeat: -1, ease: 'Linear' });
      }
    }
  }
}
