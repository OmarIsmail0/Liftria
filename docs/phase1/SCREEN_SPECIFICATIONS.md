# Screen Specifications

**Milestone:** 1A, 1B, 1C · Screen IDs match [SCREEN_INVENTORY.md](SCREEN_INVENTORY.md). The prototype shows each screen; this file covers what the prototype can't: rules, validation, edge cases and data sources.

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

### ON-7 Watch guidance
- **Update (2026-10-22, any Android phone):** the screen is generic. "Which app does your watch use?" offers Samsung Health, Fitbit, Garmin Connect, Pixel Watch (Fitbit), Other, and "I don't use a watch" (skips). The steps then name that app. Samsung Health is the verified example; the others are **Pending** until someone tests them.
- Informational only; Liftria can't change another app's settings.
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

**Quick add** (a long-press on "Log a meal" or on the Today tab): the shared bottom sheet QA-1, designed in 1C (see below). Tapping "Log a meal" opens Add food (EA-2) directly.

**1C integration:** the orb, the target line, the macro row and the Meals today card all read the same diary total as Eat (one source). Meals logged in Eat show on Today at once. The Meals today card's "Dinner, not logged yet" row has an **Add** link to EA-2 (dinner). "Photo" opens HK-2 (before sending). Nothing else on Today changed in 1C.

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

---

## Eat (EA-1 … EA-7, QA-1) (1C)

**Shared rules**
- **One number, one source.** Today's orb, Eat's orb, every meal total and Hiku's "After saving" preview read the same diary. The example day: **Breakfast 520 + Lunch 680 + Snacks 220 = 1,420 kcal**, target 2,650 (Estimate), dinner not logged. A saved Hiku dinner of 624 kcal makes it **2,044**.
- **Rounding.** Each item's kcal is rounded to a whole number; a meal is the sum of its rounded items; the day is the sum of its meals, so any total can be checked by adding the rows above it. Macros are summed unrounded and shown to the whole gram (to 0.1 g in the portion picker).
- **Not logged is not zero.** A meal with no items reads "Not logged yet", never "0 kcal". Days with nothing logged are left out of averages and drawn as a dashed outline with "—", never as a zero bar. Averages say how many days they cover ("5 of 7 days logged").
- **Calm food language.** No "bad", "cheat", "junk" or "over budget", no red for eating, no shame copy. Over target is honey: the orb keeps its palette, the ring stays full, and the label reads "180 kcal over" (and "+180 kcal over" on the line below). Delete buttons are the only red on these screens, because they are destructive actions.
- **Food data.** Foods come from a **bundled USDA FoodData Central pack that works offline**. Values are per 100 g. **Grams are the canonical unit in storage;** household units (cup, piece, serving) come from the pack's portion list, and a custom unit isn't in V1. There is no barcode scanner in V1 (Open Food Facts is a possible later add-on).
- **Source chips** (always icon + text) mark where every number came from:

  | Source | Chip | Meaning |
  |---|---|---|
  | USDA FoodData Central | `measured` style, "USDA" | From the bundled pack |
  | Created by the user | `phone` style, "My food" | Typed in by the user, saved on the phone |
  | Hiku | `chip-hiku`, sparkle, "Hiku estimate" | Proposed by Hiku and confirmed by the user |
  | Quick add | `estimate` style, dashed, "Calories only" | A calorie number with no macros |

- **Training is context only.** EA-1 shows "Training day · Upper A" as a read-only chip. Training **never adds calories** to the target: Liftria has no measured energy source (Phase 0), so the target doesn't auto-adjust until Daily calories is READY. Nutrition never writes workout data, and Train never writes nutrition data.
- **Hide numbers** (set in EA-6) applies to **Today, Eat home and History**. The orb shows "On track" or "A bit over" instead of a number, macro bars show without values, and meal and item calories are hidden (an item count is shown instead). A "Show numbers" link is always in reach. EA-6 itself always shows numbers, because you are there to change them. The ring still shows progress.
- **Meal preset.** Opening Add food from Today's "Log a meal" or Quick add presets the meal by time of day: **dinner after 17:00** (from the brief). The other cut-offs are a proposal: breakfast before 10:30, lunch 10:30–15:00, snacks 15:00–17:00. The user can change the meal with the selector chip.
- **Undo.** Adding with "+" and deleting both show a snackbar with Undo: 4 s for an add, 8 s for a delete. A whole-day clear isn't in V1.

