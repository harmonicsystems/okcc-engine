import Phaser from 'phaser';
import { THEME, FONT, css } from '../config/theme';
import { getScore, getCharacterKey, TX } from '../engine/registry';
import { Juice } from '../engine/juice';

// The finale: total score, a little confetti made of the player's own drawing,
// then back to the Menu for another run.
export class EndScene extends Phaser.Scene {
  constructor() {
    super('End');
  }

  create(): void {
    const { width, height } = this.scale;
    const total = getScore(this);
    const charKey = getCharacterKey(this);

    this.add
      .text(width / 2, height / 2 - 70, 'you did it!', {
        fontFamily: FONT.display,
        fontSize: '52px',
        color: css(THEME.box),
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2, `final score   ${total}`, {
        fontFamily: FONT.mono,
        fontSize: '22px',
        color: css(THEME.teal),
      })
      .setOrigin(0.5);

    const again = this.add
      .text(width / 2, height / 2 + 70, 'press any key  ·  tap to play again', {
        fontFamily: FONT.mono,
        fontSize: '14px',
        color: css(THEME.muted),
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: again, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });

    const juice = new Juice(this);
    juice.fireworks([TX.char(charKey), TX.role('collectible')]);

    const back = () => this.scene.start('Menu');
    this.input.once('pointerdown', back);
    this.input.keyboard?.once('keydown', back);
  }
}
