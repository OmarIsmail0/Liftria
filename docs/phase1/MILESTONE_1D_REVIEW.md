# Milestone 1D Review: Health, Progress, Settings and the final pass

**Date:** 2026-10-22 · **Author:** builder (self-review) · **Status: self-review by builder, then Claude review (done 2026-10-22); owner review pending.** Items the builder could not verify are listed under "Not done or not verified".
**Brief followed:** [MILESTONE_1D_BRIEF.md](MILESTONE_1D_BRIEF.md) · **Scope:** [PHASE_1_PROMPT.md](PHASE_1_PROMPT.md) §8 (1D). The handoff files (`PHASE_1_HANDOFF.md`, `PHASE_1_REPORT.md`, `PHASE_2_PROMPT.md`) are Claude's and are not part of this build.

## Deliverables

| Deliverable | Location | Status |
|---|---|---|
| Progress PR-1 … PR-6, Health HE-1 … HE-6 and Settings ST-1 … ST-7 in the clickable prototype, every state from the brief (plus a few extra, listed below), dark and light | `prototype/liftria.html` (source `prototype/src/liftria.html`) | Done |
| Deep links from the brief (§2), "Back returns to the origin", Quick add "Log weight" enabled, Settings as a pushed stack without the nav | same | Done |
| Glass outline fix: `color.border.control`, measured before and after | prototype CSS, `ACCESSIBILITY.md` | Done |
| 200% states for ST-1, HE-1 and PR-4 | prototype | Done (emulated) |
| Screen inventory (Progress, Health, Settings), replacing the stubs | `SCREEN_INVENTORY.md` | Done |
| Screen specifications | `SCREEN_SPECIFICATIONS.md` | Done |
| Flows 5, 8, 9, 10 (all data), 6 (key management) | `USER_FLOWS.md` | Done |
| States and interactions | `INTERACTION_AND_STATES.md` | Done |
| 1D components and tokens | `DESIGN_SYSTEM.md` | Done |
| Contrast, outline numbers, screen-reader wording, 200% findings | `ACCESSIBILITY.md` | Done |
| Progress, Health and Settings hierarchy | `INFORMATION_ARCHITECTURE.md` | Done |
| 1A open issues 1 and 4 marked resolved | `MILESTONE_1A_REVIEW.md` | Done |
| Prototype how-to | `prototype/README.md` | Done |

## Prototype screens and states (62 screen × state combinations, each rendered in dark and light)

| Screen | States |
|---|---|
| PR-1 `pr-home` | rich · first · partial · hidden (extra: the brief says Hide numbers covers PR-1) |
| PR-2 `pr-strength` | rich · empty |
| PR-3 `pr-nutrition` | rich · empty |
| PR-4 `pr-body` | rich · empty · hidden · hcweight · large · saved* · deleted* |
| PR-5 `pr-activity` | phoneonly · rich · hcoff |
| PR-6 `pr-weight` | default · invalid · edit* |
| HE-1 `he-home` | rich · notconnected · hcoff · unavailable · stale* · large |
| HE-2 `he-metric` | steps · stepsweek* · heart · energy · sleep · exercise |
| HE-3 `he-record` | default (heart rate) · steps* |
| HE-4 `he-perms` | partial · all · denied · system |
| HE-5 `he-guide` | default |
| HE-6 `he-trouble` | checking · issue · found |
| ST-1 `st-home` | default · large |
| ST-2 `st-profile` | default · changed |
| ST-3 `st-units` | default |
| ST-4 `st-hiku` | ready · nokey · test · tested* · replace* · delete |
| ST-5 `st-notif` | allowed · denied · mealson* |
| ST-6 `st-data` | default · cleared* · deleteall · typed |
| ST-7 `st-about` | default |

\* Not in the brief: added so a flow can be tapped end to end (saving and deleting a weight with Undo, editing an entry, a stale Health row, the week range for steps, a steps record, the key test result and the replace field, reveal of the meal times, the cleared-cache snackbar).

## Screen checklist

Legend: **PASS** = specified, in the prototype, states covered · **NEEDS REVISION** · **BLOCKED**. "Provenance" is the check that nothing unverified is shown as working.

