# Changelog

All notable changes to the Lesson Planner are documented here.

Versioning: MAJOR.MINOR.PATCH — major for breaking changes, minor for new features, patch for bug fixes.

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