| Screen | Layout (top → bottom) | Rules |
|---|---|---|
| EA-1 Eat home | Header (Eat, Quick add "+") → date switcher → orb → Estimate line → training-day chip → macro card → four meal cards (Breakfast, Lunch, Dinner, Snacks) → History and Targets rows | **Populated:** orb "1,230 kcal left", "1,420 eaten of 2,650". **First day:** empty glass orb, "0 kcal eaten", macros replaced by one sentence, four meals "Not logged yet". **Over:** "2,830 eaten", orb "180 kcal over". **No target:** no ring, "kcal eaten", macros as grams with no target, "Set a target" link. **Hidden:** words and bars only, "Show numbers" link. The date switcher's earlier-day arrow opens the week view; the next-day arrow is disabled on today. Meal cards have a honey rim, a total or "Not logged yet", an Add button (48dp) and one row per item; tapping an item opens EA-4. After an add, a delete or a Hiku save the screen shows an Undo snackbar. |
| EA-2 Add food | Back + title → meal selector chip → search → Photo and Describe (lavender) → Recents / Favorites / My foods → rows → Quick add calories and Create a food | The capsule nav stays (it's a browse screen). Each row: name, portion and kcal, source chip, and a 48dp "+" that adds the **last-used portion** to the selected meal at once, with a 4 s Undo snackbar. Tapping the row opens EA-3. Search is local and offline; results show per-100 g kcal. **No results:** "Not in the food pack" with Create a food, Quick add calories and Describe it to Hiku. **Offline:** Hiku buttons disabled with "Needs internet"; everything else works. |
| EA-3 Portion picker | Back → food name + source chip → unit control (g, cup, piece, serving) → amount stepper → "stored in grams" line → result card (kcal, P/C/F, per-100 g) → meal selector → dock (Add to \<meal\>) | Focus screen: no capsule nav. The amount stepper is 64dp with 52dp buttons; tapping the number opens a keypad. Changing unit converts the shown amount; the stored amount stays in grams. Example: Greek yogurt, plain, nonfat · 170 g = **100 kcal, P 17.3 / C 6.1 / F 0.7**. At 200% text the unit control becomes two rows, the result card wraps, and the dock stays visible. |
| EA-4 Meal detail | Back + meal name → kcal and macros card → item rows → Add item → Move to another meal → Delete meal | One item row per food with portion, kcal and source chip. **Editing:** tapping a row expands it in place with a gram stepper, **Remove item** and **Done**; the meal total updates live and shows "was 680". **Delete:** a confirmation sheet ("Delete lunch? 4 items, 680 kcal. You can undo for 8 s.") with **Keep** as the primary button; Delete returns to EA-1 with an 8 s Undo. |
| EA-5 Create a food | Back + title → name → brand (optional) → serving g → kcal → protein, carbs, fat → hint → dock | **Name is required;** until it's there Save is disabled and a hint says so. **Mismatch check:** if the kcal differs from 4·P + 4·C + 9·F by more than 20%, show "Calories and macros don't match (macros add up to ~260 kcal). Check the label." Save is still allowed (**Save anyway**); labels can be rounded. **Quick add** variant: name (optional) + calories, with the "Calories only" chip; it counts toward calories, not macros. |
| EA-6 Targets | Back + title → target card → macro split → hide-numbers switch → (dock: Save target when editing) | **Estimate:** 2,650 kcal with the Estimate chip. How it's calculated: Mifflin-St Jeor (about 1,740 kcal at rest) × 1.375 ("On my feet some") + 10% to build muscle, rounded to 50 kcal. Macro split P 155 g (23%) / C 340 g (51%) / F 75 g (25%), each editable in 1% steps; grams follow the calories (4, 4 and 9 kcal per gram). **Your own target** carries the "Your target" chip. **Safety floor:** a target under **1,200 kcal**, or a deficit of more than **25%** below the estimate, opens a calm sheet: "That's below 1,200 kcal a day" (or "…a deficit of about 28%") with a plain reason, **Use 1,200** (or the 25% value) as the primary button, and **Keep …** as secondary. Keep is disabled until the user ticks "I'm doing this with professional guidance". A target under 1,000 kcal can't be saved. Liftria never changes the target by itself. |
| EA-7 History and trends | Back + title → week card (averages, chart, target line) → per-day list | Last 7 days, bars in honey against a dashed target line. **Unlogged days are dashed outlines with "—", not zero bars.** Headline: "avg 2,210 kcal · 5 of 7 days logged" (logged days only); protein average on logged days. Tapping a day opens that day in EA-1. **Empty:** "Log a few days to see trends." The chart has a text alternative that states every day, and the list under it repeats the values. |
| QA-1 Quick add | Bottom sheet over the screen it was opened from | Five rows (icon tile, label, one-line hint): **Log a meal**, **Photo a meal** (Hiku), **Describe a meal** (Hiku), **Start workout**, **Log weight** (disabled: "Coming in Progress, 1D"). The Hiku rows are disabled with a reason when offline ("Needs internet") or there is no key ("Add your API key first"). Opened from Eat's "+", a long-press on Today's "Log a meal", or a long-press on the Today tab. Scrim tap or Close dismisses it. |

### Eat data contract (for Phase 4, and for Today and Progress later)

1. **Diary items** store `food_id` (or a user food id), `grams`, `kcal` and macros as computed at save time, `meal`, `logged_at` and a **`source`**: `usda`, `my-food`, `hiku-estimate` or `quick-add`. Quick-add items have kcal only and no macros.
2. **Pack data is not copied into the diary** beyond what's needed to show history: if the pack is updated, saved entries keep the numbers they were logged with.
3. **Hiku items** keep the **original estimate alongside the user's edits**, so trends can later show how often estimates were corrected. No photo is stored unless the user turns on "Keep photos" (default off, 1D Settings).
4. **What other tabs may read:** Today reads the day total, macros and meal totals. Progress (1D) reads daily totals and logged-day flags. Hiku reads the diary only through the opt-in "Today's totals" switch. Eat reads whether today is a training day, for the read-only chip. None of them may write to the other domain.

---

## Hiku (HK-1 … HK-6) (1C)

**Shared rules**
- **AI proposes, you decide.** Nothing Hiku returns is saved until the user taps **Save to \<meal\>**. Every item can be edited or removed, and totals update live. Results carry the `estimate` chip and "Check before saving." Hiku never claims perfect recognition, never diagnoses, and never fills in data it didn't return.
- **Honest status.** A Hiku request is **Pending device test**: Phase 0 proved key storage and the offline failure on the S22, but not a real Claude request. HK-1 says so ("Pending · Still being tested on your phone"). **Chat is Future** and is only a marker.
- **Feature-scoped privacy.** The food diary stays on the phone. A request sends only the photo or text the user chose, plus any context they allowed, to Anthropic's Claude API with the user's own key, and **only when they tap Send**. The Phase 1 prototype never names a model.
- **Confidence is words, never a percentage:** "Sure" (plain secondary text), "Check amount" and "Guess" (the `stale` chip style, warning tint). Never red.
- **Offline and no key** are states of HK-1 (and disable the Hiku rows in EA-2 and QA-1), not dead ends: each offers "Log manually".

| Screen | Layout (top → bottom) | Rules |
|---|---|---|
| HK-1 Hiku home | Header (Hiku, Usage) → hero (Estimate a meal: Photo, Describe, Pending note) → Recent → Chat card → usage line | **Ready:** as listed. **No key:** explains Hiku and offers Add API key (Settings, 1D stub) and "Log a meal manually"; the Photo and Describe buttons are not shown. **Offline:** banner, disabled buttons, "Hiku needs internet. Log manually meanwhile." and Log manually. **First time:** a three-step "How Hiku works" card (Send, Check, Save) replaces Recent. Recent rows show saved or discarded. The Chat card is a `pending` marker, not a button. The usage line reads "This month ≈ $0.42 · 61 requests" with an Estimate chip. |
| HK-2 Before sending | Back + title → the input (plate placeholder and note, or a multiline field) → "What's sent" panel → dock (Send to Hiku) | Focus screen. **Photo:** the photo is resized on the phone before upload (Phase 4). **What's sent:** the photo or text (always), plus two switches, **Today's totals** (adds "1,420 kcal eaten, 2,650 target") and **Training day** (adds "today is Upper A"). **Both switches reset to off for every request** unless the user changes the defaults in HK-6. Shows "Estimated cost ≈ $0.007" (photo) or "≈ $0.002" (text) with an Estimate chip, the same model as HK-6, and the privacy line: "Sent to Anthropic's Claude API with your key, only when you tap Send. Not stored by Liftria anywhere but this phone." |
| HK-3 Analyzing | Shimmering plate (or the text) → status → dock (Cancel) | Focus screen. **Cancel is always visible.** Cancel aborts the request, returns to HK-2 with the input intact, and says it may still be billed. After **10 s**: "Still working… This can take up to 45 s." The shimmer is static under reduced motion. |
| HK-4 Result review | Back + "Dinner · Hiku estimate" → chips and note → item card with total and macros → Add item → "After saving" preview → "Describe instead" link → dock (Save to Dinner, Discard) | Focus screen. Items: **Chicken breast, roasted · 150 g · 248 kcal · Sure; White rice, cooked · 200 g · 260 · Sure; Broccoli, steamed · 80 g · 28 · Sure; Olive oil · 10 g · 88 · Check amount.** Total **624 kcal, P 54 / C 62 / F 16**. "After saving: Today 2,044 of 2,650 kcal", drawn as a two-segment bar. **Editing:** tapping a row expands it with a gram stepper, Remove and Done; the olive oil at 15 g makes the total **669 kcal** (P 54 / C 62 / F 21) and "After saving" **2,089**, with "Hiku said 624" kept visible. **Discard** asks only if something was edited ("You changed 1 item. Nothing from this estimate has been saved." with Keep editing as the primary button). At 200% text the rows wrap to two lines (name, then grams, kcal and confidence). |
| HK-5 Errors | One card in place of the result | Each card has a title, one sentence of cause, a **"what was kept"** line ("Your photo is still here. Nothing was saved."), and actions. The capsule nav stays visible (see the open question on focus). **No partial result is ever shown as complete.** Cases are in INTERACTION_AND_STATES. |
| HK-6 Usage and privacy | Back + title → month card with per-request list → context defaults → what is never sent → API key link | The monthly figure and every per-request cost are labeled **Estimate**: "Prices come from Anthropic's published rates; your Anthropic console shows the exact bill." A cancelled request **may still be billed**, and the list says so. Context defaults (both off) can be changed here. "What is never sent": the diary and history, Health Connect and heart-rate data, workouts, records and body measurements, and the profile, unless a switch is on for one request. |

### Hiku request behavior

1. **One request = one image or text, plus the opt-in context.** No conversation history is sent in V1.
2. **Timing:** progress appears after 300 ms; "Still working" at **10 s**; the request times out at **45 s**; **Cancel** aborts it at any time.
3. **Result parsing:** the response must be valid structured JSON that matches the schema (items with name, grams, kcal, protein, carbs, fat, confidence; a meal name). If it isn't, show the **cut-off** or **refusal** state. **Never guess-fill** a missing or invalid field.
4. **Saving** creates diary items with `source = hiku-estimate`, keeps the original estimate beside the user's edits, and stores **no photo** unless "Keep photos" is on (default off, 1D).
5. **Context switches** reset to off for every request unless the user changes the defaults in HK-6. When on, the added numbers are shown before sending.
6. **Cost** is an estimate computed from the token counts the API returns and Anthropic's published prices. It is always labeled Estimate.
7. **Failure handling** never loses input: the photo or text stays, and every failure card offers Retry or "Log manually" (INTERACTION_AND_STATES).

---

## Progress (PR-1 … PR-6) (1D)

**Shared rules**
- **Every chart names its source** in a `t-small` line under its title ("From your workouts in Liftria", "From your food diary", "Logged in Liftria", "From Health Connect · Phone"), and has an **empty state**: one sentence and one action, never an empty axis.
- **Unsupported ≠ not allowed ≠ no data ≠ zero.** The chips are `off` "Not available", `off` with a lock "Not allowed", `off` "No data", then `pending`, `stale`, `measured`, `phone`. A day with no data is a dashed outline with "—", never a zero bar.
- **Ranges.** 4 W, 3 M and 1 Y chips sit under the header (4 W selected). Windows end **yesterday** for nutrition (today is left out until it ends, as in EA-7) and **today** for strength and body. The prototype only has numbers for 4 W.
- **Calm language.** No "lose", "gain" or judgment words: weight shows a "trend". No red or green trend color anywhere.
- **Hide numbers** (ST-3) applies to Today, Eat, History, **PR-1 and PR-4** (not Settings or Targets): numbers become words ("Volume is up", "On track", "Trend: steady"), the shapes stay, and a "Show numbers" link is in reach.
- **One source per number.** The volume of the newest strength bar is the five sessions in TR-11 (9,105 + 10,960 + 8,215 + 9,840 + 11,420 = 49,540 kg). The nutrition week is EA-7's week. Weight in PR-4 is the weight in ST-2.

| Screen | Layout (top → bottom) | Rules |
|---|---|---|
| PR-1 Progress home | Header → range chips → Strength card (coral rim) → Nutrition (honey) → Body (teal) → Activity (teal) | **Populated:** Strength "161,900 kg volume, 4 weeks, +6% vs the 4 weeks before" and "Top est. 1RM · Bench press 96 kg" with an Estimate chip; Nutrition "avg 2,210 kcal a day, 18 of 28 days logged, protein avg 128 g"; Body "78.4 kg today, 7-day trend −0.3 kg"; Activity "avg 7,480 steps a day" with a Phone chip, "1 full day so far (since 20 Oct)", the Samsung Health heart-rate line with "Device not recorded", then links to PR-5 and HE-1. **First time:** each card keeps its source line and shows its sentence and action ("Finish a workout to see strength trends", "Log meals on 3 days to see nutrition trends", "Log your weight to see a trend", "Connect Health Connect…"). **Partial:** Strength and Nutrition as populated, Body empty, Activity phone-only with "No watch data yet". **Hidden:** words instead of numbers. |
| PR-2 Strength | Back → range chips → Weekly volume card (total, change, 8 bars, "Last 4 weeks" bracket) → Top lifts (name, est. 1RM, sparkline, chevron) → Records row | Bars are 7-day periods ending Tue 21 Oct, values labeled above each bar in thousands. Volume is working sets only (kg × reps; warm-ups are not counted, as in TR-8). Top lifts carry the **Estimate** chip (Epley, best set per session) and open TR-6; "6 records in the last 4 weeks" opens TR-13. **Empty:** "Finish a workout to see strength trends" and Start a workout. |
| PR-3 Nutrition trends | Back → range chips → Calories vs target (line, 28 days) → Protein target (28-day pip grid) → Average split | The line covers **logged days only**; an unlogged day is a gap with a small dashed tick on the baseline, and the line never joins across it. Target 2,650 is a dashed line (Estimate). Protein: "3 of 18 logged days at or above 155 g" with a Tue-to-Mon pip grid (filled with a check = at or above, outlined = below, dashed = not logged). Average split (of logged days): P 128 g · 23%, C 255 g · 46%, F 75 g · 31%. **Empty:** "Log meals on 3 days to see nutrition trends" and Log a meal. Same rules as EA-7 at a longer range. |
| PR-4 Body | Back → range chips → Weight card (value, trend, chart, legend, Log weight) → Body fat row → Recent entries | The weight chart draws each entry as a small hollow dot (faint) and the **7-day moving average as a solid 2.5px line**, with the range low and high labeled and the last entry emphasized: "78.4 kg · today · You". The average at a day is the mean of entries in the 7 days up to it; the trend is today's average minus the average 7 days earlier (78.50 − 78.84 = **−0.3 kg**). Body fat is a `pending` row ("Needs a scale that writes to Health Connect"). **Hidden:** the line without axis numbers, "Trend: steady". **hcweight (example):** the same chart with entries by source (hollow circle = You, hollow diamond = Samsung Health), a source legend, and an Example note; Samsung Health rows say "edit it in Samsung Health". **Empty:** "Log your weight to see a trend", Log weight, and "Or allow Weight in Health Connect". Recent entries (tap to edit or delete) are the Flow 10 entry point. After save or delete a snackbar offers Undo. |
| PR-5 Activity | Back → Steps per day card (value, chart, legend) → Resting heart rate (Pending) → Exercise sessions (Pending) → Health details | **Phone only (what the S22 test saw):** five days before 20 Oct are "No data" dashed outlines; Monday 20 Oct 7,480 steps; today 6,214 so far. The headline average (7,480) is over the **one full day** there is; today is not averaged in while it is still counting. **Two sources (illustration, sample numbers, labeled):** phone and Samsung Health bars are drawn **side by side, never stacked or summed**, with phone solid and Samsung Health **diagonally striped**, and a legend with both. **Health Connect off:** the Today pattern: "Steps and heart rate are hidden, not zero" and Turn on. |
| PR-6 Log weight (sheet) | Grabber → title → kg stepper (0.1) → "Tap the number to type it" → date chip and note → privacy line → Save, Cancel | A focus overlay: no capsule nav. Opens over the screen it came from (PR-4, Today or Eat via Quick add) and returns there. "Saved in Liftria. Not written to Health Connect: Liftria only reads." **Invalid:** a weight outside 20 to 300 kg (example 400 kg) shows "Is that right? 400 kg is far from your recent entries (about 78 kg)", with **Fix it** as the primary button and Save anyway as secondary. **Editing:** the same sheet with Save changes and a red text **Delete entry** (8 s Undo). Entries read from Health Connect can't be edited here. |

**Weight data contract.** Entries Liftria saves are local rows (`kg`, `logged_at`, `note`, `source = liftria`). Health Connect weights are read, cached with their `dataOrigin`, and never edited or deleted from Liftria. When both exist for a day, both are listed; the average uses all entries (a dedup rule is a Phase 4 question).

---

## Health (HE-1 … HE-6) (1D)

**Shared rules**
- **Health shows what the Phase 0 device tests actually saw.** The example is the owner's S22 Ultra and Galaxy Watch 4: **6,214 steps today, all from the phone** (`com.android.healthconnect.phone`, device `SM-S908E`); **one heart-rate reading, 72 bpm, from Samsung Health** (`com.sec.android.app.shealth`) with **no device metadata**, so it reads "Samsung Health · device not recorded" and never "from your watch"; **no exercise sessions**; **no measured energy** (Health Connect's own 1,565 kcal estimate, with no contributing app, is hidden by default); **no sleep**; **Weight and Body fat not allowed** in the example; sync **started 20 Oct**, with no history before it.
- **Nothing unverified is shown as working.** Rows without evidence carry `pending`. The HE-6 "all good" state is labeled Example.
- **Freshness:** steps and heart rate are stale after 6 h, daily energy after 24 h, weight after 14 days (DESIGN_SYSTEM §6). A stale row shows the `stale` chip with its age ("7 h ago", "2 d ago") and a dimmed value.
- **Reading:** Health Connect is read on app open (at most every 15 minutes) and on pull-to-refresh, paginated; cached values show immediately with their age. There are **no background reads in V1**.
- **No merging.** Every origin is listed separately. A single total is shown **only for steps and only when there is one origin**, so a phone and a watch that count the same steps are never added.
- **Read-only.** "Liftria reads. It never writes or deletes your health data."

