import Phaser from 'phaser';
import type { PlatformType } from '../../config/roles';
import { TX, prefersReducedMotion } from '../registry';
import type { Player } from '../Player';

// =====================================================================
//  platforms/factory.ts — the seven primitives, data-driven.
//  Distinctiveness comes from layout + selection, never new code: a `type`
//  and a few params (range, speed, dir, push) flow straight from Tiled into
//  one factory. A basketball hoop and a raft are the same `move` platform
//  wearing different drawings.
//
//    static   solid, stand on it
//    oneway   jump up through, land on top
//    crumble  stand too long -> it falls, then rebuilds
//    bouncy   trampoline launch
//    conveyor pushes whatever stands on it (dir, push)
//    move     horizontal moving platform, carries you (range, speed)
//    elevator vertical lift, carries you (range, speed)
// =====================================================================

export interface PlatformParams {
  range?: number; // travel distance (px) for move/elevator
  speed?: number; // travel speed (px/s) for move/elevator
  dir?: number; // +1 / -1 push direction for conveyor
  push?: number; // push strength (px/s) for conveyor
}

export interface PlatformSpec {
  type: PlatformType;
  /** top-left + size, exactly as Tiled gives it */
  x: number;
  y: number;
  w: number;
  h: number;
  params?: PlatformParams;
}

type Body = Phaser.Physics.Arcade.Body;
type StaticBody = Phaser.Physics.Arcade.StaticBody;

const CRUMBLE_ARM_MS = 480;
const CRUMBLE_REBUILD_MS = 1500;

/** Is the player standing on top of this platform right now? */
function riding(player: Player, go: Phaser.GameObjects.TileSprite): boolean {
  if (!player.grounded) return false;
  const pb = player.body as Body;
  const gb = go.body as Body | StaticBody;
  const xOverlap = pb.right > gb.x && pb.x < gb.right;
  const onTop = pb.bottom <= gb.y + 8 && pb.bottom >= gb.y - 6;
  return xOverlap && onTop;
}

export class Platform {
  readonly go: Phaser.GameObjects.TileSprite;
  readonly type: PlatformType;
  /** how the GameScene should wire collisions */
  readonly collision: 'solid' | 'oneway' | 'mover';

  private scene: Phaser.Scene;
  private params: PlatformParams;
  private startX: number;
  private startY: number;
  private speed: number;
  private crumbleState: 'solid' | 'arming' | 'gone' = 'solid';
  private crumbleTimer = 0;

  constructor(scene: Phaser.Scene, spec: PlatformSpec) {
    this.scene = scene;
    this.type = spec.type;
    this.params = spec.params ?? {};

    const cx = spec.x + spec.w / 2;
    const cy = spec.y + spec.h / 2;
    this.startX = cx;
    this.startY = cy;
    this.speed = this.params.speed ?? 60;

    this.go = scene.add.tileSprite(cx, cy, spec.w, spec.h, TX.role(spec.type));
    this.go.setDepth(5);
    this.go.setData('platform', this);

    const isMover = spec.type === 'move' || spec.type === 'elevator';
    scene.physics.add.existing(this.go, !isMover); // static unless it travels

    if (isMover) {
      const b = this.go.body as Body;
      b.setAllowGravity(false);
      b.setImmovable(true);
      if (spec.type === 'move') b.setVelocityX(this.speed);
      else b.setVelocityY(this.speed);
      this.collision = 'mover';
    } else {
      this.collision = spec.type === 'oneway' ? 'oneway' : 'solid';
    }
  }

