import Phaser from 'phaser';

// Audio is a future workshop (recording kids needs consent + coordination), so
// for now `null` audio in the manifest means a tiny self-contained WebAudio
// blip — no files, no network. Lazily created and resumed on the first input,
// per browser autoplay rules.
export class Sfx {
  private ctx: AudioContext | null = null;

  constructor(scene: Phaser.Scene) {
    const wake = () => this.ensure();
    scene.input.once('pointerdown', wake);
    scene.input.keyboard?.once('keydown', wake);
  }

  private ensure(): void {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) {
        try {
          this.ctx = new Ctor();
        } catch {
          this.ctx = null;
        }
      }
    }
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  private blip(freq: number, dur: number, type: OscillatorType = 'square', gain = 0.04): void {
    this.ensure();
    const c = this.ctx;
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g);
    g.connect(c.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.stop(c.currentTime + dur);
  }

  jump(): void {
    this.blip(420, 0.08);
  }
  doubleJump(): void {
    this.blip(560, 0.08);
  }
  collect(): void {
    this.blip(720, 0.09, 'square', 0.05);
  }
  bounce(): void {
    this.blip(300, 0.13, 'sine', 0.06);
    this.blip(620, 0.13, 'sine', 0.035);
  }
  hurt(): void {
    this.blip(160, 0.18, 'sawtooth', 0.05);
  }
  smash(): void {
    this.blip(120, 0.12, 'square', 0.06);
    this.blip(210, 0.08, 'sawtooth', 0.04);
  }
  powerup(): void {
    this.ensure();
    const c = this.ctx;
    if (!c) return;
    const t0 = c.currentTime;
    [660, 880, 1175].forEach((f, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'square';
      o.frequency.value = f;
      const t = t0 + i * 0.06;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + 0.14);
    });
  }
  win(): void {
    this.ensure();
    const c = this.ctx;
    if (!c) return;
    const t0 = c.currentTime;
    [523, 659, 784, 1046].forEach((f, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      const t = t0 + i * 0.11;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + 0.2);
    });
  }
}
