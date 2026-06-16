# Sync Merge Design (per-record convergence)

Status: DRAFT for review. No code written yet.
Target: resolves the highest-value data-integrity issue from the May 2026 code review.

## 1. The problem, concretely

Today sync is last-write-wins on the **entire blob**, and only pulls are guarded.

- `getAllData()` collects every `note:` and `daymeta:` key plus `_config` and a fresh `_meta {synced, version}`.
- `gistPush(tok, gid, data)` PATCHes the gist's `planner-data.json` with `JSON.stringify(data)`: a wholesale replace.
- `doPush()` / the debounced `triggerSync()` call `gistPush` **unconditionally**. There is no fetch-and-compare.
- Only `doPull()` runs `checkSyncConflict` (types `version` / `older` / `fewer`) before importing.

### The data-loss scenario

1. Laptop plans three lessons at school. Debounced push uploads the laptop snapshot. Gist now holds the three lessons.
2. That evening the iPad (last synced yesterday, so its local copy lacks the three lessons) is opened. The startup/tab-focus pull does not fire, errors silently, or the tab was already open.
3. The teacher types one topic on the iPad. Four seconds later the debounced push uploads the **iPad's stale snapshot**, replacing the gist. The three laptop lessons are gone from the cloud.
4. Next laptop pull sees "fewer entries" (best case: a scary prompt) or silently regresses (worst case).

The tab-focus pull narrows the window but cannot close it: any push from a device that has not just pulled can clobber newer cloud data.

## 2. Goal and non-goals

**Goal:** make concurrent edits across a teacher's devices **converge** rather than clobber, with no server, keeping the single-file architecture.

**Non-goals:**
- Real-time collaboration or multi-user editing. This is one teacher, a few devices.
- Field-level merge inside a single note. The unit of merge is one record (`note:<dk>:<pid>`, `daymeta:<dk>`, `_config`).
- Eliminating every theoretical race (see Limitations). The aim is "no routine data loss," a categorical improvement over today.

## 3. Core idea: stamp each record, merge by recency

Add an `updatedAt` (ISO 8601 string) to every `note:` and `daymeta:` record, written **at user-edit time**. Sync becomes: fetch remote, merge per-record (newer `updatedAt` wins), write the merged result to both sides.

This is last-writer-wins (LWW) per record, the standard server-less convergence approach. Records are independent, so two devices editing **different** records always both survive. Two devices editing the **same** record before syncing will lose the older edit; for a single teacher this is rare and acceptable (documented in Limitations).

### Why this is safe to add

`updatedAt` is **additive**. Old code ignores unknown fields, so we do **not** bump `SCHEMA_VERSION` (bumping would make not-yet-updated devices refuse the data via the `version` guard, breaking sync during rollout). A record with no `updatedAt` is treated as timestamp `0` (epoch), so any stamped record beats an unstamped legacy one, and two unstamped copies tie (their content is almost always identical, since they share history).

## 4. The unified `sync()` operation

With merge, push and pull stop being opposites. Both become the same convergence step:

```
sync():
  1. If no gist configured, return.
  2. R = fetch remote gist JSON   (404 / empty -> R = {})
  3. L = getAllData()             (local snapshot)
  4. M = merge(L, R)              (per-record, section 5)
  5. Apply M to local: for each key where M differs from L, write it and
     refresh React state (reuse the existing pull-apply path: setCfg / setMC / setGR).
  6. If M differs from R, PATCH the gist with M.
  7. Set planner-last-sync.
```

Triggered by: the debounced save hook, startup, tab-focus, and the manual button(s). Because `merge` is deterministic and idempotent, running `sync()` from any device in any order converges all devices to the same state.

**UI note:** the manual "Push" and "Pull" buttons both call `sync()` (they are now the same operation). DECIDED: keep both buttons to avoid disrupting a familiar control; they simply converge in either case.

## 5. The merge algorithm

```
merge(L, R):
  out = {}
  for key in union(noteAndDaymetaKeys(L), noteAndDaymetaKeys(R)):
    a = L[key], b = R[key]
    if a and not b: out[key] = a
    else if b and not a: out[key] = b
    else:
      ta = ts(a), tb = ts(b)              // ts() = Date.parse(updatedAt) || 0
      if ta > tb: out[key] = a
      else if tb > ta: out[key] = b
      else: out[key] = (JSON(a) >= JSON(b)) ? a : b   // deterministic tiebreak
  out._config = mergeConfig(L._config, R._config)      // section 6
  out._meta = { synced: now, version: SCHEMA_VERSION }
  return out
```

- `ts()` maps missing/invalid `updatedAt` to `0`.
- The tiebreak (equal `updatedAt`, different content) picks the lexicographically larger JSON. Arbitrary but **deterministic and convergent**: all devices agree without coordination. The case is astronomically rare at millisecond resolution.

## 6. `_config` (settings)

