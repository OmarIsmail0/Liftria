# Milestone 1E Review: import from other apps and the muscle recovery map

**Date:** 2026-10-22 · **Author:** builder (self-review) · **Status: self-review by builder, then Claude review (done 2026-10-22); owner review pending.** Items the builder could not verify are listed under "Not done or not verified".
**Brief followed:** [MILESTONE_1E_BRIEF.md](MILESTONE_1E_BRIEF.md) · **Scope:** an addendum to Phase 1 (design only). Both features are **Future · Phase 3** and change nothing in Phase 2.
**Licensing:** the inspiration (openGym) is AGPL-3.0. Nothing from it was looked up, copied or paraphrased: no code, text, data or images. The brief's ideas were implemented from the brief alone, and the "ideas only" rule is now in `PHASE_1_HANDOFF.md` §4.

## Deliverables

| Deliverable | Location | Status |
|---|---|---|
| IM-1 … IM-4 and TR-14 in the clickable prototype, every state from the brief, dark and light | `prototype/liftria.html` (source `prototype/src/liftria.html`) | Done |
| The TR-1 Muscles card (hidden on first time), the ST-6 import row, the TR-1 first-time link, the TR-11 empty link, "Imported from Hevy" source lines on one example session in TR-11 and TR-12, the Undo import flow | same | Done |
| Flow 11 wired end to end (Settings → picker → preview → importing → done → history → Undo import), with the muscle map reachable from TR-1 and PR-2 | same | Done |
| Recovery shading: three steps of the train color, dots on the middle step, neutral "ready", outlines ≥ 3:1; every number computed from an example set history with the brief's formula | same | Done (arithmetic below) |
| Screen inventory (TR-14, TR-1 card, IM-1…IM-4, ST-6 rows; status Future · Phase 3) | `SCREEN_INVENTORY.md` | Done |
| Import rules §1 and the recovery calculation §2, with worked fixtures | `SCREEN_SPECIFICATIONS.md` | Done |
| Flow 11 (mermaid and step table, with the invalid, units, unmatched, failed and Undo import branches) | `USER_FLOWS.md` | Done |
| States and interactions | `INTERACTION_AND_STATES.md` | Done |
| Recovery shading tokens and pattern, the mapping row and the other 1E components | `DESIGN_SYSTEM.md` | Done |
| Contrast numbers, the map's text alternative, 200% | `ACCESSIBILITY.md` | Done |
| Settings → Data → Import and Train → Muscles map | `INFORMATION_ARCHITECTURE.md` | Done |
| Phase 3 table rows with acceptance criteria and the AGPL rule | `PHASE_1_HANDOFF.md` | Done |
| Prototype how-to | `prototype/README.md` | Done |

## Prototype screens and states (22 new screen × state combinations; 175 in all, each rendered in dark and light)

| Screen | States |
|---|---|
| TR-14 `tr-muscles-map` | recent · volume · untrained · empty · large |
| IM-1 `im-source` | default · picker* |
| IM-2 `im-preview` | ok · unmatched · units · invalid · empty · nothingnew* |
| IM-3 `im-progress` | progress |
| IM-4 `im-done` | done · failed · failedfile* |
| TR-11 `tr-history` (added) | imported* |
| TR-12 `tr-session` (added) | imported* |
| ST-6 `st-data` (added) | imported* · undoimport* · undone* |
| TR-1 `tr-home`, PR-2 `pr-strength`, ST-7 `st-about` | unchanged states; the TR-1 card and first-time link, the PR-2 "Muscle map" card and the ST-7 "From Hevy" chip line were added |

\* Not in the brief. Added so the flow can be tapped end to end: the Android file picker (it is how a state is reached), "nothing new" (how "re-importing the same file adds nothing" shows), the second failure, the imported session in the two History screens, and the Undo import row, sheet and result.

## Screen checklist

Legend: **PASS** = specified, in the prototype, states covered · **NEEDS REVISION** · **BLOCKED**. "Provenance" is the check that nothing unverified is shown as working.

