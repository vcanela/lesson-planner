# Changelog

All notable changes to the Lesson Planner are documented here.

Versioning: MAJOR.MINOR.PATCH — major for breaking changes, minor for new features, patch for bug fixes.

---

## 2.1.1 — 2026-05-07

### Fixes
- **Week View planned/total now excludes non-contacts.** The summary line at the top of Week View used to read e.g. "21/30 planned" where the 30 counted every period across the week, including NCs. It now matches the per-day fraction and the Lab's coverage bar: only contact periods are counted in the denominator. Same fix carries through to the plain-text week export.

### Docs
- **Guide rewritten for v2.** Step 2 of the setup walkthrough explains B-slot rows and the +Before/+After school toggles; a new Step 3 covers the Duties registry. Week View and Day View descriptions drop their Mid-morning Block references and gain B-slot row coverage, including the per-date override semantics. The old "Mid-morning block" section is replaced by a compact "B-slots: morning structure, duties, activities" reference.
- **What's New** has a v2.1 entry summarising the model change for teachers seeing it for the first time.

---

## 2.1.0 — 2026-05-07

### Behaviour changes

- **B-slot editors no longer write the cycle default.** Both the DayView in-row editor and the WeekView cell-zoom overlay drop the "Save to D{cd}" button. Only "Save today" and "Cancel" remain. Cycle-default edits live in Setup, where they belong; the planner views are for per-date overrides only. Less surface area, less chance of an accidental cycle-wide change.
- **B1b accepts the morning-structure options.** Tutor / Chapel / FSA / DA were previously offered only on B1a. Some teachers run morning structure in either window, so both B1a and B1b now expose the same option set. B0, B2a, B2b, B3 stay duty/activity only.
- **Assembly bell schedule is derived, not configured.** The per-cycle-day "☀" toggle in the Setup grid is gone. `isAsmDay(cycleDay, cfg)` now returns true iff that cycle day has an FSA value in either B1a or B1b. Pick FSA somewhere in the cycle day and the assembly timing follows automatically. The day-header sun icon now appears as a read-only indicator, not a button.
- **School name is fixed to "Dio".** The Setup input for it is removed; `migrateConfig` overwrites any prior value on load. Single-school deployment.

### Defaults for new installs

- Theme: `coffee`
- Export format: Plain text
- School: `Dio`

(These only affect a brand-new profile. Existing users keep whatever they set, except for the school name, which is forced to "Dio" on load.)

---

## 2.0.0 — 2026-05-07

### Major: 12-slot model and per-date overrides

The data model is rebuilt around twelve named time-blocks per day: B0 (before school), P1, P2, B1a (after 2), B1b (before 3), P3, P4, B2a (after 4), B2b (before 5), P5, P6, B3 (after school). The cosmetic mid-morning selector (`mmType`) and its derived "Tutor / Morning Tea / Lunch" break rows are gone; their content moves into proper B-slot values that the planner can hold, edit, override per date, and annotate with notes.

`SCHEMA_VERSION` bumps from 1 to 2. v1 backups still import cleanly: `migrateConfig` upper-cases period keys (`p1`-`p6` → `P1`-`P6`), seeds the six B-slot keys per cycle day, and strips the obsolete `mmType` from any leaked top-level config; a new `migrateStorage` re-keys note entries from `note:<date>:p[1-6]` to `note:<date>:P[1-6]`, seeds `overrides:{}` on every daymeta, and removes the `mmType` field. Both migrations are idempotent and run once at startup plus once after any backup import. v1 clients cannot read v2 backups (the existing `version > SCHEMA_VERSION` guard refuses them).

### Setup

- **New 12-slot timetable grid** with B-slot rows interleaved between teaching periods. B0 and B3 are toggleable via "+ Before school" / "+ After school" affordances; B1a/B1b/B2a/B2b are always visible. Slot labels show only the wordy relational phrase ("after 2", "before 3"); the B-codes stay internal.
- **Per-cycle-day assembly toggle** (sun icon in each day column header) replaces the v1 `mmType=fullsch` shortcut. When on, P1/P2/P3/P4 use the assembly bell schedule (`ASM_T`); P5/P6 are unchanged.
- **B-slot cell editor popup** (Tutor/Chapel/FSA/DA + Duty/Activity/Clear) opens anchored to the clicked cell. Period cells keep TTCombo.
- **New Duties registry card** beneath the timetable: code, description, colour swatch, reorder, delete. Duty codes added here populate the Duty submenu in B-slot editors across Setup, Day, and Week views.

### Day View

