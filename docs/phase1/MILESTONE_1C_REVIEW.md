# Milestone 1C Review: Nutrition and Hiku

**Date:** 2026-10-22 · **Author:** builder (self-review) · **Status: self-review by builder, then Claude review (done 2026-10-22); owner review pending.** Items the builder could not verify are listed under "Not done or not verified".
**Brief followed:** [MILESTONE_1C_BRIEF.md](MILESTONE_1C_BRIEF.md) · **Scope:** [PHASE_1C_PROMPT.md](PHASE_1C_PROMPT.md)

## Deliverables

| Deliverable | Location | Status |
|---|---|---|
| Eat screens EA-1 … EA-7 and Quick add QA-1 in the clickable prototype, every state from the brief (plus a few extra, listed below), dark and light | `prototype/liftria.html` (source `prototype/src/liftria.html`) | Done |
| Hiku screens HK-1 … HK-6, every state from the brief, dark and light | same | Done |
| Integration: Today "Log a meal" → EA-2, "Photo" → HK-2, meals card "Add" link, one shared diary behind Today, Eat and Hiku, long-press Quick add | same | Done |
| Screen inventory (Eat, Hiku) with status | `SCREEN_INVENTORY.md` | Done |
| Screen specifications and behavior rules | `SCREEN_SPECIFICATIONS.md` | Done |
| Flows 3, 4, 6 (request), 10 (meals) | `USER_FLOWS.md` | Done |
| States, Claude failure cases, interactions | `INTERACTION_AND_STATES.md` | Done |
| 1C components and tokens | `DESIGN_SYSTEM.md` | Done |
| Measured contrast, screen-reader wording, 200% findings | `ACCESSIBILITY.md` | Done |
| Eat and Hiku hierarchy, focus-flow list | `INFORMATION_ARCHITECTURE.md` | Done |
| Prototype how-to | `prototype/README.md` | Done |

**Prototype screens and states (52 screen × state combinations, each rendered in dark and light):**

| Screen | States |
|---|---|
| EA-1 `ea-home` | rich · first · over · notarget · hidden · added · deleted · hikusaved · hikuedited |
| EA-2 `ea-add` | recents · search · noresults · offline · added |
| EA-3 `ea-portion` | default · large |
| EA-4 `ea-meal` | view · edit · delete |
| EA-5 `ea-food` | empty · invalid · quick |
| EA-6 `ea-targets` | estimate · manual · floor · deficit |
| EA-7 `ea-history` | week · empty |
| QA-1 `qa-sheet` | default · offline · nokey |
| HK-1 `hk-home` | ready · nokey · offline · first |
| HK-2 `hk-send` | photo · text |
| HK-3 `hk-analyze` | working · slow |
| HK-4 `hk-result` | result · editing · edited · large · discard |
| HK-5 `hk-error` | offline · auth · ratelimit · server · refusal · cutoff · timeout |
| HK-6 `hk-usage` | default |

## Screen checklist

Legend: **PASS** = specified, in the prototype, states covered · **NEEDS REVISION** · **BLOCKED**. For Hiku, "PASS (design)" means the design is complete; the real request is still **Pending device test**, as the brief says.

