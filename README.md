# GlyphDOS 0.1 — character-based game creation system

A new, lightweight, dependency-free DOS-inspired game engine for creating worlds with **CP437**, **Unicode**, and **editable 8×12 pixel glyphs**. It draws inspiration from the board editor and programmable objects of ZZT and MegaZeux, but uses an original format and interpreter.

## Start immediately

1. Open **`GlyphDOS-standalone.html`** in any modern desktop browser — no server, install, account, or internet connection required.
2. Or open `index.html` from the unpacked source folder (the local relative scripts work from a normal file browser).
3. Use **WASD / arrow keys** to move, **E** to interact, **Space** to shoot; tap **Board Editor** or press **Tab** to build your own game.
4. **Export World** to save a portable `.glyphworld.json` file. Import it later to resume.

It is a browser runtime with a DOS-style interface, **not** a real-mode DOS executable. Future native DOS or SDL backends can use the same portable world schema.

## Built in now

- Fixed-step, tile-based movement; enemies, doors/keys, health, ammo, score, gems, items, power core, switches, portals, pushing blocks, hazards and a win condition.
- Arbitrary boards from 10×10 through 200×120, with a 60×25 camera viewport; up to 128 boards and 500,000 total cells per world.
- 3 layers: terrain, transparent overlay, and entities. Board painting, eraser, glyph eyedropper, board creation, undo/redo, and player spawn tool.
- Original 256 graphical CP437 symbols, full Unicode codepoint selection subject to the browser font, plus editable 8×12 bitmaps in named banks (4,096 custom glyphs per world currently accepted on import).
- A configurable 16-color palette; per-cell foreground/background indices.
- Safe, bounded event scripting with `:touch`, `:tick`, and `:shot` handlers; no JavaScript `eval`.
- WebAudio beeps; screenshottable canvas; desktop and touch direction controls.
- Import/export world JSON, automatic local browser backup when permitted, and a two-board playable demo.
- No CDN, telemetry, external libraries, or payment APIs.

## Development

Run with Node 18+ only for automated tests:

```sh
npm test
```

Run with a browser: open `index.html` directly or host this directory with any static HTTP server (`python -m http.server 8000` then `http://localhost:8000`). The web app requires no Node tooling in production.

## Limitations (v0.1)

- The dialect is original and **not** ZZT-OOP, Robotic, or legacy .ZZT/.MZX compatible. Legacy import/conversion is a planned separate component.
- Text rendering uses your browser's font fallback. Some Unicode symbols may display as empty boxes. Pixel-perfect DOS fonts are not bundled.
- Musical instruments, tracker/MOD playback, animation tracks, custom sprites larger than 8×12, dialogue trees, gamepad, network play, and advanced physics remain on the roadmap.
- Rendering uses one character per grid cell; emoji and wide Unicode codepoints are clipped to a cell to retain tile alignment.
- World files contain editable content and runtime state together. Editor and play-test snapshots are not fully separated in this first build.

## Documentation

- [`docs/ENGINE_SPEC.md`](docs/ENGINE_SPEC.md) — architecture, schema, interoperability, safety.
- [`docs/SCRIPTING.md`](docs/SCRIPTING.md) — command language.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — phased MegaZeux-class extensions.

## Free/open licensing

- **Engine and tools:** [MIT License](LICENSE) — free for personal, educational, commercial, and modified projects, with the standard copyright/license notice.
- **Original demo artwork, glyph artwork, screenshots, and documentation prose:** [Creative Commons CC0 1.0 Universal](LICENSE-CONTENT.md) — public-domain dedication, no attribution or payment required. Documentation prose is also available under MIT, if preferred.
- **Games you make with GlyphDOS remain yours.** The engine's licenses do not automatically apply to user-created games or assets.

GlyphDOS is an independent original engine and does not copy MegaZeux or ZZT source code, assets, or worlds. These names identify historical inspirations, not endorsement or affiliation.
