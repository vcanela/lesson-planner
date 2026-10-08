# Year Model Design (multi-year config)

Status: decisions resolved 2026-10-08 (section 14). Phase 1 built in 3.0.0; phase 2 built in 3.1.0 and 3.2.0. Phase 3 (setting up 2027) waits for the school's 2027 calendar; phase 4 not started.
Target: the planner moves into 2027 with 2026 intact and correctly labelled, and setting up a new year becomes a short guided task. Needed before the 2027 setup in late January; phase 1 should ship early in Term 4 2026.

## 1. The problem, concretely

The config describes exactly one school year: `terms`, `holidays`, `dayZeros`, one `anchor`, one `timetable` (plus `timetableS2` and `semesterBoundary`), one `classes` list, `weeklyEvents`, `duties`, `cycleDays`.

Notes and day metadata are keyed by date and period only (`note:<dk>:<pid>`, `daymeta:<dk>`) and store `{subject, notes, resources, status}`. **The class a note belongs to is never stored.** Every view recomputes it: `cycleDayFor(date)` counts teaching days from the single anchor, and `classAt(date, cd, pid)` looks the answer up in the current timetable.

So setting up 2027 by editing Setup breaks 2026 in one of two ways:

1. **Replace the 2026 terms with 2027's.** Every 2026 date falls outside all terms, `isSchoolDay` is false, `cycleDayFor` returns null. A year of plans disappears from Term, Week, Day and Class View. It still exists in storage, backups and search, but no view can show it.
2. **Append the 2027 terms and change the timetable.** 2026 dates stay school days, but `classAt` now reads the 2027 timetable: a 2026 Day 3 P2 lesson appears under whichever class has Day 3 P2 in 2027, and Class View credits last year's lessons to this year's classes. Worse than vanishing, because it looks plausible.

A third, quieter problem: one anchor cannot express that each year's cycle starts afresh, on whatever day number the school sets for the first teaching day. Counting from a 2026 anchor across the summer gives 2027 whatever cycle day the count happens to land on.

Nothing is deleted in any of these cases. The data is fine; the model has no way to address it.

## 2. Goals and non-goals

Goals:
- 2026 stays viewable and correctly attributed (classes, cycle days, colours) after 2027 is added, indefinitely.
- Starting a new year is a guided task: calendar, cycle start, classes, timetable, carrying forward what persists.
- Classes link across years through a course label, so a later "last year" panel can find what was taught in the same course the year before.
- No change to note or daymeta keys or shapes. No note migration.
- Old backups, old devices and sync keep working. An out-of-date app can never overwrite new-shape data.

Non-goals:
- The "last year" panel itself (its own design, after this lands).
- Schools whose year is not the calendar year. The year key is the calendar year.
- Bell times per year. `STD_T` and `ASM_T` are code constants shared by all years (section 11).

## 3. Options considered

A. **Stamp the class code into each note at write time.** Makes a note self-describing, but does not fix the views: an unplanned period has no note, so 2026's Week and Term grids still need the 2026 calendar and timetable to draw at all, and cycle days still need a 2026 anchor. It also creates two sources of truth for one fact. Rejected as the fix; could complement later.

B. **Archive and clear.** Export 2026 to a file and start clean. Simple, and it throws away exactly the thing that becomes valuable in 2027. Rejected.

C. **Years as first-class entries in the config (recommended).** The year-specific fields move into a `years` list; everything else stays shared.

## 4. Core idea: one year per screen

Every screen shows dates from a single school year. A week never holds teaching days from two years (the Christmas week is holidays), a term belongs to one year, a day is one date. So:

- **The date engine stays single-year.** `makeDateEngine` is unchanged and keeps its tests. It is built from one year's entry plus the shared fields, which is exactly today's config shape.
- **The App chooses which year to build it for:** the working year, meaning the year of the date on screen. Engines are memoised per year.
- **Only the few places that span years** need to know there is more than one: search, gamification totals, the Term and Class View year switchers, Day View Prev/Next across New Year, and Setup.

That keeps the blast radius small. Week View, Day View, and most of Term and Class View do not change.

## 5. The config shape (schema v3)

