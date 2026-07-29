# Changelog

All notable changes to the Lesson Planner are documented here.

Versioning: MAJOR.MINOR.PATCH — major for breaking changes, minor for new features, patch for bug fixes.

---

## 2.19.0 — 2026-07-29

### Changed
- **Flags are now raised deliberately, with `!` at the start of a line.** A flag is a line in a topic or note whose first non-blank character is an exclamation mark, for example `! photocopy the pulley worksheet`. Nothing else raises a flag.
- **The keyword scan is gone.** Up to 2.18.1 a period was flagged whenever its topic or notes contained one of ten words: `todo`, `prepare`, `tbc`, `tbd`, `check`, `remind`, `follow up`, `incomplete`, `print`, `photocopy`. Half of those are ordinary lesson vocabulary, so notes like "check your understanding", "prepare a table" or "the printing press" flagged periods nobody meant to flag, with no way to say otherwise.
- **Flagged Items in Week View now lists the flagged lines, not the periods.** Each marked line is its own row showing that line's text, so the list reads as a to-do list instead of a set of periods to go and open. One note can carry several flags.
- **Flag counts count items, not periods.** The Week View summary ("⚑ 3 flagged") and the Class View header count marked lines, matching the length of the Flagged Items list.
- The "flags" chip in the Week View summary strip now explains the syntax instead of listing keywords, and the Notes and Tasks placeholder mentions it.

### Migration
- Anything flagged only by a keyword stops showing a flag on upgrade. No data changes: the text is untouched, so add an exclamation mark to the lines that still matter.

### Implementation
- `FWORDS` / `FRE` / `hasF` replaced by `FLAG_LINE_RE` (`/^[ \t]*!+[ \t]*(\S.*)$/`, matched per line), `flagLines(text)` returning the marked lines with the marker stripped, `hasFlag(text)`, and `flagCount(note)` summing subject and notes. All six call sites updated; `FlagBank` became `FlagHint` (keyboard-operable, expands to the syntax reminder). Week View's `flags` memo emits one entry per marked line (`{date,pid,cls,text}`) and `sum.f` / Class View's `flagged` use `flagCount`. Guide section "Flag words" rewritten as "Flags" with a change note; glossary entry updated. Twelve new assertions in `tests.html` cover the marker, whitespace, `!!`, mid-line `!`, bare `!`, multi-line extraction, null-safety, and the counts; the old vocabulary is asserted **not** to flag. Verified in preview: 62/62 tests, "⚑ 3 flagged" for three marked lines across two periods with a keyword-only note staying unflagged, the flagged list showing each line's text, Day View flag icon on the marked period only, Class View count 3.

---

## 2.18.1 — 2026-07-14

### Fixes
- **Class View: the "No lesson" button is no longer trapped behind the floating controls.** The Today / back-to-top buttons now hide while a quick-editor is open, so the editor (including the No-lesson button on the last lesson) is fully reachable.
- **Week View: opening a lesson editor scrolls it into view.** Clicking a period now brings the grid to the top of the window, so the editor panel below it is on screen instead of just off the bottom.
- **Week and Class View: "No lesson" is now a stay-open toggle.** Marking No-lesson keeps the editor open with the field focused, so a reason can be typed straight away, and the button turns into **Remove no lesson** to undo it in place. Previously the editor closed with no chance to add a reason, and undoing required opening Day View. The old "Replace your topic?" confirm step is gone, since keeping the text and the editor open makes it non-destructive.
- **Day View: period rows and B-slot rows now share one layout.** Every row reads left to right as start time, slot name (P1, "before 3"), class or event, then description, instead of times and labels sitting on opposite sides for the two row types.
- **Class View: reordered the lesson metadata** to date, weekday, day number, period, clock time, so the period sits next to its start/stop time.

### Implementation
- Class floating controls gated on `!qe`. Week editor scroll via a ref on `.wk-grid` and `scrollIntoView({block:"start"})` on open. `toggleNL` (Week + Class) writes the new status via `writeRecord` while preserving the typed value and leaving the editor open; the button label reads the live status. Day row order changed in `PCard` and `BSlotRow`, with `.bs-row-time` losing its `margin-left:auto` and gaining a fixed left column to match the P-row time. Verified in preview across all six views (no crashes), both toggles (mark, revert, editor stays open), the Class FAB hide, the Week scroll (grid rises to the top when the window is short), the two Day row layouts, and the Class label order; `tests.html` 50/50.

---

## 2.18.0 — 2026-07-14

### Features
- **Keyboard shortcuts (desktop).** Bare keys for the common moves, so the planner can be driven without the mouse:
  - `T` `W` `D` `C` `L` `S` jump to Term / Week / Day / Class / Lab / Setup.
  - `[` and `]` step to the previous / next week (Week View) or school day (Day View); `.` jumps to today.
  - `/` opens search; `Esc` closes search, the shortcuts panel, or a quick editor; `?` shows the shortcuts cheat-sheet.
  - A "Shortcuts" link in the header footer (desktop) opens the same cheat-sheet for mouse users.

### Implementation
- One `keydown` listener bound once at the App level, reading the latest state through a ref (`hotkeyRef`) so it never re-binds. Three guards keep it safe: `Esc` aside, every key is ignored while focus is in an `input` / `textarea` / `select` / contenteditable (so typing a topic never triggers a jump); any Ctrl/Cmd/Alt combination is left to the browser; and it is bare-key only, which does not collide with browser shortcuts. View keys route through the existing `onTab` (so `D` snaps to a school day); `[` `]` `.` drive the `base` / `detDate` state the App already owns, and only act in Week and Day.
- New `HotkeyHelp` overlay lists the keys and notes that shortcuts pause while typing; opened by `?` or the footer link, closed by backdrop, Esc, or its Close button.
- Verified in preview: all six view keys switch views; `/` and `?` open and `Esc` closes; typing `w` in a focused field does **not** switch view; `[` `]` `.` move the week (Mon 13 Jul → Mon 20 Jul → back → today) and the day (Mon 27 Jul → Tue 28 Jul); the footer link opens the panel; `tests.html` 50/50.

---

## 2.17.2 — 2026-07-14

