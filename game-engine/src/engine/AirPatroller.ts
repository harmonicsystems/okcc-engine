import Phaser from 'phaser';
import { TX, prefersReducedMotion } from './registry';

type Body = Phaser.Physics.Arcade.Body;

// Object lane: flies a path, touch = damage. Gravity-free; patrols along one
// axis with a gentle bob on the other. (Birds, insects, drones.)
//
// All motion is velocity-driven — for a dynamic body the body drives the
// sprite, so we must never set x/y directly or the physics step overwrites it.
export class AirPatroller extends Phaser.Physics.Arcade.Sprite {
  private axis: 'x' | 'y';
  private start: number;
  private range: number;
  private speed: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    opts: { range?: number; speed?: number; dir?: number; axis?: 'x' | 'y' } = {},
  ) {
    super(scene, x, y, TX.role('airPatroller'));
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(8);

    this.axis = opts.axis ?? 'x';
    this.range = opts.range ?? 120;
    this.speed = opts.speed ?? 80;
    const dir = (opts.dir ?? 1) >= 0 ? 1 : -1;

    const body = this.body as Body;
    body.setAllowGravity(false);
    this.start = this.axis === 'x' ? x : y;
    if (this.axis === 'x') body.setVelocityX(this.speed * dir);
    else body.setVelocityY(this.speed * dir);
  }

  update(time: number): void {
    const body = this.body as Body;
    const bob = prefersReducedMotion() ? 0 : Math.cos(time / 280) * 40;
    if (this.axis === 'x') {
      const pos = this.x;
      if (pos >= this.start + this.range && body.velocity.x > 0) body.setVelocityX(-this.speed);
      else if (pos <= this.start && body.velocity.x < 0) body.setVelocityX(this.speed);
      body.setVelocityY(bob); // gentle vertical bob
      this.setFlipX(body.velocity.x < 0);
    } else {
      const pos = this.y;
      if (pos >= this.start + this.range && body.velocity.y > 0) body.setVelocityY(-this.speed);
      else if (pos <= this.start && body.velocity.y < 0) body.setVelocityY(this.speed);
      body.setVelocityX(bob);
    }
  }
}