| Screen | Layout (top → bottom) | Rules |
|---|---|---|
| HE-1 Health overview | Back + "Health" → connection card ("Health Connect · connected · reads only", "Data from 20 Oct (when you connected)", "Permissions · 5 of 7 allowed") → one row per type → "Watch data missing?" and "Samsung Health sync guide" rows → reading note | Rows (icon, name, value, chips, age): **Steps** 6,214 `phone` "12 min ago" · **Heart rate** 72 bpm `measured` Samsung Health + `pending` "Device not recorded" "2 h ago" · **Exercise sessions** `pending` "None recorded yet" · **Active energy** `off` "No measured source" · **Sleep** `off` "No data" · **Weight** and **Body fat** `off` with a lock "Not allowed". The count is **5 of 7**: the brief said 4, but Steps, Heart rate, Exercise, Active energy and Sleep are allowed in the example (the last two have no data, which is not the same as not allowed). **Not connected:** an explanation, **Connect** (opens the Android permission screen, HE-4) and what each type adds. **Health Connect off:** "hidden, not zero" values and Turn on. **Not installed or too old:** "Get Health Connect" (opens Google Play) and "Liftria works without it". **Stale:** the `stale` chip with the age. |
| HE-2 Metric detail | Back + type → Day / Week control → chart card (value, chips, chart, source line) → Sources → "What this means" → Recent records | **Steps:** an hourly bar chart (today's 6,214 by hour); Sources lists "Phone 6,214 · 12 min ago" and "Samsung Health · no steps yet"; the box explains why only the phone is there. **Heart rate:** sample dots (72, 68, 75, 66, …) with the line "Samsung Health didn't record which device took these readings". **Active energy:** no chart, "No measured source"; a collapsed **Health Connect estimate (hidden)** row with **Show estimate**, which reveals **1,565 kcal** with an `estimate` chip and "Not used anywhere in Liftria". The 1,565 is Health Connect's *total* energy figure (Phase 0: active 0, total 1,564.5, no origin), so it is labeled "total energy". **Sleep:** an empty state and "Sleep needs Samsung Health sleep tracking". **Exercise:** `pending` and "Record a workout on your watch, then check here". Day and Week work on Steps in the prototype. |
| HE-3 Record detail | Back → chips → definition list → plain-words footnote | Fields: **Value**, **Time**, **Data origin** (app name and `package` in `.kbd`), **Device** (model, or "Not recorded by the source"), **Recorded and read** ("Recorded 07:41 · Read by Liftria 09:41, 2 h later"), **Permission**. The footnote says what each field means in plain words, and that the same app can sit on a phone or a watch. |
| HE-4 Connection and permissions | Back → status card (count) → seven rows with switch-look → Open Health Connect (primary) → read-only statement | A row is a button: it shows a **picture** of a switch plus the words **Allowed** or **Not allowed** and opens Health Connect (the switch can't be changed here). Each missing permission says what it hides ("Hidden until you allow it"). **Partial** 5 of 7, **All** 7 of 7, **Denied** nothing allowed with "Everything else in Liftria works". **Android permission screen (reference):** a mock in neutral system greys and Roboto-like type, blue accent (not Liftria's palette), alphabetical type names, Don't allow and Allow, and the caption "Android screen, for reference". It is a focus screen (no capsule nav). Liftria must also supply a **permission rationale screen** (Android 13 shows it through an intent; Android 14 and newer through a `VIEW_PERMISSION_USAGE` activity alias, per HEALTH_INTEGRATION.md). That screen is not drawn in 1D. |
| HE-5 Watch sync guide (generic since 2026-10-22: the steps follow the watch app chosen in ON-7 or on this screen; the Samsung Health steps below are the verified example) | Back → five numbered steps with small drawings → warning "Data starts from the day you connect" → Check again | Steps: Open Samsung Health (on the phone) · ⋮ then Settings · Health Connect · allow every type · keep the watch synced. The drawings are original geometric phone screens. **Check again** runs HE-6. |
| HE-6 Troubleshoot | Back → result card (title, checks) → Check again → guide link | Checks: ① Health Connect installed ✓ ② Liftria can read heart rate ✓ ③ Samsung Health writes to Health Connect ("Last record 2 h ago") ✓ ④ Watch synced to Samsung Health: **"Can't be checked from here"**, shown as info, never a tick ⑤ Steps from the watch ✕ "None yet, only phone steps". Each status is an icon **and** a word for screen readers. A failing check is a **warning, not an error** (amber, no red). **Checking:** progress rows. **One thing to fix:** row ⑤ expands with "Turn on Steps in Samsung Health → Health Connect" and **Show me how** (HE-5). **All good (example):** "Watch data is arriving", ⑤ ✓, labeled Example. |

---

## Settings (ST-1 … ST-7) (1D)

**Shared rules**
- Settings is a **pushed stack** from the Today avatar. It has **no capsule nav** and its own back button. Cards use **neutral rims** (no domain color); the rows are 64dp.
- **Settings is honest about what's local.** Deleting data says what is and is not deleted. **Backup and export are Future**: shown, disabled, with the warning "If you lose or reset this phone, your Liftria data is gone. Backup is planned."
- **Profile changes never silently change a manual target.** An estimated target shows the proposed change and asks. A manual target stays as it is.

| Screen | Layout (top → bottom) | Rules |
|---|---|---|
| ST-1 Settings home | Back + "Settings" → three grouped cards (Profile and goals, Units and appearance / Hiku and API key, Notifications / Health Connect, Data and storage, About and help) → storage line | Each row: neutral icon tile, title, one summary line, chevron. The Health Connect row opens HE-4. Bottom line "Everything is on this phone · 6.8 MB". |
| ST-2 Profile and goals | Fields (name, sex for the formula with "Used only to estimate your target", birth year, height, weight "Latest from your weight log", activity, goal) → target link → dock Save | At 78.4 kg the formula still gives 2,650 (2,657 before rounding to 50). **Weight edited** to 80.0 kg: the estimate would be 2,681, which rounds to **2,700**, so the card says "Your estimated target changes from 2,650 to 2,700 kcal" with **Update target** and **Keep current**. (The brief said 2,610, which is not a multiple of 50.) |
| ST-3 Units and appearance | Units (weight, height, energy) → Appearance (theme, style) → switches | Weight kg / lb, height cm / ft-in, energy kcal (kJ disabled, `pending` "Future"). Theme System / Dark / Light and Style Aurora Rim / Solid act on the prototype. "Solid turns on by itself with high-contrast text or Reduce transparency." Switches: **Hide numbers on dashboards** (Today, Eat, History, Progress; not Settings or Targets), **Keep the screen on during workouts**, **Haptics**. |
| ST-4 Hiku and API key | Key card → AI privacy defaults → usage row → model line | **Key saved:** "Saved on this phone (Android Keystore) · sk-ant-…a1b2", Test key, Replace key, Delete key. **Testing:** a "Testing…" row, then **"Key works"** with a `pending` "First device test" chip (a real request has not been run on the device). **Replacing:** the ON-8 field. **Delete confirmation:** "Hiku stops working until you add a key. Your food diary isn't affected.", Keep key as the primary button. **No key:** the explanation and the key field (as ON-8). AI privacy defaults are three switches, all **off**: Today's totals, Training day, Keep photos. "Usage and what is sent" opens HK-6. The model line reads "Uses Anthropic's Claude Haiku model". The key is never shown again after saving. |
| ST-5 Notifications | Rest timer alerts (status, `pending` "Lock-screen alert being tested") → Meal reminders switch (off by default) → times per meal when on | **Denied:** a banner "Android notifications are off for Liftria", **Open Android settings**, and the rows say why they are off. Meal reminders show a time per meal (08:00, 12:30, 19:00) when on; they are made on the phone and don't read the diary. |
| ST-6 Data and storage | Counts card → Clear health cache, Export or back up (disabled) → Delete all data (danger card) | Counts: workouts 14, meals 212, custom foods 6, health records cached 1,240, storage 6.8 MB. **Clear health cache** deletes only cached Health Connect rows ("Re-read from Health Connect next time"; counts show 0, with a snackbar). **Delete all data** card: a 1.5px `status.danger` outline and a danger text button. **Confirmation sheet:** lists what is deleted (workouts, meals, foods, weights, settings, API key, cached health data) and **what isn't** (data in Health Connect and Samsung Health, Anthropic's own request logs for your key), then "Type DELETE to confirm" with the field **empty and the button disabled**; with DELETE typed exactly (capitals) the `btn-danger` button is enabled. Keep my data is the primary button. |
| ST-7 About and help | Version card → Help (chips legend, troubleshoot, how Hiku works) → Licenses → Privacy | "Version 0.1.0 (Phase 0 build)". What the chips mean is an expandable list of the provenance chips. Licenses: free-exercise-db (Unlicense), USDA FoodData Central (public domain), Archivo and Figtree (SIL OFL). The privacy summary is feature-scoped: no account, server or analytics; health data read on the phone; Hiku is the only thing that uses the internet, and sends only what you chose. |

**Delete all data (implementation contract for Phase 2).** Order matters: (1) cancel scheduled notifications, (2) close and delete the SQLite database file, (3) delete the SecureStore key, (4) delete cached files (photos, exports), (5) clear the settings store, (6) restart into onboarding. If a step fails, show what failed and stay on the screen; never report success first. It has no Undo.