### Implementation
- **Lifted the new-profile default calendar into a top-level `DEFAULT_YEAR_SEED` constant** (it was an anonymous object buried inside `App()`'s seeding effect). A comment block spells out what it is and the four dated fields to refresh each January (terms, holidays, dayZeros, anchor), plus where NZ term dates and public holidays are published. This is the ten-minute January job made obvious instead of hidden.
- The seeding effect now deep-clones the constant (so later edits can never mutate the shared default) and, when a fresh profile is created in a year later than the seed's, logs a one-line console warning that the built-in dates are stale and need updating. Derived `SEED_YEAR` from the seed so the check stays honest.
- No behaviour change for existing users or for a 2026 fresh profile. Verified: clearing the config and reloading still lands fully configured (4 terms from 2026-01-27, 8 holidays, 21 Day 0 entries, the anchor, classes left blank), no crash; `tests.html` 50/50.

---

## 2.17.1 — 2026-07-14

### Documentation
- **User guide caught up with the features shipped since v2.9**, checked against how they actually landed:
  - **Cloud sync**: added a plain note on the access-token trade-off. The token uses GitHub's "gist" scope, which can read and write every gist on that account (not just the planner's); fine-grained tokens do not currently cover gists; and a separate free GitHub account used only for the planner drops the stake to zero.
  - **Offline**: the guide now states plainly that after the first online visit the app works with no connection (a service worker caches it), and that only the first visit and cloud sync need the network.
  - **Compact phone bar**: documented that on a narrow screen the tabs shrink to icons (active tab keeps its label) and search / day-night / data collapse into a ⋯ menu, with the full bar returning on wide screens (the bottom-bar prototype was not adopted).
  - **Version footer**: explained the `v…` line under the title and its Guide and Changelog links.
  - **Error-recovery screen**: described the "Something went wrong displaying this view" card, its Download Backup and Reload buttons, and that saved data is untouched.
- No app behaviour change; `APP_VERSION` bumped to keep it in step with this entry.

---

## 2.17.0 — 2026-07-14

### Implementation
- **Renamed the short legacy identifiers to full English**, so the code reads as documentation. No behaviour changes; done in three layered commits with the test harness green before and after each, plus a full click-through of all six views and the Week quick-editor at the end.
  - **Storage / sync:** `sGet→storageGet`, `sSet→storageSet`, `eN→emptyNote`, `eM→emptyMeta`, `nM→normalizeMeta`, `recTs→recordTimestamp`, and the date-key function `dk→toDateKey`.
  - **Date engine:** `cycD→cycleDayFor`, `isSD→isSchoolDay`, `isTD→isTeachingDay`, `nearSD→nearestSchoolDay`, `getTermWks→getTermWeeks`, `clsLessons→classLessons`, `lesCtx→lessonContext`.
  - **Component props / hooks:** `mc→metaCache`, `uM→updateMeta`, `hFoc→handleFocus`, `hBlr→handleBlur`, `ss→saveStatus`, and the gamification prop `g→gam`.
- **Deliberate non-renames** (would have introduced bugs, so left as-is): `toDateKey`'s output FORMAT (`YYYY-M-D`, unpadded, zero-indexed month) is unchanged; the dark-mode boolean local also named `dk`, the lesson-shift gap counter local `g` (renamed to `gap` for clarity), the `.dk` data property on lesson objects, and the `mcR`/`setMC` companions of `metaCache` are all distinct from the renamed identifiers and were preserved. The 22 "e.g." strings and two `/…/g` regex flags were protected during the `g→gam` pass.
- `tests.html` (its factory return-list and `eng.*` calls) was updated in lockstep with the storage and engine commits so the harness kept passing. Architecture comment refreshed to describe the new names.

---

## 2.16.1 — 2026-07-12

### Fixes
- **No more sideways jump when switching views on a wide screen.** Since v2.11.0 each view centred a column of a different max width (Week 1080, Term/Setup 1000, Lab 900, Class 800, Day 760); because the column is centred, a narrower view re-centred and slid the whole frame — nav included — inward, most noticeably going into Day or Class. Every view now uses a single 1000px centred column, so the layout stays perfectly still across tabs. The dense views are unaffected (1000 was already Term/Setup's width and is visually identical to Week's old 1080); Day/Class/Lab gain a little width. Narrow windows and phones were never affected and are unchanged.

---

## 2.16.0 — 2026-07-12

### Features
- **Day View is now keyboard-operable and screen-reader-legible** (first slice of the accessibility pass; later releases repeat this for the other views). Every expand/collapse row — each period, each B-slot row, the Reflections panel, and the resurfaced past-reflection — can be reached with Tab and toggled with Enter or Space, announces itself with a descriptive label (e.g. "P3, 9SCI3, planned, expand"), and exposes its open/closed state to assistive tech.
- **A visible keyboard-focus ring across the whole app.** A global `:focus-visible` outline in the theme accent now marks the focused control on every view (keyboard only; mouse clicks are unaffected).

