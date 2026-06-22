import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { EndScene } from './scenes/EndScene';

// The Phaser game config + scene registration. One GameScene plays every level;
// scenes are added here and flow Boot -> Menu -> Title -> Game -> End.
// (More scenes get registered as they are built; Boot is the smoke test.)
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: '#17181b',
  width: 960,
  height: 540,
  pixelArt: false,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      // World gravity is 0; the Player owns its own gravity so we can do the
      // rise-vs-fall asymmetry (CLAUDE.md constitution #1).
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  input: {
    // a few simultaneous pointers so on-screen touch controls feel right
    activePointers: 3,
  },
  scene: [BootScene, MenuScene, TitleScene, GameScene, EndScene],
};

const game = new Phaser.Game(config);

// Dev-only handle for tooling/inspection; stripped from production builds.
if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}

export default game;