```
planner-config: {
  schema: 3,
  school, theme, userName, exportStyle, showGam,      // shared, as today
  updatedAt,                                           // stamp for the shared fields
  years: [
    { year: 2026, updatedAt,
      cycleDays, anchor, terms, holidays, dayZeros,
      timetable, timetableS2, semesterBoundary,
      classes: [{ code, description, colour, semester, course }],
      weeklyEvents, duties },
    { year: 2027, ... }
  ]
}
```

- `year` is the calendar year: `yearFor(date) = date.getFullYear()`.
- New class field `course`: a short label shared by the same course across years ("9SCI", "13DPHY"). How it is filled in: section 6.
- Each year entry has its own `updatedAt`, so sync can merge years independently (section 9).
- What is per-year: everything that describes a school year, including `cycleDays` (if the school ever changes cycle length, last year must keep the old one), `duties` and `weeklyEvents` (they change with the year's timetable; the new-year flow offers to carry them forward). Display and identity settings stay shared.

Two small pure helpers carry the whole design:
- `flattenYear(cfg, year)` returns `{...shared, ...thatYear}`, the v2 shape every existing reader already understands.
- `yearsOf(cfg)` returns the years list of a v3 config **and also of a v2 config** (wrapped as one year), so every reader works on either shape no matter where the config came from (local, sync, an old backup).

## 6. Migration, v2 to v3

Runs in `migrateConfig`, which already runs on every config load and after every import. Idempotent: a config that has `years` passes through.

1. If `years` is absent: build one entry from the per-year fields, with `year` taken from the first term's start date (2026), and remove those fields from the top level. Set `schema: 3`.
2. Derive each class's `course` by stripping the trailing class number from the code: `9SCI3 -> 9SCI`, `13DPHY3 -> 13DPHY`, `11PSC7 -> 11PSC`; `7SCI2` and `7SCI8` both become `7SCI`. Editable in Setup.
3. Before writing, keep a one-time copy of the v2 config under `planner-config-v2`, never overwritten. If the release ever has to be rolled back, that copy restores the old shape in one step.
4. **Do not restamp.** The year entry keeps the v2 config's `updatedAt`. (Corrected during phase 1; the first draft said to stamp it with the current time.) A migration is not an edit: stamping it "now" would let the migrated config beat a genuinely newer edit made on another device before this one upgraded, and silently discard it. What protects a new year during the transition is the per-year merge in section 9, not the stamp.

Notes and daymeta are untouched; their date keys are already unique across years.

`SCHEMA_VERSION` goes from 2 to 3, and the two guards that already exist (both unit-tested) then protect an out-of-date device: a v2 app refuses to import a v3 backup ("update first"), and a v2 app that pulls a v3 gist goes to the conflict state instead of pushing its old shape.

## 7. The engine and the App

Sketch:

```
const engines = useMemo(() => new Map(), [cfg]);      // year -> engine, built lazily
const engFor = y => engines.get(y) ?? build(y);       // null if that year is not configured
```

- **Working year.** Week and Day View derive it from their own date (`base`, `date`). Term, Class, Lab and Setup use a selected year, which follows Week and Day when you navigate, and which their year switcher can change. On load: the year of today if configured, otherwise the latest configured year.
- **`CfgCtx` still provides one engine**, the working year's, so every existing `useCfg()` call stays as it is. It also provides `engFor` for the cross-year places.
- **No year configured for today** (opening the app on 10 January before 2027 is set up): Week and Day show a "2027 isn't set up yet" card, with a button into the new-year flow and a link to view 2026. Today the same situation gives a silently empty week.

The places that span years:

| Place | Today | v3 |
|---|---|---|
| Search | labels every note through one engine | `engFor(year of the note)` per result, so a 2026 note shows its 2026 class |
| Gamification | totals over `eng.terms` | lifetime XP and achievements summed across years; term, week and streak stats from the working year (decision 1) |
| Term View | buttons for one year's terms | a year switcher, then that year's terms; next from Term 4 goes to next year's Term 1 |
| Class View | one year's classes | a year switcher; each class shows its course label |
| Day View Prev/Next | `nearestSchoolDay` inside one engine | when the walk leaves the year, it continues in the neighbouring year's engine |
| Setup | edits the config | edits the selected year; new-year flow (section 8) |

## 8. Starting a new year

Setup gets a year selector at the top: `2026 · 2027 · + Start 2027`. "Start 2027" opens a short guided flow that writes nothing until its last step:

1. **Calendar.** Terms, holidays and Day 0s for the new year, pre-filled from a built-in seed for that year when the app ships one (decision 5), otherwise today's pickers.
2. **Cycle start.** Asks which cycle day the first teaching day of Term 1 is, as the school announces it. Pre-filled with Day 1 but not assumed: the step has to be confirmed, not skipped (decision 6). This matters more than it looks. Notes are attached to a date and period, not to a class, so changing a year's anchor after lessons are planned silently moves those plans onto different classes. The anchor has to be right before planning starts.
3. **Classes.** Last year's classes, grouped by course. For each course: continuing (type this year's code; the colour carries over) or not. Plus "add a new course".
4. **Timetable.** Starts empty, because timetables change completely; an option copies last year's grid as a starting point.
5. **Carry forward.** Checkboxes for cycle length, duties and weekly events, each defaulting to last year's values.
6. **Review and create.** Appends the year entry. Last year is not touched.

