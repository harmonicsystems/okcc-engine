# CLAUDE.md — OK Code Camp Engine

## What this is

A **Kinderhook-themed, kid-skinnable side-scrolling platformer** built for Harmonic Systems /
Super-Stories workshops. Each child draws their own characters, collectibles, hazards,
platforms, backgrounds, and even level title cards on paper; those drawings drop into this
engine and become a real, playable, shareable game — an *interactive souvenir* of their
creativity, with a printed coloring book as its analog twin.

The kids never see this code. It exists so a facilitator can turn analog drawings into a
running game fast. **Optimize every decision for fast, legible asset-swapping and good game
feel — not for teaching syntax to children.** The CS lives entirely behind the crayon.

The production engine lives in **`game-engine/`** (Phaser 3 + Vite + TypeScript). It grew out of
single-file prototypes that proved the mechanics, the scene flow, the Tiled pipeline, and the
game feel; the surviving one is `demo/skeleton-game.html` (the gray-box dial demo). This repo
organizes all of that into bounded, typed modules.

---

## The design constitution (the seven core variables)

These are the cross-platform constants — the variables in every good platformer from Mario to
Celeste to Hollow Knight. They are the *why* behind every engine decision below. Build nothing
that violates them.

1. **Character controller / game feel.** Acceleration, max speed, friction, gravity, the
   rise-vs-fall asymmetry, variable jump height, air control, forgiveness windows. Tuned by
   *feel*, not realism. This is the foundation — nothing above it survives a bad controller.
   → lives in `config/variables.ts` and `engine/Player.ts`. **Get this right first.**
2. **A small, composable verb set.** Few actions that combine into deep expression. Low floor,
   high ceiling. → the player has essentially two verbs (move, jump); platforms and power-ups
   multiply expression without adding buttons.
3. **Readability.** Threats, rewards, and interactables communicated through a consistent
   color/shape/motion language. → `config/roles.ts` is the single source of that language,
   shared by the game *and* the printed worksheets *and* the Tiled editor.
4. **The teaching loop.** Introduce → develop → twist → master, with the *level* doing the
   teaching, not text. → each Kinderhook level introduces one mechanic, then complicates it;
   section labels are scaffolding for the prototype, not the real teaching surface.
5. **Feedback.** Every verb gets immediate audiovisual confirmation. → `engine/juice.ts`:
   particles, squash/stretch, camera shake/flash, score pops, glow. (Audio is a *separate*
   future workshop — see Roadmap.)
6. **Risk/reward and optional depth.** Secrets and skill expression for the engaged player,
   ignorable by everyone else. → collectibles, power-ups, and hard-to-reach gems are all
   optional; the goal is always reachable without them.
7. **Pacing / flow.** A difficulty curve with relief valves and player-selected challenge.
   → the level order is the curve; **character choice is self-selected difficulty** (a high
   jumper makes a level easier), which is the gentlest possible difficulty selector.

---

## Invariants (do not break these)

- **Fully playable with placeholder art, in both lanes.** The whole game — menu, title cards,
  every level, win — must run start-to-finish with *zero* real drawings, using generated
  placeholders. Real art is pure drop-in.
- **Theme is skin only.** Every themed item maps to one of the primitives below. Never code a
  bespoke themed mechanic. A basketball is a ground patroller wearing a drawing.
- **One source of truth for the visual language.** `config/roles.ts` defines every role once;
  the in-game placeholders, the printable worksheets, and the Tiled conventions all read it.
- **Accessible-first** is a default, not a feature: keyboard *and* touch play, `prefers-
  reduced-motion` respected (the juice dials down, never off-puttingly), readable contrast,
  role legible by shape + motion (never color alone).
- **Static and serverless.** No backend. Builds to plain files on a static host.
- **Never use the Fraunces typeface.** Anywhere — game, UI, worksheets, print. Hard rule.

---

## Architecture — scenes (the game shell)

The game is a flow of Phaser Scenes, registered in `main.ts`. One `GameScene` plays every
level; it is *told* which character and level to run via the data object passed to
`scene.start`. (Proven in prototype v8.)

```
Boot ──▶ Menu ──▶ Title ──▶ Game ──▶ (next level? ▶ Title : End) ──▶ Menu
```

