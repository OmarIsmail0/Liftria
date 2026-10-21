# Milestone 1B Review: Gym and workouts

**Date:** 2026-10-21 · **Reviewer:** Claude (self-review; **owner sign-off pending**)

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
| TR-8 Active workout | ✓ | logging, rest, notification ask, denied, discard | ✓ | ✓ 64dp controls | ✓ | ✓ "nothing is sent anywhere" | n/a | PASS |
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
| Font scaling 200% | PARTIAL | Set-table and stepper reflow is specified, not drawn |

## Technical concerns for Phase 3 (recorded, not solved)

1. **Rest timer with the screen off.**
   - Android 13+ needs the `POST_NOTIFICATIONS` runtime permission, which isn't in the Phase 0 manifest.
   - Android 14 denies `SCHEDULE_EXACT_ALARM` to new apps by default. The ways to get a reliable alert at 0:00 under Doze are a short foreground service with an ongoing notification, `USE_EXACT_ALARM` (restricted use), or an inexact scheduled notification.
   - Each needs a spike on the S22 Ultra before the design is final. TR-9 is BLOCKED until then.
2. **Keep screen on** during TR-8 needs `expo-keep-awake` (a new dependency, Phase 3).
3. **Exercise pack:** confirm the free-exercise-db exercise count, schema and muscle names, and map them to Liftria's 15 body-map regions. Bundle size target: under 2 MB of JSON.
4. **Record recalculation** after edit or delete should be incremental per exercise, not a full-history rescan.
5. **Units:** store weights in kg with full precision; convert only for display.

## Owner review asks

1. Does the **active workout** feel fast enough? One tap logs a set when it matches last time.
2. **Rest timer as an orb** (matches Today), or a plain countdown bar?
3. **Plans:** weekly plan + rotation enough for V1?
4. Anything to change before **1C (Nutrition and Hiku)** starts?