| Screen | Visual | States | Dark / light | A11y | Offline | Privacy | Provenance / honesty | Result |
|---|---|---|---|---|---|---|---|---|
| PR-1 Progress home | ✓ | populated, first, partial, hidden | ✓ | ✓ | ✓ local (Activity needs Health Connect) | n/a | ✓ source line on every card, phone chip, HR "Device not recorded" | PASS (volume figure differs from the brief, deviation 2) |
| PR-2 Strength | ✓ | populated, empty | ✓ | ✓ chart text names the source | ✓ | n/a | ✓ Estimate chip on 1RM | PASS |
| PR-3 Nutrition | ✓ | populated, empty | ✓ | ✓ | ✓ | n/a | ✓ gaps not zeros, "18 of 28 days logged" | PASS |
| PR-4 Body | ✓ | populated, empty, hidden, with HC weights, 200%, save, delete | ✓ | ✓ | ✓ | n/a | ✓ source on every dot, body fat Pending, no "lose" or "gain" | PASS |
| PR-5 Activity | ✓ | phone only, two sources (illustration), off | ✓ | ✓ | ✓ cached | n/a | ✓ "No data" days, striped Samsung Health, resting HR and sessions Pending | PASS (stacking changed, deviation 3) |
| PR-6 Log weight | ✓ | default, invalid, edit | ✓ | ✓ | ✓ | ✓ "Not written to Health Connect" | n/a | PASS (system keyboard is not drawn) |
| HE-1 Health overview | ✓ | connected, not connected, off, unavailable, stale, 200% | ✓ | ✓ 200% rendered | ✓ cached values with age | ✓ reads only | ✓ matches the S22 test; "5 of 7" (deviation 1) | PASS |
| HE-2 Metric detail | ✓ | five types, steps week | ✓ | ✓ | ✓ | n/a | ✓ per-origin sources, estimate hidden and labeled total energy | PASS |
| HE-3 Record detail | ✓ | heart rate, steps | ✓ | ✓ | ✓ | n/a | ✓ device "Not recorded by the source" | PASS |
| HE-4 Permissions | ✓ | partial, all, denied, Android reference | ✓ | ✓ switch-looks say Allowed or Not allowed and that tapping opens Health Connect | ✓ | ✓ | ✓ labeled "Android screen, for reference" | PASS |
| HE-5 Sync guide | ✓ | default | ✓ | ✓ drawings have labels | ✓ | n/a | ✓ "Data starts from the day you connect" | PASS (copy follows Phase 0, so it may change after a device test) |
| HE-6 Troubleshoot | ✓ | checking, issue, found | ✓ | ✓ icon and word per row | ✓ | n/a | ✓ watch sync is "can't be checked from here"; "found" is labeled Example | PASS (design); Pending device test |
| ST-1 Settings home | ✓ | default, 200% | ✓ | ✓ | ✓ | n/a | n/a | PASS |
| ST-2 Profile | ✓ | default, changed | ✓ | ✓ | ✓ | ✓ "Used only to estimate your target" | ✓ Estimate chip, never silent | PASS (target figures differ, deviation 5) |
| ST-3 Units and appearance | ✓ | default | ✓ | ✓ | ✓ | n/a | ✓ kJ Future | PASS |
| ST-4 Hiku and API key | ✓ | six states | ✓ | ✓ | ✓ | ✓ privacy defaults off | ✓ "First device test" Pending; only product copy names the model | PASS (design); the test is Pending device test |
| ST-5 Notifications | ✓ | allowed, denied, meals on | ✓ | ✓ | ✓ | n/a | ✓ lock-screen alert Pending | PASS; Pending device test |
| ST-6 Data and storage | ✓ | default, cleared, delete confirmation, typed | ✓ | ✓ | ✓ | ✓ says what is and isn't deleted | ✓ backup Future, warning shown | PASS |
| ST-7 About and help | ✓ | default | ✓ | ✓ | ✓ | ✓ feature-scoped | ✓ | PASS |

Nothing is BLOCKED.

## Cross-checks

