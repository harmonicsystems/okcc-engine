// =====================================================================
//  roles.ts — THE single source of truth for the visual language.
//  (CLAUDE.md constitution #3 + the "one source of truth" invariant.)
//
//  Every drawable role is declared once, here. Three surfaces read it:
//    1. the in-game placeholders  (engine/placeholders.ts)
//    2. the printable worksheets   (worksheet/, Phase 2)
//    3. the Tiled editor color-coding (docs/tiled-level-convention.md)
//
//  Readability is by SHAPE + MOTION first; color is redundant reinforcement,
//  never the only signal (accessibility invariant). Each role carries the
//  `frame` that does triple duty: the box a kid colors inside, the exact
//  sprite crop when scanned, and the in-game display size.
// =====================================================================

export type Lane = 'character' | 'platform' | 'object' | 'scene';

export type RoleShape =
  | 'roundbox'
  | 'block'
  | 'circle'
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'flag'
  | 'pad';

export type RoleMotion =
  | 'none'
  | 'spin'
  | 'pulse'
  | 'patrol-ground'
  | 'patrol-air'
  | 'carry-x'
  | 'lift-y'
  | 'flow'
  | 'crumble'
  | 'launch'
  | 'oneway';

export interface Role {
  /** stable id; also the generated placeholder texture key */
  key: string;
  /** facilitator-facing label */
  label: string;
  lane: Lane;
  /** 0xRRGGBB — reinforcement only; shape+motion carry the meaning */
  color: number;
  shape: RoleShape;
  motion: RoleMotion;
  /** worksheet box = sprite crop = in-game size (px). Platforms tile this unit. */
  frame: { w: number; h: number };
  /** kid-facing drawing prompt printed on the worksheet */
  prompt: string;
}

/** The seven platform primitives. Distinctiveness is layout + selection, never new code. */
export const PLATFORM_TYPES = [
  'static',
  'oneway',
  'crumble',
  'bouncy',
  'conveyor',
  'move',
  'elevator',
] as const;
export type PlatformType = (typeof PLATFORM_TYPES)[number];

/** Object-lane roles: separable sprites that grab / hurt / stand / finish. */
export const OBJECT_ROLES = [
  'collectible',
  'hazard',
  'groundPatroller',
  'airPatroller',
  'bouncePad',
  'goal',
  'powerup',
] as const;
export type ObjectRole = (typeof OBJECT_ROLES)[number];

export const ROLES = {
  // ---- character ---------------------------------------------------
  character: {
    key: 'character',
    label: 'Character',
    lane: 'character',
    color: 0xc9ccd2,
    shape: 'roundbox',
    motion: 'none',
    frame: { w: 48, h: 48 },
    prompt: 'Draw your robot! Give it a face, a color, and a special power.',
  },

  // ---- the seven platform primitives (color-coded by behavior) -----
  static: {
    key: 'static',
    label: 'Solid platform',
    lane: 'platform',
    color: 0x7d828c,
    shape: 'block',
    motion: 'none',
    frame: { w: 32, h: 32 },
    prompt: 'Draw something solid to stand on — an easel, a bench, a block.',
  },
  oneway: {
    key: 'oneway',
    label: 'One-way platform',
    lane: 'platform',
    color: 0x2dd4bf,
    shape: 'block',
    motion: 'oneway',
    frame: { w: 32, h: 32 },
    prompt: 'Draw a shelf or branch you can jump up through, then land on.',
  },
  crumble: {
    key: 'crumble',
    label: 'Crumbling platform',
    lane: 'platform',
    color: 0xf59e0b,
    shape: 'block',
    motion: 'crumble',
    frame: { w: 32, h: 32 },
    prompt: 'Draw something rickety — it falls if you stand too long.',
  },
  bouncy: {
    key: 'bouncy',
    label: 'Bouncy platform',
    lane: 'platform',
    color: 0x34d399,
    shape: 'pad',
    motion: 'launch',
    frame: { w: 32, h: 32 },
    prompt: 'Draw a springy thing — a see-saw, a mushroom, a trampoline.',
  },
  conveyor: {
    key: 'conveyor',
    label: 'Conveyor',
    lane: 'platform',
    color: 0x60a5fa,
    shape: 'block',
    motion: 'flow',
    frame: { w: 32, h: 32 },
    prompt: 'Draw a moving walkway or a current that pushes you along.',
  },
  move: {
    key: 'move',
    label: 'Moving platform',
    lane: 'platform',
    color: 0xa78bfa,
    shape: 'block',
    motion: 'carry-x',
    frame: { w: 32, h: 32 },
    prompt: 'Draw a raft or a cart that carries you side to side.',
  },
  elevator: {
    key: 'elevator',
    label: 'Elevator',
    lane: 'platform',
    color: 0x818cf8,
    shape: 'block',
    motion: 'lift-y',
    frame: { w: 32, h: 32 },
    prompt: 'Draw a lift or bucket that carries you up and down.',
  },

  // ---- object-lane entities ----------------------------------------
  collectible: {
    key: 'collectible',
    label: 'Collectible',
    lane: 'object',
    color: 0xfbbf24,
    shape: 'circle',
    motion: 'spin',
    frame: { w: 28, h: 28 },
    prompt: 'Draw a treasure to collect — a gear, a gem, a coin, a star.',
  },
  hazard: {
    key: 'hazard',
    label: 'Hazard',
    lane: 'object',
    color: 0xef4444,
    shape: 'triangle',
    motion: 'pulse',
    frame: { w: 40, h: 40 },
    prompt: 'Draw something prickly to avoid — spikes, a puddle, a claw.',
  },
  groundPatroller: {
    key: 'groundPatroller',
    label: 'Ground patroller',
    lane: 'object',
    color: 0xf97316,
    shape: 'roundbox',
    motion: 'patrol-ground',
    frame: { w: 44, h: 40 },
    prompt: 'Draw a critter that walks back and forth on the ground.',
  },
  airPatroller: {
    key: 'airPatroller',
    label: 'Air patroller',
    lane: 'object',
    color: 0xfb7185,
    shape: 'diamond',
    motion: 'patrol-air',
    frame: { w: 40, h: 36 },
    prompt: 'Draw something that flies a path — a bird, a bug, a drone.',
  },
  bouncePad: {
    key: 'bouncePad',
    label: 'Bounce pad',
    lane: 'object',
    color: 0xa3e635,
    shape: 'pad',
    motion: 'launch',
    frame: { w: 64, h: 26 },
    prompt: 'Draw a launcher that flings you up high.',
  },
  goal: {
    key: 'goal',
    label: 'Goal',
    lane: 'object',
    color: 0x4ade80,
    shape: 'flag',
    motion: 'pulse',
    frame: { w: 52, h: 72 },
    prompt: 'Draw the finish — a flag, a door, a portal home.',
  },
  powerup: {
    key: 'powerup',
    label: 'Power-up',
    lane: 'object',
    color: 0xc084fc,
    shape: 'star',
    motion: 'spin',
    frame: { w: 32, h: 32 },
    prompt: 'Draw a power-up — speed boots, a star, a shield.',
  },
} satisfies Record<string, Role>;

export type RoleKey = keyof typeof ROLES;

export function role(key: RoleKey): Role {
  return ROLES[key];
}
