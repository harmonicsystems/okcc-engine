# Tiled level convention

How OK Code Camp levels are authored as **Tiled JSON** and parsed by the engine.
This is the contract between the Tiled editor and `GameScene` — author to it exactly and
a level loads with placeholders, both lanes, no code changes.

> Source of truth for the parser: `game-engine/src/scenes/GameScene.ts`
> (`parseSpawn` / `parsePlatforms` / `parseEnemies` / `parseCollectibles` / `parseGoal` /
> `parseLabels`, plus the `readProp` + `objClass` helpers).
> Reference level: `game-engine/public/levels/park.json`.

---

## At a glance

- A level is **one orthogonal Tiled map** (`.json`), built entirely from **object layers** —
  no tile layers, no tilesets needed (the reference map ships `"tilesets": []`).
- Behavior is carried by an object's **Class** (Tiled's `type`/`class` field); parameters are
  carried by **custom properties**. Both flow straight into the engine factories.
- Map dimensions set the world: `widthInPixels` → camera/physics width,
  `heightInPixels` → world height (the pit-fall plane sits below it). Fallbacks are
  `1920 × 576` if Tiled omits them.

---

## The six object layers

The parser reads object layers **by name** (`map.getObjectLayer(name)`). Names are
case-sensitive and must match exactly. Unknown layers are ignored; missing layers are
tolerated (you get sensible fallbacks).

| Layer | Object kind | Holds | Parser |
|---|---|---|---|
| `Platforms` | rectangles | the seven platform primitives | `parsePlatforms` |
| `Collectibles` | points | pickups (touch = score) | `parseCollectibles` |
| `Enemies` | points | hazards, patrollers, bounce pads | `parseEnemies` |
| `Goal` | point | the level finish (first object only) | `parseGoal` |
| `Spawn` | point | player start (first object only) | `parseSpawn` |
| `Labels` | text objects | on-screen facilitator/teaching text | `parseLabels` |

`Goal` and `Spawn` use only the **first** object in the layer; extras are ignored.

---

## How Class is read (`objClass`)

Every behavioral layer resolves an object's role through one helper:

```ts
function objClass(obj) {
  return obj.type || obj.class || obj.name || '';
}
```

Precedence is **`type` → `class` → `name`**. In Tiled 1.9+ the editor writes the Class into
the `type` field of an object's JSON (older versions used `class`); the engine accepts either,
and finally falls back to the object's **Name** if neither is set. Practically: set the
object's **Class** in Tiled and you are done — the Name field is a last-resort escape hatch.

---

## `Platforms` — rectangle objects

Draw a **rectangle** (not a point). Its **Class** is the platform type — one of the seven
primitives below. Geometry is Tiled's native **top-left `x,y` + `width,height`**; the importer
converts to a center automatically (`cx = x + w/2`, `cy = y + h/2`), so author rectangles the
intuitive way — the box you draw *is* the platform's footprint. Missing `width`/`height`
default to `32`.

The factory reads up to four custom properties; only the ones relevant to a type have any
effect. Defaults below are what the factory applies when the property is absent.

| Class (type) | Behavior | Honored properties (default) | Notes |
|---|---|---|---|
| `static` | solid; stand on it | — | the workhorse floor/wall |
| `oneway` | jump up through, land on top | — | only collides while descending onto the top edge |
| `crumble` | stand too long → falls, then rebuilds | — | ~480 ms arm, ~1500 ms rebuild (engine constants) |
| `bouncy` | trampoline launch on landing | — | launch strength is the character's `FEEL.bounce` |
| `conveyor` | pushes whatever stands on it | `dir` (`1`), `push` (`90`) | `dir` is `+1`/`-1`; `push` in px/s |
| `move` | horizontal moving platform, carries rider | `range` (`120`), `speed` (`60`) | travels `range` px right then back |
| `elevator` | vertical lift, carries rider | `range` (`120`), `speed` (`60`) | travels `range` px down then back |

Property types in Tiled: `range`, `speed`, `push` are **int** (px or px/s); `dir` is **int**
(`1` or `-1`). All four are passed for every platform but ignored by types that do not use them
(e.g. setting `speed` on a `static` is harmless and inert).

Example (from `park.json`):

```json
{ "type": "move", "x": 960, "y": 500, "width": 128, "height": 24,
  "properties": [ { "name": "range", "type": "int", "value": 200 },
                  { "name": "speed", "type": "int", "value": 80 } ] }
{ "type": "conveyor", "x": 380, "y": 544, "width": 200, "height": 32,
  "properties": [ { "name": "dir", "type": "int", "value": 1 },
                  { "name": "push", "type": "int", "value": 90 } ] }
```

---

## `Enemies` — point objects

Place a **point**. Its position is the sprite **center** (`x,y` used directly — no top-left
conversion). The **Class** selects the entity; unrecognized classes in this layer are silently
skipped.

| Class | Entity | Honored properties (default) | Notes |
|---|---|---|---|
| `hazard` | static damage zone | — | touch costs a heart |
| `bouncePad` | placeable launcher (object-lane cousin of `bouncy`) | `power` (`FEEL.bounce × 1.08`) | land on top → fling up |
| `groundPatroller` | walks a path on the ground; touch = damage | `range` (`90`), `speed` (`70`), `dir` (`1`) | gravity-bound; turns at bounds or on a wall |
| `airPatroller` | flies a path; touch = damage | `range` (`120`), `speed` (`80`), `dir` (`1`), `axis` (`"x"`) | gravity-free; gentle bob on the cross-axis |

