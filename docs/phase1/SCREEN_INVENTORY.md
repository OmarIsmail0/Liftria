# Screen Inventory

**Milestone:** 1A (onboarding and Today), 1B (Train), 1C (Eat, Hiku and Quick add), 1D (Progress, Health and Settings), 1E addendum (import from other apps, muscle recovery map).

**Verification status** of the capability each screen depends on:
- **Confirmed:** proven by the Phase 0 code and device tests.
- **Pending:** designed, but waiting on a device or owner test (written "Pending device test" where a device test is the blocker).
- **Future:** not yet built or proven; planned for a later phase.

Phase 0 evidence is in `docs/PHASE_0_REPORT.md`.

## Onboarding

| ID | Screen | Purpose | Entry | Shows | Actions | States | Depends on | Status |
|---|---|---|---|---|---|---|---|---|
| ON-1 | Welcome | Set expectations | First launch | Brand mark, promise, "2 minutes, optional" | Get started | — | — | Confirmed |
| ON-2 | Privacy and local storage | Explain where data lives | ON-1 | Local DB, Hiku sends only on request, offline; no-backup warning | I understand, Back | — | SQLite, SecureStore | Confirmed (C2 PASS, C3 partial) |
| ON-3 | Profile | Inputs for the target estimate | ON-2 | Name, age, sex for formula, height, weight | Continue, Skip, Back | Validation errors (range), unit switch | Local DB | Future (Phase 2) |
| ON-4 | Goal and activity | Pick direction | ON-3 | Goal choice, daily activity choice | Continue, Skip, Back | — | — | Future (Phase 2) |
| ON-5 | Estimated target | Show and accept a starting target | ON-4 | kcal + macros, Estimate chip, formula explanation | Use this target, Set my own numbers | Below-safe-floor warning; skipped-profile state | Mifflin-St Jeor (local) | Future (Phase 2/4) |
| ON-6 | Health Connect | Explain and request read permissions | ON-5 | Data types with purpose, read-only promise | Continue to Android permissions, Not now | Unavailable / needs update; partial grant; denied | Health Connect | Confirmed (all 10 reads granted on S22) |
| ON-7 | Galaxy Watch guidance | Get Samsung Health writing | ON-6 | 3 steps, "sync starts today" notice | Done, Skip | — | Samsung Health → HC sync | Pending (first HR record seen; steps, sessions, energy unverified) |
| ON-8 | Hiku API key | Optional AI setup | ON-7 | Key field, storage, cost, internet notes | Save key, Skip | Malformed key, offline (save allowed, test later) | SecureStore, Claude API | Pending (key storage works; Claude untested on device) |
| ON-9 | Done | Summary of what's set | ON-8 | Checklist of done/skipped items | Open Today | — | — | Confirmed |

## Today

| ID | Screen / state | Purpose | Shows | Actions | Depends on | Status |
|---|---|---|---|---|---|---|
| TD-1 | Today, populated | Daily overview | Greeting, date; Pulse Orb (kcal left, ring, Estimate chip, macros); deck: Training (planned workout), Activity (steps with phone/watch chip, latest HR with provenance, energy "no measured source"), Hiku, Meals today | Log a meal, Photo (Hiku), Start workout, Sources, Profile | Local DB; HC steps/HR; Claude | Mixed: logging Future (Phase 2–4); HC steps Confirmed (phone origin); HR Pending; energy NOT measured |
| TD-2 | Today, first day | Make an empty app useful | Getting-started checklist first in the deck, empty glass orb with "0 kcal eaten", empty training card, phone steps, "No watch data yet" | Log a meal, Start empty workout, Templates, Check setup, Add API key | as TD-1 | as TD-1 |
| TD-3 | Today, offline | Keep working | Offline banner; Hiku card "Needs internet"; Photo button hidden | Same as TD-1 except Hiku | — | Offline core Confirmed (C4 PASS) |
| TD-4 | Today, no API key | Explain Hiku without blocking | Hiku card "No API key" + Add API key | Add API key | SecureStore | Confirmed |
| TD-5 | Today, Health Connect off | Hide, don't zero | Activity card banner: steps and HR hidden, not zero | Turn on, Not now | HC availability/permission | Confirmed (availability check works) |
| TD-6 | Today, stale health data | Show age honestly | Stale chips "2 d ago", sync hint | Sources | HC timestamps | Pending (freshness rules are new) |
| TD-7 | Today, no calorie target | Never compare against an invented target | Orb shows "kcal eaten" with no ring; "No target yet · Set a target"; macros in grams only | Set a target | Profile/targets | Future (Phase 4) |
| DS-1 | Energy states sheet (design reference, not an app screen) | Specify every energy-value state | Measured, measured zero, HC estimate not used, no source, not allowed, pending | — | — | Reference |

