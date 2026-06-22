# CLAUDE.md — OK Code Camp Game Engine

This is the **production engine** for OK Code Camp: a kid-skinnable, Kinderhook-themed
side-scrolling platformer that runs entirely on generated placeholders until real drawings
drop in. Phaser 3 · Vite · TypeScript · static/serverless.

## The spec lives one level up

The **authoritative spec is the root [`../CLAUDE.md`](../CLAUDE.md)** — read it first. It owns the
design constitution, the invariants, the seven platform primitives, `roles.ts` as the single
source of truth for the visual language, the Boot/Menu/Title/Game/End scene shell, the
`FEEL`/characters/assets config surface, the two-lane (scene vs object) model, the worksheet +
Tiled pipeline, and all guardrails. **Do not duplicate or re-derive any of that here** — this
file is just the local entry point so a contributor working inside `game-engine/` finds their
bearings. See also [`README.md`](README.md) (operator's guide) and
[`../docs/tiled-level-convention.md`](../docs/tiled-level-convention.md) (level authoring).

## Run it (from inside game-engine/)

```
npm install        # deps (Phaser ^3.80, Vite ^5.4, TypeScript ^5.6; Node >=20.17)
npm run dev        # local dev server
npm run build      # tsc --noEmit && vite build  → dist/
npm run preview    # serve the production build
npm run typecheck  # tsc --noEmit
```

## Two tripwires (full list in the root CLAUDE.md)

- **Never break the playable skeleton** — every commit on `main` runs start-to-finish on
  placeholders, both lanes.
- **Never use the Fraunces typeface.** Anywhere.