- **B-slot rows** render from `buildSlots`, replacing the cosmetic break dividers. Each row shows the chip (when set), an orange override dot when the value differs from the cycle default, a paperclip when there are notes, and the time range.
- **In-row expansion editor** for any B-slot. Stages a value from the slot-aware option set, surfaces a "Differs from cycle default" banner, and commits via two save buttons: "Save today" writes a per-date override into `daymeta.overrides[code]`; "Save to D{cd}" writes the cycle default into `cfg.timetable[cd][code]`.
- **B-slot notes** at `note:<date>:<slotCode>` (e.g. `note:2026-5-7:B1a`), backed by the same autosave-on-blur as period notes.

### Week View

- **B-slot rows** appear in the grid only when at least one school day in the visible week has a non-null resolved value for that slot. Empty cells inside a visible row show diagonal hatching (with a today-tinted variant) so the missing schedule reads as "exists but unscheduled".
- **Cell-zoom overlay editor** anchored to the clicked B-cell with viewport clamping and flip-up. Reuses the same staged-value editor and save-button split as Day View. Click outside to close.

### Removed

- `MMBar`, `MMT` constant, `MTag` mini-component, the "Mid-morning Setup" expand panel under the week grid, and the App-level `mmO` state.
- The `mt1`/`mt2`/`l` cosmetic break entries in `bldP` (DayView no longer iterates them; the three remaining call sites only need P1-P6 timing).
- `mmType` from `eM()` defaults and from existing daymeta entries (stripped by `migrateStorage`).

### Notes

- B-slot codes (B0/B1a/B1b/B2a/B2b/B3) are intentionally hidden from user-facing surfaces; they appear only in data, source, and storage keys.
- Override revert is informational by design: the orange dot signals the difference, but reverting is done by re-picking the cycle-default value in the editor and saving today.

---

## 1.6.1 — 2026-05-01

### Fixes
- **Timetable dropdown no longer hides off-screen.** The class-code combo (TTCombo) in Setup's Timetable section now measures the input's distance from the viewport bottom when it opens, and flips upward (drops above the input rather than below) when there is not enough room below. Setup also has 120 px of bottom padding now to give the page a comfortable tail-scroll.

---

## 1.6.0 — 2026-04-27

### Features
- **Auto-pull on tab focus**: when the planner tab becomes visible after being hidden (e.g. you switch back to your computer after editing on your phone), the app now pulls fresh from the gist so cross-device edits show up without a page refresh. Throttled by `PULL_ON_FOCUS_MIN_MS` (15 s) so quick tab toggles do not spam the API. The existing conflict-detection guard still applies, so unsaved local changes will not be silently overwritten.

### Fixes
- **No-lesson reason no longer reverts to topic in Week and Class view.** The qe save handler (`sQE`) was writing `status:""` unconditionally, which downgraded a No-Lesson period back to a topic every time the user typed a reason and pressed Enter. Now `sQE` preserves the existing status, so editing a no-lesson reason keeps it as a reason. Day View already worked correctly because it uses a different code path.
- **Backup-file import no longer requires "clicking around" to land.** `handleImport` was building the meta cache against the closed-over `eng` (which still reflects the pre-import config because `setCfg` has not committed yet). Now it builds a fresh engine from the just-imported config and walks that, so the views render correctly on first paint after import.
- **Same fix applied to the gist startup auto-pull**, which had the identical stale-engine issue. Both call sites now share a `pullAndApply` helper.

---

## 1.5.2 — 2026-04-27

### Fixes
- Click-to-toggle on Week and Class view period cells now closes the quick-edit panel correctly when you click the same period twice. The previous fix from v1.3.0 was defeated by event ordering: the input's onBlur fired between mousedown and click, clearing `qe` to null, so the click handler always saw "nothing was open" and re-opened the same period. Symptom: pressing the mouse button made the panel go away, releasing it brought the panel back. Fix: capture `qe` in a ref at mousedown time (before blur fires) and let the click handler check that captured value rather than the live state. Same pattern applied in WeekView and ClassView.

---

## 1.5.1 — 2026-04-27

### Readability (audit pass 3)
No behaviour changes. The codebase is now substantially more legible as a teaching example.