## Train (1B)

Status key for this section: everything in Train is local (SQLite) and **works offline without the watch**. Logging itself is **Future (Phase 3)**; the only device-dependent parts are notifications (new permission, untested) and watch workout data (**Pending**, not used).

| ID | Screen / state | Purpose | Entry | Shows | Actions | Depends on | Status |
|---|---|---|---|---|---|---|---|
| TR-1 | Train home: populated / first time / workout in progress | What to train next | Train tab; Today Training card | Up-next hero with muscle glyph, shortcuts, this-week plan strip, recent sessions with PR badges | Start workout, Edit, Exercises, Templates, History, Records | Templates, plan, history (local) | Future (Phase 3) |
| TR-2 | Plans and templates | Choose a plan; manage templates | TR-1 "Plan" or "Templates" | Active plan by weekday, template list | Change plan, New template, open template | Local | Future |
| TR-3 | Template editor: edit / new (invalid) | Build a repeatable workout | TR-2, TR-1 Edit, first-time "Build a template" | Name, exercises with sets × reps and rest, default rest, notes | Add/reorder/remove exercise, Save, Delete template | Exercise library | Future |
| TR-4 | Exercise library: browse / filtered / no results | Find an exercise | TR-1 search, shortcut | Search, muscle-group chips, recent, A–Z list with body glyphs, data credit | Open detail, Muscles view, Create custom exercise | free-exercise-db pack (bundled) + custom | Future; pack license confirmed (Unlicense) |
| TR-5 | Muscle browser | Browse by body area | TR-4 "Muscles" chip | Front/back body map, group chips, exercises for the group | Pick group, open exercise | As TR-4 | Future |
| TR-6 | Exercise detail: with history / never logged | Learn it, see your progress | TR-4, TR-5, TR-13, active workout menu | Body map with primary/secondary legend, Add to a workout, your best (heaviest, est. 1RM, sessions), est. 1RM chart, recent sessions, how-to text | Add to workout, see history | Local history; free-exercise-db text | Future |
| TR-7 | Workout preview | Check before starting | TR-1 Start workout; Today Training card | Muscles worked, exercise list with targets and last time | Start workout, Edit template | Local | Future |
| TR-8 | Active workout: logging / rest + Undo / notification ask / notifications denied / discard / other exercise types / text 200% | Log sets fast, one-handed | TR-7, Start empty workout, mini bar Resume | Elapsed time, progress, exercise rail, current exercise sets (last time, kg, reps, done), next exercise, steppers, Log set | Log set, adjust kg/reps, tick/undo set, add set, switch exercise, minimize, finish, discard | Local DB, local notifications | Future; notifications **Pending device test** |
| TR-9 | Rest timer on the lock screen: running / over | Rest timer while the screen is off | Automatic after a set | Android ongoing notification: time left, next set, +30 s / Skip | +30 s, Skip, Open | POST_NOTIFICATIONS + a timer that survives Doze | **Pending** (Phase 3 technical spike) |
| TR-10 | Finish summary: records / no records | Close the loop, celebrate honestly | TR-8 Finish | Duration, sets, volume vs. last time, new records, HR/calories marked pending, notes | Save workout, Back to workout | Local | Future; watch data Pending |
| TR-11 | History: populated / empty / after delete | Find past sessions | TR-1 shortcut or Recent "All" | Month stats, sessions with PR badges, Undo snackbar after delete | Open session, Records | Local | Future |
| TR-12 | Session detail: view / edit / delete confirmation | Fix or remove a logged workout | TR-11, TR-1 Recent | Stats, exercises with sets and record markers; editable sets in edit mode | Edit, Save changes, Cancel, Delete workout | Local; record recalculation | Future |
| TR-13 | Records | Personal bests per exercise | TR-1 shortcut, TR-11 trophy | Best set and est. 1RM per exercise with dates | Open exercise | Local | Future |
| TR-14 | Muscle recovery map: recent / volume / untrained / empty / text 200% (1E) | See which muscles were trained recently, how much this week, and which were neglected | TR-1 Muscles card; PR-2 "Muscle map" | `estimate` chip with a one-line explanation, a 3-way mode control, the front/back body map shaded in 3 steps of the train color (dots on the middle step), a legend, all 17 muscles with a value in words and a number | Switch mode, tap a muscle (opens TR-5 filtered to it), Find exercises, Start a workout (empty) | Local set history + the 17-category muscle map (free-exercise-db); formula in SCREEN_SPECIFICATIONS §2 | **Future · Phase 3.** An estimate from logged sets only; it doesn't know sleep, soreness, food or heart rate |
| TR-1 card | Muscles card on Train home (1E) | Glance at recovery without leaving Train | TR-1 (rich and workout-in-progress states; hidden on first time) | A mini front/back map in `recent` mode, the `estimate` chip and one line ("Glutes, hamstrings and 1 more trained yesterday · Chest ready") | Open TR-14 | As TR-14 | Future · Phase 3 |