  /** Per-frame behavior: travel + carry the rider; conveyor push; crumble countdown. */
  update(dtMs: number, player: Player): void {
    switch (this.type) {
      case 'move': {
        const b = this.go.body as Body;
        const range = this.params.range ?? 120;
        if (this.go.x >= this.startX + range && b.velocity.x > 0) b.setVelocityX(-this.speed);
        else if (this.go.x <= this.startX && b.velocity.x < 0) b.setVelocityX(this.speed);
        if (riding(player, this.go)) player.x += b.deltaX();
        break;
      }
      case 'elevator': {
        const b = this.go.body as Body;
        const range = this.params.range ?? 120;
        if (this.go.y >= this.startY + range && b.velocity.y > 0) b.setVelocityY(-this.speed);
        else if (this.go.y <= this.startY && b.velocity.y < 0) b.setVelocityY(this.speed);
        if (riding(player, this.go)) {
          player.x += b.deltaX();
          if (b.deltaY() > 0) player.y += b.deltaY(); // carry down; up is handled by collision
        }
        break;
      }
      case 'conveyor': {
        const dir = this.params.dir ?? 1;
        const push = this.params.push ?? 90;
        const step = (dir * push * dtMs) / 1000;
        this.go.tilePositionX += step; // visual flow
        if (riding(player, this.go)) player.x += step;
        break;
      }
      case 'crumble': {
        if (this.crumbleState === 'arming') {
          this.crumbleTimer -= dtMs;
          if (!prefersReducedMotion()) {
            this.go.x = this.startX + (Math.random() - 0.5) * 2; // a nervous shiver
          }
          if (this.crumbleTimer <= 0) this.fall();
        }
        break;
      }
      default:
        break; // static, oneway, bouncy need no per-frame work
    }
  }

  /** Called by the GameScene collider when the player lands on top. */
  onLand(player: Player): void {
    if (this.type === 'bouncy') {
      const pb = player.body as Body;
      if (pb.velocity.y >= -50) player.bounce();
    } else if (this.type === 'crumble' && this.crumbleState === 'solid') {
      this.crumbleState = 'arming';
      this.crumbleTimer = CRUMBLE_ARM_MS;
    }
  }

  private fall(): void {
    this.crumbleState = 'gone';
    const body = this.go.body as StaticBody;
    body.enable = false; // the player drops through immediately
    const finish = () => this.scheduleRebuild();
    if (prefersReducedMotion()) {
      this.go.setAlpha(0);
      finish();
    } else {
      this.scene.tweens.add({
        targets: this.go,
        y: this.startY + 90,
        alpha: 0,
        duration: 260,
        ease: 'Quad.easeIn',
        onComplete: finish,
      });
    }
  }

  private scheduleRebuild(): void {
    this.scene.time.delayedCall(CRUMBLE_REBUILD_MS, () => {
      this.go.setPosition(this.startX, this.startY);
      this.go.setAlpha(1);
      const body = this.go.body as StaticBody;
      body.enable = true;
      body.updateFromGameObject();
      this.crumbleState = 'solid';
      this.crumbleTimer = 0;
    });
  }
}

export function makePlatform(scene: Phaser.Scene, spec: PlatformSpec): Platform {
  return new Platform(scene, spec);
}

/**
 * Wire all the player↔platform colliders in one place: solids (with the
 * land callback for bounce/crumble), one-ways (with the pass-up-through
 * process callback), and movers.
 */
export function setupPlatformColliders(
  scene: Phaser.Scene,
  player: Player,
  platforms: Platform[],
): void {
  const solids = platforms.filter((p) => p.collision === 'solid').map((p) => p.go);
  const oneways = platforms.filter((p) => p.collision === 'oneway').map((p) => p.go);
  const movers = platforms.filter((p) => p.collision === 'mover').map((p) => p.go);

  const onLand: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (obj1, _obj2) => {
    const pl = obj1 as unknown as Player;
    const go = _obj2 as Phaser.GameObjects.TileSprite;
    const plat = go.getData('platform') as Platform | undefined;
    if (plat && (pl.body as Body).touching.down) plat.onLand(pl);
  };

  // one-way: only collide when descending onto the top edge
  const onewayProcess: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (obj1, obj2) => {
    const pb = (obj1 as unknown as Player).body as Body;
    const gb = (obj2 as Phaser.GameObjects.TileSprite).body as StaticBody;
    return (pb.velocity.y >= 0 && pb.bottom - pb.deltaY() <= gb.y + 6) as unknown as boolean;
  };

  if (solids.length) scene.physics.add.collider(player, solids, onLand);
  if (movers.length) scene.physics.add.collider(player, movers, onLand);
  if (oneways.length) scene.physics.add.collider(player, oneways, undefined, onewayProcess);
}
