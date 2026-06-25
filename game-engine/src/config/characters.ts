// =====================================================================
//  characters.ts — one entry per child's robot (their main deliverable).
//  A character is a drawing + a saved set of feel dials. The Menu picks
//  among these. Per-character overrides are self-selected difficulty
//  (constitution #7): a high jumper or a floaty robot makes a level easier.
//
//  src: null -> use the generated gray placeholder. Real art is pure drop-in:
//  set src to a file in public/assets/characters/ and nothing else changes.
// =====================================================================

import type { Feel } from './variables';
import { ROBOT_SRC } from './assets';

export interface CharacterDef {
  key: string;
  /** Menu + facilitator label */
  name: string;
  /** one-line personality note for the menu */
  blurb: string;
  /** null -> placeholder; else an image path under public/assets/ (baked to size) */
  src: string | null;
  /** how big YOUR robot is (px) — the fourth kid-facing dial */
  size: number;
  /** per-character feel overrides (the other three dials, and more) */
  feel: Partial<Feel>;
  /** placeholder accent so the four robots are distinguishable before art lands */
  accent: number;
  /** hue-rotation (deg) applied to the shared robot art when baking this character */
  hue?: number;
  /** physics body as fractions of the (real-art) texture; omit -> 14% inset square */
  bodyFrac?: { w: number; h: number; cx: number; cy: number };
  /** animation slots, reserved for spritesheet art (the current robot is one static frame) */
  frames: { idle: number[]; run: number[]; jump: number[]; fall: number[]; hurt: number[] };
}

const DEFAULT_FRAMES = {
  idle: [0],
  run: [1, 2, 3, 4],
  jump: [5],
  fall: [6],
  hurt: [7],
};

// The four characters now share one mural drawing (the Super Stories robot kid),
// hue-rotated so each reads distinctly. The collidable body is the robot's central
// column (head + torso + legs); the heart-on-a-stick and antenna sit outside it.
const ROBOT_BODY = { w: 0.56, h: 0.95, cx: 0.43, cy: 0.51 };

export const CHARACTERS: CharacterDef[] = [
  {
    key: 'skeleton',
    name: 'The Skeleton',
    blurb: 'The default. Balanced and fair.',
    src: ROBOT_SRC,
    size: 48,
    feel: {},
    accent: 0xc9ccd2,
    hue: 0, // the original mural blue
    bodyFrac: ROBOT_BODY,
    frames: { ...DEFAULT_FRAMES },
  },
  {
    key: 'springy',
    name: 'Springy',
    blurb: 'Jumps higher. Make the climb easy.',
    src: ROBOT_SRC,
    size: 46,
    feel: { jump: 520 },
    accent: 0x34d399,
    hue: 70,
    bodyFrac: ROBOT_BODY,
    frames: { ...DEFAULT_FRAMES },
  },
  {
    key: 'floaty',
    name: 'Floaty',
    blurb: 'Light on its feet. Hang in the air.',
    src: ROBOT_SRC,
    size: 50,
    feel: { gravity: 640, fallMultiplier: 1.3 },
    accent: 0x60a5fa,
    hue: 150,
    bodyFrac: ROBOT_BODY,
    frames: { ...DEFAULT_FRAMES },
  },
  {
    key: 'zippy',
    name: 'Zippy',
    blurb: 'Runs fast. For the brave.',
    src: ROBOT_SRC,
    size: 44,
    feel: { speed: 300, accel: 2800 },
    accent: 0xfbbf24,
    hue: 230,
    bodyFrac: ROBOT_BODY,
    frames: { ...DEFAULT_FRAMES },
  },
];

export function characterByKey(key: string): CharacterDef {
  return CHARACTERS.find((c) => c.key === key) ?? CHARACTERS[0];
}
