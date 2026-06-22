import Phaser from 'phaser';
import { THEME, FONT, css } from '../config/theme';
import { LEVELS } from '../config/assets';
import { CHARACTERS } from '../config/characters';
import { buildPlaceholders } from '../engine/placeholders';

// Boot: build every placeholder texture from roles.ts, load the level maps (and
// any real art whose manifest src is set), then hand off to the Menu. This is
// where "runs with zero real art" is made true.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2, 'OK CODE CAMP', {
        fontFamily: FONT.display,
        fontSize: '40px',
        color: css(THEME.box),
      })
      .setOrigin(0.5);

    // Level maps (Tiled JSON). Paths are relative so the static build runs at
    // any base path. null-src art stays as placeholders; real art drops in here.
    for (const lvl of LEVELS) {
      this.load.tilemapTiledJSON(lvl.key, lvl.map);
      if (lvl.scene.src) this.load.image(`scene:${lvl.key}`, lvl.scene.src);
      if (lvl.titleCard) this.load.image(`title:${lvl.key}`, lvl.titleCard);
    }
    for (const ch of CHARACTERS) {
      if (ch.src) this.load.spritesheet(`art:char:${ch.key}`, ch.src, { frameWidth: ch.size, frameHeight: ch.size });
    }
  }

  create(): void {
    buildPlaceholders(this);
    this.scene.start('Menu');
  }
}