## Eat (1C)

Status key for this section: the diary, food search and targets are all local (SQLite plus a bundled USDA pack) and **work offline**. The offline local database is **Confirmed** (Phase 0, C4); the screens themselves are built in Phase 4, so they read **Future (Phase 4)**. Anything that needs Hiku is marked on the Hiku table.

| ID | Screen / state | Purpose | Entry | Shows | Actions | Depends on | Status |
|---|---|---|---|---|---|---|---|
| EA-1 | Eat home: populated / first day / over target / no target / numbers hidden (plus after add, delete and Hiku save, with Undo) | Today's diary, one number | Eat tab; Today orb; Today "Log a meal" after saving | Date switcher, Pulse Orb (200px), Estimate chip, read-only training-day chip, macro bars, four meal cards with items and totals, History and Targets rows | Add (per meal), Quick add (+), open a meal, History, Targets, Show numbers, Set a target | Local diary; target | Future (Phase 4) |
| EA-2 | Add food: recents / search / no results / offline (plus after one-tap add, with Undo) | Find food and add it fast | Eat "Add"; Today "Log a meal"; Quick add; Today meals card "Add" | Meal selector, search, Hiku Photo and Describe, Recents / Favorites / My foods, rows with source chip and one-tap "+", Quick add calories, Create a food | Search, "+" (last-used portion), open EA-3, Photo, Describe, Quick add calories, Create a food | Bundled USDA FoodData Central pack; local recents | Future (Phase 4); pack size and subset open (review concern 1) |
| EA-3 | Portion picker: default / text 200% | Choose an amount with live macros | EA-2 row | Food name and source chip, unit control (g, cup, piece, serving), amount stepper (64dp), kcal and P/C/F, per-100 g line, meal selector | Change unit and amount, Add to meal | Pack portion list | Future (Phase 4); portion coverage open (concern 2) |
| EA-4 | Meal detail: view / editing an item / delete confirmation | Fix or remove a logged meal | EA-1 item or meal | Meal kcal and macros, items with portion, kcal and source chip, Add item, Move to another meal, Delete meal | Edit a portion, Remove item, Add item, Move, Delete (8 s Undo) | Local diary | Future (Phase 4) |
| EA-5 | Create a food: empty / calories and macros differ / quick add | Add a food that isn't in the pack | EA-2 links | Name, brand, serving g, kcal, P/C/F; mismatch hint; calories-only variant | Save food, Save anyway, Fix the numbers, Add (quick) | Local diary | Future (Phase 4) |
| EA-6 | Targets: estimate / your own / below the floor / deficit over 25% | See or change the daily target | EA-1 Targets row; Today "Set a target" | Target with Estimate or Your target chip, how it is calculated, macro split with editable percentages, hide-numbers switch, safety-floor and deficit sheets | Set my own numbers, change kcal and split, Use the safe value, Keep (with a tick), Save target | Profile (Mifflin-St Jeor, local) | Future (Phase 2/4) |
| EA-7 | History and trends: week / empty | See weeks without false zeros | EA-1 History row or date switcher | Week bars against a dashed target line, unlogged days as dashed outlines, averages over logged days, protein average, per-day list | Open a day | Local diary | Future (Phase 4) |
| QA-1 | Quick add sheet: default / offline / no key | One shared place to start anything | Eat "+"; long-press on Today "Log a meal" or the Today tab | Log a meal, Photo a meal, Describe a meal, Start workout, Log weight (enabled in 1D, opens PR-6) | Pick a row, Close | Claude for the Hiku rows; Train for Start workout | Future (Phase 4); the Hiku rows depend on the Hiku status below; Log weight opens PR-6 (1D) |