`_config` is a single record. Stamp it with its own `updatedAt` on Setup save (the v2.4.3 flush-on-leave path is the natural home) and merge it whole by `updatedAt`. This is coarser than per-field (concurrent Setup edits on two devices lose one device's setting changes), but Setup changes are infrequent and this keeps scope contained. If missing on both sides, keep either; if missing on one, keep the present one.

## 7. Deletions and tombstones (the subtle part)

Notes are never hard-deleted today; clearing a note saves `{subject:"", ...}`. Under LWW merge, **an empty record with a newer `updatedAt` is the tombstone.** This must be respected:

- Clear a note on device A at T2; device B has old content at T1 < T2. Merge keeps A's empty record (newer). The clear propagates. Correct.
- **Danger:** if we hard-delete (drop) empty records before merging, A's cleared note vanishes from A's blob, the merge sees it only in B (old content), and it is **resurrected**. So we must NOT drop recent empties.

### Empty-note GC rule (the review's "garbage collect" item, made safe)

Drop a `note:`/`daymeta:` key only if it is **both**:
1. **Empty:** note has no `subject`/`notes`/`resources` and `status` not `"nl"`; daymeta has empty `dayNotes`/`reflections`/`day0label` and an empty `overrides`.
2. **Old:** `updatedAt` older than a safety horizon (proposed **60 days**).

By 60 days an empty record has propagated everywhere, so even if a straggler device resurrects it, an empty record displays nothing. Recent clears stay as effective tombstones and are never dropped. GC runs inside `sync()` (on the merged result `M`) and on export, so it trims the blob without risking resurrection.

## 8. Write-site audit (load-bearing)

A missed user-save site means that record never gets stamped, so it **always loses merges** and silently goes stale. Every site that writes a `note:` or `daymeta:` record:

**User-edit sites (must stamp `updatedAt = now`):**
- `useAutoSave` `save()` and its unmount/pagehide flush (line ~988-989). Covers Day View note editors, the daymeta record, and B-slot `setOverride` (which routes through `save()`).
- WeekView `sQE` and `sNL` (quick-edit and no-lesson) (line ~1356, ~1358).
- ClassView `sQE`, `sNL`, and the inline Detailed save (line ~1549, ~1551, ~1578).
- App `uM` (daymeta update used by day-notes etc.) (line ~2317).

**Transport sites (must PRESERVE incoming `updatedAt`, never restamp):**
- `importAllData` (line ~558): backup/gist import.
- `migrateStorage` (line ~679): v1 re-keying.
- the new `sync()` apply-local step.

**Recommendation:** route all user-edit writes through one helper, `writeRecord(key, value)`, that sets `updatedAt` and calls `sSet`. A single chokepoint is far safer than stamping at seven call sites and risking a miss. The transport sites keep using raw `sSet` so they preserve timestamps.

## 9. `checkSyncConflict` simplification (the dividend)

Once pull is a merge, **pulling can never lose local work** (local-only records are always kept). So:
- Retire the `older` and `fewer` conflict types and the "Overwrite local / Keep local" prompt. They exist only because today's pull overwrites.
- **Keep** the `version` guard (still refuse data from a newer schema we cannot read).

Net: less code, and the scary "you might lose work" prompt disappears.

## 10. Limitations (documented honestly)

1. **Same-record concurrent edit.** Edit the *same* note on two devices before either syncs: the older edit is lost (LWW). Rare for one teacher. A future enhancement could detect "both newer than last common sync" and flag it; out of scope for v1.
2. **Read-modify-write race on the gist.** Between `sync()` fetching R and PATCHing M, a third device could push R'. Our PATCH then overwrites R'. The window is the fetch-to-patch interval (sub-second), and the debounce already batches rapid saves. Optional mitigation: after PATCH, re-fetch and re-merge if the remote changed (shrinks the window further). The Gists API offers no reliable conditional write, so the window cannot be fully closed without a server. Still vastly better than today's unconditional clobber.
3. **Mixed-version transition.** A device still on old code keeps doing whole-blob clobber pushes and ignores `updatedAt`, so it can still overwrite during the transition. Resolves automatically as devices pick up the new version on next open. Worth a heads-up to colleagues; for your own devices it clears quickly.

## 11. Test plan (before any live wiring)

Build a merge test harness as a preview probe (same approach that verified the `cycD` refactor across 365 days), asserting `merge(L, R)` results for:

1. A's newer note beats B's older. (recency)
2. A-only and B-only records both preserved. (no clobber)
3. Cleared note (empty, newer) propagates and is NOT resurrected from a stale non-empty remote. (tombstone)
4. Missing `updatedAt` treated as epoch: a stamped record beats an unstamped one. (legacy)
5. Equal `updatedAt`, different content: deterministic winner, and `merge` is symmetric-convergent (running it on both devices yields the same result). (tiebreak)
6. Old empty record GC'd; recent empty kept. (GC safety)
7. `_config` merges by its own `updatedAt`.
8. Idempotence: `merge(M, M) == M`.

Only after the harness is green do we wire `sync()` into the live save path, then verify end-to-end in preview with two simulated devices (two localStorage snapshots).

## 12. Rollout

- No `SCHEMA_VERSION` bump (additive field).
- First sync after upgrade: most records unstamped (epoch) on both sides, so the merge is content-stable. As the teacher edits, records gain timestamps and converge.
- Ship behind the existing sync feature; no migration step for users.

## 13. Decisions (resolved 2026-05-27)

1. **GC horizon: 60 days.** A little under a term, comfortably past propagation.
2. **Keep separate Push/Pull buttons**, both calling `sync()`. No control changes.
3. **Plain fetch-merge-patch for v1.** Accept the sub-second race window. Add verify-after-write later only if it ever bites.
4. **Include `_config` in the per-record merge** (whole-record LWW by its own `updatedAt`, stamped on Setup save). Leaving it out would keep the clobber hole open for settings, which is the whole point of the change.

## 14. Build order

1. Implement the pure merge helpers (`recTs`, `isEmptyRecord`, `mergeRecords`/`merge`, `gcEmpties`, `mergeConfig`) with no wiring to the save or sync path.
2. Prove them green via a preview probe across the section 11 cases.
3. Only then: add `writeRecord()` stamping at the user-save sites, rewrite `sync()` to fetch-merge-writeback, retire the `older`/`fewer` conflict prompt, and verify end-to-end with two simulated devices.
