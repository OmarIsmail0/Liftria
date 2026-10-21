# Milestone 1B Review: Gym and workouts

**Date:** 2026-10-21 · **Reviewer:** Claude (self-review) + external review (ChatGPT) · **Status: conditionally approved; 1C may start.** Open conditions are listed at the end.

## Deliverables

| Deliverable | Location | Status |
|---|---|---|
| Train screens TR-1 … TR-13 in the clickable prototype, every state, dark and light, Aurora Rim and Solid | `prototype/liftria.html` (source `prototype/src/liftria.html`) | Done |
| Screen inventory (Train) | `SCREEN_INVENTORY.md` | Done |
| Screen specifications, including active-workout behavior | `SCREEN_SPECIFICATIONS.md` | Done |
| Flow 2 and flow 10 (workouts) | `USER_FLOWS.md` | Done |
| Train states, special cases and interactions | `INTERACTION_AND_STATES.md` | Done |
| 1B components and tokens (set row, stepper, rest orb, body map, sheets, mini bar…) | `DESIGN_SYSTEM.md` | Done |
| Accessibility for gym use, measured rest-orb contrast | `ACCESSIBILITY.md` | Done |
| Train hierarchy and focus-flow rule | `INFORMATION_ARCHITECTURE.md` | Done |

## Screen checklist

Legend: **PASS** = specified, in the prototype, states covered · **NEEDS REVISION** · **BLOCKED**.

| Screen | Visual | States | Dark / light | A11y | Offline | Privacy | Provenance / honesty | Result |
|---|---|---|---|---|---|---|---|---|
| TR-1 Train home | ✓ | populated, first time, in progress | ✓ | ✓ | ✓ no network used | n/a | ✓ | PASS |
| TR-2 Plans and templates | ✓ | populated (empty = first-time TR-1) | ✓ | ✓ | ✓ | n/a | n/a | PASS |
| TR-3 Template editor | ✓ | edit, new + validation | ✓ | ✓ | ✓ | n/a | n/a | PASS |
| TR-4 Exercise library | ✓ | browse, filtered, no results | ✓ | ✓ | ✓ bundled pack | n/a | ✓ data credit shown | PASS |
| TR-5 Muscle browser | ✓ | selected group | ✓ | ✓ chips as the accessible path | ✓ | n/a | ✓ original art | PASS |
| TR-6 Exercise detail | ✓ | with history, never logged | ✓ | ✓ chart text alternative | ✓ | n/a | ✓ est. 1RM labeled Estimate | PASS |
| TR-7 Workout preview | ✓ | — | ✓ | ✓ | ✓ | n/a | n/a | PASS |
| TR-8 Active workout | ✓ | logging, rest + Undo, notification ask, denied, discard, other exercise types, text 200% | ✓ | ✓ 64dp controls; 200% rendered | ✓ | ✓ scoped: "your workout data stays here" | ✓ suggested ≠ logged | PASS, pending a real gym test |
| TR-9 Lock-screen notification | ✓ | running, over | n/a (system UI) | ✓ | ✓ | ✓ | n/a | **BLOCKED** on a Phase 3 device spike (see concern 1) |
| TR-10 Finish summary | ✓ | records, no records | ✓ | ✓ | ✓ | n/a | ✓ HR and calories `pending`, no guessed burn | PASS |
| TR-11 History | ✓ | populated, empty, after delete + Undo | ✓ | ✓ | ✓ | n/a | n/a | PASS |
| TR-12 Session detail | ✓ | view, edit, delete confirmation | ✓ | ✓ | ✓ | n/a | ✓ names records that revert | PASS |
| TR-13 Records | ✓ | populated (empty = never-logged copy) | ✓ | ✓ | ✓ | n/a | ✓ Estimate chip | PASS |

## Cross-checks

| Check | Result | Notes |
|---|---|---|
| Whole flow works offline and without the watch | PASS | Train reads only local data; no screen depends on Health Connect or the network |
| Nothing unverified described as working | PASS | Watch workout HR and calories shown as `pending`; notifications marked pending device test |
| Exercise data and artwork licensing | PASS | free-exercise-db text only (Unlicense), credited; no images from it; body map drawn as original geometric shapes, not based on react-native-body-highlighter |
| Safety and tone | PASS | Neutral comparisons ("about the same"), no "worse"/"failed"; suggestions never change weights silently; est. 1RM framed as "a trend, not a test" |
| Destructive actions | PASS | Discard and delete have confirmation sheets with the safe choice as primary; deletes have an 8 s Undo |
| Data safety mid-workout | PASS (spec) | Every set saved on Log set; in-progress workout restored after an app kill |
| Contrast | PASS | Rest orb ≥ 8.57 dark / ≥ 11.14 light where text sits; other 1B colors reuse measured tokens |
| Touch targets ≥ 48dp | PASS | Automated check over every Train screen and state: no button under 48dp. It also found the 1A Today profile button at 40dp, now fixed |
| Prototype runtime | PASS | Every Train screen and state rendered in Chromium, dark and light: no script errors, no horizontal overflow |
| One-handed reach on the S22 Ultra | PASS | Log set, steppers, rest controls and Start are in the bottom dock; Finish (rare) is top-right |
| Mini bar collisions | PASS | Found and fixed: the mini bar overlapped the exercise-detail action, the session edit bar and the Undo snackbar |
| Font scaling 200% | PASS for TR-8, PARTIAL elsewhere | TR-8 rendered at 200% in both themes; the first render hid the current set and was fixed. Other Train screens are specified, not drawn |
| Muscle mapping | PASS (tested) | Body map redrawn so its 17 regions equal free-exercise-db's 17 categories; a rendered test checks the region set (17/17, none extra) |

