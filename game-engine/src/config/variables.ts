// =====================================================================
//  variables.ts — the tunable "character variables" (the dials).
//  CLAUDE.md constitution #1: the foundation. Named, centralized, and
//  pedagogically load-bearing — they map to a kid's paper worksheet, and
//  *a character is a saved set of these dials* (see characters.ts).
//
//  Units are Phaser arcade pixels/second (and /second^2 for accel/gravity).
//  The four headline, kid-facing dials are: speed, jump, gravity, size.
//  (size lives per-character in characters.ts, since it's how big YOUR robot is.)
// =====================================================================

export const FEEL = {
  speed: 220, // max horizontal speed
  jump: 430, // jump impulse (how high)
  gravity: 900, // fall strength (floatiness — lower = floatier)
  fallMultiplier: 1.6, // rise-vs-fall asymmetry — falls faster than it rises
  airControl: 0.85, // how much steering you keep mid-air (0..1)
  coyoteMs: 90, // grace window to still jump just after leaving a ledge
  bufferMs: 110, // jump pressed slightly early still registers
  maxJumps: 2, // double jump
  cutVelocity: 200, // release jump early -> short hop (variable jump height)
  bounce: 690, // bounce-pad / trampoline launch

  // Lower-level shaping of the *same* feel (still constitution #1, just not on
  // the kid's worksheet): how quickly you reach top speed and stop.
  accel: 2200, // ground acceleration toward target speed
  friction: 2000, // ground deceleration when there's no input
};

// No `as const`: the fields stay plain `number` so per-character overrides
// (characters.ts) can set any value, not just the default literal.
export type Feel = typeof FEEL;

/** Merge per-character overrides onto the base feel. */
export function resolveFeel(overrides?: Partial<Feel>): Feel {
  return { ...FEEL, ...(overrides ?? {}) };
}
