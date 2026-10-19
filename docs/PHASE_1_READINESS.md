# Phase 1 readiness and roadmap decision — 2026-10-19

**Phase 0 is NOT approved.** No build has been installed or checked on the owner's S22 Ultra. This report follows the four independent verdicts from the approved Phase 0 scope.

## Core foundation — PENDING

C1 (debug/release embedded-bundle APK builds AND device installation): BLOCKED by absent Android SDK and physical device.

C2 (SQLite migrations and restart persistence): PENDING_DEVICE_TEST.

C3 (SecureStore restart persistence and key deletion): PENDING_DEVICE_TEST.

C4 (embedded-bundle airplane-mode startup, settings, workout/nutrition CRUD, health cache, offline AI failure): PENDING_DEVICE_TEST.

**Owner corrective action:** on Windows run `npm ci` (once lockfile is committed), `npx expo install --check`, `npm run check`, `expo prebuild`, `assembleDebug`, `assembleRelease`, install both, follow DEVICE_TESTS.md and attach evidence. **Agent corrective action:** fix any concrete dependency/native/runtime errors surfaced by these runs. Re-test the failed criterion before granting GO.

## Claude AI — PENDING

Code implements typed key storage, API errors/retries/timeout/offline, structured schema and local image preprocessing; no real API key or Android HTTP call was tested.

**Owner:** set a dedicated Anthropic API key with workspace spend controls, run Test A text; separately run Test B on a **real** meal photo; record token costs, errors without exposing secrets. **Agent:** fix any observed compatibility/response problems; re-test. Photo recognition is PENDING_OWNER_TEST and text recognition is PENDING_OWNER_TEST, independently.

## Workout wearable — PENDING

Watch-originated HR, exercise sessions/duration, steps need a real data-origin and Samsung Health comparison. A Health Connect `available` response is not readiness.

**Owner:** enable Samsung Health sharing; grant read access; read 7 days; document HR, steps, sessions, watch/device origin; confirm matching time windows. **Agent:** investigate missing metrics and implement Samsung Health Data SDK Kotlin adapter *only if* Health Connect has a verified gap; retest.

If eventual verdict is PARTIAL or NOT READY, fallback is manual workout logging and phone-origin steps while the watch feature remains explicitly out of V1 until verified. This would affect watch-dependent Phase 3 only, not offline core.

## Daily calorie tracking — PENDING

No verified **daily** active, **daily** total, basal/resting energy, or exercise-specific calorie values; no double-counting assessment. A single workout-interval TotalCaloriesBurned record is not a daily TDEE.

**Owner:** gather same-day energy from Samsung Health and Health Connect. **Agent:** compare intervals/units/provenance and if needed research conditional Samsung `ActivitySummaryType` aggregate SDK, re-test. Until READY, manual entered TDEE or explicit unavailable-energy state is a future Phase 4 fallback; do not fabricate energy balance. Would affect calorie dashboard, not offline app.

## Fixed roadmap — do NOT reorder

1. **Phase 1: UI/UX design.** May proceed now, but watch/AI/daily energy visuals must carry pending badges/assumptions. **Design only**; no implementation feature work is planned for Phase 1.
2. **Phase 2: app foundation.** Blocked until Core = **GO**; if app fails no-go with no fix, propose alternative before proceeding.
3. **Phase 3: gym system.** Offline gym feature may follow Phase 2. Watch-originated features gated by Workout Wearable = READY or documented descope.
4. **Phase 4: nutrition system.** Offline nutrition may follow Phase 3. Claude features gated by Claude READY or descope; calorie dashboard and energy balance gated by Daily Calorie = READY or descope.

**Decision: conditional design GO for Phase 1 only. App foundation NO START until core device PASS.**

Owner test checklist: [DEVICE_TESTS.md](DEVICE_TESTS.md).
