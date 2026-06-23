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

// The array order IS the difficulty curve / teaching loop (constitution #4):
// each Kinderhook location introduces one mechanic, then the level develops it.
export const LEVELS: LevelDef[] = [
  {
    key: 'superStories',
    name: 'Super Stories',
    map: 'levels/super-stories.json',
    titleCard: null,
    scene: { src: null },
    motif: 0x6d5ac4, // art-studio purple
    teaches: 'Move, jump, and ride a cart — the gentle warm-up.',
  },
  {
    key: 'park',
    name: 'The Park',
    map: 'levels/park.json',
    titleCard: null,
    scene: { src: null },
    motif: 0x3f7d5a, // park green
    teaches: 'The bounce pad — springy, vertical play.',
  },
  {
    key: 'bikePath',
    name: 'The Bike Path',
    map: 'levels/bike-path.json',
    titleCard: null,
    scene: { src: null },
    motif: 0x9c7b3a, // orchard amber
    teaches: 'Dodging — time your run past the bikes.',
  },
  {
    key: 'library',
    name: 'The Library',
    map: 'levels/library.json',
    titleCard: null,
    scene: { src: null },
    motif: 0x5a4a6b, // library dusk
    teaches: 'Climbing — jump up through the shelves.',
  },
  {
    key: 'garden',
    name: 'The Garden',
    map: 'levels/garden.json',
    titleCard: null,
    scene: { src: null },
    motif: 0x6aa84f, // garden green
    teaches: 'Air threats — mind the birds.',
  },
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
