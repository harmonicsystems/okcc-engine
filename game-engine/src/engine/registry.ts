import Phaser from 'phaser';

// Cross-scene state lives in Phaser's registry, never module globals — so a
// level restart resets cleanly (CLAUDE.md architecture note). This module is
// the typed door to it, plus the texture-key and accessibility helpers every
// scene shares.

export const REG = {
  score: 'okcc:score',
  character: 'okcc:character', // selected character key
} as const;

export function getScore(scene: Phaser.Scene): number {
  return (scene.registry.get(REG.score) as number) ?? 0;
}
export function addScore(scene: Phaser.Scene, n: number): number {
  const next = getScore(scene) + n;
  scene.registry.set(REG.score, next);
  return next;
}
export function resetScore(scene: Phaser.Scene): void {
  scene.registry.set(REG.score, 0);
}

export function getCharacterKey(scene: Phaser.Scene): string {
  return (scene.registry.get(REG.character) as string) ?? 'skeleton';
}
export function setCharacterKey(scene: Phaser.Scene, key: string): void {
  scene.registry.set(REG.character, key);
}

// ---- texture keys ---------------------------------------------------
// All generated placeholder textures use these stable keys, so swapping in
// real art later is a matter of loading a real texture under the same key.
export const TX = {
  role: (key: string) => `ph:${key}`,
  char: (key: string) => `ph:char:${key}`,
  spark: 'ph:spark',
  dust: 'ph:dust',
  pixel: 'ph:pixel',
  heart: 'ph:heart',
  heartEmpty: 'ph:heartEmpty',
} as const;

// ---- accessibility --------------------------------------------------
let reducedMotionMql: MediaQueryList | null = null;
let reducedMotionResolved = false;
/**
 * Honors `prefers-reduced-motion`, read LIVE each call: the MediaQueryList is
 * created once, but `.matches` reflects the *current* setting — so toggling
 * Reduce Motion mid-session (e.g. a photosensitive player reacting to the
 * invincibility hue cycle) takes effect without a reload. The juice dials down,
 * never off-puttingly.
 */
export function prefersReducedMotion(): boolean {
  if (!reducedMotionResolved) {
    reducedMotionResolved = true;
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      reducedMotionMql = window.matchMedia('(prefers-reduced-motion: reduce)');
    }
  }
  return reducedMotionMql ? reducedMotionMql.matches : false;
}
