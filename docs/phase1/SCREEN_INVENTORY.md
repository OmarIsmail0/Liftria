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
| TD-1 | Today, populated | Daily overview | Greeting, date; Nutrition card (ring, kcal left, macros, meals); Training (planned workout); Activity (steps with phone/watch chip, latest HR with provenance, energy "no measured source"); Hiku card; This week | Log a meal, Photo (Hiku), Start workout, Sources, Profile | Local DB; HC steps/HR; Claude | Mixed: logging Future (Phase 2–4); HC steps Confirmed (phone origin); HR Pending; energy NOT measured |
| TD-2 | Today, first day | Make an empty app useful | Getting-started checklist, empty ring with "Nothing logged", empty training card, phone steps, "No watch data yet" | Log a meal, Start empty workout, Templates, Check setup, Add API key | as TD-1 | as TD-1 |
| TD-3 | Today, offline | Keep working | Offline banner; Hiku card "Needs internet"; Photo button hidden | Same as TD-1 except Hiku | — | Offline core Confirmed (C4 PASS) |
| TD-4 | Today, no API key | Explain Hiku without blocking | Hiku card "No API key" + Add API key | Add API key | SecureStore | Confirmed |
| TD-5 | Today, Health Connect off | Hide, don't zero | Activity card banner: steps and HR hidden, not zero | Turn on, Not now | HC availability/permission | Confirmed (availability check works) |
| TD-6 | Today, stale health data | Show age honestly | Stale chips "2 d ago", sync hint | Sources | HC timestamps | Pending (freshness rules are new) |
| DS-1 | Energy states sheet (design reference, not an app screen) | Specify every energy-value state | Measured, measured zero, HC estimate not used, no source, not allowed, pending | — | — | Reference |

## Stubs in the 1A prototype (designed later)

| ID | Screen | Milestone |
|---|---|---|
| TR-* | Train tab and all workout screens | 1B |
| EA-* | Eat tab, diary, food search, targets | 1C |
| HK-* | Hiku tab, chat, photo analysis, review-before-save | 1C |
| PR-*, HE-* | Progress and Health screens | 1D |
| ST-* | Settings, privacy, data management | 1D |
