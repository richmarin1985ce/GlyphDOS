# GlyphDOS scripting v0.1

Attach scripts to **NPCs**, **switches**, or **exits**. In Editor, place an object on the Objects layer; switch to Object Script; select the object on the board; edit and **Save Object Configuration**. For other object types, the `:shot` handler may run when hit by a projectile. A script is a plain UTF-8 string in the world file.

Scripts use named event labels, one command per line, separated by spaces. Commands are case-insensitive; item/flag names are case-sensitive. Lines beginning `;` or `//` are comments. Unknown commands stop execution and display an error. There is **no JavaScript evaluation**, and execution is capped at 100 instructions per event. `:tick` runs periodically on NPCs, and `wait` pauses a tick handler for the given number of ticks.

```text
:touch
if flag lights_online goto ready
say Restore the generator before entering.
end
:ready
say Doors unlocked. Take some gems!
give gems 3
play 660 0.1
end

:tick
wait 10
play 220 0.03
end
```

| Command | Effect |
|---|---|
| `say Any message here` | Writes a message to the event log. |
| `set flagname` | Sets a world flag to true. |
| `clear flagname` | Sets a world flag to false. |
| `if flag NAME goto LABEL` | Branch if the named flag is true. |
| `if notflag NAME goto LABEL` | Branch unless flag is true. |
| `if has keys 2 goto LABEL` | Branch if player has at least this many of a stat or custom inventory entry. |
| `if counter NAME 3 goto LABEL` | Branch if world counter is at least 3. |
| `goto LABEL` | Jump to a label in this script. |
| `give keys 1` / `take ammo 5` | Change player stats (hp, ammo, torches, gems, keys, score) or inventory. |
| `counter kills 1` | Increment a named counter (can be negative). |
| `move east` | Move scripted entity one open cell north/south/east/west. |
| `teleport board_id 5 8` | Change board and player position. |
| `wait 10` | Stop script; defer next `:tick` invocation for 10 ticks. |
| `play 440 0.1` | Short WebAudio square beep (frequency Hz, duration seconds). |
| `damage 10` | Reduce player HP. |
| `heal 10` | Heal player up to max 100. |
| `win` | Set victory, add 1,000 points, stop world simulation. |
| `end` | End current handler. |

**Events:** `:touch` (walking into/interacting with an actor), `:shot` (projectile hits a scripted object), `:tick` (NPC periodic update).

**Limitations:** This is currently a stateless event handler language; scripts restart from an event label on each trigger except for the `wait` counter. There is no global robot, arithmetic expressions, or full MegaZeux Robotic syntax yet. Bounds and command budgets limit accidental loops; long lines can still flood the event log, but world imports are size-capped.
