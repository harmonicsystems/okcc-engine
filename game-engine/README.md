# OK Code Camp — Game Engine

A Kinderhook-themed, **kid-skinnable side-scrolling platformer**. Children draw the characters,
collectibles, hazards, platforms, and backgrounds on paper; their drawings drop into this engine
and become a real, playable game. The whole thing runs start-to-finish on **generated
placeholders** — real art is pure drop-in.

> Design constitution, invariants, and the full vision live in the repo-root
> [`../CLAUDE.md`](../CLAUDE.md). This README is the quick operator's guide.

## Run it

```
npm install
npm run dev        # local dev server (hot reload)
npm run worksheets # the printable worksheet generator (worksheets.html, a 2nd entry)
npm run build      # static production build -> dist/ (both the game + worksheets)
npm run preview    # serve the production build
npm run typecheck  # tsc --noEmit
```

Stack: **Phaser 3 · Vite 5 · TypeScript**. Vite 5 is pinned for Node 20.17 compatibility
(Vite 6 needs Node ≥ 20.19). Static and serverless — `dist/` runs on any host.

## How a kid's drawing becomes the game

Only **`src/config/*`** and the **Tiled level files** ever need editing to add content.

- **A character** → add/replace an entry in [`src/config/characters.ts`](src/config/characters.ts).
  Set `src` to a spritesheet under `public/assets/characters/` (or `null` for the gray
  placeholder). Each character is also a saved set of feel dials (speed / jump / gravity / size).
- **An object** (collectible, hazard, platform, goal…) → its look comes from a generated
  placeholder defined once in [`src/config/roles.ts`](src/config/roles.ts), the single source of
  truth for the visual language (shared by the game, the worksheets, and the Tiled color-coding).
  Drop real art by loading a texture under the same key.
- **A level** → one Tiled JSON in [`public/levels/`](public/levels/) using object layers
  (`Platforms`, `Collectibles`, `Enemies`, `Goal`, `Spawn`, `Labels`). An object's **Class** is
  its behavior; **custom properties** (`range`, `speed`, `dir`, `push`) are its params. Register
  the level in [`src/config/assets.ts`](src/config/assets.ts). See `park.json` for a full example.

## The shape of it

```
Boot ──▶ Menu ──▶ Title ──▶ Game ──▶ (next level? ▶ Title : End) ──▶ Menu
```

- `src/scenes/` — the five scenes. One parameterized `GameScene` plays every level.
- `src/engine/Player.ts` — the character controller (coyote time, jump buffering, fall
  asymmetry, variable jump height, double jump). The foundation; tuned by feel in
  `src/config/variables.ts`.
- `src/engine/platforms/factory.ts` — the seven platform primitives, data-driven.
- `src/engine/` — object entities, juice (particles/shake/glow, reduced-motion aware), parallax.
- `src/engine/placeholders.ts` — generates every gray texture from `roles.ts`.

Keyboard (← → / A D, ↑ / W / Space) **and** touch (on-screen buttons) both play. Motion honors
`prefers-reduced-motion`.

## Deploy

See [`../docs/deploy.md`](../docs/deploy.md). Push to `main` → GitHub Actions builds and publishes
to GitHub Pages.