| Screen | Visual | States | Dark / light | A11y | Offline | Privacy | Provenance / honesty | Result |
|---|---|---|---|---|---|---|---|---|
| EA-1 Eat home | ✓ | populated, first, over, no target, hidden, plus three Undo states | ✓ | ✓ orb wording for hidden and over | ✓ local | n/a | ✓ Estimate chip, "Not logged yet", honey over | PASS |
| EA-2 Add food | ✓ | recents, search, no results, offline, after add | ✓ | ✓ | ✓ pack is local; Hiku disabled with reason | n/a | ✓ source chips | PASS |
| EA-3 Portion picker | ✓ | default, 200% | ✓ | ✓ 200% rendered | ✓ | n/a | ✓ USDA chip, grams canonical | PASS |
| EA-4 Meal detail | ✓ | view, edit, delete sheet | ✓ | ✓ | ✓ | n/a | ✓ Hiku item marked | PASS |
| EA-5 Create a food | ✓ | empty, invalid, quick | ✓ | ✓ | ✓ | n/a | ✓ "Calories only" chip | PASS (mismatch threshold is a proposal, question 7) |
| EA-6 Targets | ✓ | estimate, own, floor, deficit | ✓ | ✓ | ✓ | n/a | ✓ Estimate vs Your target | **NEEDS REVISION** on one point: the brief's formula text doesn't reproduce 2,650 (deviation 2) |
| EA-7 History and trends | ✓ | week, empty | ✓ | ✓ chart alternative + list | ✓ | n/a | ✓ unlogged ≠ 0, "avg of 5 logged days" | PASS |
| QA-1 Quick add | ✓ | default, offline, no key | ✓ | ✓ | ✓ | n/a | ✓ weight disabled with reason | PASS |
| HK-1 Hiku home | ✓ | ready, no key, offline, first | ✓ | ✓ | ✓ | ✓ | ✓ "Pending" note, Chat marked pending | PASS (design); request Pending device test |
| HK-2 Before sending | ✓ | photo, text | ✓ | ✓ switches announce state | n/a (entry disabled offline) | ✓ shows exactly what's sent, switches off | ✓ cost labeled Estimate | PASS (design); Pending device test |
| HK-3 Analyzing | ✓ | working, slow | ✓ | ✓ | n/a | ✓ | ✓ Cancel says it may still be billed | PASS (design); Pending device test |
| HK-4 Result review | ✓ | result, editing, edited, 200%, discard | ✓ | ✓ 200% rendered | n/a | ✓ | ✓ Estimate + Hiku chips, confidence words, nothing saved until Save | PASS (design); Pending device test |
| HK-5 Errors | ✓ | seven cases | ✓ | ✓ | ✓ offline is Confirmed from Phase 0 | ✓ | ✓ input kept, no partial result | PASS (design); chrome rule is question 3 |
| HK-6 Usage and privacy | ✓ | default | ✓ | ✓ | ✓ | ✓ never-sent list | ✓ every cost labeled Estimate | PASS (the example numbers disagree, deviation 8) |
| Chat | marker | pending | ✓ | ✓ | n/a | n/a | ✓ "Coming later", not a button | Future (not designed as a feature) |

Nothing is BLOCKED. The HK-3, HK-4 and HK-5 server cases depend on a device test that hasn't happened (see technical concern 7).

## Cross-checks

