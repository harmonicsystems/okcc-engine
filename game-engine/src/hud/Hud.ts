import Phaser from 'phaser';
import { THEME, FONT, css } from '../config/theme';
import { TX } from '../engine/registry';

// Hearts + score, pinned to the camera (scrollFactor 0). Placeholder shapes +
// a mono font; swappable like everything else. Readable contrast on the dark
// world is part of the accessible-first default, not a feature.
export class Hud {
  private hearts: Phaser.GameObjects.Image[] = [];
  private scoreText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, maxHearts: number) {
    const pad = 16;
    for (let i = 0; i < maxHearts; i++) {
      const h = scene.add
        .image(pad + 12 + i * 28, pad + 11, TX.heart)
        .setScrollFactor(0)
        .setDepth(100);
      this.hearts.push(h);
    }

    this.scoreText = scene.add
      .text(scene.cameras.main.width - pad, pad, 'SCORE 0', {
        fontFamily: FONT.mono,
        fontSize: '18px',
        color: css(THEME.white),
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);
  }

  setHearts(n: number): void {
    this.hearts.forEach((h, i) => h.setTexture(i < n ? TX.heart : TX.heartEmpty));
  }

  setScore(n: number): void {
    this.scoreText.setText('SCORE ' + n);
  }
}