| Screen | Visual | States | Dark / light | A11y | Offline | Privacy | Provenance / honesty | Result |
|---|---|---|---|---|---|---|---|---|
| TR-14 Muscle map | ✓ | recent, volume, untrained, empty, 200% | ✓ | ✓ text alternative, rows as the accessible path | ✓ | n/a | ✓ `estimate` chip and its line, never "fatigued" | PASS (the 25% step is subtle, see "Contrast") |
| TR-1 Muscles card | ✓ | rich, resume; hidden on first time | ✓ | ✓ one button with a full label | ✓ | n/a | ✓ `estimate` chip | PASS |
| IM-1 Choose source | ✓ | default, picker | ✓ | ✓ | ✓ | ✓ "stays on this phone", no permission | ✓ export paths are unverified (question 1) | PASS (paths Pending) |
| IM-2 Preview | ✓ | ok, unmatched, units, invalid, empty, nothing new | ✓ | ✓ | ✓ | ✓ nothing saved until Import | ✓ Suggested is never applied; unit never guessed | PASS |
| IM-3 Importing | ✓ | progress | ✓ | ✓ progress bar | ✓ | n/a | ✓ says it can't be cancelled and why | PASS |
| IM-4 Done | ✓ | done, failed, failed file | ✓ | ✓ | ✓ | n/a | ✓ "Nothing was imported" + the reason | PASS |
| ST-6 import rows | ✓ | default, after import, Undo confirmation, after Undo | ✓ | ✓ | ✓ | ✓ | ✓ the sheet names what goes and what stays | PASS |
| TR-11 / TR-12 source lines | ✓ | imported | ✓ | ✓ | ✓ | n/a | ✓ "Imported from Hevy" + import date | PASS (imported session is view-only in the prototype) |

Nothing is BLOCKED.

## The recovery arithmetic (what the prototype computes and the spec uses as fixtures)