## Hiku (1C)

Status key for this section: **a Hiku request is Pending device test.** Phase 0 proved key storage and the offline failure on the S22, but **a real Claude request has not been run on the device**. The chat is **Future**: not designed as a working feature.

| ID | Screen / state | Purpose | Entry | Shows | Actions | Depends on | Status |
|---|---|---|---|---|---|---|---|
| HK-1 | Hiku home: ready / no key / offline / first time | Start an estimate; see what Hiku is | Hiku tab; Quick add; Today Hiku card | Hero with Photo and Describe, a "Pending" note, recent analyses (saved or discarded), Chat card ("Pending", coming later), monthly usage line; how-it-works steps on first use | Photo, Describe, Usage, Add API key, Log manually | SecureStore (Confirmed); Claude (Pending device test) | Confirmed for no key and offline states; Pending device test for ready |
| HK-2 | Before sending: photo / description | Show exactly what will be sent | HK-1, EA-2, Quick add, Today Photo | Plate placeholder or text field, optional note, "What's sent" panel with two context switches (off), estimated cost, privacy line | Toggle context, Retake, Choose another, Send to Hiku | Android photo picker; image resize on the phone | Pending device test |
| HK-3 | Analyzing: working / still working (after 10 s) | Wait, with a way out | HK-2 Send | Shimmering plate (static under reduced motion), status text, Cancel | Cancel | Claude request | Pending device test |
| HK-4 | Result review: result / editing / after editing / text 200% / discard confirmation | Check and correct before saving | HK-3 | "Estimate" and "Hiku estimate" chips, items with grams, kcal and a confidence word, total and macros, "After saving" preview, Add item, Describe instead | Edit an item, Remove, Add item, Save to Dinner, Discard | Claude structured output; local diary | Pending device test |
| HK-5 | Errors: offline / key rejected / rate limit / server / refusal / cut off / timeout | Fail without losing anything | HK-3 or HK-4 | One card: cause, "your photo is still here", actions; rate-limit countdown | Retry, Check key, Describe instead, Log manually | HTTP status mapping | Offline Confirmed (Phase 0); the rest Pending device test |
| HK-6 | Usage and privacy | Make cost and data use visible | HK-1 Usage | Monthly estimate, per-request list (type, tokens, estimated cost), context defaults, what is never sent, key link | Change context defaults, Open API key (Settings) | Local usage log; Anthropic's published prices | Future (Phase 4); prices source open (concern 4) |
| HK-C | Chat (marker only, no screen) | Later: multi-turn questions with personal context | HK-1 Chat card | "Pending" chip, "Coming later" | None | Needs device testing and its own design | **Future** |

