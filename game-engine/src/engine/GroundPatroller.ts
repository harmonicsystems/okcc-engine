import Phaser from 'phaser';
import { TX } from './registry';

type Body = Phaser.Physics.Arcade.Body;

// Object lane: walks a path, touch = damage. Gravity-bound; collides with the
// ground. Turns at its patrol bounds or when it bumps a wall. (Bikes, woodchucks,
// basketballs — all the same primitive.)
export class GroundPatroller extends Phaser.Physics.Arcade.Sprite {
  private startX: number;
  private range: number;
  private speed: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    opts: { range?: number; speed?: number; dir?: number } = {},
  ) {
    super(scene, x, y, TX.role('groundPatroller'));
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(8);

    this.startX = x;
    this.range = opts.range ?? 90;
    this.speed = opts.speed ?? 70;
    const dir = (opts.dir ?? 1) >= 0 ? 1 : -1;

    const body = this.body as Body;
    body.setVelocityX(this.speed * dir);
    const inset = 4;
    body.setSize(this.width - inset * 2, this.height - inset);
    body.setOffset(inset, inset);
  }

  update(): void {
    const body = this.body as Body | null;
    if (!body) return; // destroyed (e.g. smashed while invincible)
    if (this.x >= this.startX + this.range && body.velocity.x > 0) {
      body.setVelocityX(-this.speed);
    } else if (this.x <= this.startX && body.velocity.x < 0) {
      body.setVelocityX(this.speed);
    }
    if (body.blocked.right) body.setVelocityX(-this.speed);
    else if (body.blocked.left) body.setVelocityX(this.speed);
    this.setFlipX(body.velocity.x < 0);
  }
}
