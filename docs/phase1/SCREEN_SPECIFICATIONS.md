# Screen Specifications

**Milestone:** 1A · Screen IDs match [SCREEN_INVENTORY.md](SCREEN_INVENTORY.md). The prototype shows each screen; this file covers what the prototype can't: rules, validation, edge cases and data sources.

---

## Onboarding (ON-1 … ON-9)

**Shared rules**
- Full-screen focus flow: no bottom navigation. A step indicator shows "Step n of 8". Back is at top-left; Skip is at top-right on optional steps.
- The primary action is pinned to the bottom (thumb zone) and never scrolls off-screen. Content scrolls above it.
- Progress is saved after each step. If the app is killed mid-onboarding, it resumes at the same step.
- Everything entered can be changed later in Settings. Onboarding never blocks the app on an optional integration.

### ON-3 Profile, validation

| Field | Rule | Error copy |
|---|---|---|
| Age | 16–100 | "Enter an age between 16 and 100." |
| Height | 120–230 cm (4'0"–7'6") | "That height looks off. Check the unit." |
| Weight | 35–300 kg (77–660 lb) | "That weight looks off. Check the unit." |
| Sex for formula | Male / Female / Prefer not to say | With "Prefer not to say", the formula averages the two constants and the target shows "Estimate, less precise". |
| Name | optional, ≤ 30 chars | — |

Skipping ON-3 skips ON-5's calculation. Today then shows "No target yet · Set target" (state: no calorie target).

### ON-5 Estimated target, calculation and guardrails

- `BMR = 10·kg + 6.25·cm − 5·age + s`, where s = +5 (male), −161 (female), −78 (average).
- Activity factor: Mostly sitting 1.2 · On my feet some 1.375 · Active job or daily training 1.55.
- Goal adjustment: Lose −15% · Maintain 0 · Build +10%.
- Macros: protein 2.0 g/kg (lose and build) or 1.6 g/kg (maintain); fat 25% of kcal; carbs take the remainder. Values are rounded to 50 kcal and 5 g.
- **Safety floor:**
  - If the result is under 1,200 kcal, or "Set my own numbers" asks for more than a 25% deficit from the estimate, show an inline warning: "This is lower than Liftria recommends without guidance from a professional." The user may proceed, but Today will never praise going lower.
  - A target below 1,000 kcal can't be saved.
- The result is always labeled **Estimate**, with a one-line explanation of the inputs. Watch data never changes it until Daily calories = READY (Phase 0 verdict).

### ON-6 Health Connect
- The CTA opens the Android Health Connect permission screen for the 10 read types plus history (a separate request).
- **Return states:**
  - all granted: continue
  - some granted: continue, listing what's affected ("Heart rate not allowed: workout heart rate won't show")
  - none granted: continue, Today shows TD-5
  - Health Connect missing or outdated: "Update Health Connect" with a Play Store link, plus "Not now"
- Liftria **never** requests write permissions.

### ON-7 Galaxy Watch guidance
- Informational only; Liftria can't change Samsung Health settings.
- **"Sync starts today":** Samsung Health shares only new data after the connection, so the first watch readings appear within minutes and history does not appear.
- Done goes to ON-8. The full troubleshooting flow is in 1D.

### ON-8 Hiku API key
- A masked password field with a paste button. Format check: `sk-ant-` plus at least 12 characters. A malformed key shows "That doesn't look like an Anthropic API key".
- **Saving** stores the key in Android secure storage (Keystore-backed). It never goes in the database, logs or exported reports.
- **Online:** after saving, an optional "Test key" sends a tiny request and shows ✓ or the exact error (invalid, revoked, rate limit). Offline: "Saved. We'll check it next time you're online."
- Cost note: "You pay Anthropic directly. Set a spending limit in the Anthropic Console."

---

## Today (TD-1 … TD-7): Pulse Orb

**Layout (top to bottom):** header (date, greeting, profile button) → offline banner → **Pulse Orb** (calories) → target line with Estimate chip → macro row → actions (Log a meal, Photo) → **deck** of swipeable cards: Getting started (first day only) · Training · Activity · Hiku · Meals today → capsule navigation.

Nutrition is no longer a card: the orb, target line and macro row above the deck *are* the Nutrition summary, and tapping them opens the Eat diary. "This week" moves to Progress (1D); Today stays about today.

| Card | Data source | Empty state | Rules |
|---|---|---|---|
| Header | Device clock, profile name | "Good morning/afternoon/evening"; "Welcome to Liftria" on first day | The profile button opens Settings. |
| Nutrition (orb) | Local diary (Phase 4), target (local estimate or manual) | Empty glass orb, "0 kcal eaten", "Your first meal lights it up." | Target chip always "Estimate" or "Your target". Over target: "+180 kcal over", same honey color. No target (TD-7): no ring, "kcal eaten", "No target yet · Set a target", macros in grams with no `/target`. Hide-numbers setting replaces values with progress words. |
| Training | Templates and plan (Phase 3) | "Start empty workout" + Templates | Shows the planned or last workout. An unfinished workout shows "Resume" instead. |
| Activity | Health Connect | Not connected: "Connect Health Connect"; HC off: TD-5 banner | Steps: one row per origin (phone / Samsung Health); the watch source isn't assumed. HR: latest value + source chip + pending chip until verified. Energy: one figure only if measured; otherwise the "No measured source" text. The HC estimate is never shown here. |
| Hiku | Key presence, connectivity | No key: TD-4; offline: TD-3 | The suggestion is context-free in V1 (e.g. "Dinner still open" uses only local diary state, no AI call). |
| Meals today | Local diary | "Nothing logged yet" + Log a meal | One row per meal with kcal; unlogged meals say "not logged yet". |

**Refresh:** pull to refresh re-reads Health Connect and shows "Updated just now". Health Connect is also read on app foreground at most every 15 minutes. Local data always reflects the latest change instantly.

**Quick add** (from "Log a meal" or a long-press on the Today tab): a bottom sheet with Log meal · Photo meal (Hiku) · Start workout · Log weight. Designed fully in 1C/1B.

## Train (TR-1 … TR-13)

**Shared rules**
- **Units:** kg by default (lb in Settings, 1D). Weight steps are 2.5 kg for barbell and machine, 2 kg for dumbbells, 1.25 kg when the user turns on "small plates". Reps step by 1.
- **Exercise types:** each exercise has one type, which decides what the kg column means. The prototype's "Other exercise types" state shows all four.

  | Type | kg column | Volume | Records |
  |---|---|---|---|
  | Weighted (barbell, machine, cable) | total load | weight × reps | heaviest, best est. 1RM, most reps at a weight |
  | Dumbbell / per hand | **kg each** (one dumbbell) | weight × 2 × reps | as weighted, on the per-dumbbell weight |
  | Assisted (machine or band) | **assist kg**, shown as −25 | excluded | **lowest** assistance at a rep count |
  | Body weight | "BW" or **+ added kg** | added weight × reps only | most reps; heaviest added weight |

  **Unilateral** is a flag on top of any type: each set has L and R rows, each side keeps its own records, and the set counts once toward the set total.
- **Set kinds:** working (default) and **warm-up**. Warm-ups are labeled "W" in honey, sit before set 1, and are excluded from records, volume and the "sets" count. A set's kind can be changed from the exercise menu.
- **Volume** = Σ volume of completed working sets, per the table above. Volume is a training-load signal, not a score.
- **Estimated 1RM** uses the Epley formula, `weight × (1 + reps / 30)`, from the best completed set per session, and only for sets of 1–12 reps. It always carries the `estimate` chip and the words "a trend, not a test".
- **Records** are recalculated from history whenever a session is edited or deleted. Types:
  - heaviest weight
  - best estimated 1RM
  - most reps at a given weight
  - best session volume per exercise

  Records come from completed sets only.
- **Exercise data:** names, muscles and instructions come from the bundled free-exercise-db pack (Unlicense). No images from it are used. Every illustration is Liftria's own geometric body map (DESIGN_SYSTEM §5).
- **Custom exercises** have a name, equipment, primary and secondary muscles, and a weight or body-weight type. They behave like built-in exercises everywhere.
- **No watch dependency:** nothing in Train reads Health Connect. Heart rate and calories from the watch are not shown (Pending; Phase 0 hasn't verified watch workouts).

| Screen | Layout (top → bottom) | Rules |
|---|---|---|
| TR-1 Train home | Header (Train, search) → hero → shortcut chips → This week → Recent → offline note | Hero priority: **in-progress workout** (Resume / Discard) > **plan's next template** (Start / Edit) > **first time** (Start empty / Build a template, plus two starter templates). This week marks each day as done, today, planned or rest; the plan never blocks training on another day. |
| TR-2 Plans and templates | Active plan by weekday → templates list | Plan types in V1: weekly (weekday-based) and rotation (next in order). Changing a plan never changes history. |
| TR-3 Template editor | Name → exercises (drag handle, glyph, sets × reps, rest, options) → Add exercise → default rest → notes → Delete template | Save requires a name and at least one exercise. Until then Save is disabled and a hint explains why. Deleting a template keeps logged workouts. Back with unsaved changes asks "Discard changes?". Rep targets can be a range ("6–8"). |
| TR-4 Exercise library | Search → chips (Muscles, All, groups) → Recent → A–Z | Search is local, prefix and fuzzy, and matches names and common aliases ("OHP"). No results offers "Create '<query>'". The data-source credit is always at the bottom. |
| TR-5 Muscle browser | Front/back map → group chips → exercises for the group | Tapping a region and tapping its chip do the same thing; chips are the accessible path. |
| TR-6 Exercise detail | Body map + legend → Add to a workout → Your best (3 stats, chart, estimate note) → Recent sessions → How to | Never logged: "Your progress" explains that records and the chart start after the first session. The chart needs at least 2 sessions; with only 1 it shows the single value. "Add to a workout" adds to the in-progress workout if there is one, otherwise it asks which template. |
| TR-7 Workout preview | Title + meta → muscles map → exercise list with last time → Start workout (bottom) | One extra tap before starting prevents accidental starts from Today. The capsule nav is hidden. |
| TR-8 Active workout | Top bar (minimize, name, elapsed, sets done, Finish) → progress bar → exercise rail → current exercise card (sets table) → up next → bottom dock (kg stepper, reps stepper, **Log set n**) | See "Active workout behavior" below. |
| TR-9 Rest notification | System lock screen with Liftria's ongoing notification | Content: "Rest · 0:42 left", the next set, a progress bar, and +30 s / Skip. At 0:00: "Rest over · time for set 4", a short vibration, and sound per the phone's mode. Tapping it opens TR-8. |
| TR-10 Finish summary | Done mark → stats (duration, sets, volume) with a neutral comparison → records card (honey rim) → HR and calories `pending` → notes → Save workout / Back to workout | Comparisons are neutral: "+4%" or "about the same", never "worse". With no records: "No new records today. Consistent sessions are what move them." Empty sets (no reps) are dropped on save, and the summary says how many. |
| TR-11 History | Month stats → sessions newest first with PR badges | Empty: explanation + Start a workout. After a delete: snackbar "… deleted. Records updated." + **Undo** (8 s). |
| TR-12 Session detail | Header (name, date, start, duration, edit) → stats → exercises with sets and record markers → Delete workout | Edit mode: an "Editing" banner, inline kg/reps inputs, remove set, add set, and Save changes / Cancel in a bottom bar. The capsule nav is hidden. Delete shows a confirmation sheet naming any records that will change. |
| TR-13 Records | Explanation → one row per exercise (best set, est. 1RM, date) → estimate note | Sorted by most recent record. Tapping opens TR-6. |

### Active workout behavior (TR-8)

1. **Prefill is a suggestion, never data.**
   - Each unlogged set shows last time's weight and reps in the *suggested* style: tertiary color and italic, with a one-line key under the table.
   - They become data only when the user taps **Log set** or the current row's tick. Nothing is logged automatically: not by the timer, not by Finish (untouched sets are dropped), and not by leaving the screen.
   - If last time hit the top of the rep range on every set, the weight is suggested +1 step and labeled "Suggested +2.5 kg".
2. **Log set** saves the set immediately to SQLite (it survives an app kill or reboot), ticks the row, gives a light haptic, moves to the next set and starts the rest timer.
3. **Only the current row has a tick.** Future rows have none, so a stray tap can't log a set ahead.
   - **Undo right away:** the rest sheet opens with "Set 3 logged · 72.5 kg × 8 · **Undo**". Undo removes the set and returns to it.
   - **Undo later:** tapping a logged row's tick asks "Undo this set?" inline.
   - **Correcting a logged set:** tapping its numbers loads them into the steppers under an "Editing set 2" label, with Save and Cancel instead of Log set.
   - After Finish, sets change only through TR-12's edit mode.
4. **Steppers** are 64dp tall. Long-press repeats. Tapping the number opens a numeric keypad for direct entry.
5. **Exercise rail:**
   - Tap to switch exercise (supersets: switching mid-rest is fine).
   - The rail order can be changed from the exercise menu.
   - The menu also offers notes, replace exercise, and history.
6. **Rest timer:**
   - **Contract: it counts down from a stored deadline** (the absolute end time, saved with the set). The time left is always deadline − now, so the in-app timer is correct after a screen lock, Doze, a process kill or a reboot. If the deadline is still in the future when Liftria reopens, the timer resumes; if it has passed, it shows "Rest over".
   - Starts automatically with the exercise's rest time (template default, 2:00 if none).
   - Shows as a bottom sheet with the **rest orb**: the Pulse Orb in training colors, a countdown ring, −15 s / +15 s / Skip rest, and the next set.
   - Dismissing the sheet keeps the timer running in the top bar.
7. **Screen off / app in background (enhancement, not a guarantee):**
   - An ongoing notification (TR-9) shows the countdown and tries to alert at 0:00.
   - Until the Phase 3 device spike proves on-time delivery under Doze and screen lock, the UI says so ("Lock-screen alert at 0:00 is being tested on your phone", `pending` chip). It never promises an exact alert.
   - The in-app timer (rule 6) is the reliable path.
8. **Notification permission:**
   - Asked **in context, at the first rest**, with an in-app explanation (TR-8 "Notification ask"), then the Android dialog.
   - If denied: a one-line banner in the dock ("…can only alert you inside the app. Turn on"). Logging is never blocked.
9. **Minimize** (chevron or system back) returns to the previous screen and shows the **mini bar** ("Upper A · 23:10 · 9 of 22 sets · Resume") above the capsule nav on every tab.
10. **Finish** goes to TR-10. Unfinished sets prompt: "3 sets have no reps. Finish anyway?" (they're dropped).
11. **Discard** is on TR-1's in-progress hero and at the bottom of the Finish summary ("Discard workout"); it's kept off the active screen so it can't be hit mid-set. Its confirmation sheet names the number of logged sets. **Keep training** is the default (primary) button.
12. **Screen stays on** while TR-8 is visible (it can be turned off in Settings).

### Workout data contract (for Phase 3, and for Today, Eat and Health later)

1. **Stable IDs:**
   - Built-in exercises keep their free-exercise-db `id` string forever.
   - Custom exercises get a UUID.
   - Renaming changes the display name, never the ID.
   - If the pack updates and drops an exercise, it stays in the database as "retired", so history never loses its exercise.
2. **Sessions are append-only in practice:** a finished session changes only through TR-12's explicit edit or delete. Each edit stores `edited_at`. Records are derived data, recalculated from sets, and never edited directly.
3. **Every workout has a `source`:**
   - `manual`: logged in Liftria. The only source in V1.
   - `imported`: a Health Connect `ExerciseSession`, for example from the watch. Pending verification.
   - `estimate`: anything Liftria calculates, such as est. 1RM. Never stored as a measurement.
4. **No double counting:** when an imported session overlaps a manual Liftria workout in time (≥ 50% overlap), they're **linked, not added**.
   - The Liftria workout owns the sets.
   - The import may add only measured heart rate and duration, labeled with its source.
   - Totals (sessions per week, minutes) count the pair once.
5. **Energy:** Liftria doesn't estimate calories from sets. Workout energy appears only if a measured `ActiveCaloriesBurned` record exists for that session's window, and it follows the one-figure energy rule (DESIGN_SYSTEM §6).
6. **What other tabs may read:**
   - Today: today's planned or finished workout (name, done or not).
   - Eat (1C): whether today is a training day, as context for Hiku only if the user allows it.
   - Progress (1D): sessions, volume, records.
   - None of them may write workout data.