## Progress (1D)

Status key for this section: every chart reads **local data** (workouts, diary, weights) except Activity, which reads Health Connect. Charts are **Future (Phase 4)**; the Health Connect parts follow the Health table below. Every chart names its source under its title and has an empty state (a sentence and one action).

| ID | Screen / state | Purpose | Entry | Shows | Actions | Depends on | Status |
|---|---|---|---|---|---|---|---|
| PR-1 | Progress home: populated / first time / partial / numbers hidden | One look at all four areas | Progress tab | Range chips (4 W, 3 M, 1 Y), four domain-rimmed cards (Strength, Nutrition, Body, Activity), each with a headline, its own source line and a link | Open a detail screen, Health details, empty-state actions | Workouts, diary, weights (local); Health Connect steps | Future (Phase 4); Activity card Confirmed for phone steps, Pending for watch data |
| PR-2 | Strength: populated / empty | Volume and top lifts | PR-1 Strength | Weekly volume bars (8 periods), 4-week total and change, top lifts with est. 1RM sparkline and Estimate chip, records count | Open an exercise (TR-6), Records (TR-13) | Local workouts | Future (Phase 3/4) |
| PR-3 | Nutrition trends: populated / empty | Calories and protein over 4 weeks without false zeros | PR-1 Nutrition | Daily calories vs target (gaps for unlogged days), protein days at or above target, average macro split | — | Local diary | Future (Phase 4) |
| PR-4 | Body: populated / empty / numbers hidden / with Health Connect weights / text 200% (plus after save and after delete, with Undo) | Weight trend, entries | PR-1 Body; Quick add "Log weight" | Weight dots with a 7-day average line, range, last entry with source, body-fat row (Pending), recent entries | Log weight, edit or delete an entry | Local weights; Health Connect weight (needs permission) | Future (Phase 4); Health Connect weight and body fat **Pending device test** |
| PR-5 | Activity: phone only / phone and Samsung Health (illustration) / Health Connect off | Steps per day by source | PR-1 Activity | Steps per day by source (phone solid, Samsung Health striped), resting heart rate (Pending), exercise sessions (Pending) | Health details, Turn on | Health Connect steps | Phone steps **Confirmed** (S22 test); Samsung Health steps, resting HR and sessions **Pending device test** |
| PR-6 | Log weight (sheet): default / invalid / editing | Add, fix or delete a weight | PR-4, Quick add | kg stepper (0.1), typed entry, date, note, "Saved in Liftria. Not written to Health Connect." | Save, Cancel, Delete entry | Local weights | Future (Phase 4) |

## Health (1D, inside Progress)

Status key for this section: what the Phase 0 device tests saw, and nothing more. **Steps are Confirmed from the phone only. One heart-rate record from Samsung Health arrived (device not recorded). Exercise sessions, measured energy and sleep have not been seen.** Health Connect's own energy figure (1,565 kcal, no contributing app) is never used.

