import Phaser from 'phaser';
import { THEME, FONT, css } from '../config/theme';
import { LEVELS, levelByKey } from '../config/assets';

interface TitleData {
  char: string;
  level: string;
}

// The title card: the level's front door. Shows the level number, name, and the
// kid-drawn title-card art (a placeholder frame until one is scanned). Tap /
// press to start. One transition scene for every level.
export class TitleScene extends Phaser.Scene {
  private titleData!: TitleData;

  constructor() {
    super('Title');
  }

  init(data: TitleData): void {
    this.titleData = data;
  }

  create(): void {
    const { width, height } = this.scale;
    const level = levelByKey(this.titleData.level) ?? LEVELS[0];
    const index = LEVELS.findIndex((l) => l.key === level.key);
    const cx = width / 2;

    // the title-card frame (the kid colors inside this box)
    const cardW = 360;
    const cardH = 200;
    const cardY = height / 2 - 20;
    const frame = this.add.graphics();
    frame.fillStyle(level.motif, 0.18);
    frame.fillRoundedRect(cx - cardW / 2, cardY - cardH / 2, cardW, cardH, 16);
    frame.lineStyle(3, level.motif, 0.9);
    frame.strokeRoundedRect(cx - cardW / 2, cardY - cardH / 2, cardW, cardH, 16);

    const titleKey = `title:${level.key}`;
    if (this.textures.exists(titleKey)) {
      this.add.image(cx, cardY, titleKey).setDisplaySize(cardW - 16, cardH - 16);
    } else {
      this.add
        .text(cx, cardY - 16, level.name, {
          fontFamily: FONT.display,
          fontSize: '34px',
          color: css(THEME.white),
        })
        .setOrigin(0.5);
      this.add
        .text(cx, cardY + 28, '[ title card goes here ]', {
          fontFamily: FONT.mono,
          fontSize: '12px',
          color: css(THEME.muted),
        })
        .setOrigin(0.5);
    }

    this.add
      .text(cx, cardY - cardH / 2 - 30, `LEVEL ${index + 1}`, {
        fontFamily: FONT.mono,
        fontSize: '16px',
        color: css(THEME.teal),
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cardY + cardH / 2 + 26, level.teaches, {
        fontFamily: FONT.body,
        fontSize: '14px',
        color: css(THEME.muted),
      })
      .setOrigin(0.5);

    const go = this.add
      .text(cx, height - 56, 'press any key  ·  tap to start', {
        fontFamily: FONT.mono,
        fontSize: '14px',
        color: css(THEME.box),
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: go, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });

    const start = () => this.scene.start('Game', { char: this.titleData.char, level: level.key });
    this.input.once('pointerdown', start);
    this.input.keyboard?.once('keydown', start);
  }
}
