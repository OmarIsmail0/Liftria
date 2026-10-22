# Phase 1 Report: UI/UX design

**Date:** 2026-10-22 · **Author:** Claude · **Status: complete, awaiting owner approval.** Phase 1 is approved only by the owner, after 1D (prompt §13).

## Summary

Phase 1 designed all of Liftria as a clickable prototype and implementation-ready specs, in four milestones, each reviewed before the next:

| Milestone | Scope | Owner decision |
|---|---|---|
| 1A | IA, design system, onboarding, Today, cross-cutting states | **Approved** (2026-10-21): Aurora Rim style, Pulse Orb Today, capsule nav |
| 1B | Gym and workouts (TR-1…TR-13) | **Conditionally approved** (external review): conditions carried forward below |
| 1C | Nutrition and Hiku (EA-1…EA-7, HK-1…HK-6, QA-1) | Pending owner review |
| 1D | Progress, Health, Settings (PR-1…PR-6, HE-1…HE-6, ST-1…ST-7) + final accessibility pass | Pending owner review |

**Process:**
- 1A and 1B were designed and built by Claude.
- For 1C and 1D, Claude wrote a design brief (`MILESTONE_1C_BRIEF.md`, `MILESTONE_1D_BRIEF.md`), a builder agent implemented it, and Claude reviewed it.
- In both milestones the builder caught arithmetic and consistency errors in Claude's briefs and flagged them rather than copying them. The review files record each one.

## Deliverables

| Deliverable | Location |
|---|---|
| Clickable prototype, every screen and state, dark/light, Aurora Rim/Solid | `prototype/liftria.html` (source `prototype/src/liftria.html`); 1A snapshot `liftria-1a.html` |
| Vision, IA, design system, inventory, specs, flows 1–10, states, accessibility | `PRODUCT_UX_VISION.md`, `INFORMATION_ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `SCREEN_INVENTORY.md`, `SCREEN_SPECIFICATIONS.md`, `USER_FLOWS.md`, `INTERACTION_AND_STATES.md`, `ACCESSIBILITY.md` |
| Milestone reviews and briefs | `MILESTONE_1A…1D_REVIEW.md`, `MILESTONE_1C_BRIEF.md`, `MILESTONE_1D_BRIEF.md` |
| Handoff to build | `PHASE_1_HANDOFF.md` (feature → phase, status, source, components, prerequisites, acceptance) |
| Phase 2 build prompt | `PHASE_2_PROMPT.md` |

**Scale:**
- 57 prototype screens across onboarding, Today, Train, Eat, Hiku, Progress, Health and Settings.
- 153 screen × state combinations in the prototype (onboarding not counted), each rendered in both themes.
- All 10 required user flows documented.

## Quality

| Check | Result |
|---|---|
| Prototype runtime | All 153 combinations render in Chromium, dark and light: no script errors, no horizontal overflow (automated, re-run by Claude at each milestone) |
| Touch targets | No button under 48dp anywhere (automated); in-workout controls 64dp |
| Contrast (WCAG AA) | Every text token ≥ 4.5:1 and UI outline ≥ 3:1, including the worst case over the Aurora glows; measured tables in ACCESSIBILITY.md. Fixed along the way: five 1A tokens, light `status.warning` (1C), dark `status.danger` and the glass control outlines (1D, new `color.border.control`) |
| Body map ↔ exercise data | 17 regions = free-exercise-db's 17 categories (tested) |
| Font scale 200% | Rendered (emulated) for the active workout, portion picker, Hiku result, Health overview, Body and Settings; the remaining Train screens are specified, and will be drawn in Phase 3 |
| Data honesty | Phase 0 findings drive the Health screens (phone steps, HR without device, hidden HC estimate, pending watch data); no data ≠ 0 throughout |
| Licensing | free-exercise-db text only (no images), USDA FDC, OFL fonts, original body map and illustrations |

## What is not proven (honest list)

- **Nothing in Phase 1 ran on the phone.** The prototype is HTML. TalkBack, real font scaling, real Health Connect, notifications and Claude requests are untested.
- **Phase 0 gates are still PENDING:** Core, Claude AI, Workout wearable, Daily calories. **Phase 2 can't start until Core = GO.**
- **TR-9** (rest alert with the screen locked) is BLOCKED on a Phase 3 device spike.
- **Example data error:** the prototype labels 21 Oct as a Tuesday; in 2026 it's a Wednesday. Example data only; the specs don't depend on it.

## Carried forward

The canonical list with owners and timing is in PHASE_1_HANDOFF.md §5. The highlights:
- the Core device checks
- Claude Test A/B
- a watch day + a recorded workout
- the TR-9 spike
- a real one-handed gym session
- the USDA subset and price table
- the phone vs watch step dedup rule
- the Health Connect permission-rationale screen

## Owner approval asks

1. Approve Phase 1 (1C and 1D in particular), or list changes.
2. Confirm the build split in PHASE_1_HANDOFF.md: Phase 2 foundation, Phase 3 gym, Phase 4 nutrition.
3. Confirm the new app id `com.liftria.app` for Phase 2 (a fresh install; the diagnostics app's data doesn't carry over).