- `range` / `speed` are **int**; `dir` is **int** (`1`/`-1`); `power` is **int** (px/s launch).
- `axis` is a **string**, `"x"` (horizontal patrol, default) or `"y"` (vertical patrol). It is
  read for `airPatroller` only.
- `groundPatroller` collides with `static` and `oneway` platforms, so it walks on floors and
  turns at edges/walls; place it just above the ground it should patrol.

Example:

```json
{ "type": "groundPatroller", "x": 1220, "y": 520, "point": true,
  "properties": [ { "name": "range", "value": 180 },
                  { "name": "speed", "value": 70 },
                  { "name": "dir", "value": 1 } ] }
{ "type": "airPatroller", "x": 1024, "y": 430, "point": true,
  "properties": [ { "name": "range", "value": 120 },
                  { "name": "speed", "value": 70 },
                  { "name": "axis", "type": "string", "value": "x" } ] }
```

---

## `Collectibles` — point objects

Place a **point** per pickup; `x,y` is the **center**. Touch = score + collect burst, then it
destroys itself.

| Property | Type | Default | Effect |
|---|---|---|---|
| `value` | int | `1` | points added (and the `+N` score pop) |

Plain points with no properties score `+1`. In `park.json` every collectible is a bare point.

---

## `Goal` — point object

A single **point**; `x,y` is the **center** of the finish. Overlap → win → fireworks → next
level's Title card (or End if it is the last level in `LEVELS`). The object's Class is
conventionally `goal` but is not read — the parser just takes the first object in the layer.
Omit the layer / leave it empty and the level has no finish (useful for a sandbox).

---

## `Spawn` — point object

A single **point** marking the player start; `x,y` is used directly. Also the **respawn point**
after a pit fall or losing all hearts. If the layer is missing the engine falls back to
`x = 80, y = worldHeight − 140`.

---

## `Labels` — Tiled text objects

Use Tiled's **Text** object tool. The parser reads the text in this order:
`object.text.text` → a `text` custom property → the object Name. Empty text is skipped.

Rendered at the object's `x,y` in the engine's mono font / muted color — Tiled's own font size
and color settings are **not** honored (the engine restyles to match the HUD). Position is the
text's top-left, as Tiled gives it.

Labels are facilitator scaffolding (the prototype's teaching captions), not the real teaching
surface — keep them sparse. Example:

```json
{ "x": 90, "y": 452, "width": 320, "height": 20,
  "text": { "text": "← →  move      ↑ / space / tap  jump",
            "wrap": true, "pixelsize": 13, "color": "#6b7077" } }
```

---

## Color-coding convention

`config/roles.ts` is the **single source of truth** for the visual language — the same role
colors drive in-game placeholders, the printable worksheets, and the Tiled editor. Set each
Class's **object color** in Tiled to its role color so the editor color-codes behavior exactly
like the running game and the worksheet frames.

**Platform classes** (`PLATFORM_TYPES`):

| Class | Role color |
|---|---|
| `static` | `#7d828c` |
| `oneway` | `#2dd4bf` |
| `crumble` | `#f59e0b` |
| `bouncy` | `#34d399` |
| `conveyor` | `#60a5fa` |
| `move` | `#a78bfa` |
| `elevator` | `#818cf8` |

**Enemy / object classes** (`OBJECT_ROLES`):

| Class | Role color |
|---|---|
| `collectible` | `#fbbf24` |
| `hazard` | `#ef4444` |
| `groundPatroller` | `#f97316` |
| `airPatroller` | `#fb7185` |
| `bouncePad` | `#a3e635` |
| `goal` | `#4ade80` |
| `powerup` | `#c084fc` |

> Colors are taken from each role's `color` field in `roles.ts` (stored there as `0xRRGGBB`;
> shown above as hex for Tiled). Color is **reinforcement** — readability is carried by shape +
> motion first, so never rely on color alone.

**Recommended:** define each Class once in Tiled as an **object type** (Project →
*Custom Types* / the Object Types Editor) with the matching color and its default custom
properties, and save a **Template** per Class. Then authoring a level is dropping pre-typed,
pre-colored, pre-propertied objects — the editor mirrors the game and the worksheets by
construction.

---

## Adding a new level (end-to-end)

1. **Author the map** in Tiled as an orthogonal map with the six object layers above. Build
   from typed/templated objects so Class + color + properties come for free. Save as
   `game-engine/public/levels/<name>.json`.
2. **Register it** in `game-engine/src/config/assets.ts` by adding a `LevelDef` to the `LEVELS`
   array. The **array order is the difficulty curve** — insert it where it belongs in the
   teaching sequence.

   ```ts
   {
     key: 'garden',                 // scene-start key; must be unique
     name: 'The Garden',            // shown on the title card
     map: 'levels/garden.json',     // path under public/, no leading slash
     titleCard: null,               // kid art; null → placeholder frame
     scene: { src: null },          // scene-lane backdrop; null → generated parallax
     motif: 0x6aa84f,               // base hue for the generated parallax/title
     teaches: 'Air patrollers — threats from above.',
   }
   ```

3. **That's it.** `BootScene` loads every entry's `map` via Phaser's Tiled JSON loader, so the
   level is available immediately — no scene edits. `MenuScene`/`TitleScene` start the run at
   `LEVELS[0]`; reaching a goal advances to the next entry (`nextLevelKey`), and the last
   entry's goal routes to `EndScene`.

**Conventions to keep:**

- Map filename matches the manifest: `map: 'levels/<name>.json'` ↔ `public/levels/<name>.json`.
- One parameterized `GameScene` plays every level — never fork it per level.
- The level must run fully on placeholders, both lanes — don't commit a map that needs a
  specific drawing to be playable.
