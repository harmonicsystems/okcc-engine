import Phaser from 'phaser';
import type { CharacterDef } from '../config/characters';
import { resolveFeel, type Feel } from '../config/variables';
import { TX, prefersReducedMotion } from './registry';
import type { Controls } from './Controls';

// =====================================================================
//  Player.ts — the character controller. CLAUDE.md constitution #1: the
//  foundation nothing above survives without. Coyote time, jump buffering,
//  and rise-vs-fall asymmetry are REQUIRED, not polish.
//
//  It is art-agnostic: it reads a CharacterDef (a saved set of feel dials +
//  a texture) and behaves. Swapping the drawing changes nothing here.
//
//  It emits events the scene turns into juice + sfx, so feel and feedback
//  stay decoupled:  'jump' | 'doublejump' | 'land' | 'bounce' | 'hurt'
// =====================================================================

const FALL_CAP = 1600; // terminal velocity (px/s)
const INVINCIBLE_MS = 1000;

export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly def: CharacterDef;
  readonly feel: Feel;
  facing: 1 | -1 = 1;

  private jumpsUsed = 0;
  private coyote = 0; // ms of coyote grace remaining
  private buffer = 0; // ms of jump-buffer remaining
  private wasJumpHeld = false;
  private wasGrounded = false;
  private invincible = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, def: CharacterDef) {
    super(scene, x, y, TX.char(def.key));
    this.def = def;
    this.feel = resolveFeel(def.feel);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    // a slightly inset hitbox feels fairer than a pixel-exact one
    const inset = Math.round(def.size * 0.14);
    body.setSize(def.size - inset * 2, def.size - inset * 2);
    body.setOffset(inset, inset);
    body.setMaxVelocity(this.feel.speed, FALL_CAP);
    body.setGravityY(this.feel.gravity);

    this.setDepth(10);
  }

  get isInvincible(): boolean {
    return this.invincible > 0;
  }

  get grounded(): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    return body.blocked.down || body.touching.down;
  }

  /** Called every frame by GameScene, after controls.update(). */
  step(controls: Controls, dtMs: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const grounded = this.grounded;

    // --- forgiveness timers (coyote + buffer) ---
    if (grounded) {
      this.jumpsUsed = 0;
      this.coyote = this.feel.coyoteMs;
    } else {
      this.coyote -= dtMs;
      if (this.coyote <= 0) {
        this.coyote = 0;
        // walked off a ledge without jumping -> you've spent the ground jump
        if (this.jumpsUsed === 0) this.jumpsUsed = 1;
      }
    }
    if (this.buffer > 0) this.buffer -= dtMs;
    if (controls.jumpJustPressed) this.buffer = this.feel.bufferMs;

    // --- horizontal: accelerate to speed, coast with friction ---
    const dir = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
    const control = grounded ? 1 : this.feel.airControl;
    if (dir !== 0) {
      const turning = Math.sign(body.velocity.x) === -dir && Math.abs(body.velocity.x) > 10;
      body.setAccelerationX(dir * this.feel.accel * control * (turning ? 1.8 : 1));
      body.setDragX(0);
      this.facing = dir as 1 | -1;
      this.setFlipX(dir < 0);
    } else {
      body.setAccelerationX(0);
      // keep air momentum; brake firmly on the ground
      body.setDragX(grounded ? this.feel.friction : this.feel.friction * 0.2);
    }

    // --- jump (uses the buffer; coyote counts as a ground jump) ---
    if (this.buffer > 0 && this.jumpsUsed < this.feel.maxJumps) {
      const ground = grounded || this.coyote > 0;
      body.setVelocityY(-this.feel.jump);
      this.jumpsUsed += 1;
      this.coyote = 0;
      this.buffer = 0;
      this.wasJumpHeld = true;
      this.squash(0.72, 1.3, 120);
      this.emit(ground && this.jumpsUsed === 1 ? 'jump' : 'doublejump');
    }

    // --- variable jump height: release early -> short hop ---
    if (this.wasJumpHeld && !controls.jumpHeld && body.velocity.y < -this.feel.cutVelocity) {
      body.setVelocityY(-this.feel.cutVelocity);
    }
    this.wasJumpHeld = controls.jumpHeld;

    // --- rise-vs-fall asymmetry: falls faster than it rises ---
    const rising = body.velocity.y < 0;
    const heavy = !rising || !controls.jumpHeld; // falling, or released mid-rise
    body.setGravityY(this.feel.gravity * (heavy ? this.feel.fallMultiplier : 1));

    // --- landing ---
    if (grounded && !this.wasGrounded) {
      this.emit('land');
      this.squash(1.26, 0.76, 130);
    }
    this.wasGrounded = grounded;

    // --- invincibility blink after a hit ---
    if (this.invincible > 0) {
      this.invincible -= dtMs;
      this.setAlpha(Math.floor(this.invincible / 80) % 2 === 0 ? 1 : 0.35);
      if (this.invincible <= 0) {
        this.invincible = 0;
        this.setAlpha(1);
        this.clearTint();
      }
    }
  }

  /** Launch upward from a bounce pad / bouncy platform. Refreshes the air jumps. */
  bounce(power?: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityY(-(power ?? this.feel.bounce));
    this.jumpsUsed = 0;
    this.squash(0.6, 1.45, 160);
    this.emit('bounce');
  }

  /** Take a hit from a hazard at world-x `fromX`. Returns false if currently immune. */
  takeHit(fromX: number): boolean {
    if (this.invincible > 0) return false;
    this.invincible = INVINCIBLE_MS;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const away = this.x < fromX ? -1 : 1;
    body.setVelocity(away * 220, -260);
    this.setTint(0xff6b6b);
    this.emit('hurt');
    return true;
  }

  /** Hard reset to a respawn point (after a pit fall). */
  respawn(x: number, y: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.reset(x, y);
    this.jumpsUsed = 0;
    this.coyote = 0;
    this.buffer = 0;
    this.setAlpha(1);
    this.clearTint();
  }

  private squash(sx: number, sy: number, ms: number): void {
    if (prefersReducedMotion()) {
      this.setScale(1, 1);
      return;
    }
    this.scene.tweens.killTweensOf(this);
    this.setScale(sx, sy);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: ms,
      ease: 'Quad.easeOut',
    });
  }
}
