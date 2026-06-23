import Phaser from 'phaser';
import { THEME, FONT, css } from '../config/theme';
import { levelByKey, nextLevelKey, LEVELS } from '../config/assets';
import { characterByKey } from '../config/characters';
import { Player } from '../engine/Player';
import { Controls } from '../engine/Controls';
import { Juice } from '../engine/juice';
import { Sfx } from '../engine/sfx';
import { Parallax } from '../engine/Parallax';
import {
  makePlatform,
  setupPlatformColliders,
  type Platform,
  type PlatformParams,
} from '../engine/platforms/factory';
import type { PlatformType } from '../config/roles';
import { POWERUPS } from '../config/variables';
import { Collectible } from '../engine/Collectible';
import { Hazard } from '../engine/Hazard';
import { Goal } from '../engine/Goal';
import { BouncePad } from '../engine/BouncePad';
import { GroundPatroller } from '../engine/GroundPatroller';
import { AirPatroller } from '../engine/AirPatroller';
import { Powerup } from '../engine/Powerup';
import { Hud } from '../hud/Hud';
import { TX, addScore, getScore } from '../engine/registry';

type Body = Phaser.Physics.Arcade.Body;
type TiledObject = Phaser.Types.Tilemaps.TiledObject;

interface GameData {
  char: string;
  level: string;
}

function readProp<T>(obj: TiledObject, name: string, def: T): T {
  const ps = obj.properties as Array<{ name: string; value: unknown }> | undefined;
  if (!Array.isArray(ps)) return def;
  const f = ps.find((p) => p.name === name);
  return (f ? (f.value as T) : def);
}

function objClass(obj: TiledObject): string {
  return (obj.type || (obj as { class?: string }).class || obj.name || '') as string;
}

// THE one GameScene. It is *told* which character + level to run via init(data)
// and builds the level from its Tiled data with the chosen controller settings.
// Parameterized and reused — never forked per level (CLAUDE.md invariant).
export class GameScene extends Phaser.Scene {
  private charKey = 'skeleton';
  private levelKey = 'park';

  private player!: Player;
  private controls!: Controls;
  private juice!: Juice;
  private sfx!: Sfx;
  private hud!: Hud;
  private parallax!: Parallax;

  private platforms: Platform[] = [];
  private collectibles: Collectible[] = [];
  private hazards: Hazard[] = [];
  private groundPatrollers: GroundPatroller[] = [];
  private airPatrollers: AirPatroller[] = [];
  private bouncePads: BouncePad[] = [];
  private powerups: Powerup[] = [];

  private spawn = { x: 80, y: 0 };
  private worldH = 576;
  private maxHearts = 3;
  private hearts = 3;
  private finished = false;
  private sparkAcc = 0;

  constructor() {
    super('Game');
  }

  init(data: GameData): void {
    this.charKey = data.char ?? 'skeleton';
    this.levelKey = data.level ?? 'park';
    this.finished = false;
    this.hearts = this.maxHearts;
    // fresh collections every (re)entry
    this.platforms = [];
    this.collectibles = [];
    this.hazards = [];
    this.groundPatrollers = [];
    this.airPatrollers = [];
    this.bouncePads = [];
    this.powerups = [];
  }

