import Phaser from 'phaser';
import type { CharacterDef } from '../config/characters';
import { resolveFeel, type Feel, POWERUPS } from '../config/variables';
import { THEME } from '../config/theme';
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
//  It also owns its power-up state (constitution #6, optional depth) and the
//  postFX it wears, so the speed/invincibility effects modulate the player's
//  own glow + hue without coupling to the scene.
//
//  Events the scene turns into juice + sfx, so feel + feedback stay decoupled:
//    'jump' | 'doublejump' | 'land' | 'bounce' | 'hurt' | 'powerup'(kind)
// =====================================================================

const FALL_CAP = 1600; // terminal velocity (px/s)
const HURT_IMMUNE_MS = 1000; // post-hit damage immunity (the blink)
const BASE_GLOW = 4;
const STAR_GLOW = 9; // brighter glow while invincible
const STAR_TINT = 0xffe066; // steady, renderer-independent invincibility tell (Canvas + reduced-motion safe)

export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly def: CharacterDef;
  readonly feel: Feel;
  facing: 1 | -1 = 1;

  private jumpsUsed = 0;
  private coyote = 0; // ms of coyote grace remaining
  private buffer = 0; // ms of jump-buffer remaining
  private wasJumpHeld = false;
  private wasGrounded = false;
  private hurtImmuneMs = 0;

  // power-ups
  private speedMs = 0;
  private starMs = 0;
  private echoAcc = 0;
  private hueA = 0;
  private wasStar = false;
  private glowFX?: Phaser.FX.Glow;
  private hueFX?: Phaser.FX.ColorMatrix;

  constructor(scene: Phaser.Scene, x: number, y: number, def: CharacterDef) {
    super(scene, x, y, TX.char(def.key));
    this.def = def;
    this.feel = resolveFeel(def.feel);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    // Size the hitbox from the actual texture (baked to size in Boot), so a tall
    // mural robot collides at its torso while a square placeholder stays square.
    const tw = this.width;
    const th = this.height;
    if (def.bodyFrac) {
      const bf = def.bodyFrac;
      const bw = Math.round(tw * bf.w);
      const bh = Math.round(th * bf.h);
      body.setSize(bw, bh);
      body.setOffset(Math.round(tw * bf.cx - bw / 2), Math.round(th * bf.cy - bh / 2));
    } else {
      // a slightly inset hitbox feels fairer than a pixel-exact one
      const inset = Math.round(tw * 0.14);
      body.setSize(tw - inset * 2, th - inset * 2);
      body.setOffset(inset, inset);
    }
    body.setMaxVelocity(this.feel.speed, FALL_CAP);
    body.setGravityY(this.feel.gravity);

    this.setDepth(10);

    // the player owns its FX (WebGL-only; degrade gracefully to Canvas)
    if (scene.renderer.type === Phaser.WEBGL) {
      try {
        this.glowFX = this.postFX.addGlow(THEME.teal, BASE_GLOW);
        this.hueFX = this.postFX.addColorMatrix();
      } catch {
        /* FX are pure polish */
      }
    }
  }

  get grounded(): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    return body.blocked.down || body.touching.down;
  }

  get hasSpeed(): boolean {
    return this.speedMs > 0;
  }
  get hasStar(): boolean {
    return this.starMs > 0;
  }
  /** Immune to damage right now (post-hit blink OR invincibility star). */
  get isInvulnerable(): boolean {
    return this.hurtImmuneMs > 0 || this.starMs > 0;
  }
  get speedMsLeft(): number {
    return Math.max(0, this.speedMs);
  }
  get starMsLeft(): number {
    return Math.max(0, this.starMs);
  }

  /** Grant (or extend) a power-up. */
  grantPower(kind: 'speed' | 'star', ms: number): void {
    if (kind === 'speed') this.speedMs = Math.max(this.speedMs, ms);
    else this.starMs = Math.max(this.starMs, ms);
    this.emit('powerup', kind);
  }

  /** Called every frame by GameScene, after controls.update(). */
  step(controls: Controls, dtMs: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const grounded = this.grounded;

    // --- power-up timers + the speed cap ---
    if (this.speedMs > 0) this.speedMs -= dtMs;
    if (this.starMs > 0) this.starMs -= dtMs;
    const boosting = this.speedMs > 0;
    body.setMaxVelocity(this.feel.speed * (boosting ? POWERUPS.speedBoost : 1), FALL_CAP);

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

    // --- horizontal: accelerate to (boosted) speed, coast with friction ---
    const dir = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
    const control = grounded ? 1 : this.feel.airControl;
    const boostMul = boosting ? POWERUPS.speedBoost : 1;
    if (dir !== 0) {
      const turning = Math.sign(body.velocity.x) === -dir && Math.abs(body.velocity.x) > 10;
      body.setAccelerationX(dir * this.feel.accel * control * (turning ? 1.8 : 1) * boostMul);
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

    // --- speed: phased afterimage ghosts while moving fast ---
    if (boosting && !prefersReducedMotion() && Math.abs(body.velocity.x) > 30) {
      this.echoAcc += dtMs;
      if (this.echoAcc >= POWERUPS.echoMs) {
        this.spawnEcho();
        this.echoAcc = 0;
      }
    }

    // --- invincibility tell ---
    // A steady tint is the renderer-independent, motion-safe signal (works on
    // Canvas and with prefers-reduced-motion, where the WebGL hue/glow + sparkles
    // are absent). On WebGL we add the flashy hue-rotation + brighter glow on top.
    if (this.starMs > 0) {
      this.setTint(STAR_TINT); // every frame: self-heals after any clearTint
      if (this.hueFX) {
        // slow the cycle under reduced motion, never stop it jarringly
        this.hueA = (this.hueA + (prefersReducedMotion() ? 1.5 : 6)) % 360;
        this.hueFX.hue(this.hueA);
        if (this.glowFX) this.glowFX.outerStrength = STAR_GLOW;
      }
      this.wasStar = true;
    } else if (this.wasStar) {
      this.clearTint();
      if (this.hueFX) this.hueFX.reset();
      if (this.glowFX) this.glowFX.outerStrength = BASE_GLOW;
      this.wasStar = false;
    }

    // --- post-hit immunity blink ---
    if (this.hurtImmuneMs > 0) {
      this.hurtImmuneMs -= dtMs;
      this.setAlpha(Math.floor(this.hurtImmuneMs / 80) % 2 === 0 ? 1 : 0.35);
      if (this.hurtImmuneMs <= 0) {
        this.hurtImmuneMs = 0;
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
    if (this.isInvulnerable) return false;
    this.hurtImmuneMs = HURT_IMMUNE_MS;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const away = this.x < fromX ? -1 : 1;
    body.setVelocity(away * 220, -260);
    this.setTint(0xff6b6b);
    this.emit('hurt');
    return true;
  }

  /** Hard reset to a respawn point (after a pit fall). Clears power-ups + FX. */
  respawn(x: number, y: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.reset(x, y);
    this.jumpsUsed = 0;
    this.coyote = 0;
    this.buffer = 0;
    this.speedMs = 0;
    this.starMs = 0;
    this.hurtImmuneMs = 0;
    this.setAlpha(1);
    this.clearTint();
    if (this.hueFX) this.hueFX.reset();
    if (this.glowFX) this.glowFX.outerStrength = BASE_GLOW;
    this.wasStar = false;
  }

  /** A fading, cyan-tinted ghost of the player — the speed afterimage. */
  private spawnEcho(): void {
    const ghost = this.scene.add
      .image(this.x, this.y, this.texture.key)
      .setScale(this.scaleX, this.scaleY)
      .setFlipX(this.flipX)
      .setAlpha(0.5)
      .setTint(0x7fdfff)
      .setDepth(this.depth - 1);
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: 260,
      onComplete: () => ghost.destroy(),
    });
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