## Technical concerns for Phase 3 (recorded, not solved)

1. **Rest timer with the screen off.**
   - Android 13+ needs the `POST_NOTIFICATIONS` runtime permission, which isn't in the Phase 0 manifest.
   - Android 14 denies `SCHEDULE_EXACT_ALARM` to new apps by default.
   - The `shortService` foreground-service type is limited to about 3 minutes, so it can't cover long rests or a whole workout.
   - Other candidates: another foreground-service type, `USE_EXACT_ALARM` (restricted use), or an inexact scheduled notification.
   - **Decided now:** the in-app timer runs from a stored deadline and is always correct. The screen-off alert is an enhancement with a stated reliability contract (SCREEN_SPECIFICATIONS, TR-8 rules 6–7).
   - **Spike test matrix** on the S22: notifications allowed or denied × screen locked × Doze × process killed × rests of 1, 3 and 5 minutes. Measure the delay of the 0:00 alert.
   - TR-9 stays BLOCKED until then.
2. **Keep screen on** during TR-8 needs `expo-keep-awake` (a new dependency, Phase 3). It prevents sleep while TR-8 is visible; it does **not** solve alert delivery with the screen off.
3. **Exercise pack:** free-exercise-db describes 800+ exercises under the Unlicense. Confirm the exact count and schema at import, and keep the 17-category ↔ 17-region test as a unit test. Bundle size target: under 2 MB of JSON. Exercise IDs are stable (see the workout data contract).
4. **Record recalculation** after edit or delete should be incremental per exercise, not a full-history rescan.
5. **Units:** store weights in kg with full precision; convert only for display.

## External review (ChatGPT, 2026-10-21) and response

**Verdict received:** conditional approval. Approve the visual direction, the 13-screen scope, plans and templates, the active-workout concept (with real-use testing) and the rest orb. Keep TR-9 blocked. Require a 200% follow-up. Clarify data semantics before implementation. Start 1C.

| Point raised | Agree? | What changed |
|---|---|---|
| Rest timer: `shortService` is ~3 min; define a fallback and a reliability contract; test denial, Doze, lock, process death | Yes | Deadline-based in-app timer (always right, survives process death); screen-off alert labeled `pending` in the UI and never promised; spike test matrix above |
| Logging edge cases: warm-ups, body weight, assisted, unilateral, per-hand dumbbells | Yes | Exercise-type table and set kinds in the spec; new prototype state "Other exercise types"; warm-up row in the main example |
| Undo for an accidental set; never log a prefilled value by accident | Yes, with one difference | One-tap logging of last time's values stays: it's the main speed win. It's guarded instead: suggested values look different, nothing logs itself, future rows have no tick, every log gets an immediate Undo, and logged sets can be corrected |
| Stable exercise IDs, immutable sessions, manual vs. imported vs. estimate, no double counting | Yes | New "Workout data contract" in SCREEN_SPECIFICATIONS |
| Render and test 200% for TR-8 | Yes | Rendered in both themes; the render found and fixed a real layout problem |
| No app-wide privacy promise like "nothing is sent anywhere" | Yes | Notification copy now says only that the notification is made on the phone and workout data stays there; Hiku's network use stays explicit elsewhere |
| Map 17 muscle categories to the body map explicitly and test it | Yes, and it found a real flaw | The old map had front/rear delts and obliques, which the data can't populate. Redrawn to 17 regions = 17 categories, with a rendered test |
| `expo-keep-awake` doesn't solve screen-off alerts | Yes | Noted in concern 2 |
| Answers: keep the orb, with native styling on the lock screen; weekly + rotation plans are enough for V1 | Adopted | No change needed; TR-9 already uses the native notification style |

## Open conditions (carried forward)

1. **TR-9 device spike** (Phase 3) before the screen-off alert design is final.
2. **A real one-handed gym session** with the Phase 3 build: log a full workout and judge speed. The prototype can't prove this.
3. **200% for the remaining Train screens**, drawn when Phase 3 builds them.
4. **1C must integrate with Train and Today, not sit beside them.** At least:
   - training-day context available to Eat and Hiku (opt-in)
   - Today's deck reflects both meals and workouts
   - one shared Quick add

## Owner review asks (answered)

1. Active workout speed: **approved in design**; to be proven in a real session (open condition 2).
2. Rest timer: **orb**, with native styling on the lock screen.
3. Plans: **weekly + rotation is enough for V1.**
4. Before 1C: the changes above; 1C starts with the integration condition (open condition 4).
