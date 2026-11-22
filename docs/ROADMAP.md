# Roadmap — exceeding ZZT and MegaZeux

## Phase 0: playable vertical slice (delivered in 0.1)
- [x] Multi-board worlds and 60×25 camera with arbitrary board size.
- [x] Terrain, overlay and entity layers; built-in painter/editor.
- [x] Expanded glyphs: 256 CP437 graphic characters, Unicode, 8×12 authored bitmap slots and named banks.
- [x] Interactive objects, scripted events, enemies, player stats, portals, demo quest.
- [x] JSON import/export, autosave, editable palette, undo/redo, music-free beep SFX.

## Phase 1: production-grade game studio
- [ ] Separate authored world from game saves; playtest clones not mutating editor data.
- [ ] Cross-board exits with directional border linking and accurate ZZT-style board transitions.
- [ ] Collision/physics flags per tile and entity, direction-sensitive pushers, conveyors, bullets, particles, richer AI.
- [ ] Room data inspector, tile selections, copy/paste, rectangle/line/flood fill, prefab and map stamps.
- [ ] Glyph editor supports multiple resolutions (8×8, 8×14, 8×16, 12×20, 16×16), sprite animation frames, atlas imports/exports.
- [ ] Better pixel-font rendering with downloadable open-license art (not bundled in v0.1).
- [ ] Visual node scripting plus step-debugger, breakpoints, named object messaging, global and per-board logic.

## Phase 2: exceed MegaZeux
- [ ] Live tracker/music editor, MOD/XM/S3M playback via optional decode module, timeline SFX.
- [ ] Expanded palette: 256 colors + truecolor and shader/postprocessing presets while keeping retro fallback.
- [ ] Rich markup dialogue, quests, localization, inventory menus, UI layers and cutscenes.
- [ ] Object templates, component/entity system, triggers/sensors, world signals, pathfinding.
- [ ] Asset packs, safe script mods and portable zip-based game packages.
- [ ] Compiled export targets: static HTML, desktop SDL, terminal, optional actual DOS backend.

## Phase 3: interoperability and community
- [ ] ZZT board/world converter + best-effort ZZT-OOP transpiler.
- [ ] MegaZeux read-only world importer and Robotic command mapping.
- [ ] Plugin API, theme packs, save migrations, sample campaign and test coverage.
- [ ] Collaboration/variant control, deterministic replays, automated smoke tests and snapshots.

## Hardware goals

Stay playable on modest laptop hardware. The initial browser runtime loads no framework and no external content. Future renderers should remain optional and allow a low-memory path.
