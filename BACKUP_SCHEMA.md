# Backup file schema (v2)

This is the authoritative shape of a Lesson Planner backup. It exists so anyone (including a third-party LLM) can produce a backup from a school timetable without guessing.

The planner accepts JSON files matching this shape via **Setup → Data → Import**. v1 backups still load cleanly: they are upgraded to v2 in place on import.

## Top level

```json
{
  "_meta":   { "synced": "<ISO timestamp>", "version": 2 },
  "_config": { /* config object, see below */ },
  "note:<date>:<slot>":   { "subject": "...", "notes": "...", "resources": "...", "status": "" },
  "daymeta:<date>":       { "dayNotes": "...", "day0label": "...", "reflections": "...", "overrides": {} }
}
```

- `_meta.version` **must** be `2`. v1 backups (version `1`) are accepted and upgraded; anything higher than `2` is refused.
- `note:` and `daymeta:` entries are optional. A fresh setup only needs `_meta` and `_config`.
- A backup with only `_config` is a "blank slate": classes + timetable + duties, no historical lesson notes.

## Date formats

Two formats are used, and they are not interchangeable:

- **ISO padded** `YYYY-MM-DD` for `terms[].start/.end`, `holidays[].date`, `dayZeros[].date`, and `anchor.date`. Example: `2026-04-20`.
- **Unpadded `YYYY-M-D`** for the date portion of `note:` and `daymeta:` keys. Months and days are **not zero-padded**. Example: `note:2026-3-15:P1`, `daymeta:2026-3-15`.

## `_config`

Single object with these top-level keys.

| Key | Type | Notes |
|---|---|---|
| `school` | string | Always `"Dio"` for this deployment. Overwritten on load. |
| `userName` | string | Optional teacher name, e.g. `"Andrew Blackstone"`. |
| `cycleDays` | number | Cycle length. Usually `7` at Dio. |
| `theme` | string | One of `"physics"`, `"coffee"`, `"cooking"`, `"ocean"`, `"birds"`. |
| `exportStyle` | string | `"plain"` or `"org"`. |
| `terms` | array | See below. |
| `holidays` | array | See below. |
| `dayZeros` | array | See below. |
| `anchor` | object | `{date, day}`. The fixed point that pegs the rotation. |
| `classes` | array | See below. |
| `duties` | array | See below. |
| `timetable` | object | The 12-slot weekly grid, keyed by cycle day. |

### `terms`

```json
[ { "n": 1, "start": "2026-01-27", "end": "2026-04-03" }, ... ]
```

Term numbers are 1-indexed. A date outside every term range counts as "not a school day".

### `holidays`

```json
[ { "date": "2026-04-27", "name": "ANZAC Day" }, ... ]
```

A statutory holiday becomes an automatic Day 0 (no class structure).

### `dayZeros`

```json
[
  { "date": "2026-04-27", "label": "ANZAC Day",       "source": "statutory" },
  { "date": "2026-02-17", "label": "Athletics Day",   "source": "manual" }
]
```

Day 0 events pause the rotation: the cycle day **does not advance** on these dates. `source: "statutory"` is auto-derived from `holidays`. `source: "manual"` is teacher-entered (EOTC weeks, athletics days, teacher-only days, etc.).

### `anchor`

```json
{ "date": "2026-04-20", "day": 3 }
```

Pins one date to one cycle day. The planner walks the calendar from the anchor (skipping weekends, holidays, and Day 0 events) to compute the cycle day for every other date. Pick a date that is definitely a teaching day and that you know the cycle day of.

### `classes`

```json
[
  { "code": "9SST5",  "description": "Year 9 Social Studies", "colour": "#C5D9C0" },
  { "code": "12BSD3", "description": "",                       "colour": "#D0C0E0" }
]
```

- `code` is the short class identifier used everywhere else. **It is the key**: timetable cells reference classes by code, not by an `id` field.
- `description` is optional, free-form. Empty string is fine.
- `colour` is one of the 12 Okabe-Ito-derived hex codes accepted by the planner:
  `#E8C8C0 #EDD9B5 #C5D9C0 #B8CCE0 #D0C0E0 #D4B8A0 #A8C8C0 #E0C0D0 #C0C8A8 #E0D0A8 #B0C0D8 #D8B8B8`.
  Reuse is allowed but the colour picker dims used colours.

### `duties`

```json
[
  { "code": "GD",  "description": "Gate duty",    "color": "#F8D8C2", "textColor": "#7A2E00" },
  { "code": "LD",  "description": "Library duty", "color": "#C2E5D6", "textColor": "#005C40" },
  { "code": "Bus", "description": "Bus duty",     "color": "#D7E8F5", "textColor": "#003F6B" }
]
```

A flat registry of duty codes. **Note the spelling: `color` and `textColor`, not `colour`** (different from `classes`). `textColor` should give legible contrast against `color`. Suggested defaults are above.

Duties are referenced from B-slot cells in the timetable as `{ "t": "duty", "c": "GD" }`.

### `timetable`

