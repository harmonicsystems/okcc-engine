import Phaser from 'phaser';
import { THEME, FONT, css } from '../config/theme';
import { CHARACTERS } from '../config/characters';
import { LEVELS } from '../config/assets';
import { TX, setCharacterKey, resetScore } from '../engine/registry';

// Character select: pick your robot (or a friend's). Each is a drawing + a saved
// set of feel dials. Picking resets the run score. Keyboard (← → Enter) and
// touch (tap a robot) both work — accessible-first.
export class MenuScene extends Phaser.Scene {
  private selected = 0;
  private cards: Phaser.GameObjects.Container[] = [];
  private blurb!: Phaser.GameObjects.Text;

  constructor() {
    super('Menu');
  }

  create(): void {
    resetScore(this);
    this.cards = [];
    const { width, height } = this.scale;

    this.add
      .text(width / 2, 64, 'OK CODE CAMP', {
        fontFamily: FONT.display,
        fontSize: '46px',
        color: css(THEME.box),
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 104, 'pick your robot', {
        fontFamily: FONT.mono,
        fontSize: '15px',
        color: css(THEME.teal),
      })
      .setOrigin(0.5);

    const n = CHARACTERS.length;
    const gap = Math.min(190, (width - 120) / n);
    const startX = width / 2 - ((n - 1) * gap) / 2;
    const cardY = height / 2 - 10;

    CHARACTERS.forEach((ch, i) => {
      const x = startX + i * gap;
      const container = this.add.container(x, cardY);

      const plate = this.add.rectangle(0, 0, gap - 26, 150, THEME.machine2, 0.35).setStrokeStyle(2, THEME.machine2);
      const sprite = this.add.image(0, -16, TX.char(ch.key)).setScale(1.6);
      const name = this.add
        .text(0, 48, ch.name, { fontFamily: FONT.display, fontSize: '16px', color: css(THEME.white) })
        .setOrigin(0.5);

      container.add([plate, sprite, name]);
      container.setSize(gap - 26, 150);
      container.setInteractive(
        new Phaser.Geom.Rectangle(-(gap - 26) / 2, -75, gap - 26, 150),
        Phaser.Geom.Rectangle.Contains,
      );
      container.on('pointerover', () => this.select(i));
      container.on('pointerdown', () => {
        this.select(i);
        this.confirm();
      });
      container.setData('plate', plate);
      this.cards.push(container);
    });

    this.blurb = this.add
      .text(width / 2, height - 92, '', {
        fontFamily: FONT.body,
        fontSize: '15px',
        color: css(THEME.muted),
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height - 50, '← →  choose      Enter / Space  play      (or tap a robot)', {
        fontFamily: FONT.mono,
        fontSize: '13px',
        color: css(THEME.muted),
      })
      .setOrigin(0.5);

    const kb = this.input.keyboard!;
    kb.on('keydown-LEFT', () => this.select((this.selected - 1 + n) % n));
    kb.on('keydown-RIGHT', () => this.select((this.selected + 1) % n));
    kb.on('keydown-A', () => this.select((this.selected - 1 + n) % n));
    kb.on('keydown-D', () => this.select((this.selected + 1) % n));
    kb.on('keydown-ENTER', () => this.confirm());
    kb.on('keydown-SPACE', () => this.confirm());

    this.select(0);
  }

  private select(i: number): void {
    this.selected = i;
    this.cards.forEach((card, idx) => {
      const plate = card.getData('plate') as Phaser.GameObjects.Rectangle;
      const on = idx === i;
      plate.setStrokeStyle(on ? 3 : 2, on ? THEME.teal : THEME.machine2);
      card.setScale(on ? 1.06 : 1);
      card.setDepth(on ? 5 : 1);
    });
    this.blurb.setText(CHARACTERS[i].blurb);
  }

  private confirm(): void {
    const ch = CHARACTERS[this.selected];
    setCharacterKey(this, ch.key);
    this.scene.start('Title', { char: ch.key, level: LEVELS[0].key });
  }
}