| Check | Result | Notes |
|---|---|---|
| Health matches what Phase 0 saw | PASS | 6,214 phone steps (`com.android.healthconnect.phone`, `SM-S908E`); 72 bpm from Samsung Health with no device ("device not recorded", never "from your watch"); no sessions; no measured energy; the 1,565 kcal Health Connect figure is hidden by default and not used; no sleep; Weight and Body fat not allowed; sync from 20 Oct |
| Unsupported ≠ not allowed ≠ no data ≠ zero | PASS | Four distinct treatments: `off` "Not available", `off` lock "Not allowed", `off` "No data", dashed "—" days; nothing is drawn as zero |
| Every chart names its source and has an empty state | PASS | Source line under every chart title and in its text alternative |
| No merging of origins | PASS | A total appears only for steps with one origin; two origins are side by side and never summed |
| Settings honesty | PASS | Delete all says what is and isn't deleted; backup is disabled with the warning |
| Navigation | PASS | Progress tab → PR-1; Today avatar → ST-1; Settings without the nav; PR-6 a focus overlay. Every deep link in brief §2 clicked through in Chromium and Back returns to the origin (Today steps and HR row, EA-6, HK-1, HK-6, TR-8 "Turn on", Quick add "Log weight") |
| One number, one source | PASS | Progress reads TR-11's session volumes and EA-7's week; weight in ST-2 is PR-4's; Today and Eat numbers are unchanged |
| Not logged ≠ 0 | PASS | Gaps in PR-3, "No data" days in PR-5 |
| Calm language | PASS | "trend" not "lose" or "gain"; no red or green trend color; a failed check is amber; red appears only on Delete entry, Delete key and Delete all data |
| No model names | PASS | Only the ST-4 product copy "Uses Anthropic's Claude Haiku model" |
| Outline contrast | PASS after one fix | Measured before and after (ACCESSIBILITY.md); the fix also found `status.danger` text in dark at 4.25 and lightened it |
| Touch targets ≥ 48dp | PASS | The check reports no small button. It skips `.link`, so I measured links, `summary` rows and tick rows in all states: all ≥ 48dp. The 1B TR-8 "Turn on" link was `min-height:0`; it's now 48dp |
| Font scaling 200% | PASS for ST-1, HE-1 and PR-4 | Emulated. One finding fixed (PR-4 body fat title) |
| Prototype runtime | PASS | Chromium (headless): `errors []` in both runs; flows clicked through (see below) |
| 1A to 1C unchanged | PASS | The same check covers every non-onboarding screen; the outline change is glass-only and the Solid style was not touched |

**Final check output (the exact last lines of the runs):**

```
$ node check-all.mjs dark
errors []

$ node check-all.mjs light
errors []

$ node musclecheck.mjs
categories 17 regions 17 missing [] extra [] errors []
```

Both runs print no overflow line and no `small:` line. 153 screen × state combinations in each theme were rendered, 62 of them new. A separate script clicked through flows 5, 6, 8 and 10, the deep links and Quick add "Log weight" and reported no page error.

## Contrast numbers (full tables in ACCESSIBILITY.md)

| Outline | Dark: card / bare page | Light: card / bare page |
|---|---|---|
| Before, `glass-border` (iconbtn, search, fchip, stepper, inputs, choice, unitseg, avatar) | 1.19 / 1.17 | 1.01 / 1.12 |
| Before, `border.strong` (btn-secondary, tick-btn, addrow) | 2.25 / 1.79 | 3.17 / 2.07 |
| After, `border.control` (`#929CAA` / `#5F6978`) | 4.24 / **3.38** | 4.98 / **3.25** |

Method: WCAG formula in Python; the outline colour over the card fill (with and without the sheen) and over the bare page, over each glow at full strength and the plain base; lowest value reported. Stacking all four glows is an unreal extreme (3.04 on a card, 1.41 on a bare page in dark) and is noted in ACCESSIBILITY.md.

## Deviations from the brief (and why)