- **Architecture overview** comment block at the top of the script tag, explaining data shapes, localStorage key conventions, the component hierarchy, the date engine, and the security posture. About 60 lines.
- **Header comments on every top-level function and component**: `compGam`, `useAutoSave`, `makeDateEngine`, `migrateConfig`, `syncHolsToDZ`, `getAllData`, `gistCreate`/`gistPush`/`gistPull`, `cycD`, `nearSD`, `PCard`, `DayView`, `TermView`, `WeekView`, `ClassView`, `LabView`, `WeeklyBar`, `SettingsView`, `DataPanel`, `App`, plus the small primitives (`Btn`, `SvH`, `AInp`, `CBadge`, `MTag`, `XpStrip`, `Badges`).
- **Inline block comment on the cycle-day calculator** (`cycD`) explaining the anchor-based walk, the forward and backward branches, and the double-modulo trick for negative results. This is the cleverest piece of code in the file and was previously the most opaque.
- **Inline annotations on `compGam`** breaking the gamification pipeline into named steps (active term lookup, two-pass calcStats, streak vs longest-streak, achievement triggers, XP and level lookup).
- **Per-clause annotations on `migrateConfig`** explaining which legacy shape each clause handles.
- **Named constants for ten magic numbers**: `XP_PER_LESSON`, `XP_PER_PERFECT_WEEK`, `STREAK_THRESHOLD_PCT`, `ALL_HALF_THRESHOLD_PCT`, `BLUR_SAVE_MS`, `STATUS_PILL_MS`, `SYNC_DEBOUNCE_MS`, `SYNC_STATUS_OK_MS`, `SYNC_STATUS_ERR_MS`, `CYCLE_WALK_MAX_DAYS`.

The cryptic short identifiers (`compGam`, `eN`, `dk`, `sGet`, etc.) are deliberately left in place for now. A bulk rename is planned as a separate pass.

---

## 1.5.0 — 2026-04-27

### Data-loss resilience (audit pass 2)
- **localStorage quota banner**: when a save hits the browser's storage limit, a sticky red banner appears at the top of every view with a button to open the Data Panel for export. While the banner is visible, the cloud sync is suspended so the gist never receives partial state. Dismiss the banner once you've cleared space; it will reappear if a new save fails.
- **`beforeunload` flush in `useAutoSave`**: closing the tab during the 80 ms blur-debounce window no longer drops the typed text. The hook also flushes on `pagehide` and `visibilitychange` to cover Safari and iOS, where `beforeunload` is unreliable.
- **Multi-tab `storage` event listener**: when another tab writes a `note:`, `daymeta:`, or `planner-config` key, this tab refreshes its React state automatically. Two browser tabs editing simultaneously no longer overwrite each other on save.
- **Schema version gate**: `_meta.version` is now read on every backup import and gist pull. Payloads with a newer version than the running app are refused with a clear message (`"This backup is from a newer version of the planner (v2). Please update before importing."`) instead of being silently ingested. The Sync Conflict prompt has a third type, "version mismatch", with no Overwrite option.
- **No-lesson confirmation**: marking a period as No Lesson when the topic field has content now shows an inline confirmation (Yes / Cancel) instead of clearing the topic silently. The confirmation appears in Day View, Week View, and Class View. Uses inline UI rather than a popup dialog to match the rest of the app's visual register.

---

## 1.4.2 — 2026-04-27

### Fixes
- Import allowlist regex was too strict on date format. Note and daymeta keys store dates in the same form `dk()` produces, which uses unpadded month and day (e.g. `note:2026-3-23:p5`). The v1.4.0 regex required `\d{2}-\d{2}` and so rejected every legitimate key. Symptom: backup imports surfaced all keys as "unrecognised" and `checkSyncConflict` counted remote entries as 0, falsely flagging every healthy gist as having "fewer entries than local copy". Fix: relaxed the regex to `\d{1,2}-\d{1,2}` for month and day; year is still strictly 4 digits.

---

## 1.4.1 — 2026-04-27

### Fixes
- Gist sync conflict detection no longer false-positives after a successful push. Previously the local "last sync" timestamp was set to `Date.now()` on the client, but the gist's own `_meta.synced` was set milliseconds earlier inside `getAllData()` (before the network round trip). The two timestamps drifted by 1-3 seconds, which made every subsequent pull report the gist as "older than your last sync". The fix anchors local `planner-last-sync` to the same `_meta.synced` value that lives in the gist, so a clean round-trip leaves both sides in agreement.

---

## 1.4.0 — 2026-04-26

### Security hardening (audit pass 1)
- **Subresource Integrity** added to React, ReactDOM and Babel CDN scripts. The browser refuses to execute these files if they do not match the pinned SHA-384 hashes, blocking CDN-compromise and TLS-intercept attacks.
- **Content Security Policy** meta tag added. Restricts script, style, font, image, manifest, connect, base-uri and form-action sources to known origins.
- **Backup import key allowlist**: only `_config`, `note:YYYY-MM-DD:periodId` and `daymeta:YYYY-MM-DD` keys are accepted, and each value is shape-checked. Unknown or malformed keys are reported in the import preview as "will be ignored". Closes the path where a malicious backup file could overwrite the GitHub token or inject arbitrary localStorage entries.
- **Gist sync conflict detection**: the app records the timestamp of every successful push and pull. On future pulls, if the Gist appears older than the last sync or has fewer entries than local storage, the pull is paused and a "Sync conflict" prompt explains the discrepancy and asks for confirmation before overwriting local data. The startup auto-pull surfaces the same state (red dot on the Data button) without clobbering anything.
- **Gist ID connection preview**: when you connect to a non-empty Gist ID, the app first pulls a read-only preview (school name, note count, last-synced time) and asks "Use this Gist?" before adopting it. Stops a phished or copy-pasted Gist ID from silently replacing your data.
- GitHub API requests now use `Bearer` authorization with explicit `Accept` and `X-GitHub-Api-Version` headers (modern GitHub recommendation).

