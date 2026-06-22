// The visual identity, carried straight from the proof-of-concept demo and the
// harmonic-systems.org one-pager: a dark "machine" world with a single accent
// (teal = "your hand on the dial"). Gray placeholders read as blueprint, never
// broken. Numbers are Phaser-style 0xRRGGBB ints; css() makes strings for DOM.
//
// Typeface rule (hard): Space Grotesk for chrome, never Fraunces, anywhere.

export const THEME = {
  machine: 0x17181b, // the gray world / canvas background
  machine2: 0x3a3d44, // structural gray
  grid: 0x1f2125, // blueprint grid lines
  box: 0xc9ccd2, // placeholder body
  boxInk: 0x8b8f98, // placeholder detail (eye dots, etc.)
  panel: 0xf2f3f5, // the human's side
  ink: 0x1d2024,
  muted: 0x6b7077,
  teal: 0x0fa3a3, // the one accent
  tealDeep: 0x0b7d7d,
  white: 0xf4f6f8,
} as const;

export const FONT = {
  display: 'Space Grotesk, system-ui, -apple-system, sans-serif',
  body: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
} as const;

/** 0xRRGGBB int -> "#rrggbb" string for the rare DOM/style use. */
export function css(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}
