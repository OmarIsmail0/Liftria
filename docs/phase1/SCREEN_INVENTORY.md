# Screen Inventory

**Milestone:** 1A (onboarding and Today). Later milestones add the Train (1B), Eat and Hiku (1C), and Progress, Health and Settings (1D) sections.

**Verification status** of the capability each screen depends on:
- **Confirmed:** proven by the Phase 0 code and device tests.
- **Pending:** designed, but waiting on a device or owner test.
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
| TR-8 | Active workout: logging / rest / notification ask / notifications denied / discard | Log sets fast, one-handed | TR-7, Start empty workout, mini bar Resume | Elapsed time, progress, exercise rail, current exercise sets (last time, kg, reps, done), next exercise, steppers, Log set | Log set, adjust kg/reps, tick/undo set, add set, switch exercise, minimize, finish, discard | Local DB, local notifications | Future; notifications **Pending device test** |
| TR-9 | Rest timer on the lock screen: running / over | Rest timer while the screen is off | Automatic after a set | Android ongoing notification: time left, next set, +30 s / Skip | +30 s, Skip, Open | POST_NOTIFICATIONS + a timer that survives Doze | **Pending** (Phase 3 technical spike) |
| TR-10 | Finish summary: records / no records | Close the loop, celebrate honestly | TR-8 Finish | Duration, sets, volume vs. last time, new records, HR/calories marked pending, notes | Save workout, Back to workout | Local | Future; watch data Pending |
| TR-11 | History: populated / empty / after delete | Find past sessions | TR-1 shortcut or Recent "All" | Month stats, sessions with PR badges, Undo snackbar after delete | Open session, Records | Local | Future |
| TR-12 | Session detail: view / edit / delete confirmation | Fix or remove a logged workout | TR-11, TR-1 Recent | Stats, exercises with sets and record markers; editable sets in edit mode | Edit, Save changes, Cancel, Delete workout | Local; record recalculation | Future |
| TR-13 | Records | Personal bests per exercise | TR-1 shortcut, TR-11 trophy | Best set and est. 1RM per exercise with dates | Open exercise | Local | Future |

## Stubs in the 1A prototype (designed later)

| ID | Screen | Milestone |
|---|---|---|
| EA-* | Eat tab, diary, food search, targets | 1C |
| HK-* | Hiku tab, chat, photo analysis, review-before-save | 1C |
| PR-*, HE-* | Progress and Health screens | 1D |
| ST-* | Settings, privacy, data management | 1D |