---

## 1.3.0 — 2026-04-26

### Features
- **Day/night toggle**: a sun/moon button in the nav bar instantly flips between day and night mode from any view, preserving your bold/non-bold preference.
- **"This week" vertical bar**: the Lab view's weekly progress visual has been replaced with a clean vertical fill bar. Milestone markers sit at their percentage positions along the bar, filling as you plan more periods.
- **Lab view clarity**: the XP & Level card now has a clear heading and explanatory subtitle. A "Your progress" label separates the stats tiles from the XP card.

### Fixes
- Clicking an already-open quick-edit panel in Week View or Class View now closes it (click-to-toggle), instead of requiring the X button.
- Coverage-by-class bars in Lab view are now taller (8 px) and fully opaque, making them much easier to read.

---

## 1.2.0 — 2026-04-24

### Features
- **Gamification toggle**: Setup > Display now has a switch to hide the XP bar and awards. Planning counts and XP continue to accumulate while hidden; toggling on restores everything. The x/x planned indicator is unaffected.

### Fixes
- Day View now opens on today when accessed from the current week in Week View. For any other week, it opens on that week's Monday.

---

## 1.1.1 — 2026-04-23

### Features
- **No lesson reason**: when marking a period as "No lesson", anything typed in the input is saved as the reason (e.g. "Class has assembly"). Shown in Week View cell, Class View row, and Day View alongside the "No lesson" label.

### Fixes
- "No lesson" state now shows in Day View — period row displays "No lesson" (with reason if set), label changes to "Reason (optional)", and a toggle button lets you set or remove the status without leaving the day
- "No lesson" now counts as planned in all views consistently: Week View summary bar, Term View coverage dots, Class View planned count, XP/gamification — all were missing it except the gamification engine
- Markdown removed from export format options (replaced with "Formatted" using structured text); default changed from Markdown to Formatted
- No remaining literal `\u` escape sequences in any rendered output

---

## 1.1.0 — 2026-04-22

### Features
- **No lesson state**: periods can now be marked "No lesson" (e.g. class has an event, relief teacher, assembly) via a button in the quick-edit panel. Shows as a distinct label in Week View and Class View, and counts toward planned totals and XP.
- **Export format options**: Setup now has an "Export Format" selector — Markdown, Org mode, or Plain text. Applies to both week plan and reflections exports.
- **Clipboard copy**: a "Copy" button alongside the week plan download button copies the formatted text directly to the clipboard.

### Fixes
- XP and level now update immediately when periods are planned, not only after visiting Setup
- Term View and Class View now default to the current term instead of always Term 1
- Day Notes textarea now auto-expands as you type (no more fixed height on mobile)
- Unplanned period cells now have a red outline and full opacity, making them much easier to spot
- Class code and subject text in Week View cells now aligns to the top of the cell
- Week View previous/next buttons no longer shift position when the date label changes length
- Unicode em-dash in the quick-edit placeholder now renders correctly instead of showing as `\u2014`
- Week plan and reflections export files now use `.txt` extension (avoids macOS treating `.md` files as suspicious)

---

## 1.0.0 — 2026-04-17

Initial public release for Dio staff.

### Features
- 7-day rotating timetable cycle with automatic cycle day calculation
- Term View, Week View, Day View, Class View
- Quick-edit and detailed-edit modes for lesson planning
- Mid-morning block types (Tutor, Dean's Assembly, Full School Assembly, Chapel)
- Day notes and reflections per day
- Flag word detection (todo, tbc, print, etc.)
- Gamification: 5 themes, 10 achievements, XP, levels, streaks
- 4 display modes (Light, Dark, Light Bold, Dark Bold)
- JSON backup export and import
- Optional GitHub Gist sync for cross-device access
- Week export and reflections export as Markdown
- Day print view
- Pre-filled 2026 config for Dio (terms, holidays, Day 0 events, anchor)
- User manual (guide.html)

### Fixes
- Fixed DataPanel crash on open and on file import (missing state variable, overly strict import validation)
- Backup import now accepts config-only files (files with only `_meta` and `_config` keys)
