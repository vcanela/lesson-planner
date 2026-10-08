# Lesson reflections: design

Status: decisions resolved 2026-10-09 (section 9). Feature A built in 3.7.0; feature B (3.8.0) is next.

Two features that work as a pair:

- **A. Ask after the lesson, inside the lesson.** Once a lesson has ended, it asks "How did it go?" with three one-tap answers and an optional line for next time.
- **B. Show the payoff while you plan.** When you plan a lesson, what you wrote about the last lesson with that class appears beside it. From 2027, so does what you wrote about the same lesson last year.

A gives B something to show; B is the reason A is worth doing. The carrot is better planning, not points.

## 1. Why reflection isn't happening now

The existing Reflections panel is one free-text box per day. It sits collapsed at the bottom of Day View, below every period, while most planning happens in Week View. It starts empty, earns nothing in the Lab, and nothing reads it later except the "reflection from the past" panel. It costs effort and gives little back where you work. This design keeps that panel (it suits longer end-of-day thoughts) and adds a much cheaper path at the level of a single lesson.

## 2. Principles

1. **One tap counts.** Choosing an answer is a complete reflection. The line of text is optional.
2. **Ask at the right moment, then stop asking.** A lesson asks only once it has ended, and only for a short while (section 4.2). Older lessons can still be rated, but they never ask.
3. **Nothing is ever "missing".** No counts of unrated lessons, no red marks, no streaks to lose.
4. **Written for future you.** The optional line is framed as "Next time", advice rather than a record.
5. **Separate from planning.** Rating a lesson does not count as planning it. Coverage and XP are unchanged.

## 3. Data

A reflection belongs to one lesson, so it lives in that lesson's existing record, `note:<date>:<period>`, as two new fields:

```
{ subject, notes, resources, status, updatedAt,   // as now
  went: "" | "good" | "mixed" | "rough",          // the one-tap answer
  nextTime: "" }                                  // the optional line
```

Keeping it in the same record means sync, merging, backups, import and search need no new machinery: they already handle `note:` records. Old backups simply lack the fields, and old versions of the app ignore them.

Consequences to handle:

- `isEmptyRecord` must count `went` and `nextTime` as content. Otherwise a lesson that was rated but never planned would look like a deleted note and could be cleared.
- The "planned" test (`subject || notes || status === "nl"`) stays as it is, so a rating never inflates coverage or XP.
- Search also looks in `nextTime`.
- Sync merges whole records, newest wins. Rating a lesson on your phone while editing the same lesson's plan on your laptop before either syncs keeps only the newer edit. This is already true of topic and notes today, and is rare in practice.
- `BACKUP_SCHEMA.md` gains the two fields.

## 4. Feature A: ask after the lesson

### 4.1 What it looks like

The ask is a single row:

```
How did it go?   [ Went well ]  [ Mixed ]  [ Rough ]
Next time (optional) ______________________________
```

The three answers are the app's standard single-choice toggles (the `.tog` buttons, chosen = filled), so the row looks like Quick/Detailed and bell times. Tapping the chosen answer again clears it. The "Next time" line appears once an answer is chosen, so the first step is only ever one tap.

### 4.2 When a lesson asks

A lesson asks when all of these hold:

- it is a class period (not non-contact) and not marked No lesson;
- it has ended: an earlier date, or today after its end bell, using that day's bell times (standard or assembly, as Day View shows them);
- it has no answer yet;
- it falls in the **ask window**: from Monday of the current week up to now. This lets a Friday afternoon catch-up cover the whole week. Last week's lessons stop asking on Monday.

Outside the window you can still rate any past lesson; it just doesn't prompt.

### 4.3 Where it appears

1. **Day View, on the collapsed period row.** A lesson that is asking shows the three answers directly in its row, so an end-of-day pass through Day View is a few taps without opening anything. Once answered, the row shows the answer as a small quiet label in place of the buttons. Expanding the period shows the full row with the "Next time" line.
2. **Week View and Class View quick editors.** The editor that opens when you click a lesson gets the same row under the topic, for past lessons only.
3. **Class View list.** Each past lesson shows its answer, if any, as a small label beside the date. Scanning a class's term becomes a quick read of how it went.

### 4.4 Week View cells

**No change to the cells** (decision 4). They already carry the planned dot, the flag and the No lesson stripes, and a phone cell is 54px wide. Rating from Week View happens in the quick editor.

## 5. Feature B: show the payoff

### 5.1 "From last time" (works immediately)

When you plan a lesson, a short quote appears if the previous lesson with that class has an answer or a Next time line. In Day View's expanded period it joins the context line that already says "Lesson 12/41 this term · prev: Tue 13 Oct"; the Week and Class quick editors, which have no context line today, gain it as a single line under the topic:

```
Last lesson (Tue 13 Oct): Mixed. "Demo the trolleys before the worksheet."
```

The previous lesson already comes from `lessonContext`, so this reads one more record. If the previous lesson has nothing, nothing extra shows.

### 5.2 "Parallel class": not built (decision 5)

Kept here for reference in case it becomes useful.

If another class this year shares the course label (10SCI2 and 10SCI4 are both `10SCI`) and taught the same lesson number this term before this one, its answer and Next time line show too:

```
10SCI4, same lesson (Mon 12 Oct): Rough. "Too much for one period; split the practical."
```

Useful when you teach the same lesson twice in a week.

### 5.3 "Last year" (lights up in 2027)

For a lesson in a 2027 class, find the 2026 classes with the same course label, take the lesson with the same term and lesson number, and show its topic, answer and Next time line:

```
Last year, 12PHY1, Term 4 lesson 12: "Projectile lab". Went well. "Book the light gates early."
```

This is the first piece of the "last year" panel from the year-model design (section 10) and uses the same pieces: `engFor(2026)`, `classLessons` and the course label. Matching by lesson number is approximate when a term is a day longer or shorter, which is why it says "lesson 12" rather than a date. If several 2026 classes share the course, the one with an answer or Next time line wins, then the lowest class code.

It is built and tested in this release with the existing two-year test fixture, but on your data it first appears in January, when 2027 exists. That is the moment this autumn's taps start paying off.

## 6. What doesn't change

- The day-level Reflections panel, Glow/Grow/Grab and "A reflection from the past" stay as they are.
- XP, streaks and achievements are unchanged (decision 6).
- Week export and Day print are unchanged in the first release. Adding "Next time" lines to the week export is a small follow-up if you want it.

## 7. Tests

- Unit: the ask rule (ended, standard and assembly bells, No lesson, non-contact, the window across a week boundary); `isEmptyRecord` with only `went`; the planned count unaffected by a rating; the last-year match by course and lesson number, including two 2026 classes in one course.
- Smoke: answer from Day View's collapsed row; the answer shows in Class View; the next lesson's editor shows "Last lesson"; future lessons and No lesson lessons never ask; the two-year fixture shows "Last year".
- Contrast: the new row and labels in all four display modes (the existing sweep covers them once they render).

## 8. Releases

1. **3.7.0, ask after the lesson (A).** Data fields, ask rule, Day View row, quick editors, Class View labels.
2. **3.8.0, show the payoff (B).** "Last lesson" and "last year".

Each with screenshots before it ships.

## 9. Decisions (resolved 2026-10-09)

1. **The three answers:** *Went well*, *Mixed*, *Rough*.
2. **The ask window:** Monday of the current week to now.
3. **One-tap answers on Day View's collapsed rows:** yes.
4. **Week View cells:** no rating mark; rating happens in the quick editor.
5. **Parallel classes:** skipped.
6. **XP:** none.
