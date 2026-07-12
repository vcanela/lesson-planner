# Lesson Planner

A browser-based lesson planner built for schools that use a **7-day rotating timetable cycle**. Currently configured for Diocesan School for Girls (Auckland, NZ).

**[Open the planner](https://vcanela.github.io/lesson-planner)**

## Features

- **Cycle day calculation** -- automatically works out which cycle day each date falls on, skipping weekends, holidays, and Day 0 events
- **Term-aware scheduling** -- 4 terms pre-configured with NZ school dates, public holidays, and school-specific events
- **Multiple views** -- term overview, week grid, day detail, class view (all lessons for one class across a term)
- **Gamification** -- XP, levels, achievements, and streaks to keep planning momentum going. 5 swappable themes (Physics, Coffee, Cooking, Ocean, NZ Birds)
- **4 display modes** -- light, dark, and high-contrast variants of each
- **Works offline** -- after the first visit a service worker caches the app, so it opens and runs with no network; all planning data lives in the browser via localStorage. No account, no server. (The first visit needs a connection to download the app, and cloud sync needs one to reach GitHub.)
- **Optional cloud sync** -- connect a GitHub Personal Access Token to sync via Gist across devices

## Getting started

Open the link above. New users land straight in the planner with Dio's 2026 term dates, holidays, and Day 0 events already filled in. Head to **Setup** to add your classes and timetable.

## Data and privacy

All planning data stays in your browser's localStorage. Nothing is sent to any server. The optional Gist sync uses your own GitHub account and writes to a private Gist that only you control.

## Tech

The source is a single self-contained file, `index.html`: open it directly and it just works, because React 18 loads from a CDN and the file transpiles its own JSX in the browser. That is the only file to edit, and there is no build step to run to work on it.

The **deployed** copy at the link above is precompiled for speed: a GitHub Action runs `build.mjs` on every push to `main`, transpiling the JSX ahead of time into `dist/index.html` and dropping the in-browser Babel transformer, so visitors load an already-compiled app instead of paying the transpile on every visit. The source file is left untouched and still runs on its own.
