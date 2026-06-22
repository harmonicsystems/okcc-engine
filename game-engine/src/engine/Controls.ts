import Phaser from 'phaser';

// The whole interface is two verbs: move and jump (constitution #2). This
// merges keyboard (arrows + WASD + space) and on-screen touch buttons into one
// state the Player reads each frame. Touch flags are set by the GameScene's
// on-screen buttons via setTouch*(); they OR with the keyboard so either works.
export class Controls {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private a!: Phaser.Input.Keyboard.Key;
  private d!: Phaser.Input.Keyboard.Key;
  private w!: Phaser.Input.Keyboard.Key;
  private space!: Phaser.Input.Keyboard.Key;

  // set by touch buttons
  private touchLeft = false;
  private touchRight = false;
  private touchJump = false;

  // resolved state (read by Player after update())
  left = false;
  right = false;
  jumpHeld = false;
  jumpJustPressed = false;

  private jumpPrev = false;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.a = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.d = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.w = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.space = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    // keep arrows/space from scrolling the page while playing
    kb.addCapture([
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    ]);
  }

  setTouchLeft(v: boolean): void {
    this.touchLeft = v;
  }
  setTouchRight(v: boolean): void {
    this.touchRight = v;
  }
  setTouchJump(v: boolean): void {
    this.touchJump = v;
  }

  update(): void {
    const c = this.cursors;
    const kLeft = c.left.isDown || this.a.isDown;
    const kRight = c.right.isDown || this.d.isDown;
    const kJump = c.up.isDown || this.w.isDown || this.space.isDown;

    this.left = kLeft || this.touchLeft;
    this.right = kRight || this.touchRight;

    const jump = kJump || this.touchJump;
    this.jumpHeld = jump;
    this.jumpJustPressed = jump && !this.jumpPrev;
    this.jumpPrev = jump;
  }
}