| Check | Result | Notes |
|---|---|---|
| One number, one source | PASS | Today's orb, Eat's orb, the Meals today card, the meal cards and Hiku's "After saving" all read one example diary in the prototype. Saving the Hiku dinner changes Today and Eat to 2,044 (or 2,089 after the olive-oil edit). Tested by clicking through |
| Not logged ≠ 0 | PASS | Empty meals read "Not logged yet"; unlogged days in the week chart are dashed outlines with "—"; the average says "5 of 7 days logged" and leaves the others out |
| Calm language | PASS | No "bad", "cheat", "junk" or "over budget". Over target is honey with "180 kcal over". The only red on these screens is Delete / Remove (destructive actions) |
| Feature-scoped privacy | PASS | The HK-2 privacy line names what is sent and when; HK-6 lists what is never sent; no screen says "nothing leaves your phone" |
| AI never saves without confirm | PASS | Hiku results only reach the diary through Save to Dinner; every item is editable or removable; discard asks if edited; failures never show a partial result |
| Honesty about verification | PASS | HK-1 shows a `pending` chip, "Still being tested on your phone"; Chat is a `pending` marker; inventory marks the request Pending device test |
| Integration with Today | PASS | Today "Log a meal" → EA-2, "Photo" → HK-2, Dinner "Add" link, long-press Quick add. Today's design is otherwise unchanged. Its macro numbers now come from the shared diary (deviation 3) |
| Integration with Train | PASS | The workout mini bar still shows above the capsule on Eat and Hiku screens and hides on focus flows. "Training day · Upper A" is a read-only chip; nothing writes workout data or adds calories |
| Capsule nav and focus flows | PASS | Hidden on EA-3, EA-5, HK-2, HK-3, HK-4 and the confirmation sheets. NAV points to `ea-home` and `hk-home` |
| Contrast | PASS after one fix | Measured for every new pair, both themes, worst case over each glow (ACCESSIBILITY.md). Found and fixed: the confidence chip at 4.43 in light, and the switch outline at 2.25 in dark |
| Touch targets ≥ 48dp | PASS | The automated check reports no button under 48dp across all 52 screen × state combinations. The check skips text links, so I measured those separately and fixed the ones I added (Today's dinner "Add" link, Eat links). The 1A Today "Set a target" link is still 44dp |
| Font scaling 200% | PASS for EA-3 and HK-4 | Emulated (CSS text sizes, not Android's setting). The first HK-4 render stacked each row into four lines and was fixed to two. Other 1C screens are specified, not drawn |
| Prototype runtime | PASS | Chromium (headless): both runs below print `errors []` and no overflow or small-button lines. Clicked through flows 3 and 4, long-press and context menu, the delete and Undo flow, and the rate-limit countdown |
| No model names | PASS | None in the prototype or the docs I changed |

**Final check output (the exact last lines):**

```
$ node check-all.mjs dark
errors []

$ node check-all.mjs light
errors []
```

## Meal arithmetic (brief §4 food table; USDA per-100 g values)

Each item is `round(per-100 g value × grams ÷ 100)`; a meal is the sum of its rounded items.

| Meal | Items (grams = kcal) | kcal | P / C / F (g) |
|---|---|---|---|
| Breakfast | Oats 55 g = 208 · Greek yogurt 150 g = 89 · Banana 120 g = 107 · Almonds 20 g = 116 | **520** | 28.1 / 74.3 / 14.5 |
| Lunch | Chicken breast 130 g = 215 · White rice 120 g = 156 · Whole-wheat bread 70 g = 176 · Olive oil 15 g (Hiku estimate) = 133 | **680** | 52.3 / 63.7 / 22.5 |
| Snacks | Greek yogurt 140 g = 83 · Almonds 15 g = 87 · Whole-wheat bread 20 g = 50 | **220** | 20.0 / 16.8 / 8.7 |
| **Day** | 520 + 680 + 220 | **1,420** | **100.4 / 154.9 / 45.8** (brief: 96 / 152 / 41; deviations +4.4 / +2.9 / +4.8, all within ±5) |
| Hiku dinner | Chicken 150 g = 248 · Rice 200 g = 260 · Broccoli 80 g = 28 · Olive oil 10 g = 88 | **624** | 53.8 / 62.2 / 16.3 → P 54 / C 62 / F 16 |
| Hiku dinner, olive oil edited to 15 g | 248 + 260 + 28 + 133 | **669** | P 54 / C 62 / F 21 |
| After saving | 1,420 + 624 = **2,044** of 2,650 (2,089 after the edit) | | |
| Over-target day (revised in Claude's review) | Day 1,420 + dinner: Chicken 200 g = 330 · Rice 300 g = 390 · Bread 70 g = 176 · Olive oil 20 g = 177 = 1,073; + evening snacks: Almonds 40 g = 232 · Banana 118 g = 105 = 337 | **2,830** → "180 kcal over" | |
| Portion picker | Greek yogurt 170 g: 59 × 1.7 = 100.3 → **100 kcal**; P 17.34 / C 6.12 / F 0.68 | | |

I found these meals with a small search over gram amounts (steps of 5 g) that hits 520 / 680 / 220 exactly and keeps day macros within ±5 g of the brief. A tighter match (within ±3 g on all three) did not exist in the foods and portions I allowed.

## Deviations from the brief (and why)

1. **Greek yogurt protein is 17.3 g, not 17.0 g.** The brief's own table gives 10.2 g per 100 g, and 10.2 × 1.7 = 17.34. Everything else in that example (100 kcal, 6.1, 0.7) matches.
2. **How the estimate is calculated (EA-6).** The brief says "Mifflin-St Jeor × activity 1.55". For the example profile that gives about 2,693 kcal (1,738 × 1.55), which does not round to 2,650. The 1A spec (ON-5) does: 1,738 × 1.375 ("On my feet some") + 10% to build muscle = 2,628, rounded to 50 = **2,650**. I wrote the 1A formula so the number stays consistent with onboarding. Needs a decision (question 1).
3. **Today's macro numbers changed from 96 / 152 / 41 to 100 / 155 / 46 g.** The brief asks for example meals built from the food table, which land near but not on those numbers. I made Today read the same diary as Eat, so the macros agree everywhere. Calories are exactly as the brief says.
4. **Hide numbers also hides per-meal and per-item calories** on Eat home (it shows an item count). The brief only names the orb words and the macro bars; showing item calories would undo the setting. Question 2.
5. **A shared token changed:** light `color.status.warning` `#946300` → `#8A5C00`, because the confidence chip (same pair as the 1A "2 d ago" chip) measured 4.43 over the lavender glow. DESIGN_SYSTEM.md is updated. This is the one change to a signed-off 1A token.
6. **Extra states beyond the brief** (so the flows can be tapped end to end): EA-1 added / deleted / hikusaved / hikuedited; EA-2 added; EA-5 quick (calories only); EA-6 deficit; HK-4 edited and discard; QA-1 offline and no key. The brief didn't say where "Quick add calories" goes, so it opens EA-5's quick variant.
7. **HK-5 cut-off, like the others, offers Retry and Log manually.** The brief lists only Retry for it. Without a manual path, a repeat cut-off would be a dead end.
8. **HK-6 and HK-2 disagree on cost.** The brief gives "≈ $0.004" per request and "≈ $0.42 · 61 requests" (about $0.007 each). My per-request list shows photo requests at $0.007–0.008, which is higher than the pre-send estimate. The numbers are labeled Estimate and are example data, but a real build needs one price model (technical concern 4). **Resolved in Claude's review:** one model, photo ≈ $0.007, text ≈ $0.002.
9. **The Hiku error cards keep the capsule nav.** The brief's focus list doesn't include HK-5, and I followed it literally (question 3).
10. **Small generalizations in the shared code:** `orb(v, opts)` gained a 200px size, a hidden-numbers mode and an over-target label; `sheet(body, closeTo)` can close on scrim tap; `.page .link` is 48dp tall.

## Technical concerns for Phase 4 (recorded, not solved)

1. **USDA pack size and subset.** Decide which FoodData Central data types to bundle (for example Foundation and SR Legacy versus Branded). Measure the SQLite size, with a budget to be set; Branded foods are far larger. Index for prefix and fuzzy search offline. FoodData Central is published as public domain (CC0); confirm the exact terms at import and keep the credit.
2. **Portion data coverage.** Household portions (cup, piece, serving) come from the pack's portion list, and not every food has one. Define the fallback (grams only, with the unit control showing only what exists), and decide what "serving" means when the food has none. EA-3 draws all four units; the real control hides the missing ones.
3. **Claude structured-output schema and validation.** Define one JSON schema (meal name, items with name, grams, kcal, protein, carbs, fat, confidence word) and validate every response against it. Anything that fails goes to the cut-off or refusal state; never fill in missing fields. Test with truncated, empty and off-schema responses.
4. **The exact Anthropic price table source.** Pick one source for per-token prices (the published pricing page), bundle it with a date, and compute cost from the token counts in each response. Everything stays labeled Estimate. Resolve the cost mismatch in deviation 8, and decide how cancelled requests are counted (they may still be billed).
5. **Image downscaling before upload** with the Phase 0 `expo-image-manipulator`. Choose a long edge and JPEG quality from Anthropic's current image guidance, strip metadata (location), and measure the resulting token cost so the HK-2 estimate is honest.
6. **Storing original versus edited estimates.** Each Hiku diary item keeps the original estimate (JSON) beside the saved, user-edited values and a `source = hiku-estimate` flag; no photo unless "Keep photos" is on (1D). The schema should let trends compute how often and how much users correct Hiku.
7. **The Hiku request is still untested on the device.** Phase 0 proved key storage and the offline failure, but not a real request. Test on the S22: a photo and a text request, 401, 429, a timeout at 45 s, Cancel mid-request, airplane mode mid-request, and a refusal. Until then the UI keeps the `pending` note and the inventory says Pending device test.
8. **Smaller items.** Long-press on Today's "Log a meal" and the Today tab has no visible hint (the Eat "+" is the discoverable path). Time-of-day meal presets need a rule (question 6). The diary's day boundary at midnight, and time zone changes, need a rule.

## Open questions (for Claude and the owner)

1. **Target formula.** Use the 1A formula (× 1.375 and +10% for "on my feet some", building muscle), which reproduces 2,650? Or change the example numbers to match "× 1.55"? (Deviation 2.)
2. **Hide numbers:** should it also hide per-meal and per-item calories on Eat home? I assumed yes.
3. **Should HK-5 hide the capsule nav** like HK-2, HK-3 and HK-4? It is mid-flow ("your photo is still here"), but the brief's list doesn't include it.
4. **Today's macro numbers** now read 100 / 155 / 46 g. Acceptable, or should the example meals be re-cut to land exactly on 96 / 152 / 41 (I couldn't within ±1.5 g using the brief's foods)?
5. **Cost model:** one price model for HK-2 and HK-6 (deviation 8).
6. **Meal presets:** only "dinner after 17:00" is in the brief. I proposed breakfast before 10:30, lunch 10:30–15:00 and snacks 15:00–17:00.
7. **Create a food mismatch rule:** I used "calories differ from 4·P + 4·C + 9·F by more than 20%". Is that the right threshold? Also proposed: an amount over 2,000 g asks "Is that right?".
8. **Over-target example:** the brief's 2,830 kcal needs a 1,410 kcal dinner, which looks odd. Should the over state use several smaller meals instead?
9. **The `Snacks` card** is named "Snacks" on Eat and "Snack" on Today (1A). Rename Today's, or keep it?
10. **Date switcher:** the earlier-day arrow opens the week view in the prototype. In the app it should open yesterday, and EA-7 should be reached from the History row.

## Not done or not verified

- **Nothing was tested on a device.** No TalkBack, no real Android font scale, no real Hiku request. The 200% render is CSS emulation in Chromium.
- **Only a subset of screenshots was looked at by eye** (EA-1 rich, over, hidden, first; EA-2 recents, no results, offline; EA-3 both; EA-4 view and edit; EA-5 invalid; EA-6 estimate, floor, deficit; EA-7; QA-1; HK-1 ready, no key, first; HK-2 photo; HK-3 slow; HK-4 result, editing, large; HK-5 rate limit; HK-6; plus light renders of Today, EA-1 over, EA-3 at 200% and HK-4 (result and 200%), and Solid renders of HK-4 editing and EA-7). The automated check covers errors, overflow and button size for all 52 combinations, but not overlap or clipping. The remaining screens and the Solid style were not all reviewed by eye.
- **Prototype limits:** the portion picker's − and + buttons, Remove item, Move to another meal and most secondary buttons don't act. Adding or deleting food after a Hiku save restarts from the example day. The rate-limit countdown and the 3 s "analyzing" advance are prototype behaviors (the advance only happens when you arrive by tapping Send, not from the State menu).
- **Contrast** was measured for the new pairs only, not re-audited for 1A and 1B. The glass `border.strong` outlines (steppers, inputs, secondary buttons) measure below 3:1 over a bright glow; that is a 1A style question and wasn't changed.
- **Food values** other than the brief's ten foods (the other yogurt variants in search, "Protein shake", "Chicken and rice bowl", "Dinner out") are invented examples, not USDA data.
- **Hiku usage numbers** (tokens, costs, $0.42 for 61 requests) are invented examples; see deviation 8.
- **The standalone page** `prototype/liftria.html` was regenerated by `build.sh`. No other file outside `docs/phase1/` was touched, and `src/liftria-1a.html` is unchanged.

## Claude review (2026-10-22)

Re-ran both automated checks independently: `errors []` in dark and light, no overflow, no button under 48dp, muscle-map test 17/17. Reviewed by eye: EA-1 rich, over, hidden; EA-2 recents; EA-3 default and 200%; EA-4 view; EA-6 floor; EA-7 week (light); HK-1 ready; HK-2 photo; HK-4 result, editing, 200% (light); HK-5 rate limit (light); QA-1.

**Found and fixed in review:**
1. **Diary state leaked through the screen picker.** Viewing an "after save" or "over" state changed Today for every later screen (Today showed 2,089 kcal behind Quick add). The picker now resets to the example day; taps inside the phone still carry a changed diary along, which is how the tap-through flows keep their numbers.
2. **Over-target example** is now a large dinner plus two evening snacks (1,073 + 337) instead of one 1,410 kcal dinner. Still exactly 2,830 kcal, "+180 kcal over".
3. **One cost model:** HK-2 now shows ≈ $0.007 for a photo and ≈ $0.002 for text, matching HK-6's list.
4. **"Snacks"** is used on Today too (Today said "Snack").
5. **The 1A "Set a target" link** was 44dp; `.link` is now 48dp everywhere.

**Decisions on the open questions:**

| # | Question | Decision |
|---|---|---|
| 1 | Target formula | Keep the 1A formula (ON-5). The brief's "× 1.55" was my error; the brief is corrected |
| 2 | Hide numbers hides per-meal and per-item kcal | Yes |
| 3 | HK-5 and the capsule nav | Keep the nav. An error ends the request, so leaving should be one tap; the input is kept either way |
| 4 | Today's macros 100 / 155 / 46 g | Accepted; one source for every screen matters more than the old example numbers |
| 5 | Cost model | Photo ≈ $0.007, text ≈ $0.002, labeled estimate, both screens |
| 6 | Meal presets | Accepted: breakfast before 10:30, lunch 10:30–15:00, snacks 15:00–17:00, dinner after 17:00 |
| 7 | Create-a-food mismatch rule | Accepted: warn above 20% difference; ask "Is that right?" above 2,000 g |
| 8 | Over-target example | Fixed (above) |
| 9 | "Snack" vs "Snacks" | "Snacks" everywhere |
| 10 | Date switcher | In the app, ‹ opens yesterday; EA-7 is reached from the History row. The prototype shortcut stays, labeled as a prototype limit |

**Carried forward (not fixed in 1C):** glass `border.strong` outlines measure below 3:1 over the brightest glows. This is a 1A style issue that affects 1A–1C controls; it's scheduled for a fix in 1D alongside the final accessibility pass.

**Verdict:** 1C is ready for the owner's review.

## Owner review asks

1. **Eat home:** is a 200px orb with the macro card and four meal cards the right density? The first meal is below the fold.
2. **Hiku result rows:** is "Sure" / "Check amount" clear enough, with no percentages? Is the "After saving" bar helpful or noise?
3. **Quick add:** are the five rows right, and is long-press on "Log a meal" acceptable given it has no visible hint?
4. **Safety-floor sheet:** is the tone calm enough, and is the "professional guidance" tick the right gate?
5. **Hide numbers** hiding item calories too (question 2).
6. **The HK-1 "Pending" note** ("Still being tested on your phone"): keep it visible until the device test passes?
7. **Decisions needed:** questions 1, 3, 4, 5 and 8 above.
