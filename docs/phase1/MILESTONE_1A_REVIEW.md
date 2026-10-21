# Milestone 1A Review

**Date:** 2026-10-21 · **Reviewer:** Claude (self-review; **owner sign-off pending**)

## Deliverables

| Deliverable | Location | Status |
|---|---|---|
| Phase 1 prompt (approved scope) | `PHASE_1_PROMPT.md` | Done |
| Product and UX vision | `PRODUCT_UX_VISION.md` | Done |
| Information architecture | `INFORMATION_ARCHITECTURE.md` | Done |
| Design system: tokens, type, space, motion, data-honesty patterns, 1A components | `DESIGN_SYSTEM.md` | Done (components extended in 1B–1D) |
| Screen inventory: onboarding and Today | `SCREEN_INVENTORY.md` | Done |
| Screen specifications: onboarding and Today | `SCREEN_SPECIFICATIONS.md` | Done |
| User flows 1, 6 (setup) and 7 | `USER_FLOWS.md` | Done |
| States and interactions | `INTERACTION_AND_STATES.md` | Done for 1A scope |
| Accessibility, with measured contrast | `ACCESSIBILITY.md` | Done |
| Clickable prototype, dark and light | `prototype/liftria-1a.html` (source in `prototype/src/`) | Done |

## Screen checklist

Legend: **PASS** = specified, in the prototype, states covered · **NEEDS REVISION** = owner feedback or open issue · **BLOCKED** = waiting on Phase 0.

| Screen | Visual | States | Dark / light | A11y | Offline | Privacy copy | Provenance | Result |
|---|---|---|---|---|---|---|---|---|
| ON-1 Welcome | ✓ | n/a | ✓ | ✓ | ✓ | ✓ | n/a | PASS |
| ON-2 Privacy | ✓ | n/a | ✓ | ✓ | ✓ | ✓ includes no-backup warning | n/a | PASS |
| ON-3 Profile | ✓ | Validation specified, not drawn | ✓ | ✓ | ✓ | ✓ | n/a | PASS (error states drawn in Phase 2 build) |
| ON-4 Goal and activity | ✓ | n/a | ✓ | ✓ | ✓ | n/a | n/a | PASS |
| ON-5 Estimated target | ✓ | Safety-floor warning specified, not drawn | ✓ | ✓ | ✓ | n/a | ✓ Estimate chip | **NEEDS REVISION**: draw the safety-floor and "Set my own numbers" sheet (carry into 1C targets) |
| ON-6 Health Connect | ✓ | Return states specified | ✓ | ✓ | ✓ | ✓ read-only | ✓ | PASS |
| ON-7 Watch guidance | ✓ | n/a | ✓ | ✓ | ✓ | ✓ | ✓ "sync starts today" | **BLOCKED** on device verification of watch data types (copy may change) |
| ON-8 Hiku key | ✓ | Malformed / offline / test results specified | ✓ | ✓ | ✓ | ✓ cost + sharing | n/a | PASS (Claude untested on device: Pending) |
| ON-9 Done | ✓ | n/a | ✓ | ✓ | ✓ | n/a | ✓ | PASS |
| TD-1 Today, populated | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ phone/HC/estimate/pending chips | PASS |
| TD-2 First day | ✓ | ✓ | ✓ | ✓ | ✓ | n/a | ✓ | PASS |
| TD-3 Offline | ✓ | ✓ | ✓ | ✓ | ✓ proven on device | ✓ | n/a | PASS |
| TD-4 No API key | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | n/a | PASS |
| TD-5 Health Connect off | ✓ | ✓ | ✓ | ✓ | ✓ | n/a | ✓ hidden, not zero | PASS |
| TD-6 Stale data | ✓ | ✓ | ✓ | ✓ | ✓ | n/a | ✓ | PASS (freshness limits need Phase 2 tuning) |
| DS-1 Energy states | ✓ | all 6 | ✓ | ✓ | n/a | n/a | ✓ | PASS |

## Cross-checks

| Check | Result | Notes |
|---|---|---|
| Nothing unverified described as working | PASS | Heart rate carries "Watch unverified"; energy says "No measured source"; Claude is labeled untested where relevant |
| Phase 0 findings used as design inputs | PASS | Phone-origin steps, HC 1,565 kcal estimate hidden, sync-from-today, HR without device metadata |
| No energy double counting | PASS | One energy figure or none; rule in DESIGN_SYSTEM §6 |
| Local-first feasibility | PASS | Every 1A screen works from local DB, SecureStore and on-device Health Connect; only Hiku needs network |
| Contrast (WCAG AA) | PASS | 5 failing tokens found and fixed; ratios in ACCESSIBILITY.md |
| Glass style (owner request) | PASS | Added as default with a Solid/Glass switch; worst-case contrast on the brightest glow measured and fixed (card opacity .76, dark tertiary `#8A94A3`); ring and bar tracks given their own token after they disappeared on light glass |
| Touch targets ≥ 48dp | PASS | Small and ghost buttons raised from 40/44 to 48 during review |
| Target formula vs. screens | PASS | Prototype showed 2,350 while the formula gives 2,650 for its sample profile; corrected |
| Prototype runtime | PASS | Rendered in Chromium at 1100px and 384px, dark and light: no script errors, no horizontal overflow |
| S22 Ultra one-handed reach | PASS | Primary actions pinned bottom; nav 56dp; profile/settings (rare) top-right |
| Safety guardrails | PARTIAL | Floor and wording specified; warning UI not yet drawn (ON-5 revision) |

## Open issues carried forward

1. **ON-5:** draw the safety-floor warning and the "Set my own numbers" editor, in 1C alongside nutrition targets.
2. **Fonts:** the prototype loads Archivo and Figtree from Google Fonts and falls back to system fonts offline. The app must bundle them (Phase 2).
3. **Watch copy (ON-7, TD-2)** depends on what Samsung Health actually syncs; revisit after the next device report.
4. **Hide-numbers setting:** specified for Today; its Settings UI is in 1D.

## Owner review asks

1. ~~Overall look~~ **Decided: Aurora Rim** (from the 5-option direction board). Check it on your phone for a few days; if it's too loud, dial back `rim.glow` and the ambient strengths.
2. Navigation: Today · Train · Eat · Progress · Hiku, with Health inside Progress. OK?
3. Provenance chips on every health number. Too much, or right?
4. Anything to change before 1B (Gym) starts?
