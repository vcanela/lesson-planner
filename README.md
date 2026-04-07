# Lesson Planner

A browser-based lesson planner built for schools that use a **7-day rotating timetable cycle**. Currently configured for Diocesan School for Girls (Auckland, NZ).

**[Open the planner](https://vcanela.github.io/lesson-planner)**

## Features

- **Cycle day calculation** -- automatically works out which cycle day each date falls on, skipping weekends, holidays, and Day 0 events
- **Term-aware scheduling** -- 4 terms pre-configured with NZ school dates, public holidays, and school-specific events
- **Multiple views** -- term overview, week grid, day detail, class view (all lessons for one class across a term)
- **Gamification** -- XP, levels, achievements, and streaks to keep planning momentum going. 5 swappable themes (Physics, Coffee, Cooking, Ocean, NZ Birds)
- **4 display modes** -- light, dark, and high-contrast variants of each
- **Works offline** -- all data stored in the browser via localStorage. No account required, no server
- **Optional cloud sync** -- connect a GitHub Personal Access Token to sync via Gist across devices

## Getting started

Open the link above. New users land straight in the planner with Dio's 2026 term dates, holidays, and Day 0 events already filled in. Head to **Setup** to add your classes and timetable.

## Data and privacy

All planning data stays in your browser's localStorage. Nothing is sent to any server. The optional Gist sync uses your own GitHub account and writes to a private Gist that only you control.

## Tech

Single HTML file. React 18 and Babel loaded via CDN, transpiled in-browser. No build step, no npm, no dependencies to install. Just open the file or visit the GitHub Pages link.
