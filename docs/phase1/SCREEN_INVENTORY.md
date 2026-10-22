# Screen Inventory

**Milestone:** 1A (onboarding and Today), 1B (Train), 1C (Eat, Hiku and Quick add). A later milestone adds Progress, Health and Settings (1D).

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
| QA-1 | Quick add sheet: default / offline / no key | One shared place to start anything | Eat "+"; long-press on Today "Log a meal" or the Today tab | Log a meal, Photo a meal, Describe a meal, Start workout, Log weight (disabled, "Coming in Progress, 1D") | Pick a row, Close | Claude for the Hiku rows; Train for Start workout | Future (Phase 4); the Hiku rows depend on the Hiku status below |

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

## Stubs in the prototype (designed later)

| ID | Screen | Milestone |
|---|---|---|
| PR-*, HE-* | Progress and Health screens | 1D |
| ST-* | Settings, privacy, data management (API key, Keep photos, units) | 1D |