### Implementation
- The toggle rows keep their exact styling: they gain `role="button"`, `tabIndex={0}`, `aria-expanded`, an `aria-label`, and a shared `kAct` Enter/Space key handler, rather than becoming native `<button>`s that would fight the existing flex-row CSS. The genuinely button-like controls in Day View (Back/Prev/Next/Today/Print, Quick/Detailed, bell times, No-lesson, +Before/After school) were already native `<button>`s and are unchanged.
- The `:focus-visible` rule is placed last in the stylesheet so it wins specificity ties (e.g. over inputs' `outline:none`).
- Verified in preview with keyboard only: focusing a period row and pressing Enter expands it (`aria-expanded` flips, the editor appears, the label updates to "collapse"); Space expands a B-slot row; Enter opens Reflections. Tab order runs top-to-bottom (header, nav, controls, then the day's rows). No console errors; styling visually unchanged.

### To check manually
- A VoiceOver / screen-reader pass could not be run headlessly. Worth a spot-check: tab through Day View with VoiceOver on and confirm each row is announced as a button with its label and expanded/collapsed state, and that expanding a period moves focus sensibly into the editor fields.

---

## 2.15.0 — 2026-07-12

### Features
- **Genuinely works offline.** After the first online visit, a service worker caches the app (the built HTML, the React CDN scripts, and the fonts), so it opens and runs with no network connection. The README's long-standing "works offline" claim is now literally true; the only caveats are the first visit (needs a connection to download the app) and cloud sync (needs one to reach GitHub).

### Implementation
- New **`sw.js`** (deployed only): precaches `index.html`, the two React scripts, and the Google Fonts stylesheet on install; font `woff2` files are cached on first fetch since their URLs are user-agent specific. Fetch strategy is **network-first for app pages** (so a redeploy is picked up on the next online load, with the cached copy as the offline fallback — no eternal staleness, per review 1.3) and **cache-first for the immutable CDN scripts and fonts**. The GitHub API (sync) is never cached. The cache name is tied to `APP_VERSION`, and `activate` deletes any cache from a different version.
- `build.mjs` now writes `dist/sw.js` with the current `APP_VERSION` substituted into its cache name, and injects the registration (`if ('serviceWorker' in navigator) …`, guarded, after `load`) into `dist/index.html`. The registration lives in the built copy only: a service worker needs HTTPS or localhost, so it has no place in a `file://` open of the source, and the source stays free of deploy concerns. No CSP change was needed — `script-src 'self'` already permits a same-origin worker.
- Verified locally by serving `dist/`: the worker registers and controls the page; the cache (`planner-2.15.0`) holds all four precached entries and the app shell is retrievable for the offline fallback. Bumping the version and rebuilding confirmed the new worker installs, activates, and deletes the previous cache (only the new one remains) — so a redeploy is not stuck behind a stale cache. `tests.html` runs 50/50 against the dist copy. The final "turn off the network and reload" check is a one-click devtools step for a live confirmation.

---

## 2.14.1 — 2026-07-12

### Fixes
- **Week view B-slot labels ("before 3", "after 2", "before school", …) no longer clip.** The v2.13.0 attempt widened the label column in a CSS media query, but the `.wk-grid` div still set `grid-template-columns` as an inline style, and an inline style overrides a stylesheet rule, so the column stayed 32px and the widest word ("before", 31–34px) lost its leading "b". The inline value is removed so the CSS controls the column, and the base column width is now 44px, which fits "before" at both the phone (nano) and wide-screen (micro) text sizes. This clipped on desktop too, so the fix applies to both; the extra 12px comes out of the five day columns (about 2px each, imperceptible).

---

## 2.14.0 — 2026-07-12

### Features
- **Faster loads: the deployed site is now precompiled.** Until now every visitor's browser transpiled the whole app with Babel on each load (about 2.4s of work on a fast laptop, plus a ~1MB Babel download). Deployment now transpiles once, ahead of time, so visitors receive an already-compiled app. The `'unsafe-eval'` allowance the in-browser Babel required has been dropped from the deployed page's Content-Security-Policy (review 4.1).

### Implementation
- **`index.html` is still the single source of truth** and still runs as-is when opened directly (it keeps its `text/babel` script and the Babel CDN tag), so a colleague handed the raw file gets a working app. The only source change is a one-line comment noting the deploy path, plus the version bump.
- New **`build.mjs`** (Node, ~40 lines): reads `index.html`, transpiles the `text/babel` body with the `react` preset, and writes `dist/index.html` with the script tag now plain JS, the Babel CDN tag removed, and `'unsafe-eval'` stripped from the CSP; everything else byte-identical. It also copies `guide.html` and `tests.html` into `dist/` so the deployed site still resolves the in-app Guide link and the test harness. `@babel/standalone@7.23.2` (matching the CDN version) is its only dependency, installed at build time, not committed.
- New **GitHub Action** (`.github/workflows/deploy.yml`): on push to `main` (and manual dispatch) it installs the build dependency, runs `build.mjs`, and publishes `dist/` to Pages. Requires a one-time repo setting change (Settings → Pages → Source = "GitHub Actions"), documented in the PR.
- `dist/`, `node_modules/`, and any build-time `package*.json` are gitignored.
- Verified by serving `dist/` locally: no `text/babel` tag, no Babel loaded, no `'unsafe-eval'` in the CSP, React/ReactDOM still from CDN; all six views click through; `tests.html` runs 50/50 against the dist copy (the test-core markers survive transpilation); the app boots under the stricter CSP, confirming nothing needs eval at runtime. Measured transpile cost removed: ~2.4s for the 241KB app body.

### Note
- The README's offline claim is intentionally left as-is for now; a later change makes the app genuinely offline-capable and will update that wording then.

---

## 2.13.0 — 2026-07-12

### Features
- **Compact phone nav is now the standard below 800px** (the experimental selector and the bottom-bar prototype are gone). On a phone the view tabs shrink to icons with the active tab keeping its word, and search / theme / data collapse into a single ⋯ overflow menu. Laptops and wide screens are unchanged.
- **Week view on a phone is now for glancing, not squinting.** Each lesson pill shows only the centred class code plus a status marker: "–" when there is no plan and a filled dot ● when there is one. The truncated, half-readable topic line is gone; tap a pill for the quick editor, or open Day view for the full detail. Day notes become a tappable indicator ("notes", or "● notes" when written) that opens Day view to edit. The row-label column is a little wider so "before" no longer clips. Desktop Week view is unchanged (it keeps the topic text and inline editing).
- **Term view reads at a glance.** Each day now stacks its periods as P1 on top, P2 to P5 in the middle, and P6 at the bottom, so a free first or last period is obvious (handy for arriving late or leaving early), and the old lopsided wrapping is gone. A busy period is a filled colour box; a free period is an empty outlined box, which stays clearly visible in dark mode where the old filled marker had all but disappeared.

### Implementation
- 7b cleanup: removed `cfg.navStyle`, the Setup selector, the bottom-bar JSX and its `.botbar`/`.botbtn` styles; `compact` is now simply `isNarrow` (the `(max-width:799px)` match).
- Week phone layout is CSS-only, keyed to `@media (max-width:799px)`: the pill renders an always-present `.pb-mark` (hidden on desktop) and the day-notes cell an always-present `.wk-daynote-m` indicator (hidden on desktop), so no `isNarrow` had to be threaded into WeekView. The label column moved from an inline `grid-template-columns` to `.wk-grid` so the phone media query can widen it (32px → 44px).
- Term view periods restructured into three rows (P1 / P2–P5 / P6); free periods switch from a `--nc-bg` fill to a transparent box with a `--text-secondary` border (visible on both light and dark cards). This one change applies on desktop too, since it is a shared layout and a straight visibility win.
- Verified in preview, light and dark: desktop nav, desktop Week pills, and desktop editing unchanged; phone shows compact nav, centred code + "–"/"●" markers, "notes"/"● notes" day indicators, no label clipping, and the three-row Term layout with a visible free box in dark mode; no console errors; `tests.html` all 50 green.

---

## 2.12.0 — 2026-07-12 (experimental)

### Features (experimental, opt-in)
- **Phone navigation prototypes.** A new *Nav style* selector in Setup → Display offers three layouts to trial on a phone over the holidays, stored in `cfg.navStyle` (default **Current**). All three only change anything below an 800px viewport; a wide screen is unaffected.
  - **Current** — unchanged.
  - **Compact** — the top view tabs shrink to icons (the active tab keeps its word), and search / theme / data collapse into a single ⋯ overflow menu (with the backup-status line inside it).
  - **Bottom bar** — the six views move to a fixed bottom tab bar with 44px touch targets; the header keeps only the title, a sync-status dot, and the ⋯ menu.

### Implementation
- `isNarrow` tracks the `(max-width:799px)` breakpoint via `matchMedia`; `navStyle` gates the compact/bottom restructure below it. Tabs render from one `TABS` array through a shared `tabBtn` helper, so Current stays pixel-identical (verified). The ⋯ menu and the bottom bar are new `.navmenu` / `.botbar` styles; the bottom bar uses `padding-bottom:env(safe-area-inset-bottom)` and the page gains matching bottom padding (`viewport-fit=cover` is already set, so the inset applies on notched iPhones). All variants use theme variables, so they work in all four display modes.
- **Header height at 390px:** Current **176px** (tabs + buttons wrap over several rows — the waste this addresses), Compact **126px**, Bottom bar **122px** header plus a **45px** bar pinned to the base.
- Verified in preview at 375/390px in light and dark: Current unchanged on desktop and phone; Compact shows icon tabs + active label + working ⋯ menu; Bottom bar shows the 6-item 44px bar with content clearing it; no console errors; `tests.html` all 50 green.
- **Experimental / temporary:** ships behind the selector. Session 7b will keep whichever variant Victor picks and delete the other two plus the selector.

---

## 2.11.1 — 2026-07-12

### Fixes
- **No more zoom-on-focus when tapping a field on iPhone/iPad.** Safari zooms the page whenever a focused input's font size is below 16px, which made tapping a topic field or timetable cell jump the layout. On touch (coarse-pointer) devices every text control is now floored at 16px, so focusing a field no longer zooms. Desktop is unchanged.

### Implementation
- One rule: `@media (pointer:coarse){.inp,.ta,.bs-popup-input,.tt-grid select,.tt-grid input{font-size:16px!important}}`. The `!important` is deliberate and load-bearing: a handful of inputs (the class editor, weekly-activity rows, global search, and the timetable class combo) set their desktop size via an inline `fontSize`, which would otherwise beat a stylesheet rule. Those inputs all carry `.inp`, so the shared class list covers them with no per-input logic and no JSX changes. Fine-pointer (desktop) devices never match the query.
- Verified in preview: on a fine pointer the rule does not apply (inputs keep 12.48/11.52px, unchanged); the CSSOM confirms the media condition and `font-size:16px !important`; and a probe proved `!important` overrides an inline `fontSize` (a `.inp` with inline `.72rem` computes to 16px under the rule). The on-device no-zoom check is manual.

---

## 2.11.0 — 2026-07-11

### Features
- **Per-view content width.** The app used one fixed 720px column for every view, wasting most of a wide laptop screen on the dense grids. The centred wrapper now sizes to the view: Week 1080px, Term and Setup 1000px, Lab 900px, Class 800px, Day 760px. Reading and editing views stay narrow for comfortable line length; the grid views get room to breathe.
- **Week View breathes on wide screens.** At ≥900px viewport the Week grid's chip text steps up one size (nano to micro) and the column gap widens slightly, using the extra width. Below 900px this is inert.

### Implementation
- New `VIEW_WIDTHS` map keyed by the `view` state, applied to the wrapper's `maxWidth` (falls back to 720). The wide-screen Week bump is a single `@media (min-width:900px){.wk-grid{--fs-nano:var(--fs-micro);column-gap:10px}}` rule — redefining the Session 4 variable scoped to `.wk-grid` reaches the cells' inline `fontSize:var(--fs-nano)` styles through the custom-property cascade, so no per-cell edits were needed.
- **Phones and tablets are unchanged.** Every `VIEW_WIDTHS` value exceeds a sub-800px viewport, so the wrapper is constrained by the screen exactly as the old 720px was, and the `min-width:900px` rule never fires. Verified at 375px: wrapper client width 343px (= viewport − padding), `--fs-nano` still `.62rem`, column gap still `6px` — pixel-identical to before.
- Verified all six views at 1400px (Week fills 1080px with no clipping; Setup timetable grid 962px wide, no horizontal scroll; Day 760px) and at 375px (Week grid unchanged); no console errors; `tests.html` all 50 green.

---

## 2.10.0 — 2026-07-11

### Implementation
- **Unified type scale.** Replaced ~40 distinct ad-hoc font sizes (304 occurrences: 262 inline `fontSize`, 42 CSS `font-size`) with a 7-step scale exposed as CSS variables in `:root`: `--fs-nano:.62rem`, `--fs-micro:.68rem`, `--fs-caption:.72rem`, `--fs-body:.78rem`, `--fs-emph:.9rem`, `--fs-title:1.1rem`, `--fs-display:1.35rem`. The scale is theme-independent, so the dark and high-contrast blocks do not override it.
- **Mapping.** Every literal was mapped to its nearest step, rounding up whenever below `.62rem` (so the old `.48`–`.61rem` cluster of week-cell chips and grid sublabels floors at `--fs-nano`) and rounding up on exact ties. Net effect is a slight, consistent increase in the smallest text toward readability. Distribution after mapping: nano 75, micro 69, caption 76, body 47, emph 15, title 17, display 5.
- **Scope.** This pass changed font sizes only — no spacing, colour, or layout edits (verified by a word-diff showing every changed token is a `rem` literal becoming a `var(--fs-*)` reference). Any resulting size misfits are deferred to the width-changing pass.
- **Note:** the four values above the scale's top step (`2.2`, `1.5`, `1.4`, `1.3rem`) collapse to `--fs-display` (`1.35rem`); the most visible is the large glyph in the Lab view's "This Week" panel, which shrinks from `2.2rem`.
- Verified in preview across all six views in light and dark: no overflow or clipped labels, including the two risk spots (the Setup timetable grid and Week View cells); all CSS variables resolve; `tests.html` still all green (the pure core was untouched).

---

## 2.9.1 — 2026-07-11

### Implementation
- **Test harness for the pure data core (`tests.html`).** A standalone, framework-free, build-free page that locks down the functions whose failure would lose other people's data, before later sessions edit around them. It fetches `index.html`, slices the pure-core block delimited by two new marker comments (`//__TEST_CORE_START__` / `//__TEST_CORE_END__`), and evaluates it with a fake in-memory `localStorage`, so the tests exercise the real shipped code without touching real storage and without a build step. The mechanism is deliberately dumb and visible: a plain `new Function` with the block's only eval-time React binding (`createContext`) stubbed, returning the functions under test. A tiny `assert`/`eq` DSL renders a red/green summary at the top.
- **Coverage (50 assertions):** merge convergence (`pickNewer`/`mergeData` — different records both survive, newer `updatedAt` wins in both argument orders, exact-tie deterministic tiebreak, unstamped legacy loses to any stamped record, `_config` merged by its own timestamp, local-only record preserved); GC and tombstones (`gcEmpties`/`isEmptyRecord` — recent empty survives as a tombstone, old empty dropped, non-empty old kept, `status:"nl"` and non-empty `overrides` count as content); import allowlist and migrations (`importAllData` rejects alien keys and non-object values, refuses a higher schema version with a message, imports valid records, re-keys v1 lowercase period IDs to uppercase; `migrateConfig` upgrades string holidays/dayZeros to objects); and the date engine (`makeDateEngine.cycD`/`isSD` — cycle advances correctly across a weekend, a holiday, and a Day 0, and walks backward across a term boundary from the anchor; `resolveSlot` precedence override > weekly > cycle default with the clash flag set only when a weekly event displaces a non-null default; `asmBellsForDate` manual override and auto-derivation, including an FSA moved onto a day via a per-date override).
- The only change to `index.html` is the two marker comments (inert; the app boots unchanged) and the `APP_VERSION` bump. Verified in the browser: all 50 green; a deliberately broken expectation turned that row red with a "got/expected" detail, then went green again on restore.

---

## 2.9.0 — 2026-07-11

### Features
- **Crash-safe views (error boundary).** If a single view ever throws while rendering, the app no longer goes blank and strand a colleague. A recovery card appears in the view area with a calm message ("Something went wrong displaying this view. Your data is safe on this device."), a **Download Backup** button, and a **Reload** button; the header and tabs keep working, and switching to another tab clears the error. The underlying error message is shown in small muted text for bug reports.
- **Version footer.** The header now shows `v{APP_VERSION}` with **Guide** and **Changelog** links (both open in a new tab), so anyone can see which version they are running and reach the docs.

### Fixes
- **Data & Sync no longer shows the full Gist ID.** The connected-state display is truncated to the first 8 characters plus an ellipsis, so a screenshot of the Data panel no longer leaks the readable sync key. Clicking it still copies the full ID (tooltip: "Click to copy full ID").

### Implementation
- New `APP_VERSION` constant beside `SCHEMA_VERSION` (independent of it; tracks releases). New class-based `ErrorBoundary` (`getDerivedStateFromError` / `componentDidCatch`) wraps only the active view inside `App`, keyed on `view` so a tab switch remounts it and clears the error state; its Download Backup reuses `getAllData` + `doExport`'s blob pattern, which reads from localStorage and so works even when the view component has thrown. Gist ID display uses `gistId.slice(0,8)+"…"` while the copy handler keeps the full value. Verified in preview: temporary throw in a view surfaced the card, backup downloaded, header still navigated, tab-switch cleared it; version line renders in all four display modes (light / dark / light-hc / dark-hc); no console errors after the test throw was removed.

---

## 2.8.0 — 2026-05-27

### Features
- **Per-day bell schedule control (Bell times: Auto / Standard / Assembly).** The assembly bell schedule (shifted P1-P4 times) was derived solely from which cycle day carried the FSA, so moving an FSA to a different day for one week left the old day on assembly bells and the new day on standard. Day View now has a Bell times control:
  - **Auto** (default) derives from the *resolved* morning structure for that date, FSA overrides included, so moving the FSA moves the bell schedule with it automatically (both ways).
  - **Standard** / **Assembly** are explicit per-day overrides for the exceptions (an FSA that keeps normal times, or the shifted schedule with no FSA, e.g. an extended morning tea), marked in orange like other per-date overrides.
- The corrected schedule flows through Day View, Class View, Week View's class spotlight, and the plain-text week export.

### Implementation
- New `asmBellsForDate(cycleDay, date, cfg, daymeta)` resolver: per-date override (`daymeta.bells`) wins, else auto-derives FSA from `resolveSlot` (overrides + weekly + cycle). Replaces the cycle-only `isAsmDay` at every render/export call site (Setup's cycle-grid indicator still uses `isAsmDay`, as it describes the cycle default). Stored in `daymeta.bells`, so it rides the per-record sync merge. Verified end-to-end in preview: FSA moved off a Day 2 reverts Auto to standard bells; moved onto a Day 5 gives assembly bells; manual Standard/Assembly override both directions; times update live and persist.

---

## 2.7.2 — 2026-05-27

### Fixes
- **Week View quick-edit no longer pops the keyboard on touch either.** Extends the v2.7.1 fix: on coarse-pointer (touch) devices, clicking a class cell in Week View opens the quick editor without auto-focusing the input, so it no longer raises the on-screen keyboard and resizes the screen on a glance. Desktop keeps auto-focus. Week View and Class View now behave consistently.

---

## 2.7.1 — 2026-05-27

### Features
- **Class View: floating Today and back-to-top controls.** A long lesson list late in the term meant scrolling far to reach today, and scrolling all the way back up to change class. A bottom-right "◉ Today" button now centres the list on today's (or the next) lesson, with previous and upcoming lessons visible around it. A back-to-top "↑" button appears once you have scrolled down, jumping straight back to the class chips.

### Fixes
- **Class View no longer pops the keyboard when you tap a lesson to glance (touch devices).** Opening a lesson auto-focused the topic input, which on a phone or tablet immediately raised the on-screen keyboard and resized the viewport; switching to Detailed then dismissed it, causing a visible jump. On coarse-pointer (touch) devices the quick input no longer auto-focuses, so tapping a lesson just opens it for viewing; tap the field when you actually want to type. Desktop keeps auto-focus. Day View was unaffected and is unchanged.

---

## 2.7.0 — 2026-05-27

### Features
- **Lesson shifting in Class View (ripple-until-gap).** When a lesson is eaten (assembly, trip, sick day), open it in Class View and use "Lesson bumped? Push the rest forward". The lesson and those after it each move forward by one slot; the ripple stops at the first empty lesson, which absorbs it, so buffer/revision slack is consumed first and anything past that free slot (e.g. a fixed topic test) is left untouched. The vacated lesson becomes No-lesson with the reason you type. A No-lesson day or the end of term is a hard barrier: if the block can't fit before it, the shift aborts with an explanation rather than overrunning a fixed event. An Undo button reverses the whole shift in one click.

### Implementation
- `shiftLanding` finds the absorbing gap (or reports a barrier/end-of-term stop). `doShift` snapshots the affected keys, ripples content forward (writing via `writeRecord` so the moved records are stamped for sync), and marks the source No-lesson. `undoShift` restores from the snapshot, also via `writeRecord`, so the undo's newer timestamp wins the sync merge (otherwise the shifted version would return on the next sync). The confirm UI replaces the topic input while active, sidestepping the blur-close issue. Verified end-to-end in preview: ripple absorption with later lessons untouched, vacated-to-No-lesson, undo restoration, and barrier-abort with no mutation.

---

## 2.6.0 — 2026-05-27

### Features
- **Cloud sync now merges per record instead of overwriting.** Previously every push replaced the whole gist with the local snapshot, so a device with stale data could clobber newer cloud changes (and a pull could clobber local). Sync is now a single convergence operation: fetch the gist, merge per record (each `note:`/`daymeta:`/`_config` carries an `updatedAt`; the most recently edited version wins), write the result to both sides. Editing different lessons on two devices is always safe; only editing the same record on two devices before syncing keeps just the newest. See SYNC_MERGE_DESIGN.md.

### Behaviour changes
- The "Overwrite local / Keep local" pull-conflict prompt is gone: pulling can no longer lose work, so it is not needed. The schema-`version` guard remains (a gist from a newer planner is still refused). The `older`/`fewer` heuristics (`checkSyncConflict`) were retired.
- "Push" and "Pull" buttons both run the same merge now; kept as two buttons for familiarity.
- Empty records (cleared notes) are garbage-collected only once they are also older than 60 days, so a recent clear acts as a tombstone and is never resurrected by a stale device.

### Implementation
- `updatedAt` is additive, so SCHEMA_VERSION stays at 2 and old/new clients interoperate (a missing timestamp counts as epoch, so any stamped edit wins). A read failure aborts the sync without pushing, so a transient network error can never clobber the gist. All user-save sites write through `writeRecord`/`writeConfig` (stamping); transport paths use `sSet` (preserving timestamps).
- Verified end-to-end against a mocked gist: no-clobber convergence, newer-wins, both-sides converge, read-failure-no-push, and tombstone-no-resurrect all pass; merge helpers unit-tested across all design cases.

---

## 2.5.1 — 2026-05-27

### Features
- **Sync-aware backup reminder.** A small status sits next to the data icon. Cloud-sync users (who are continuously backed up) see a quiet "Synced", or "⚠ Sync error" in amber if the last sync failed. Users without sync see "Backed up today" / "Backup N days ago", turning amber once it has been about two weeks since their last export, or "⚠ Not backed up" if they never have. Clicking it opens the Data Panel. This targets the colleagues least likely to set up sync, who are exactly the ones who lose data, without nagging synced users. A `planner-last-backup` timestamp is now written whenever a backup is downloaded; sync users continue to use `planner-last-sync`.

---

## 2.5.0 — 2026-05-27

### Features
- **Global search.** A magnifier icon in the top nav opens a search overlay that scans every `note:` value (subject, notes, resources) and every `daymeta:` value (reflections, day notes, day label) in localStorage. Results filter live as you type (minimum two characters), sorted newest first, each showing the date, the resolved class and slot, and a snippet with the matched term highlighted. Clicking a result navigates straight to that day (and focuses the period). Closes on Escape, backdrop click, or selecting a result. Pure read of localStorage, no new stored state. Capped at 60 shown results with a "refine to narrow" note when there are more. Suggested by the external review as the answer to "where did I teach electrolysis?" a year in.

---

## 2.4.3 — 2026-05-27

### Fixes
- **Setup no longer silently discards unsaved edits.** SettingsView holds a local copy of the config and only persisted it when you clicked "Save Configuration"; navigating to another tab first threw the changes away with no warning. The rest of the app never loses work on navigation, so Setup now matches: any unsaved changes are flushed to localStorage (and synced) when you leave the Setup tab, when the page is hidden, or when the tab is backgrounded. The Save button stays for the explicit "Saved" confirmation. Implemented with the same ref-based unmount-flush pattern as `useAutoSave` (v2.3.3), so the listeners never close over a stale config, and a snapshot guard means nothing is written when nothing changed.

---

## 2.4.2 — 2026-05-27

### Performance
- **Cycle-day lookup is no longer quadratic.** `cycD` previously walked day-by-day from the April anchor on every call, so computing the cycle day for a December date walked ~190 days; and `compGam` called it for every school day of every term on every save and tab switch. Late in the year on an older device this was noticeable. `makeDateEngine` now builds a `Map<dateKey, cycleDay>` once (two linear passes out from the anchor) and `cycD` is an O(1) lookup. The map is rebuilt automatically whenever the engine is recreated (any config change), so there is no manual invalidation. The original walk is retained as `cycDcompute`, a fallback for any teaching day outside the precomputed term span.
- Verified by diffing the memoized result against the original algorithm for all 365 days of 2026, including the 13 Day-0 dates that shift the count (EOTC week etc.): zero mismatches. The live app's rotation labels were spot-checked across a week and match.

---

## 2.4.1 — 2026-05-27

### Fixes
- **Achievement tooltips work on touch devices.** The badge tooltips were hover-only (`.bm:hover .bt`), so iPad and phone users, the majority of teachers planning in the evening, could never read them. Tapping a badge now toggles its tooltip; mouse hover and keyboard focus still reveal it. Badges gained `tabIndex` and an `aria-label` for keyboard and screen-reader access.

### Docs
- **Corrected the `dk()` date-key comments.** Three comment sites (the architecture block, the import allowlist note, and the `dk()` definition) gave the example "2026-3-23" for 23 March, but `dk()` uses a zero-indexed `getMonth()`, so 23 March is actually keyed `2026-2-23`. The comments now state the off-by-one explicitly, which matters for anyone reading the source as a teaching example or writing an external script against a backup. The code was always internally consistent; only the comments were misleading.
- **Softened the offline claim in the guide.** The guide stated the app "caches all the files locally so it works offline." There is no service worker, so offline access depends on the browser's ordinary HTTP cache, which it can evict. The guide now says it will "usually still open without internet" once recently opened, and points to sync or a saved backup as the real safety net. A proper service worker is planned separately.

---

## 2.4.0 — 2026-05-27

### Features
- **Reflection prompts: Glow / Grow / Grab.** When the Day View Reflections box is empty, a "+ Glow/Grow/Grab" link drops a three-label template into the field (Glow = what worked, Grow = what to change, Grab = the one concrete thing to carry forward, phrased as an action). Soft convention only: it is plain text, there is no schema change, and existing free-text reflections are untouched. The button hides itself once the box has content.
- **Resurfacing past reflections.** A quiet block at the top of the Reflections panel surfaces one earlier reflection ("A while back (about a month ago) you wrote..."), collapsed to its Grab line (or a word-boundary snippet when there is no Grab line) and expandable to the full text plus its date. Selection is a pure function of (viewed date, localStorage): it scans daymeta for reflections, drops anything younger than 5 days, buckets the rest by age (week 5-13d, month 14-45d, far 45+d), and uses a date-seeded pick. The choice is therefore stable for the day, rotates daily, matches across devices, and needs no stored "seen" state. Bucketing by horizon is deliberate: it keeps the far past in rotation no matter how large the reflection corpus grows, where uniform-random would bury it. Reflections remain ungamified: nothing here touches XP, streaks, or the Lab.

### Implementation
- `grabLine(text)` extracts a `Grab:` line if present, else a word-boundary snippet capped near 100 chars (no ellipsis; the expand caret signals there is more).
- `pickResurfaced(viewedDate)` builds the bucketed pool from localStorage and returns the date-seeded pick, or null when the pool is empty.
- `ReflectionsPanel` gains `date` and `save` props; the resurfaced pick memoises on the viewed date key so it recomputes per day, not per render.

---

## 2.3.4 — 2026-05-22

### Features
- **B-slots in the week export.** The plain-text/Markdown week export previously emitted only P1-P6 lines per day. B-slot rows are now interleaved at their actual time positions: B0 (before school), B1a/B1b (after 2 / before 3) between P2 and P3, B2a/B2b (after 4 / before 5) between P4 and P5, B3 (after school) after P6. Each B-slot is emitted only when it has a value (Tutor/Chapel/FSA/DA, a duty pill, or an activity) OR notes for that date. When only notes exist (no committed value), the line shows just the label and time, with a Notes sub-line — no awkward "free" suffix.

### Refactor
- `buildWkTxt` now takes `cfg` as an extra argument so it can pass `cfg.weeklyEvents` into the shared `resolveSlot` helper. Period emission was lifted into a `pLine(pi)` closure that returns a string, paired with a `bSlotLine(code, ...)` helper, and the day loop now emits both in calendar order.

---

## 2.3.3 — 2026-05-22

### Fixes
- **Typed-but-not-blurred notes survive navigation.** Follow-up to v2.3.2. The visibility logic was correct, but the data wasn't reaching localStorage in time. When you typed into the Notes textarea and then tapped a tab without first clicking outside the textarea, the blur-debounce save timer never fired (or got cleared during unmount), and your typing was lost. `useAutoSave` now tracks a `dirty` flag on every keystroke and flushes the latest ref synchronously in the unmount cleanup if anything is unsaved. So typing → tab tap → switched view → your note is in localStorage and the row appears on next mount.
- **Cross-view re-render trigger.** WeekView's `gridCells` useMemo previously didn't have a dep that would change when a note was saved outside its own quick-edit flow, so even after an unmount-flush wrote to localStorage, WeekView's first render after navigation used the memoized stale result. Added `g` (the App-level gam object) to the deps; `useAutoSave` now calls `window._plannerGamRefresh` after a cleanup-flush so the gam reference changes and WeekView re-evaluates.

---

## 2.3.2 — 2026-05-22

### Fixes
- **B-slot notes alone keep the row visible.** Previously, writing only notes (without first committing an Activity or Duty value) saved the notes to localStorage but the row vanished on next render because visibility was gated strictly on the resolved value being non-null. Teachers who clicked "+ Before school", typed straight into Notes, and switched view lost sight of their event — even though the notes were technically there. Visibility now considers notes too: a row appears in Day View and Week View if it has either a value OR notes for that date+slot. A 📝 indicator surfaces in the WeekView cell when only notes exist, mirroring the Day View row summary.

### Refactor
- `buildSlots` accepts an optional `hasSlotNote(code)` callback so the B0/B3 omission rule also relaxes when notes exist.
- WeekView's `bRowVisible` adds a parallel notes check across the visible week.

---

## 2.3.1 — 2026-05-22

### Cosmetic
- **Week View label column tightened further.** From 56px to 32px. To make this work without ragged single-vs-double-line wrapping, B-slot labels are now explicitly split at the space and rendered as two right-aligned lines ("after / 2", "before / 3", "before / school", etc.). All B-slot rows look consistent now, and the day columns get a noticeable ~5px each on a phone-sized layout.

---

## 2.3.0 — 2026-05-22

### Features
- **Ad-hoc before/after-school events in Day View.** B0 (before school) and B3 (after school) are still hidden by default when empty so the day list stays clean for teachers with no edge-of-day commitments. New "+ Before school" / "+ After school" buttons sit at the top/bottom of the slot list when those rows are absent. Clicking one inserts the row into the day with the editor already open — pick a Duty or Activity, hit Save today, and the override lands in `daymeta.overrides[code]` for that one date. The row stays visible on revisit because the value is now non-null. Week View automatically reflects the new value (the existing row-visibility rule already checks resolved values across the visible week).

### Refactor
- `buildSlots` now accepts an optional `forceShow` set. The Day View component manages a per-date `forceShow` state that resets on navigation. `BSlotRow` gains an `initOpen` prop so a force-shown row opens its editor immediately on first render.

---

## 2.2.6 — 2026-05-22

### Cosmetic
- **Week View label column trimmed.** The left column that holds the row headings (P1-P6, "after 2", "before 3", etc.) shrinks from 66px to 56px. The reclaimed 10px goes to the day columns, which makes the grid feel less cramped on phones. "before school" and "after school" wrap to two lines in the label column, which is acceptable since those rows are toggleable and rarely visible. All other labels stay on a single line.

---

## 2.2.5 — 2026-05-22

### Cosmetic
- **Today is more visible in Week View.** When the grid is busy with planned content, the gentle today-bg tint alone wasn't enough to spot the current day at a glance. The today column header pill now also gets a thicker inset border (2px box-shadow inside the existing 1px border), a small accent bar above the column, and bolder weight on the date and day-cycle text. Layout-stable: no other columns shift.

---

## 2.2.4 — 2026-05-19

### Fixes
- **Class View "Detailed" tab now actually opens the detailed view.** Regression introduced in 2.2.2: the tab buttons used `onClick`, which fires AFTER the input's blur. The Quick-mode input's `onBlur` calls `sQE` which both saves *and* closes the panel via `setQE(null)`. So clicking Detailed closed the panel before the mode-switch ran. Fixed by switching the tabs to `onMouseDown` with `e.preventDefault()` (keeps focus on the input so blur doesn't fire), and manually committing any unsaved Quick-mode typing before switching to Detailed. The reverse path was already safe because `DetailedNoteEditor` flushes on unmount.

---

## 2.2.3 — 2026-05-19

### Features
- **"Today" button in Day View.** Sits next to Prev/Next. Jumps to today if today is a school day; otherwise jumps to the next school day (mirrors the Week View Today button's weekend-mode behaviour). Disabled if there is no upcoming school day within the engine's walk window. The App-level "Weekend mode" indicator already surfaces when today is a weekend, so the context is consistent across views.

---

## 2.2.2 — 2026-05-16

### Features
- **Class View row expands to Detailed mode inline.** Previously, the "Full detail →" link in Class View's quick-edit panel jumped the user to Day View, breaking class-focused planning flows. Now the same row offers **Quick** | **Detailed** pill tabs: Quick keeps the existing single-input + No-lesson behaviour; Detailed expands the row in place to show Topic / Subject, Notes &amp; Tasks, and Resources &amp; Links — the same three fields as Day View's Detailed mode. Changes autosave on blur via a dedicated `DetailedNoteEditor` that flushes any pending save on unmount, so mode switches and panel closes never lose typing. You stay in Class View throughout.

---

## 2.2.1 — 2026-05-16

### Fixes
- **Setup label for the semester boundary clarified.** The date input in School & Cycle is now labelled "Semester 2 starts" instead of the more ambiguous "Semester boundary", and the explanatory caption underneath spells out that the boundary date is the first day of Semester 2 (S1 runs up to the day before). No data or behaviour change; the underlying `cfg.semesterBoundary` field shape is unchanged.

---

## 2.2.0 — 2026-05-16

### Features
- **Semester-aware classes.** Each class in Setup gains an optional `semester` field: Full year, Semester 1, or Semester 2. Combined with a new school-wide **Semester boundary** date in the School & Cycle card, this lets teachers run classes that only exist for part of the year. Out-of-semester cells render as `nc`, drop out of coverage and Lab counts, and the class chip dims in Week View when not active in the visible week. Past lesson notes remain fully reachable on their original dates — the filter is at the render layer, not the data layer.
- **Semester 2 timetable variant.** Some full-year classes shift cycle position at the semester boundary; some don't. Setup now has a small tab affordance above the timetable grid (visible only when a semester boundary is set): **Semester 1** / **+ Create Semester 2 variant**. Clicking create copies the current S1 grid into a separate `cfg.timetableS2`. Teachers then edit only the cells that differ. After the boundary, every read pipeline (Day View, Week View, plain-text export, Lab coverage, Class View lessons) routes through whichever grid applies for the date. Reset and Delete buttons next to the tabs handle the lifecycle.

### Refactor
- All read sites that previously did `eng.timetable[cd][pid]` are unified through a new `eng.classAt(date, cd, pid)` helper. The helper picks the right timetable grid for the date (S1 or S2), then applies the class's `semester` filter, then returns the class code or `"nc"`. Single source of truth for "what class meets this cell on this date".
- `eng.timetableForDate(date)` and `eng.classActiveOn(code, date)` are also exposed for the few places that need finer-grained access.

### Docs
- `BACKUP_SCHEMA.md` updated with the new `classes[].semester`, `cfg.semesterBoundary`, and `cfg.timetableS2` fields.

### Non-impact
- Existing users with no `semesterBoundary` set see no behavioural change. The Setup affordances (boundary input, semester dropdown, S1/S2 tab) appear but do nothing until used. No data migration required.

---

## 2.1.6 — 2026-05-16

### Features
- **Weekly activities.** A new Setup card lets teachers register recurring activities pinned to a weekday rather than a cycle day. Useful for things like "Chess Club every Wednesday after school" where the cycle day rotates but the calendar weekday stays fixed. Each entry sits in one B-slot (B0/B1a/B1b/B2a/B2b/B3) on one weekday and renders as an activity chip in Day View and Week View on every matching date. Activity-only; teaching periods are untouched.
  - **Precedence**: cycle default < weekly activity < per-date override. A specific date's override always wins. A weekly activity beats a quiet cycle default.
  - **Clash warning**: when a weekly activity is hiding a non-null cycle default on a given date, a small ⚠ glyph appears next to the chip in collapsed view, and the editor surfaces a full caption: "A weekly activity is showing today instead of the cycle default (X). The cycle default still applies on other dates."
  - **Zero impact on non-users**: `cfg.weeklyEvents` defaults to an empty array. No UI affordance shows up in any view until the user adds an entry.

### Refactor
- B-slot resolution unified through a single `resolveSlot(slotCode, cycleDay, date, cfg, daymeta)` helper, used by both `buildSlots` (DayView) and WeekView's grid resolver. Same precedence rule everywhere by construction.

---

## 2.1.5 — 2026-05-16

### Fixes
- **Back-to-top button in Setup.** Setup is long, and once the timetable is filled in there is a lot of scrolling to get back to the top. A floating circular button now fades in once you have scrolled past about one screen, and smooth-scrolls the page back to the top on click. Scoped to the Setup view; other views are unaffected.

---

## 2.1.4 — 2026-05-13

### Fixes
- **Em-dash in the Day View "Day 0" card now renders correctly.** The heading text "Day 0 — No class structure" was written as a literal `—` escape inside a JSX text node, so it appeared verbatim rather than as a real em-dash. Same class of bug as the Setup hint fixed in 2.0.1. One-line edit.

---

## 2.1.3 — 2026-05-13

### Fixes
- **Empty P-cells now resolve to "nc" cleanly.** The Setup timetable input rendered an empty cell with a "nc" placeholder, which read as "this period is non-contact" even though the underlying value was an empty string. Downstream counters that compared strictly to `"nc"` then double-counted those cells as teaching periods and inflated the "planned/total" denominator in Week View. Three layers of fix:
  1. `TTCombo` onBlur now writes `"nc"` instead of an empty string when the input is empty (or whitespace-only). New cells canonicalise the moment focus leaves.
  2. `migrateConfig` runs a one-time sweep on load: any empty/missing P-cell in an existing cycle day is coerced to `"nc"`. Idempotent, so subsequent loads are no-ops.
  3. `sum` and `cov` in WeekView now match `compGam`'s defensive idiom (`if (!cls || cls === "nc") return`), so even if a stray empty slips through it is excluded from the count rather than inflating it.

---

## 2.1.2 — 2026-05-13

### Features
- **Class spotlight popup now splits by today.** Clicking a class badge above the Week grid still shows every appearance of that class during the visible week, but the list is now split: lessons before today are dimmed above a "Still this week" divider, lessons today-and-after sit below it at full opacity. Today's lessons all count as "upcoming" regardless of wall-clock time — the teacher reads the start time. If everything is in the past or everything is upcoming, no divider; the list reads as before.

### Docs
- **`BACKUP_SCHEMA.md`** added at the repo root. Authoritative shape of a v2 backup file: top-level keys, date formats, every _config field, B-slot value shapes, common mistakes that fail silently, and a worked minimal example. Aimed at teachers who want to bootstrap a backup via an LLM from their published timetable PDF — paste the schema alongside the PDF and the workflow becomes one-shot.

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