```json
{
  "1": {
    "P1": "9SST5", "P2": "nc", "P3": "9SST9", "P4": "nc", "P5": "12BSD3", "P6": "7SST9",
    "B0": null,
    "B1a": { "t": "b1", "c": "fsa" },
    "B1b": null,
    "B2a": null,
    "B2b": { "t": "duty", "c": "GD" },
    "B3":  null
  },
  "2": { ... },
  "...": { ... }
}
```

- Keys `"1"` … `"7"` are **strings**, one per cycle day.
- Each cycle-day object has **twelve required keys**: `P1`…`P6` for teaching periods and `B0, B1a, B1b, B2a, B2b, B3` for the surrounding windows.
- **P-cell value** is a string: a class `code`, or `"nc"` for non-contact. **Always present, never absent.** Use `"nc"` rather than omitting the key.
- **B-cell value** is `null` (free / nothing scheduled) or one of the three object shapes below.

### B-slot value shapes

```json
null                                     // free / nothing scheduled
{ "t": "b1",       "c": "tutor" }         // morning structure: B1a or B1b only
{ "t": "b1",       "c": "chapel" }
{ "t": "b1",       "c": "fsa" }
{ "t": "b1",       "c": "da" }
{ "t": "duty",     "c": "GD" }            // any duty code from cfg.duties
{ "t": "activity", "tx": "Chess club" }   // free-form text, ~30 chars
```

- Only `B1a` and `B1b` accept `t: "b1"` values. The other B-slots accept duty, activity, or null.
- The cycle day with `{t:"b1", c:"fsa"}` automatically uses the assembly bell schedule (P1–P4 shifted earlier). No separate flag.

### `note:<date>:<slot>` entries

Optional. One entry per saved lesson or B-slot note.

```json
"note:2026-3-15:P1": {
  "subject":   "Energy intro",
  "notes":     "warm-up demo + concept check",
  "resources": "ws-001.pdf",
  "status":    ""
}
```

- Slot key is `P1`-`P6` for periods or `B0/B1a/B1b/B2a/B2b/B3` for B-slots.
- `status: "nl"` marks the slot as **No lesson** (e.g. teacher absent, class on excursion). All other status values are blank.
- Date format is **unpadded** (`2026-3-15`, not `2026-03-15`).

### `daymeta:<date>` entries

Optional. One per date that has any per-day metadata.

```json
"daymeta:2026-3-15": {
  "dayNotes":    "IBDP meeting 3.40pm",
  "day0label":   "",
  "reflections": "Class went well, photocopier broke at lunch.",
  "overrides":   { "B1a": { "t": "duty", "c": "GD" } }
}
```

- `overrides` is a map from B-slot code to value. An entry there beats the cycle default for that date only.
- `day0label` is the teacher-friendly name for a Day 0 event (e.g. "EOTC trip"). Empty for normal days.

## Worked minimal example

```json
{
  "_meta": { "synced": "2026-05-08T00:00:00.000Z", "version": 2 },
  "_config": {
    "school": "Dio",
    "userName": "Jane Doe",
    "cycleDays": 7,
    "theme": "coffee",
    "exportStyle": "plain",
    "anchor": { "date": "2026-04-20", "day": 1 },
    "terms":    [ { "n": 1, "start": "2026-01-27", "end": "2026-04-03" } ],
    "holidays": [],
    "dayZeros": [],
    "classes":  [ { "code": "10PHY", "description": "Year 10 Physics", "colour": "#FBE2C2" } ],
    "duties":   [],
    "timetable": {
      "1": {
        "P1": "10PHY", "P2": "nc", "P3": "nc", "P4": "nc", "P5": "nc", "P6": "nc",
        "B0": null, "B1a": null, "B1b": null, "B2a": null, "B2b": null, "B3": null
      }
    }
  }
}
```

This loads on a fresh planner with one class, one cycle day populated, no historical notes.

## Things that look reasonable but break the planner

- `"timetable": { "1": { "1": "9SST5", ... } }` — period keys must be `P1`..`P6`, not numbers.
- `"P1": { "classId": "9SST5", "room": "C4.32" }` — period values are strings, not objects. There is no `room` field.
- `"classes": [{ "id": "9SST5", "name": "9SST5" }]` — must be `{code, description, colour}`.
- `"P5": null` — periods can never be null. Use `"nc"`.
- `"daymeta:2026-04-20"` (zero-padded) — the date in note/daymeta keys is unpadded.
- Period or slot keys in lower case (`"p1"`, `"b1a"`) — accepted on import (auto-corrected) but will be silently re-cased.
- `"_meta": { "version": 1 }` mixed with v2 shapes — pick one. v1 keys (`p1`-`p6` lower, `mmType` in daymeta) get migrated automatically; just don't half-migrate manually.

## Validating before import

The planner refuses to import:

- a backup whose `_meta.version` is greater than `2`
- a non-object payload
- entries with keys outside the `_config | note:<date>:<slot> | daymeta:<date>` allowlist (those are reported as "skipped" but the rest still imports)
- entries whose value is not a non-array object

Anything else fails silently in the rendering layer with the symptom "no classes appear" or "the cycle day is wrong" — usually a casing or shape mismatch from this list.