Example set history in the script: six sessions (Thu 2 Oct, Mon 6 Oct, Thu 16, Fri 17, Sat 18, Mon 20 Oct). "Now" is fixed at **Tue 21 Oct 09:41** (the prototype's today). Formula: credit 1.0 per primary and 0.5 per secondary muscle per working set, warm-ups 0; decay 1.0 / 0.5 / 0.25 for sets 0–24 / 24–48 / 48–72 h old, 0 after; bands ≥ 4, 1 to 4, < 1.

| Session | Age of its sets | Decay |
|---|---|---|
| Mon 20 Oct, Lower A (squat 4 + 2 warm-up, Romanian deadlift 3, leg press 3, hip thrust 3, calf raise 3, plank 2 = 18 working sets) | 14.8 to 15.5 h | 1.0 |
| Sat 18 Oct, Upper B (incline 3, pull-up 4, overhead press 4, row 4, curl 3, pushdown 3 = 21 sets) | 70.6 to 71.4 h | 0.25 |
| Fri 17 Oct, Upper A · Thu 16 Oct, Lower B | 3.9 and 4.9 days | 0 (they count only for volume) |

| Muscle | Arithmetic | Score | Band |
|---|---|---|---|
| Glutes | squat 4 × 0.5 + RDL 3 × 0.5 + leg press 3 × 0.5 + hip thrust 3 × 1.0 = 2 + 1.5 + 1.5 + 3 | **8.0** | higher load |
| Hamstrings | squat 4 × 0.5 + RDL 3 × 1.0 + leg press 3 × 0.5 + hip thrust 3 × 0.5 = 2 + 3 + 1.5 + 1.5 | **8.0** | higher load |
| Quads | squat 4 × 1.0 + leg press 3 × 1.0 | **7.0** | higher load |
| Lower back | squat 4 × 0.5 + RDL 3 × 0.5 | **3.5** | some load |
| Calves · Abs | 3 × 1.0 · 2 × 1.0 | **3.0 · 2.0** | some load |
| Shoulders | (incline 3 × 0.5 + overhead press 4 × 1.0 + row 4 × 0.5) × 0.25 = 7.5 × 0.25 | **1.875** | some load |
| Biceps | (pull-up 4 × 0.5 + row 4 × 0.5 + curl 3 × 1.0) × 0.25 = 7 × 0.25 | **1.75** | some load |
| Triceps | (incline 3 × 0.5 + overhead press 4 × 0.5 + pushdown 3 × 1.0) × 0.25 = 6.5 × 0.25 | **1.625** | some load |
| Lats · Middle back | (4 × 1.0 + 4 × 0.5) × 0.25 · (4 × 0.5 + 4 × 1.0) × 0.25 | **1.5 · 1.5** | some load |
| Chest | incline 3 × 1.0 × 0.25 | **0.75** | ready (below 1) |
| Forearms | curl 3 × 0.5 × 0.25 | **0.375** | ready |
| Abductors, adductors, neck, traps | no credited set in 72 h | **0** | ready |

- **Volume** (7 days, undecayed): glutes 16, hamstrings 16, shoulders 15.5, quads 14, biceps 14, triceps 13.5, lats 12, middle back 12, chest 7, calves 6, lower back 5, abs 3, forearms 3, and 0 for the other four.
- **Untrained** (no primary credit in 10 days): neck (never), lower back (never a primary: "No direct sets yet · helper yesterday"), traps and forearms (18 days, 2 Oct), adductors and abductors (14 days, 6 Oct).
- **TR-1 card line:** "Glutes, hamstrings and 1 more trained yesterday · Chest ready".
- A Node script reproduced these numbers from the same code before the specs were written; the browser run shows the same values on screen.
- **Imported sessions do not change the example map**: the last imported Hevy workout is 1 Oct, outside every window (72 h, 7 days, 10 days).

## Cross-checks

| Check | Result | Notes |
|---|---|---|
| Brief followed | PASS with 11 deviations | Listed below |
| Nothing saved before Import | PASS | IM-2 is a preview; Cancel, back and the picker's Cancel save nothing; the preview says so |
| Unmatched never blocks or drops | PASS | Default for an undecided name is a custom exercise; the count updates live; the Done screen and the Undo sheet use the same count |
| Suggestions never auto-applied | PASS | "Keep as my own" is the default; "Suggested" is a chip, not a decision |
| Units never guessed | PASS | `units` keeps Import off until kg or lb is chosen |
| Re-import adds nothing | PASS | "Nothing new to import" (same file after an import); spec: days with a workout are skipped, and the file hash is remembered |
| Undo import removes exactly that batch | PASS (design) | Sheet lists removed and kept; acceptance test in the handoff; Pending a build |
| One number, one source | PASS | IM-2 / IM-3 / IM-4 / ST-6 / the Undo sheet read one example (`IMP`); TR-11, TR-12 and the records preview read the same session (10 working sets, 4,133 kg; bench 92.5 kg × 3) |
| Estimate honesty | PASS | `estimate` chip and one line on TR-14 and the TR-1 card; copy says "trained recently", "higher load", "ready" |
| No red | PASS | The shading, the import screens and the failures use train, neutral and amber; red appears only on the existing destructive buttons (Remove import uses `btn-danger`, like Delete all) |
| No model names | PASS | No AI model name in any file touched |
| 17-region body map test | PASS | `categories 17 regions 17 missing [] extra [] errors []` |
| Navigation | PASS | Every entry point and Back clicked through in Chromium (list below) |
| Touch targets ≥ 48dp | PASS | No `small:` line in either run; `.link` buttons and `summary` rows measured separately across every screen and state (all ≥ 48dp) |
| Prototype runtime | PASS | `errors []` in both runs and in the click-through |
| 1A to 1D unchanged | PASS (checked by the same run) | Every earlier screen and state still renders; `src/liftria-1a.html` was not touched |

**Click-through** (a separate Playwright script, no page error): Settings → Data and storage → Import → Hevy → Choose a file → `hevy_workouts.csv` → two suggestions accepted (the count went 6 → 4, and Done and the Undo snackbar said 4) → Import → the bar ran → Done screen → View history → imported session → Back, Back → Done returns to ST-6 with Undo import → Undo import → Remove import → snackbar. Then: the same file again shows "Nothing new to import"; `my_workouts.csv` keeps Import off until lb is chosen, then imports 67 workouts; the TR-1 first-time link and the TR-11 empty link open IM-1 and Back returns; TR-1 card → TR-14 → Volume → Untrained → Find exercises → TR-5 (Neck) → Back; a map region (quads) → TR-5 (Quads); PR-2 "Muscle map" → Back.

**Final check output (the exact last lines of the runs):**

```
$ node check-all.mjs dark
errors []

$ node check-all.mjs light
errors []

$ node musclecheck.mjs
categories 17 regions 17 missing [] extra [] errors []
```

Both runs print no overflow line and no `small:` line. 175 screen × state combinations were rendered in each theme, 22 of them new.

## Contrast numbers (full table and method in ACCESSIBILITY.md)

| Pair | Dark (glass / Solid) | Light (glass / Solid) |
|---|---|---|
| Solid step (train color) vs card | 5.27 / 7.81 | 5.58 / 6.24 |
| 55% step vs card | **2.58 / 3.22** | **2.44 / 2.54** |
| 25% step vs card | **1.52 / 1.61** | **1.46 / 1.48** |
| Dots on the 55% step | 3.90 / 4.79 | 6.66 / 7.14 |
| Ready region outline (`color.border.control`) vs card | 4.24 / 6.28 | 4.98 / 5.56 |
| Shaded and untrained outline (train color) vs card | 5.27 / 7.81 | 5.58 / 6.24 |
| Legend and row text (`text.secondary`) | 6.85 / 10.15 | 6.54 / 7.31 |
| Row title text (`text.primary`) | 10.40 / 15.41 | 16.25 / 18.15 |
| `chip-file` text | 9.18 | 7.31 |

- **Finding, not hidden:** the 55% and 25% **fills alone do not reach 3:1** (and the steps differ from each other by only 1.2 to 2.4). The brief asks for these steps, so they are kept, and **no band relies on fill alone**: the middle step has the dot pattern, shaded regions have a train-colored outline against neutral regions' gray one, the untrained highlight has a dashed outline, and the legend, the list (a number and a word per muscle) and the text alternative repeat every band. The outlines themselves are ≥ 3:1 (all-four-glows extreme: 3.04 for neutral outlines, 3.78 for shaded ones).
- **Rendered check:** pixels sampled from the dark glass TR-14 gave 7.82 (solid) and 2.99 (55% base); light gave 6.18 and 2.56: inside the modelled range.
- **Risk:** in `volume`, "1–5 sets" (25%) versus "0" (neutral) is subtle on the map itself (outline color and a faint fill). The list reads it reliably. If a device check shows it is too subtle, make the 25% step a visible hatch (ACCESSIBILITY.md).

## Deviations from the brief (and why)

1. **Skipped days: 2, not 38; 142 is the count after skipping.** The brief's example has 38 days with a Liftria workout, but the app shows **14 workouts in all** (ST-6, TR-11), so at most 14 days can overlap. It also shows "142 workouts" in the summary, the button and Done while skipping 38, which can't all hold. The example file has **144 workouts, 2 on days Liftria already has (2 Oct and 4 Oct), so 142 are imported** and the summary, button and Done all say 142.
2. **The bench record depends on the mapping.** The brief lists "Bench Press (Barbell)" as unmatched and also says the bench record becomes 92.5 kg × 3. Both hold only if the suggestion is accepted (then Bench press goes 82.5 kg × 5 → 92.5 kg × 3, estimated 1RM 96 → 102: 92.5 × (1 + 3/30) = 101.75). Kept as a custom exercise, it becomes that exercise's first record. The records card follows the choice for that row.
3. **"6 custom exercises created" holds only if no suggestion is accepted.** It is the default (undecided names become custom exercises), and the count falls as suggestions are accepted. The `ok` state (everything matched) creates 0.
4. **Legend wording for `recent`.** The brief's legend says "Trained in the last 24 h / 24–72 h ago / Ready (more than 72 h)", but the bands are score bands, not time bands: 8 sets 30 hours ago still scores 4. The legend reads "Higher load, mostly the last 24 h", "Some load, 24–72 h", "Ready: little or none in 72 h", and rows give the real "trained yesterday".
5. **The brief's sample copy follows the data.** "Legs ready · Chest trained yesterday", "Chest · 8 sets · trained yesterday" and "Calves · last trained 19 days ago" would need a different history. The prototype shows what the example history gives: "Glutes, hamstrings and 1 more trained yesterday · Chest ready", glutes 8 sets, and forearms and traps last trained 18 days ago.
6. **Volume counts credit, so numbers can be halves** ("15.5 sets"); a footnote says a secondary muscle counts half a set. Untrained uses primary credit only, so a muscle that has only been a helper (lower back) reads "No direct sets yet · helper yesterday" rather than "Not trained yet".
7. **`imported-file` extends the workout data contract.** §3 lists `manual` ("the only source in V1"), `imported` (a Health Connect session) and `estimate`. The brief's `source = imported-file` is added as a fourth value in one line, with a pointer to the import rules; `imported` keeps its Health Connect meaning.
8. **The imported session in TR-12 is view-only** in the prototype (no edit or delete controls drawn), and TR-11 shows it under "August 2026" (12 Aug, the bench record session) with a note that the other 141 are further down, because none of the imported workouts falls in October.
9. **New provenance chip and tokens.** `chip-file` ("From Hevy") is added to the chip legend (prototype panel, ST-7 help); `recovery.*` tokens are derived from existing ones (DESIGN_SYSTEM.md). No existing token changed.
10. **PR-2 gets a "Muscle map" card**, because the brief says TR-14 is reached from PR-2 Strength.
11. **IM-3 has no back button and ignores the system back**, because it can't be cancelled; the brief says the former and implies the latter.

## Technical concerns for Phase 3 (recorded, not solved)

1. **Real exports.** The column sets in SCREEN_SPECIFICATIONS §1.1 and the export paths in IM-1 were written without a sample file from any of the apps. Get one real export from each (from the owner or a tester who uses each app) before parsing is built; keep the parser table-driven.
2. **Timestamps and time zones.** Hevy-style files carry a local time without a zone; the day for the skip rule must use the same zone the file was written in, which Liftria can't know. Decide: the phone's zone at import. Date-only files (Strong and FitNotes can be) use 12:00 local, which only matters for the 72-hour muscle map.
3. **Day-based skipping is coarse.** Two workouts in one day, one logged in Liftria and one in the file, lose the file's. That follows the brief; a time-overlap test (the Health Connect ≥ 50% rule) would be finer but needs end times that not every file has.
4. **Undo import and edits.** An imported session edited after the import is removed with its batch (the sheet says so). If that proves surprising, mark edited sessions and keep them, but then "removes exactly that batch" needs a second sentence.
5. **Recovery on a large history.** 3,910 imported sets plus daily use: compute the muscle scores from the last 10 days only (an indexed range on the completed time), never from the whole table.
6. **Custom exercises from an import have no muscles**, so they don't count in the map. A bulk "set muscles" step after an import could be worth adding in Phase 3.
7. **The recovery constants** (4 and 1 for the bands, the decay, 10 days) are a starting point from the brief. Tune with a few weeks of real use, and keep them in one file.
8. **Transaction size.** One transaction for ~4,000 sets is fine in SQLite; test 20,000 on the S22 for memory (parse in chunks, not the whole file).

## Open questions (for Claude and the owner)

1. **Export paths and columns:** are "Profile → Settings → Export & Import Data" (Hevy, from the brief), "Settings → Export Strong Data" and "Settings → Spreadsheet Export" right? The last two are from memory.
2. **Skipped-day rule** (deviation 1): keep the day-based rule, or compare times when the file has them?
3. **Volume wording:** "sets" with a half-set footnote (as built), or "set credits"?
4. **Legend wording** (deviation 4): accept the load-based wording?
5. **Undo import** covers only the last batch. Enough?
6. **The 25% step in volume** (a11y risk above): keep as the brief says, or add a hatch now?
7. **TR-11 versus TR-1:** TR-11 lists a finished "Tue 21 Oct · Upper A" while TR-1 says Upper A is up next today. I followed TR-1 for "now" (so the muscle numbers don't count a 21 Oct session). Which is right? (Existing issue from 1B.)
8. **Weekday in the example data** ("Tue 21 Oct" is a Tuesday in 2025, Wednesday in 2026): still known, still unfixed; the new screens avoid weekdays on dates before October.

## Not done or not verified

- **Nothing was tested on a device.** No Android document picker, no real file parse, no real Hevy, Strong or FitNotes export, no TalkBack, no real font scale (the 200% render is CSS emulation in Chromium).
- **Only part of the screenshots were looked at by eye.** Dark: TR-14 recent (all pages), volume, untrained (map, list, end of list), empty and 200%; the TR-1 card (rich and first time); IM-1 default and picker; IM-2 unmatched (top, mapping rows, records), ok, units and invalid; IM-3; IM-4 done and failed; TR-11 after an import; TR-12 imported (before and after the icon fix, in dark and light); ST-6 after an import and the Undo sheet. Light: TR-14 recent, untrained (list) and 200%; IM-2 unmatched (mapping rows); TR-12 imported; TR-1 first time. Solid dark: TR-14 volume. **Not seen by eye:** IM-2 empty and nothing new, IM-4 failed file, ST-6 after Undo, TR-11 empty with the link, the light renders of IM-1, IM-3, IM-4 and ST-6, and Solid for the import screens. The automated check covers errors, overflow and button size for all of them, but not clipping or overlap.
- **200% is rendered only for TR-14** (dark and light). IM-1 to IM-4 and the TR-1 card use rows and buttons already checked in 1C and 1D, but were not rendered at 200%.
- **Specified but not drawn:** the "no close match" mapping row, the "last import didn't finish" notice, the "too large" and "You already imported this file on <date>" texts, and the empty-state copy for a file whose only workouts were all skipped (that is `nothingnew`).
- **Prototype limits** (see `prototype/README.md`): the picker is a drawing; imported sessions can't be edited or deleted; the records card follows only the first mapping row; the tapped muscle opens TR-5 with that muscle selected but TR-5's list is the prototype's short example list; the "Hevy" lines in IM-1 for Strong, FitNotes and CSV don't change IM-2.
- **Example data** is invented except where the brief gives it: the 144 / 142 workouts, 3,910 sets, 412 warm-ups, 41 and 35 and 6 exercises, the six mapping names and their set counts, the 9 other records, 67 workouts and 1,512 sets, file names and sizes, and the six-session set history (two of its sessions, 2 Oct and 6 Oct, are invented; 16 to 20 Oct follow TR-1 and TR-11).
- **Seen while working, not mine and not changed:** the "Not deleted" list in the Delete-all sheet (ST-6) draws a bordered box around its items; the new Undo sheet inherits that style.
- **Files:** only `docs/phase1/` was touched. `prototype/liftria.html` and the other standalone pages were regenerated by `build.sh`; the other pages are byte-identical. Nothing was committed.

## Claude review (2026-10-22)

**Checks re-run independently:** `check-all.mjs` `errors []` in dark and light (175 combinations each), no overflow, no button under 48dp; muscle map 17/17.

**Reviewed by eye**, including every screen the builder hadn't viewed:
- TR-14: recent, volume, untrained
- the TR-1 card
- IM-1 (light)
- IM-2: unmatched, empty, nothing-new
- IM-3 (light)
- IM-4: done (light), failed-file
- ST-6 after Undo

**No defects found.**

**Deviations accepted, all of them.** Items 1–3 correct arithmetic errors in Claude's brief: 38 skipped days was impossible with 14 Liftria workouts, and the record and custom-exercise counts depend on the mapping. Item 4, the load-based legend, is more honest than the brief's time wording, because the bands measure load.

**Decisions on the open questions:**

| Question | Decision |
|---|---|
| Export paths and column sets | Stay **Pending** until checked against a real export of each app (Phase 3 acceptance §1). The parser is table-driven so a correction is a data change |
| Skip rule: day-based vs. time-based | Keep day-based for V1. It's simple and predictable, and re-imports are idempotent |
| "Sets" with half-set footnote vs. "set credits" | Keep "sets" + the footnote; "credits" is jargon |
| Load-based legend wording | Accepted |
| Undo for the last batch only | Enough for V1 |
| Subtle 25% step in Volume | Keep, because the list and text alternative carry the value. Re-check on the device; add a hatch if it's not distinguishable |
| TR-11 "Tue 21 Oct Upper A" finished vs TR-1 "up next today" | Known 1B example-data conflict, like the Tue/Wed date (1D decision 9); not fixed |

**Verdict:** 1E is ready for the owner's review. Both features are Phase 3 and added to the handoff with acceptance criteria and the AGPL ideas-only rule.

## Owner review asks

1. **Import preview:** is the preview (counts, skipped days, warm-up line, records) enough to trust before tapping Import? Is anything missing?
2. **Unmatched exercises:** is "Keep as my own" the right default, with the suggestion a tap away?
3. **Undo import:** is "until your next import" the right life for it?
4. **Muscle map:** do "Higher load / Some load / Ready" read well and calmly? Is "Estimate" clear enough, and is the Untrained tab useful?
5. **Shading:** can you tell the three steps apart on the phone (especially "1–5 sets" from "0" in Volume)?