| ID | Screen / state | Purpose | Entry | Shows | Actions | Depends on | Status |
|---|---|---|---|---|---|---|---|
| HE-1 | Health overview: connected / not connected / Health Connect off / not installed or too old / stale / text 200% | See every type, its source and age | PR-1 Health details; PR-5; Settings | Connection card (reads only, data from 20 Oct, 5 of 7 allowed), one row per type with value or state, source chip and age | Open a type, Permissions, Watch data missing?, Sync guide, Connect, Turn on, Get Health Connect | Health Connect | Availability and permissions **Confirmed**; Steps Confirmed (phone); Heart rate Pending (device not recorded); Sessions, energy, sleep Pending device test |
| HE-2 | Metric detail: steps (day, week) / heart rate / active energy / sleep / exercise sessions | One type in depth | HE-1 row; Today Activity card (steps) | Range control, chart with source line, Sources breakdown, "What this means" box, recent records | Open a record, Show estimate (energy), Watch data missing? | Health Connect | As HE-1 |
| HE-3 | Record and source detail: heart-rate record / steps record | Show exactly what Health Connect returned | HE-2 record; Today HR row | Value, time, data origin (app and package), device, recorded vs read, permission, plain-words footnote | — | Health Connect record metadata | Pending device test (device metadata absent on the HR record) |
| HE-4 | Connection and permissions: partly / all / nothing allowed / Android permission screen (reference) | See and change what Liftria may read | HE-1; Settings | Status card, seven types with an Allowed or Not allowed switch-look (read-only, opens Health Connect), Open Health Connect, "Liftria reads. It never writes or deletes." | Open Health Connect | Android Health Connect permission flow | Confirmed (all 10 reads granted on the S22); the screen text is a reference, wording differs by Android version |
| HE-5 | Samsung Health sync guide | Get watch data into Health Connect | HE-1, HE-2 (sleep), HE-6 | Five numbered steps with small drawings, "Data starts from the day you connect", Check again | Check again | Samsung Health → Health Connect write sync | Pending (first HR record seen; steps, sessions, energy unverified) |
| HE-6 | Troubleshoot missing watch data: checking / one thing to fix / all good (example) | Find where the chain breaks | HE-1, HE-2, Settings help | Five checks, each with a status and one line; the failing check expanded with a fix | Show me how, Check again | Health Connect read; Samsung Health | Pending device test (the "all good" state is an example; no watch steps have been seen) |

## Settings (1D)

Status key for this section: everything is local (SQLite, SecureStore) and **works offline**. Key storage is **Confirmed** (restart persists; delete → restart → missing is still Pending). A key **test** and any Hiku request are **Pending device test**. Backup and export are **Future**. Settings is a pushed stack from the Today avatar, with no capsule nav.

| ID | Screen / state | Purpose | Entry | Shows | Actions | Depends on | Status |
|---|---|---|---|---|---|---|---|
| ST-1 | Settings home: default / text 200% | Find a setting | Today avatar | Grouped rows, storage line "Everything is on this phone · 6.8 MB" | Open a group | — | Future (Phase 2) |
| ST-2 | Profile and goals: default / weight edited | Inputs for the target estimate | ST-1; EA-6 | Name, sex for the formula, birth year, height, weight (latest from PR-4), activity, goal, target link | Edit, Save, Update target, Keep current | Local profile; Mifflin-St Jeor | Future (Phase 2/4) |
| ST-3 | Units and appearance | Units, theme, style, display options | ST-1 | kg/lb, cm/ft-in, kcal (kJ Future), theme, style, hide numbers, keep screen on, haptics | Change a setting | — | Future (Phase 2); kJ **Future** |
| ST-4 | Hiku and API key: key saved / no key / testing / test result / replacing / delete confirmation | Manage the key and AI privacy defaults | ST-1; HK-1; HK-5; HK-6; Today | Key card (masked), Test, Replace, Delete, AI privacy defaults, usage link, model line | Test key, Replace key, Delete key, Save key | SecureStore; Claude (test) | Storage Confirmed; Test **Pending device test** |
| ST-5 | Notifications: allowed / denied in Android / meal reminders on | Rest timer and meal reminders | ST-1; TR-8 Turn on | Status of rest timer alerts (lock-screen alert Pending), meal reminders (off by default) with a time per meal | Open Android settings, set a time | POST_NOTIFICATIONS | **Pending device test** |
| ST-6 | Data and storage: default / health cache cleared / delete all / DELETE typed | See what is stored; clear or delete | ST-1 | Counts, Import workouts from another app and Undo import (1E), Clear health cache, Export or back up (disabled, Future), Delete all data (danger) | Import, Undo import, Clear cache, Delete all data | Local DB, SecureStore, files | Future (Phase 2); backup **Future** |
| ST-7 | About and help | Version, help, licenses, privacy | ST-1 | Version, "What the chips mean", troubleshoot and Hiku links, licenses, privacy summary | Open help topics | — | Future (Phase 2) |