  create(): void {
    const level = levelByKey(this.levelKey) ?? LEVELS[0];
    const charDef = characterByKey(this.charKey);

    this.cameras.main.setBackgroundColor(THEME.machine);
    this.parallax = new Parallax(this, level.motif, this.cameras.main.width, this.cameras.main.height);
    this.juice = new Juice(this);
    this.sfx = new Sfx(this);
    this.controls = new Controls(this);

    // ---- build the level from Tiled object layers ----
    const map = this.make.tilemap({ key: level.key });
    const worldW = map.widthInPixels || 1920;
    this.worldH = map.heightInPixels || 576;

    this.parseSpawn(map);
    this.parsePlatforms(map);
    this.parseEnemies(map);
    this.parseCollectibles(map);
    const goal = this.parseGoal(map);
    this.parseLabels(map);

    // ---- the player ----
    this.player = new Player(this, this.spawn.x, this.spawn.y, charDef);
    this.physics.world.setBounds(0, 0, worldW, this.worldH + 400);
    this.cameras.main.setBounds(0, 0, worldW, this.worldH);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.wirePlayerFeedback();

    // ---- colliders & overlaps ----
    setupPlatformColliders(this, this.player, this.platforms);
    const groundGos = this.platforms
      .filter((p) => p.collision === 'solid' || p.collision === 'oneway')
      .map((p) => p.go);
    if (groundGos.length && this.groundPatrollers.length) {
      this.physics.add.collider(this.groundPatrollers, groundGos);
    }

    this.physics.add.overlap(this.player, this.collectibles, (_pl, obj) =>
      this.collect(obj as unknown as Collectible),
    );
    this.physics.add.overlap(this.player, this.hazards, (_pl, obj) =>
      this.hit((obj as unknown as Hazard).x),
    );
    this.physics.add.overlap(this.player, this.groundPatrollers, (_pl, obj) =>
      this.touchEnemy(obj as unknown as GroundPatroller),
    );
    this.physics.add.overlap(this.player, this.airPatrollers, (_pl, obj) =>
      this.touchEnemy(obj as unknown as AirPatroller),
    );
    this.physics.add.collider(this.player, this.bouncePads, (_pl, obj) => {
      const pad = obj as unknown as BouncePad;
      if ((this.player.body as Body).touching.down) pad.launch(this.player);
    });
    this.physics.add.overlap(this.player, this.powerups, (_pl, obj) =>
      this.grabPowerup(obj as unknown as Powerup),
    );
    if (goal) this.physics.add.overlap(this.player, goal, () => this.win());

    // ---- hud + touch ----
    this.hud = new Hud(this, this.maxHearts);
    this.hud.setHearts(this.hearts);
    this.hud.setScore(getScore(this));
    this.buildTouchControls();

    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Menu'));
  }

  // ------------------------------------------------------------------
  //  Tiled parsing
  // ------------------------------------------------------------------
  private layer(map: Phaser.Tilemaps.Tilemap, name: string): TiledObject[] {
    return map.getObjectLayer(name)?.objects ?? [];
  }

  private parseSpawn(map: Phaser.Tilemaps.Tilemap): void {
    const s = this.layer(map, 'Spawn')[0];
    this.spawn = s ? { x: s.x ?? 80, y: s.y ?? 0 } : { x: 80, y: this.worldH - 140 };
  }

  private parsePlatforms(map: Phaser.Tilemaps.Tilemap): void {
    for (const o of this.layer(map, 'Platforms')) {
      const type = objClass(o) as PlatformType;
      const params: PlatformParams = {
        range: readProp(o, 'range', undefined as number | undefined),
        speed: readProp(o, 'speed', undefined as number | undefined),
        dir: readProp(o, 'dir', undefined as number | undefined),
        push: readProp(o, 'push', undefined as number | undefined),
      };
      this.platforms.push(
        makePlatform(this, {
          type,
          x: o.x ?? 0,
          y: o.y ?? 0,
          w: o.width ?? 32,
          h: o.height ?? 32,
          params,
        }),
      );
    }
  }

  private parseEnemies(map: Phaser.Tilemaps.Tilemap): void {
    for (const o of this.layer(map, 'Enemies')) {
      const cls = objClass(o);
      const x = o.x ?? 0;
      const y = o.y ?? 0;
      const opts = {
        range: readProp(o, 'range', undefined as number | undefined),
        speed: readProp(o, 'speed', undefined as number | undefined),
        dir: readProp(o, 'dir', undefined as number | undefined),
      };
      if (cls === 'groundPatroller') {
        this.groundPatrollers.push(new GroundPatroller(this, x, y, opts));
      } else if (cls === 'airPatroller') {
        const axis = readProp(o, 'axis', 'x') as 'x' | 'y';
        this.airPatrollers.push(new AirPatroller(this, x, y, { ...opts, axis }));
      } else if (cls === 'bouncePad') {
        this.bouncePads.push(new BouncePad(this, x, y, readProp(o, 'power', undefined as number | undefined)));
      } else if (cls === 'hazard') {
        this.hazards.push(new Hazard(this, x, y));
      } else if (cls === 'speedPower') {
        this.powerups.push(new Powerup(this, x, y, 'speed', readProp(o, 'duration', POWERUPS.speedMs)));
      } else if (cls === 'starPower') {
        this.powerups.push(new Powerup(this, x, y, 'star', readProp(o, 'duration', POWERUPS.starMs)));
      }
    }
  }

