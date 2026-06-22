// =====================================================================
//  assets.ts — the content manifest. One of only two files (with the Tiled
//  maps) that names specific art. null src -> generated placeholder; real art
//  is pure drop-in (set the path, drop the file in public/assets/).
//
//  The LEVELS array order *is* the difficulty curve (constitution #7). Each
//  level is one Tiled file under public/levels/, themed by skin + which
//  primitives appear. Phase 1 ships The Park; the rest are the teaching curve.
// =====================================================================

export interface LevelDef {
  key: string;
  /** name on the title card */
  name: string;
  /** Tiled JSON under public/levels/ (loaded relative, so no leading slash) */
  map: string;
  /** the kid-drawn title-card art; null -> generated placeholder frame */
  titleCard: string | null;
  /** the continuous scene-lane backdrop; null -> generated parallax */
  scene: { src: string | null };
  /** base hue for the generated parallax/title placeholder (0xRRGGBB) */
  motif: number;
  /** facilitator scaffolding: the one mechanic this level introduces */
  teaches: string;
}

export const LEVELS: LevelDef[] = [
  {
    key: 'park',
    name: 'The Park',
    map: 'levels/park.json',
    titleCard: null,
    scene: { src: null },
    motif: 0x3f7d5a, // park green
    teaches: 'The bounce pad — springy, vertical play.',
  },
  // The teaching curve continues here as each Tiled map lands (Phase 3):
  //   superStories (art studio) — gentle intro: static, move, collectibles
  //   bikePath     — fast ground patrollers; dodging
  //   library      — stacked one-way shelves; climbing
  //   garden       — air patrollers; air threats
];

export function levelByKey(key: string): LevelDef | undefined {
  return LEVELS.find((l) => l.key === key);
}

/** The next level in the curve, or undefined at the end of the run. */
export function nextLevelKey(key: string): string | undefined {
  const i = LEVELS.findIndex((l) => l.key === key);
  return i >= 0 ? LEVELS[i + 1]?.key : undefined;
}

// Audio is a future workshop. null -> WebAudio blip / silence (see engine/sfx).
export const AUDIO = {
  jump: null,
  collect: null,
  hurt: null,
  bounce: null,
  powerup: null,
  win: null,
  music: null,
} as const;