**Not designed as screens (V1 or later):** barcode scanning, kJ, export and backup, chat with Hiku, Samsung Health Data SDK. The prototype's State menu reaches every state above; some states only exist to tap through a flow and are marked in the review file.

## Import from another app (1E)

Status key for this section: everything is local. The user picks a file with Android's document picker, Liftria parses it on the phone, and **nothing is uploaded**. All of it is **Future · Phase 3** (it needs the Phase 3 workout tables). Import is a pushed stack with no capsule nav, entered from Settings (ST-6), the first-time Train home, or the empty History.

| ID | Screen / state | Purpose | Entry | Shows | Actions | Depends on | Status |
|---|---|---|---|---|---|---|---|
| IM-1 | Choose source: default / Android file picker (reference) | Say which app the file comes from | ST-6 "Import workouts from another app"; TR-1 first-time link; TR-11 empty link | "Where are you coming from?", Hevy, Strong, FitNotes, Another app (CSV) each with its export path, the privacy line, "doesn't change your plans or templates", the Future list (Hevy account import, Apple Health weight, export from Liftria) | Choose a source, Choose a file, back | Android document picker (no storage permission) | Future · Phase 3 |
| IM-2 | Preview: ok / unmatched exercises / unit needed / not the expected format / no workouts / nothing new | See exactly what will happen **before anything is saved** | IM-1 after a file is read | Summary (workouts, sets, date range, source), what is skipped and why, warm-up handling, records preview, the unmatched list with suggestions, the kg/lb question | Import N workouts, Cancel, Use suggestion / Keep as my own, kg / lb, Choose another file | Parser per app; exercise library and aliases; local workouts (for skipped days) | Future · Phase 3 |
| IM-3 | Importing: progress | Show progress of a single all-or-nothing transaction | IM-2 Import | "Importing… 61 of 142 workouts", a bar, "can't be cancelled halfway" | None (no cancel) | SQLite transaction | Future · Phase 3 |
| IM-4 | Done: done / failed (storage full) / failed (file unreadable) | Report the result; offer the way back | IM-3 | Counts (workouts, sets, custom exercises, records updated, skipped); the Undo import hint. Failure: "Nothing was imported" and the reason | View history (TR-11), Done, Try again | Local DB | Future · Phase 3 |
| ST-6 rows | Data and storage: "Import workouts from another app" and, after an import, **Undo import** (with its confirmation sheet and result) | Start an import; remove the last one | ST-1 → Data and storage | Counts, the import row, Undo import "Removes the 142 workouts from this import" until the next import | Import, Undo import (confirm), Keep it | Import batch ID on every imported session | Future · Phase 3 |
| TR-11 / TR-12 source lines | "Imported from Hevy" on an imported session | Provenance of a session | TR-11, TR-12 | A file icon and "Imported from Hevy" (TR-11 row; TR-12 card with the import date) | — | `source = imported-file`, `importer` | Future · Phase 3 |

**Not designed as screens (V1 or later):** Hevy API import (needs Hevy Pro and the internet), Apple Health weight import, exporting from Liftria (listed as Future in IM-1); the "last import didn't finish" notice after a killed import (specified in SCREEN_SPECIFICATIONS §1, not drawn).