  private parseCollectibles(map: Phaser.Tilemaps.Tilemap): void {
    for (const o of this.layer(map, 'Collectibles')) {
      this.collectibles.push(new Collectible(this, o.x ?? 0, o.y ?? 0, readProp(o, 'value', 1)));
    }
  }

  private parseGoal(map: Phaser.Tilemaps.Tilemap): Goal | undefined {
    const g = this.layer(map, 'Goal')[0];
    if (!g) return undefined;
    return new Goal(this, g.x ?? 0, g.y ?? 0);
  }

  private parseLabels(map: Phaser.Tilemaps.Tilemap): void {
    for (const o of this.layer(map, 'Labels')) {
      const text =
        (o as { text?: { text?: string } }).text?.text ?? readProp(o, 'text', o.name ?? '');
      if (!text) continue;
      this.add
        .text(o.x ?? 0, o.y ?? 0, text, {
          fontFamily: FONT.mono,
          fontSize: '13px',
          color: css(THEME.muted),
        })
        .setDepth(2);
    }
  }

  // ------------------------------------------------------------------
  //  Feedback wiring (decoupled from the controller)
  // ------------------------------------------------------------------
  private wirePlayerFeedback(): void {
    const bottom = () => (this.player.body as Body).bottom;
    this.player.on('jump', () => {
      this.sfx.jump();
      this.juice.puff(this.player.x, bottom(), 4);
    });
    this.player.on('doublejump', () => {
      this.sfx.doubleJump();
      this.juice.puff(this.player.x, this.player.y, 5);
    });
    this.player.on('land', () => this.juice.puff(this.player.x, bottom(), 5));
    this.player.on('bounce', () => {
      this.sfx.bounce();
      this.juice.puff(this.player.x, bottom(), 8);
    });
    this.player.on('powerup', (kind: 'speed' | 'star') => {
      this.sfx.powerup();
      this.juice.pop(
        this.player.x,
        this.player.y - 34,
        kind === 'speed' ? 'SPEED!' : 'STAR!',
        kind === 'speed' ? 0x4cc9f0 : 0xfde047,
      );
    });
  }

  // ------------------------------------------------------------------
  //  Interactions
  // ------------------------------------------------------------------
  private collect(c: Collectible): void {
    if (!c.active) return;
    const total = addScore(this, c.value);
    this.hud.setScore(total);
    this.juice.collectBurst(c.x, c.y, c.texture.key);
    this.juice.pop(c.x, c.y - 10, '+' + c.value);
    this.sfx.collect();
    c.destroy();
  }

  private grabPowerup(p: Powerup): void {
    if (!p.active) return;
    this.player.grantPower(p.kind, p.duration);
    this.juice.collectBurst(p.x, p.y, p.texture.key);
    p.destroy();
  }

  /** Touch a patroller: smash it for points if invincible, else take the hit. */
  private touchEnemy(enemy: Phaser.Physics.Arcade.Sprite): void {
    if (this.finished || !enemy.active) return;
    if (this.player.hasStar) {
      this.juice.collectBurst(enemy.x, enemy.y, enemy.texture.key);
      this.juice.shake(0.006, 120);
      this.sfx.smash();
      const total = addScore(this, POWERUPS.smashScore);
      this.hud.setScore(total);
      this.juice.pop(enemy.x, enemy.y - 10, '+' + POWERUPS.smashScore, 0xfde047);
      enemy.destroy();
    } else {
      this.hit(enemy.x);
    }
  }

  private hit(fromX: number): void {
    if (this.finished) return;
    if (!this.player.takeHit(fromX)) return;
    this.hearts--;
    this.juice.shake(0.01, 180);
    this.juice.flash(0xff3b3b, 90);
    this.sfx.hurt();
    if (this.hearts <= 0) {
      this.hearts = this.maxHearts;
      this.player.respawn(this.spawn.x, this.spawn.y);
      this.juice.pop(this.player.x, this.player.y - 30, 'oops!', 0xff6b6b);
    }
    this.hud.setHearts(this.hearts);
  }

