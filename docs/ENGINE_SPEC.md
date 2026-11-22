# GlyphDOS architecture and world format

## Principles

1. Familiar DOS look, modern runtime: no real DOS memory constraints.
2. Separate serialized world data from engine code.
3. Extend 256-glyph engines with **CP437 + Unicode + bitmap glyph banks**.
4. Keep author tools in the same app as the runtime.
5. Avoid executing user-supplied JavaScript.

## Modules

- `src/charset.js`: graphical Code Page 437 map, 16-color defaults, unicode/glyph helpers.
- `src/data.js`: tile/entity definitions, world model, validation, and demonstration level data.
- `src/engine.js`: player physics, event VM, enemy AI, board transitions, and scoring.
- `src/app.js`: canvas renderer, tool panels, glyph studio, object editor, input, save/load.

## World file

`format` must be `glyphdos-world` and `version` currently 1.

```json
{
  "format": "glyphdos-world",
  "version": 1,
  "title": "My New World",
  "author": "Creator",
  "palette": ["#07090f", "#254bc8", "... 14 more"],
  "glyphBanks": {
    "default": {
      "7": ["00011000", "00111100", "... 10 more 8-bit rows"]
    }
  },
  "flags": {"door_open": true},
  "counters": {"kills": 0},
  "player": {"board":"board0","x":3,"y":3,"hp":100,"keys":0,"inventory":{}},
  "boards": [{
    "id": "board0", "name": "Board One", "width": 60, "height": 25,
    "spawn": {"x":3,"y":3},
    "ground": ["width × height terrain cell objects"],
    "overlay": ["width × height optional transparent glyphs"],
    "entities": [{"id":"robot_1","type":"npc","x":12,"y":7,
      "glyph":"☻","fg":10,"bg":0,"code":":touch\nsay Hello!\nend","state":{}}]
  }]
}
```

Terrain and overlay arrays are flat row-major arrays: `y * width + x`. Terrain values have `kind`, `glyph`, `fg`, `bg`; overlay values have glyph, fg, and bg (`null` for transparency). Entity objects contain type, position, glyph colors, optional text, script, teleport target, and state.

A `glyph` string is either one Unicode codepoint (for example `"█"`, `"♞"`, `"漢"`) or a custom reference of the form `"@default:7"`. A custom glyph is exactly 12 rows of eight `0`/`1` pixel values. Banks can be named and slots indexed 0–4095.

## Runtime

- 60×25 character viewport (720×500 internal canvas pixels at 12×20 per character), with camera following player or manually panned in edit mode.
- Fixed update interval of 180ms in app; engine tick independent from drawing. Functions can be called by a different host/backend.
- Keyboard, touch click direction buttons; mouse editor painting.
- Sandbox VM parses lines; bounded to 100 instructions/event; no eval.
- Serialized game state lives alongside editor state, with optional localStorage backup and explicit JSON export.

## Size / trust boundaries

World imports are checked for supported version, dimensions (10–200 by 10–120), ≤128 boards, ≤500,000 tiles, ≤4,000 objects/board, normalized palette, and bitmap rows. App import capped at 12MB. Script text and dialogue are capped per entity; malicious scripts cannot execute browser JS.

This is a prototype. Do not assume import validation is a comprehensive adversarial security audit, particularly if extending it into networking or third-party plugins.

## Legacy paths

- **ZZT `.ZZT`/`.SZZ`:** future explicit converter should understand board headers, object/stat blocks, ZZT-OOP and palette. No pretend compatibility.
- **MegaZeux `.MZX`/`.MZB`:** future importer can pull physical tiles, character sets, overlay layers, robots and RoboScript into a conversion pipeline, with warnings for unsupported opcodes.
- Separate native DOS output via SDL2/terminal or FreeDOS backend, not browser execution under MS-DOS.