Past years stay editable through the selector, under a banner: "You are editing 2026. Changes here change how 2026's lessons display." Not locked, since fixing last year's mistakes is occasionally legitimate.

`DEFAULT_YEAR_SEED` becomes `YEAR_SEEDS`, keyed by year and holding calendar fields only. A brand-new profile is seeded with the current year's calendar, as today.

## 9. Sync during the transition (the subtle part)

Today `_config` merges as one record: the newer `updatedAt` wins the whole thing. With years inside it, that rule can lose a year:

1. The laptop updates, migrates, and 2027 is added there.
2. The iPad has not been opened online since the release, so it still runs the old version. A 2026 Day 0 is changed there; its whole v2 config is now the newer record.
3. The whole-record merge picks the iPad's config. 2027 is gone.

The schema guard only helps once the gist already holds v3; this race happens before that point. Fix: **merge configs year by year.**

```
mergeConfig(a, b):
  A = yearsOf(a), B = yearsOf(b)           // either side may still be v2
  each year in A or B: keep the entry with the newer updatedAt
  shared fields: the newer top-level updatedAt wins, as today
```

An old-shape config can now only ever overwrite its own year, never remove another. Unstamped years count as epoch and lose to any stamped edit, as records do today. It also fixes an everyday case: editing the 2027 timetable on one device while correcting a 2026 Day 0 on another, both edits now survive.

Two more doors to the same problem, found while building phase 1:

- **Adopting the merged config locally.** `applyMerged` used to adopt the merged config only if its top-level timestamp was strictly newer than the local one, so that an unstamped config could never clobber local settings on a tie. Per-year merging breaks that test: a merged config can carry a newer year from another device while its top-level stamp is unchanged, and that year would never land. Now the local config and the merged one are merged again part by part, with ties going to the local side: newer parts are adopted, ties keep what is local.
- **Importing a backup.** Import used to replace the config wholesale, so restoring an old 2026 backup after 2027 exists would delete 2027. Import now restores the years the backup contains and keeps the rest, the same way it overwrites the notes it contains and keeps other dates. Shared settings come from the backup, as before.

For the release notes and the guide: open the planner online once on every device after the update. Until a device has updated, it stops syncing (conflict state) rather than doing harm.

## 10. What this enables next

- **Last year panel.** For a lesson in a 2027 class with course `9SCI`, find the 2026 classes with course `9SCI` via `engFor(2026)`, list their lessons with the existing `classLessons`, and align by lesson number or week of term.
- **Lost-lessons report** across terms and years.
- **A published school calendar.** `YEAR_SEEDS`, or later an importable calendar file, makes the yearly Dio calendar something colleagues receive instead of a code edit every January.

## 11. Limitations

- **Calendar-year key.** Right for NZ; a September-start school would need a different key.
- **Bell times are code constants** shared by every year. If Dio changes bell times in 2027, 2026's Day View shows the 2027 times. Moving them into the year entry is a separate change (decision 7).
- **Notes on dates outside any configured year** (typed during the summer) are reachable only through search and backups, as today.
- **Editing a past year** is possible and changes how its lessons display. Banner, no lock.
- **Changing a year's anchor after planning** moves that year's plans onto different classes, because notes carry a date and period but no class. This is already true today; Setup will warn before the anchor of a year that has notes is changed.