  private pitFall(): void {
    this.player.respawn(this.spawn.x, this.spawn.y);
    this.hearts = this.hearts > 1 ? this.hearts - 1 : this.maxHearts;
    this.hud.setHearts(this.hearts);
    this.juice.shake(0.006, 140);
  }

  private win(): void {
    if (this.finished) return;
    this.finished = true;
    this.sfx.win();
    this.juice.flash(0xffffff, 200);
    this.juice.fireworks([this.player.texture.key, TX.role('collectible')]);
    this.juice.pop(this.player.x, this.player.y - 40, 'GOAL!', THEME.teal);
    this.time.delayedCall(1500, () => {
      const nxt = nextLevelKey(this.levelKey);
      if (nxt) this.scene.start('Title', { char: this.charKey, level: nxt });
      else this.scene.start('End');
    });
  }

  // ------------------------------------------------------------------
  //  Touch controls (on-screen; also help mouse users)
  // ------------------------------------------------------------------
  private buildTouchControls(): void {
    // Only on touch devices — on desktop the keyboard is primary and the buttons
    // would just be clutter. Inclusive detection: show whenever any touch signal
    // exists, hide only when confidently a fine-pointer (mouse) device.
    const hasTouch =
      typeof window !== 'undefined' &&
      ((window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
        'ontouchstart' in window ||
        (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0));
    if (!hasTouch) return;

    const { width, height } = this.scale;
    const R = 60; // big, thumb-friendly buttons
    const margin = 28;
    const mk = (x: number, y: number, label: string): Phaser.GameObjects.Arc => {
      const btn = this.add
        .circle(x, y, R, THEME.box, 0.16)
        .setScrollFactor(0)
        .setDepth(95)
        .setStrokeStyle(3, THEME.box, 0.35)
        .setInteractive();
      this.add
        .text(x, y, label, { fontFamily: FONT.display, fontSize: '36px', color: css(THEME.box) })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(96);
      return btn;
    };

    const y = height - margin - R;
    const left = mk(margin + R, y, '‹');
    const right = mk(margin + R * 3 + 20, y, '›'); // ~20px gap from the left button
    const jump = mk(width - margin - R, y, '▲');

    const bind = (btn: Phaser.GameObjects.Arc, set: (v: boolean) => void): void => {
      const press = (on: boolean): void => {
        set(on);
        btn.setFillStyle(THEME.box, on ? 0.34 : 0.16); // brighten on touch — clear feedback
      };
      btn.on('pointerdown', () => press(true));
      btn.on('pointerup', () => press(false));
      btn.on('pointerout', () => press(false));
      btn.on('pointerupoutside', () => press(false));
    };
    bind(left, (v) => this.controls.setTouchLeft(v));
    bind(right, (v) => this.controls.setTouchRight(v));
    bind(jump, (v) => this.controls.setTouchJump(v));
  }

  // ------------------------------------------------------------------
  update(time: number, delta: number): void {
    const cam = this.cameras.main;
    if (this.finished) {
      this.parallax.update(cam);
      return;
    }
    this.controls.update();
    this.player.step(this.controls, delta);
    for (const p of this.platforms) p.update(delta, this.player);
    // skip any that got smashed this run (destroyed entities have no body)
    for (const e of this.groundPatrollers) if (e.active) e.update();
    for (const e of this.airPatrollers) if (e.active) e.update(time);
    this.parallax.update(cam);

    // power-up feedback: HUD countdown + invincibility sparkles
    this.updatePowerHud();
    if (this.player.hasStar) {
      this.sparkAcc += delta;
      if (this.sparkAcc > 110) {
        this.juice.sparkle(this.player.x, this.player.y);
        this.sparkAcc = 0;
      }
    }

    if (this.player.y > this.worldH + 200) this.pitFall();
  }

  private updatePowerHud(): void {
    let s = '';
    if (this.player.hasSpeed) s += 'SPEED ' + Math.ceil(this.player.speedMsLeft / 1000) + 's   ';
    if (this.player.hasStar) s += 'INVINCIBLE ' + Math.ceil(this.player.starMsLeft / 1000) + 's';
    this.hud.setStatus(s);
  }
}
