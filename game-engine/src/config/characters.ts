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

export interface CharacterDef {
  key: string;
  /** Menu + facilitator label */
  name: string;
  /** one-line personality note for the menu */
  blurb: string;
  /** null -> placeholder; else a spritesheet/image path under public/assets/ */
  src: string | null;
  /** how big YOUR robot is (px) — the fourth kid-facing dial */
  size: number;
  /** per-character feel overrides (the other three dials, and more) */
  feel: Partial<Feel>;
  /** placeholder accent so the four robots are distinguishable before art lands */
  accent: number;
  /** animation slots, used when real art is present */
  frames: { idle: number[]; run: number[]; jump: number[]; fall: number[]; hurt: number[] };
}

const DEFAULT_FRAMES = {
  idle: [0],
  run: [1, 2, 3, 4],
  jump: [5],
  fall: [6],
  hurt: [7],
};

export const CHARACTERS: CharacterDef[] = [
  {
    key: 'skeleton',
    name: 'The Skeleton',
    blurb: 'The default. Balanced and fair.',
    src: null,
    size: 48,
    feel: {},
    accent: 0xc9ccd2,
    frames: { ...DEFAULT_FRAMES },
  },
  {
    key: 'springy',
    name: 'Springy',
    blurb: 'Jumps higher. Make the climb easy.',
    src: null,
    size: 46,
    feel: { jump: 520 },
    accent: 0x34d399,
    frames: { ...DEFAULT_FRAMES },
  },
  {
    key: 'floaty',
    name: 'Floaty',
    blurb: 'Light on its feet. Hang in the air.',
    src: null,
    size: 50,
    feel: { gravity: 640, fallMultiplier: 1.3 },
    accent: 0x60a5fa,
    frames: { ...DEFAULT_FRAMES },
  },
  {
    key: 'zippy',
    name: 'Zippy',
    blurb: 'Runs fast. For the brave.',
    src: null,
    size: 44,
    feel: { speed: 300, accel: 2800 },
    accent: 0xfbbf24,
    frames: { ...DEFAULT_FRAMES },
  },
];

export function characterByKey(key: string): CharacterDef {
  return CHARACTERS.find((c) => c.key === key) ?? CHARACTERS[0];
}