- **BootScene** — builds placeholder textures from `roles.ts`, loads the manifest.
- **MenuScene** — character select: **pick your robot** (or a friend's). Each character is a
  drawing + a preset of game-feel dials. Resets the run score.
- **TitleScene** — the transition / **title card**. Shows the level number and the title card:
  the kid-drawn art if scanned, otherwise the level name as the placeholder inside the frame
  (plus the level's one-line *teaches* note). Tap to start.
- **GameScene** — the level. `init(data)` receives `{ char, level }`; builds the level from its
  Tiled data with the chosen character's controller settings. On goal → next level's Title, or
  End. This scene is parameterized and reused; never fork it per level.
- **EndScene** — finale + total score → back to Menu.

Cross-scene state (score, selected character) lives in Phaser's **registry** (`this.registry`),
not in module globals — so a level restart resets cleanly.

---

## The mechanical canvas

### Character controller (`engine/Player.ts` + `config/variables.ts`)
The foundation (constitution #1). The dials are named, centralized, and pedagogically
load-bearing — they map 1:1 to a kid's paper worksheet, and **a character is a saved set of
these dials.**
```ts
export const FEEL = {
  speed: 220,         // max horizontal speed
  jump: 430,          // jump impulse
  gravity: 900,       // fall strength
  fallMultiplier: 1.6,// rise-vs-fall asymmetry — falls faster than it rises (feel #1)
  airControl: 0.85,   // how much steering you keep mid-air
  coyoteMs: 90,       // grace window to still jump just after leaving a ledge (forgiveness)
  bufferMs: 110,      // jump pressed slightly early still registers
  maxJumps: 2,        // double jump
  cutVelocity: 200,   // release jump early → short hop (variable jump height)
  bounce: 690,        // bounce-pad / trampoline launch
  accel: 2200,        // ground acceleration toward top speed  ┐ lower-level shaping of the
  friction: 2000,     // deceleration when there's no input    ┘ same feel — off the worksheet
};
// Per-character overrides live in config/characters.ts (e.g. a high-jumper raises `jump`).
// `size` (how big YOUR robot is) is the fourth kid dial and lives per-character there too.
```
> Coyote time, jump buffering, and fall-multiplier asymmetry are the difference between a toy
> and a game that feels *fair*. They are not optional polish; they are constitution #1.

### The verb set (constitution #2)
Move and jump. That's the whole interface. Everything else — variable height, double jump,
wall interactions, momentum from conveyors and movers — emerges from those two verbs meeting
the environment. Low floor (one button), high ceiling.

### The seven platform primitives (`engine/platforms/factory.ts`)
Distinctiveness comes from *layout and selection*, never new code. A data-driven factory reads
a `type` and builds the behavior. (Proven in v6–v8.)

| Type | Behavior | Themed skins |
|---|---|---|
| `static` | solid, stand on it | easel, bleacher, bookshelf, ground |
| `oneway` | jump up through, land on top | stacked shelves, branches |
| `crumble` | stand too long → it falls, then rebuilds | rotten log, loose tile |
| `bouncy` | trampoline launch | see-saw, springy mushroom |
| `conveyor` | pushes whatever stands on it (`dir`, `push`) | a current, a moving walkway |
| `move` | horizontal moving platform, carries you (`range`, `speed`) | a raft, a cart |
| `elevator` | vertical lift (`range`, `speed`) | a bucket lift |

### Object-lane entities
`Collectible` (touch = score), `Hazard` (static, touch = damage), `GroundPatroller` and
`AirPatroller` (move a path, touch = damage), `BouncePad`, `Goal`. Optional eighth primitive:
**power-up** (`engine/Powerup.ts`) — an overlap that flips a timer. **Built:** `speedPower`
(cyan orb → ×1.8 speed + afterimage echoes) and `starPower` (gold star → hue-rotation glow,
smash-through-enemies, hazard immunity); two roles in `roles.ts`, tuned in `POWERUPS`
(`config/variables.ts`). Power-ups are constitution #6 (optional depth — the goal never needs them).

---

## The two lanes + visual language + worksheets

A platformer needs two kinds of art that behave oppositely, and the whole paper↔engine bridge
depends on keeping them separate.

| | **Scene lane** | **Object lane** |
|---|---|---|
| What | one continuous colorable backdrop | framed tiles, one role each |
| In game | parallax background | sprite |
| Collision | none — it only scrolls | yes — grab / hurt / stand |
| Worksheet | wide landscape "scene page" | bounded "object tile" |

**Hard rule:** never bake an interactive object into a scene page; sprites must stay separable.

### `config/roles.ts` — single source of truth (constitution #3)
Each role declares `lane`, `color`, `shape`, `motion`, `frame {w,h}`, and a kid-facing `prompt`.
Placeholders, worksheets, and the Tiled color-coding all read this. Role is legible by **shape +
motion glyph**, with color as redundant reinforcement (never color alone). Platforms are
color-coded by behavior in-game *and* in Tiled *and* on the worksheet — one visual language
across all three surfaces.

### Worksheets (`worksheet/`)
Printable frames generated from `roles.ts`. The frame does triple duty: the box a kid colors
inside, the exact sprite crop when scanned, and the manifest path it belongs to. Worksheet
kinds: **object tiles**, **scene pages**, the **character animation spread** (idle/run/jump/
fall/hurt with onion-skin guides + a color-key strip), and **level title cards** (the kid names
and illustrates a level's front door). Each carries registration ticks + a printed manifest
path + a QR so a scanned stack sorts itself.

### Ingest (`scripts/ingest.ts`, deferred)
`scan → detect frame via registration ticks → crop → edge-flood alpha (preserve interior
whites) → save to manifest path`. Three baked-in rules: edge-flood transparency (so white eyes
survive), crop *inward* (overspill trimmed, not breaking bounds), single-pose-plus-color-key
for animation consistency.

---

## Level authoring — Tiled

Levels are **data**, authored in the Tiled editor, loaded by Phaser's native Tiled parser.
Full spec: [`docs/tiled-level-convention.md`](docs/tiled-level-convention.md). `park.json` is
the worked reference.

- Use **object layers**: `Platforms`, `Collectibles`, `Enemies`, `Goal`, `Spawn`, `Labels`.
- An object's **Class** = its behavior (`crumble`, `move`, …); **custom properties** = its
  params (`range`, `speed`, `dir`, `push`, `axis`, `value`, `power`). These flow straight into
  the factory + entities. (A level's `motif`/scene/title-card live in `config/assets.ts`, not
  in the map.)
- Geometry: Tiled gives top-left `x,y`; the importer converts to center.
- Define each Class in Tiled with a matching **object color** + a **Template**, so the editor
  color-codes behavior exactly like the game and the worksheets.
- Load: `this.load.tilemapTiledJSON('park', 'levels/park.json')` → `this.make.tilemap(...)`.

### The Kinderhook level set
Each level is one Tiled file, themed by skin + which primitives appear. The teaching loop
(constitution #4) lives in this ordering:

- **Super Stories** (art studio) — gentle intro: static, move, collectibles. *Friendly.*
- **The Park** — adds the bounce pad (see-saw). *Bouncy, vertical.*
- **The Bike Path** — fast ground patrollers (bikes/woodchucks), orchard scene page. *Dodging.*
- **The Library** — stacked one-way shelves. *Climbing.*
- **The Garden** — air patrollers (birds/insects). *Air threats.*

---

## Content manifest (`config/assets.ts` + `config/characters.ts`)

The only files that name specific art. `null` src → placeholder.
- **characters** — one entry per child's robot, constant across all levels (the child's main
  deliverable). The Menu's character-select picks among them. Each carries per-character feel
  overrides (a child can make their robot fast, floaty, or bouncy).
- **levels** — one entry per Kinderhook location: a scene page, a Tiled map key, the object
  selection, and a title card.
- **audio** — `null` → silent / WebAudio blip (audio is a future workshop).

Only `config/*` and Tiled files should ever need editing to add a kid's content.

---

## Game feel & juice (`engine/juice.ts`) — constitution #5

Every verb gets immediate confirmation: collect → the gem **bursts into copies of itself**
(particle emitter textured with the kid's own drawing); land → squash-and-stretch + dust;
bounce → upward puff; hit → camera shake; win → fireworks made of the kids' drawings + camera
flash; the player carries a (WebGL) `postFX` glow. **Power-ups** add afterimage echoes (speed)
and, for invincibility, a steady tint (every renderer — the motion-safe, Canvas-safe signal)
plus animated hue-rotation via a ColorMatrix shader, brighter glow, and rainbow sparkles on
WebGL. All reduced-motion aware: the hue cycle slows (never strobes), echoes + sparkles drop,
and the tint + HUD keep invincibility legible with motion minimized. *Planned: camera bloom.*

**Accessibility:** all of the above must honor `prefers-reduced-motion` — reduce particle
counts, drop screen shake, slow or stop hue cycling. The game must be fully playable and
legible with motion minimized. PostFX is WebGL-only; guard it and degrade gracefully to Canvas.

---

## Stack, layout, commands, git

**Stack:** Phaser `^3.80` · Vite `^5.4` · TypeScript `^5.6` · Node `>=20.17`. (Vite 5 is pinned
deliberately: Vite 6 needs Node ≥20.19.) **Hand-authored** against Phaser 3 + Vite + TS — *not*
scaffolded from a template. No bundler other than Vite. Deploy static to GitHub Pages (workflow
live) or Cloudflare Pages. GitHub org: **harmonicsystems**. *The worksheet generator (a second
Vite entry) is Phase 2 — not built yet.*

```
okcc-engine/                     # repo root
  CLAUDE.md  README.md  .gitignore
  .github/workflows/deploy.yml   # builds game-engine/ → GitHub Pages
  .claude/launch.json
  docs/ concept-spec.md deploy.md parent-guide.md skills-framework.md tiled-level-convention.md
  demo/ skeleton-game.html        # the surviving single-file prototype (gray-box dial demo)
  website/ index.html             # marketing one-pager
  game-engine/                    # the playable engine — all build tooling lives here
    index.html  package.json  tsconfig.json  vite.config.ts
    public/ levels/ (Tiled .json per location)   # + assets/ for scanned drawings & audio
    src/
      main.ts                     # Phaser config + scene registration
      config/ roles.ts variables.ts characters.ts assets.ts theme.ts
      scenes/ BootScene.ts MenuScene.ts TitleScene.ts GameScene.ts EndScene.ts
      engine/
        Player.ts Controls.ts     # the character controller (game feel) + input merge
        platforms/factory.ts      # data-driven makePlatform (the seven types)
        Collectible.ts Hazard.ts GroundPatroller.ts AirPatroller.ts BouncePad.ts Goal.ts
        Powerup.ts Parallax.ts placeholders.ts juice.ts registry.ts sfx.ts
      hud/Hud.ts

# Future (Phase 2/3, not yet in repo):
#   game-engine/worksheets.html + src/worksheet/   (worksheet generator — a 2nd Vite entry)
#   scripts/ingest.ts                              (scan → crop → manifest)
```

```
cd game-engine
npm install   npm run dev   npm run build   npm run preview   npm run typecheck
# (npm run worksheets / npm run ingest are Phase 2 — not wired yet)
```

**Git workflow**
- `git init`, first commit the scaffold; host under `harmonicsystems`.
- **Conventional commits** (`feat:`, `fix:`, `refactor:`, `docs:`), small and frequent.
- **The skeleton invariant is a git rule:** every commit on `main` must still run with
  placeholders, both lanes. Don't commit a broken skeleton.
- Feature branches per mechanic (`feat/elevator`, `feat/worksheet-gen`); merge when it runs.
- **Tag workshop milestones** (`v0.1-park-playable`, `v1.0-workshop-ready`) so you can always
  check out a known-good build the morning of a session.

---

## Build roadmap (leverages the prototypes)

**Phase 0 — done.** Single-file prototypes proved: character controller + game feel, the seven
platform primitives + factory, the multi-scene shell, the Tiled pipeline, drawing-particles,
and the juice. The surviving reference is `demo/skeleton-game.html`.

**Phase 1 — the playable skeleton. ✅ Done.** Hand-authored Vite/TS engine in `game-engine/`:
the scene shell (Boot/Menu/Title/Game/End), the character controller (coyote + buffer + fall-
multiplier + variable height + double jump), and the seven-primitive platform factory. **The
Park** ships as one Tiled level, fully playable on placeholders, keyboard + touch, with HUD,
parallax, juice, and WebAudio SFX. `roles.ts` drives the in-game placeholders (the worksheet
half lands in Phase 2). Verified end-to-end in-browser; GitHub Pages deploy workflow wired.

**Phase 2 — paper handshake.** Build the worksheet generator (object tiles, scene pages,
character spread, title cards) from `roles.ts`. Prove one scanned drawing replaces its
placeholder through `scripts/ingest.ts`.

**Phase 3 — the full game.** Remaining Kinderhook levels as Tiled files (the teaching curve)
and secrets/optional depth. (Power-ups — speed + invincibility — already shipped, in The Park.)
Audio is its own later workshop concept — design it deliberately (recording kids needs consent +
Super-Stories coordination).

---

## Guardrails (consolidated)

- **Never Fraunces.** Anywhere.
- **Game feel first.** A bad controller invalidates everything above it. Coyote time, buffering,
  and fall asymmetry are required, not polish.
- **Theme is skin only.** Map every themed item to a primitive; never code a bespoke mechanic.
- **`roles.ts` is the one source of truth** for the visual language — placeholders, worksheets,
  and Tiled all read it. Never duplicate role definitions.
- **Keep the lanes separate.** Scene = backdrop (no collision); object = separable sprite.
- **Worksheet frame = sprite bounds = manifest path.** Crop inward; edge-flood alpha.
- **One parameterized GameScene** plays all levels. Never fork it per level.
- **Never break the playable skeleton** — every commit runs on placeholders, both lanes.
- **Accessibility is not optional:** keyboard + touch, `prefers-reduced-motion`, contrast, role
  legible by shape + motion (never color alone).
- **Static and serverless.** No backend.
- Don't hardcode filenames or tuning numbers outside `config/` and Tiled files.
- The IP to handle with care is the **children's drawings** — publishing a kid's work is a
  consent conversation with Super-Stories, not a licensing one.
```