## 12. Test plan

Unit (pure core):
- `migrateConfig`: v2 to v3 wraps one year with the right `year`; a no-op on v3; derives course labels; writes `planner-config-v2` exactly once.
- `yearsOf` and `flattenYear`: a v2 config and its migrated v3 form give identical results.
- Engine per year: 2027 cycle days restart from 2027's own anchor; a 2026 date still resolves through the 2026 timetable after 2027 is added. That last one is the exact failure from section 1, kept as a permanent regression test.
- `mergeConfig`: per-year last-write-wins; a v2 remote cannot delete a v3 year; shared fields merge as today.
- Schema guards: importing or syncing v3 into v2 is still refused (existing tests, version bumped).

Smoke (a new two-year fixture):
- Frozen in 2026 Term 4, and again in 2027 Term 1: all six views render with each year's classes.
- Week navigation across New Year; the Term View year switcher; Day View Prev across New Year.
- Working in 2027, search finds a 2026 note labelled with its 2026 class.
- Frozen on 10 January with 2027 not configured: the "not set up yet" card renders, nothing crashes.
- The new-year flow opens, steps through, and creates a year.

## 13. Rollout

1. **Phase 1, model and migration (early Term 4). Built in 3.0.0.** Sections 5, 6, 7 (engine and working year only) and 9, with no visible change beyond a year label in Setup. When the date on screen falls in a year that is not configured, phase 1 works in the nearest configured year instead, which renders exactly as the single-year planner always has (an empty holiday week); the "not set up yet" card arrives with phase 2. Day View Prev/Next and search still work within one year until phase 2. This puts the risky parts, migration and sync, into daily use for weeks while 2026 is still the only year and the stakes are lowest. Take a backup from the Data panel before updating. `BACKUP_SCHEMA.md` moves to v3. Roughly two working sessions.
2. **Phase 2, the year UI (before Term 4 ends on 8 December).** Split into two releases:
   - **3.1.0, reading across years. Built.** Term and Class View year switchers (shown only once a second year exists), Day View Prev/Next and the `[` `]` keys across New Year (the engine handed to views steps through `stepSchoolDay`), search labelling each lesson through its own year's engine, lifetime XP, levels and achievements.
   - **3.2.0, setting up a year. Built.** Setup's year selector and the new-year flow (section 8), editable course labels, the anchor confirmation and the warning on changing an anchor once a year has notes, the "not set up yet" card replacing the phase 1 fallback, `YEAR_SEEDS`, and the guide section. One departure from section 8: the flow is Setup itself in a draft mode (the same cards, numbered, shared cards hidden) rather than a separate wizard, and "continuing or not" per course is done by editing or deleting the carried-over classes. Same steps, no duplicated editors, and Tab order matches the screen.
3. **Phase 3, set up 2027 (January).** Needs two facts from the school: the 2027 calendar (term dates, holidays, Day 0s) for the seed, and the cycle day of the first teaching day.
4. **Phase 4, last year panel (Term 1 2027).** Separate design.

## 14. Decisions (resolved 2026-10-08)

1. **Gamification across years:** XP, levels and achievements are lifetime; term, week and streak stats belong to the working year.
2. **Per-year fields:** `duties` and `weeklyEvents` belong to the year, carried forward on request in the new-year flow.
3. **Course labels:** Dio codes are level + subject + class number, so the migration derives `course` by stripping the number (`13DPHY3 -> 13DPHY`). Editable in Setup.
4. **Past years:** editable, behind a banner.
5. **The 2027 calendar:** a built-in seed (`YEAR_SEEDS`), with the dates supplied once a year. An importable calendar file is deferred until colleagues ask for one.
6. **Cycle restart: not assumed.** The school sets the cycle day of the first teaching day, and it is not confirmed to be Day 1. So the new-year flow asks for it explicitly (pre-filled Day 1, must be confirmed), and Setup warns before a year's anchor is changed once that year has notes (section 11). The 2027 value comes with the calendar in phase 3.
7. **Bell times:** stay shared code constants. Revisit only if Dio changes them.