1. **HE-1 permissions read "5 of 7 allowed", not "4 of 7".** The example allows Steps, Heart rate, Exercise sessions, Active energy and Sleep (the last two have no data, which is not the same as not allowed) and denies only Weight and Body fat. That is five.
2. **PR-1 and PR-2 volume is 161,900 kg for 4 weeks, not 41,200 kg.** The workouts in TR-10 and TR-11 are 8,000 to 11,500 kg each (the five listed sessions alone add to 49,540 kg), so 41,200 is about one week. I kept "+6%" and built eight 7-day periods whose newest one is exactly those five sessions; the last four add to 161,900 and the four before to 152,736 (+6.0%).
3. **Steps with two sources are side by side, not stacked.** Brief §4 asks for stacking by source and §6 says a total is shown only with one origin so phone and watch aren't double counted. A stacked bar is a visual sum, so the two-source illustration uses grouped bars (solid and striped) and says they are never added. With one origin (the real example) it looks the same either way.
4. **The steps average covers the one full day there is.** The brief gives "avg 7,480/day" in a 4-week view, but sync started on 20 Oct and nothing is stored before it. 7,480 is Monday 20 Oct (the only complete day), today's 6,214 is "so far", and the card says "1 full day so far (since 20 Oct)".
5. **ST-2 changed example is 2,650 → 2,700 kcal (weight 78.4 → 80.0 kg), not 2,650 → 2,610.** The target is rounded to 50 (ON-5), so 2,610 can't occur, and a higher weight raises the estimate. At 78.4 kg the estimate is still 2,650 (2,656.7 before rounding); at 80.0 it is 2,680.9, which rounds to 2,700.
6. **The 1,565 kcal estimate is labeled "total energy".** Phase 0: active 0.0, total 1,564.5, basal 1,564.5, no origin. The brief calls it the active/total estimate; calling it active would claim something Phase 0 didn't show.
7. **The latest heart-rate reading is "2 h ago".** The brief gives only the steps age (12 min). HE-6 says Samsung Health's "last record 2 h ago", so the HR age had to be 2 h to agree.
8. **A shared token changed:** dark `status.danger` `#FF6B6B` → `#FF7A7A`, because danger text measured 4.25 over the brightest glass card (the same finding as 1C's `status.warning`). DESIGN_SYSTEM.md is updated.
9. **PR-6 has no drawn keypad.** The brief says "stepper + keypad"; EA-3's pattern is "tap the number to type", which opens the system numeric keyboard. I followed EA-3.
10. **PR-4 has a "Recent entries" list**, which the brief's layout doesn't show, because Flow 10 needs an entry to edit or delete.
11. **HE-3 has a steps variant** (the brief has one `default`), because HE-2's steps records open it and showing a heart-rate record there would be wrong. `default` is the heart-rate record (the Today HR row opens it).
12. **TR-8's "Turn on" link was 1B's `min-height:0`** and is now 48dp, because it became a real link.
13. **The Phase 0 app asks for 10 read permissions**; the brief (and these screens) show 7 user-facing types. Total energy, resting energy and lean body mass are not separate rows (question 2).

## Technical concerns for Phase 2–4 (recorded, not solved)

1. **Health Connect pagination at volume.** The Phase 0 reader follows `pageToken` until exhausted and fails closed above 100 pages or on a repeated token. At 1,240 cached rows this is fine; after a month of heart-rate series it won't be. Read incrementally (changes API or a last-read time), keep a per-type cursor, and show cached values first with their age. Decide what the UI shows when a read is partial ("Showing the last 7 days; reading more…").
2. **The dedup rule for phone vs watch steps.** Phone (`com.android.healthconnect.phone`) and Samsung Health can count the same walk. V1 never adds them. Phase 2/3 should test with a day of both and decide a rule (prefer one origin per time window, or Health Connect's own aggregate with origin priority) before any total over two origins is shown. The same applies to weights from two apps.
3. **Background reads: none in V1.** Reads happen on app open (at most every 15 min) and pull-to-refresh. Notifications about watch data, or "stale" alerts, would need WorkManager and the background-read permission. Decide it as a later feature.
4. **Delete-all implementation order.** Cancel scheduled notifications; close and delete the SQLite file (WAL files too); delete the SecureStore key; delete cached files; clear the settings store; restart into onboarding. Report any failed step and don't claim success first. Test it with the app killed mid-delete (the next launch should detect a half-deleted state and finish).
5. **The Health Connect permission rationale screen** is required by Android (an intent on Android 13; a `VIEW_PERMISSION_USAGE` activity alias on Android 14 and newer). It isn't drawn in 1D. It must say what Liftria reads and that it never writes, and it can reuse HE-4's statement.
6. **Play Store Health Connect declaration.** A Play-published app that requests Health Connect permissions needs the Health Connect declaration form and a privacy policy. **A sideloaded personal app doesn't need it.** Recorded here so it isn't forgotten if the app is ever published.
7. **Freshness limits** (6 h, 24 h, 14 days) are defaults from DESIGN_SYSTEM §6; Phase 2 tunes them with real sync intervals (Samsung Health syncs in batches).
8. **Samsung Health Data SDK** is still conditional on device evidence (HEALTH_INTEGRATION.md): the trigger is missing watch steps, energy or sessions after the sync guide is followed.
9. **Weight from Health Connect** needs the Weight permission, which is off in the example. Decide in Phase 4 whether a Health Connect weight can become the "latest weight" for the profile (ST-2) and the target, or stays display-only.
10. **Local aggregates for charts.** PR-2 and PR-3 read many diary rows; precompute daily totals (and weekly volume) when a workout or meal is saved so the charts don't scan the tables.

## Open questions (for Claude and the owner)

1. **Workout mini bar in Settings.** IA rule 3 says the mini bar shows on every screen until the workout ends; Settings hides it (no nav, treated as a focus flow). Should it show there?
2. **The 7 types vs Phase 0's 10 permissions.** Are total energy, resting energy and lean body mass part of "Active energy" and "Body fat" in the UI, or separate rows?
3. **Weights outside 20 to 300 kg** ask "Is that right?" in PR-6 (my proposal). Right range?
4. **Hide numbers on PR-1.** I used words ("Volume is up", "On track", "Trend: steady"). The Strength word is a comparison, not a judgment, but OK?
5. **7-day periods** (ending today) are used for PR-2 instead of calendar weeks, so the newest bar is never partial. Calendar weeks (Mon to Sun) would show a partial current week. Which?
6. **What 3 M and 1 Y show** when data starts on 20 Oct for health and a few weeks ago for the rest: the same data with a wider empty axis, or the chips disabled until there is enough?
7. **HE-6 "All good"** is an example of a state nobody has seen yet. Keep it labeled Example in the app, or drop the state until it is verified?
8. **Meal reminder times** (08:00, 12:30, 19:00) are examples; should reminders follow the meal presets in EA-2 instead?
9. **Weekday label.** The prototype says "Tue 21 Oct" throughout (carried from 1A), which matches 2025's calendar; 21 Oct 2026 is a Wednesday. Example data only, but the owner may notice.
10. **Settings → Health Connect** opens HE-4 (as the brief says). Should it open the whole Health overview instead?

## Not done or not verified

- **Nothing was tested on a device.** No TalkBack, no real Android font scale (the 200% render is CSS emulation in Chromium), no real Health Connect, no real notification, no real Claude request.
- **Only a subset of screenshots was looked at by eye.** Dark: PR-1 (rich), PR-2, PR-3, PR-4 (rich, 200%), PR-5 (phone only), PR-6 (default), HE-1 (rich, 200%), HE-2 (energy, heart rate), HE-4 (partial, Android reference), HE-5, HE-6 (issue), ST-1 (200%), ST-3, ST-4 (ready), ST-6 (delete confirmation); light: ST-6, PR-4 (with HC weights), HE-4 Android reference; Solid dark: PR-5 (two sources). The automated check covers errors, overflow and button size for all 153 combinations, but not overlap or clipping. The other new screens and states were not all reviewed by eye, in particular HE-2 sleep, exercise and steps week, HE-3, ST-2, ST-5, ST-7, the light renders of most screens and the Solid style of most.
- **The outline fix was measured, not seen on every control.** I looked at the segmented controls (dark, ST-3) and the range chips (light, PR-4), but not every 1A to 1C control in both themes. The all-four-glows case is an extreme bound; a bare control where two glows overlap should be checked on a device.
- **Prototype limits:** see `prototype/README.md` (range chips, units, "Hide numbers" in Settings, the typed keypad and the date picker don't act; the weight sheet saves nothing).
- **Example data** other than the Phase 0 facts in brief §1 is invented: the strength periods, the 28-day calories and protein, the weight entries, the hourly steps, the heart-rate samples, the illustrative Samsung Health steps, the storage counts and the sample name in ST-2. Where the numbers feed several screens I checked them with a script (volume +6%, nutrition avg 2,210 and protein 128 g over 18 of 28 days, 3 days at or above 155 g, weight trend −0.3 kg).
- **The standalone page** `prototype/liftria.html` was regenerated by `build.sh`. Nothing outside `docs/phase1/` was touched, and `src/liftria-1a.html` is unchanged.

## Claude review (2026-10-22)

**Checks re-run independently:**
- `check-all.mjs`: `errors []` in dark and light across all 153 screen × state combinations, with no overflow and no button under 48dp.
- Muscle map: 17/17.

**Reviewed by eye**, including the screens the builder hadn't viewed:
- Dark: PR-1, HE-1, HE-2 (energy, sleep, exercise), HE-3, ST-2 (changed), ST-5.
- Light: ST-7, HE-1 at 200%, ST-6 typed confirm, PR-5 with two sources.

No defects found. The Phase 0 facts are shown exactly as observed:
- phone steps
- heart rate from Samsung Health, device not recorded
- workouts pending
- the estimate hidden behind "Show estimate"

**Deviations accepted:** all ten.
- Items 1, 2, 4 and 5 correct errors in Claude's brief: the permission count, the volume arithmetic, the steps average with one full day, and target rounding.
- Item 3 (side-by-side, not stacked, steps) is better than the brief, because a stack implies a sum.
- The rest are consistent with Phase 0 data or fill gaps sensibly.

**Decisions on the open questions:**

| # | Question | Decision |
|---|---|---|
| 1 | Workout mini bar inside Settings | Stay hidden. Settings is a pushed stack; back returns to a tab, where the bar shows |
| 2 | Phase 0's 10 read permissions vs 7 types | HE-4 shows the 7 user-facing types. Phase 0's extra reads (basal/total energy, history) are grouped under them, and "Older data" (history) gets its own row. Phase 2 implements the mapping and lists it in the PR |
| 3 | Weight "Is that right?" range | 20–300 kg accepted |
| 4 | PR-1 hide-numbers words | Accepted |
| 5 | Strength chart periods | Rolling 7-day periods |
| 6 | 3 M / 1 Y with short data | Show what exists with "Data from 20 Oct" under the chart; never stretch or extrapolate |
| 7 | HE-6 "all good" state | Keep: it's flow 8's success end |
| 8 | Meal reminder times | Default to the EA-2 presets, editable |
| 9 | "Tue 21 Oct" in the example data (21 Oct 2026 is a Wednesday) | **Known example-data error, not fixed.** It comes from Claude's 1A example and appears in about 18 labels. The specs don't depend on it, and the app uses real dates |
| 10 | Settings → Health Connect target | HE-4 (permissions); the HE-1 overview stays in Progress |

**Token changes in 1D**, both recorded in DESIGN_SYSTEM.md:
- new `color.border.control` (glass only): dark `#929CAA`, light `#5F6978`
- dark `status.danger` `#FF6B6B` → `#FF7A7A`

The glass outline contrast carried from 1A is now **closed**: worst case ≥ 3.25 against the bare page over a glow, ≥ 4.24 against the card.

**Verdict:** 1D is ready for the owner's review, and Phase 1 is complete pending owner approval.

## Owner review asks

1. **Progress home:** four cards with a headline and a source line each. Too dense, or right?
2. **Health overview:** is the row layout (value, source chip, age) readable, and is "Device not recorded" clear enough?
3. **Show estimate:** is it right to let the owner reveal Health Connect's 1,565 kcal, with "Not used anywhere in Liftria"?
4. **Troubleshoot:** does the checklist help? Is "can't be checked from here" for the watch sync the right honesty?
5. **Delete all data:** typed confirmation with the list of what is and isn't deleted. Right level of friction?
6. **Outline contrast:** the control outlines are now visibly stronger in Aurora Rim. Acceptable?
7. ~~Decisions needed~~ Decided in Claude's review above.
