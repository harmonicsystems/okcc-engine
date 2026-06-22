# OK Code Camp

A workshop by **Harmonic Systems**, in partnership with **Super-Stories**, where kids design a
game by hand and leave with an *interactive souvenir* of their own creativity. The child brings
the imagination; the machine just runs it.

This folder collects the working prototypes and planning documents.

---

## Start here

**`website/index.html`** — open it in any browser. Play the gray skeleton, drag the dials, then
press **"Make it theirs."** This single page *is* the proof of concept — it lets Grace, Ramiro,
and parents feel the whole idea instead of reading about it.

---

## Contents

### `website/`
- **index.html** — The interactive one-page site for harmonic-systems.org, with an embedded
  playable demo and the gray→skinned transformation. Deploys as-is (only the web font is external).
  Before sharing: swap the contact email (`hello@harmonic-systems.org`) and, when you have one,
  point the skin at a real kid's drawing instead of the placeholder robot.

### `demo/`
- **skeleton-game.html** — The standalone skeleton platformer with the live variable HUD
  (speed, jump, gravity, size). One file, no dependencies. The minimal tool for the
  "change a number, watch the behavior" moment. To skin it, set `CHARACTER.spriteUrl` near the
  top of the script.

### `game-engine/`
- **CLAUDE.md** — Instructions for building the real SNES-style game in a Claude Code repo.
  Stack: Phaser 3 + Vite + TypeScript, fully static/serverless. Bootstrap with
  `npx degit phaserjs/template-vite-ts`, drop this file in the project root, and tell Claude Code
  to "build the skeleton to the Definition of Done in CLAUDE.md."

### `docs/`
- **concept-spec.md** — One-page concept spec aligning the workshop with both Super-Stories'
  philosophy and yours.
- **skills-framework.md** — The clinical rationale: the communication and cognitive skills the
  workshop fosters, by domain. "Designed with a clinician's experience" — not therapy.
- **parent-guide.md** — The warm, parent-facing version of the same content. A recruiting tool.

---

## Notes carried throughout

- **No backend, anywhere.** Everything is static. The only future server piece is the optional
  worksheet-photo→parameters feature — a single serverless function, added only if you want it.
- The robot in the website is a **placeholder drawn in code** — the moment you drop in a real
  drawing, the site also becomes the workshop's first output.
- **Never the Fraunces typeface.** (Hard rule, respected throughout.)

*The hand leads; the machine serves.*
