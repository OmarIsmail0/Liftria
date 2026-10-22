# Phase 1 Handoff: from design to build

**Author:** Claude · **Date:** 2026-10-22 · **For:** the build agent (Phase 2 onward) and the owner
**Status:** handoff draft. It's final when the owner approves Phase 1 after 1D. **The owner waived the Core gate on 2026-10-22, so Phase 2 may start**; its two remaining Core checks are in the Phase 2 device checklist (see "Gates").

This file is the bridge between the Phase 1 design and the code. The build prompt for Phase 2 is [PHASE_2_PROMPT.md](PHASE_2_PROMPT.md). Phases 3 and 4 get their own prompts later, written from this handoff.

## 1. Sources of truth (read in this order)

| What | Where | Wins over |
|---|---|---|
| What exists and works on the device | `docs/PHASE_0_REPORT.md`, `docs/TECHNICAL_DECISIONS.md` | Everything else on capability questions |
| Screens, states, rules | `docs/phase1/SCREEN_SPECIFICATIONS.md`, `INTERACTION_AND_STATES.md`, `USER_FLOWS.md` | The prototype, when they disagree |
| Tokens, components, data-honesty patterns | `docs/phase1/DESIGN_SYSTEM.md` | Hard-coded values anywhere |
| Accessibility rules and measured contrast | `docs/phase1/ACCESSIBILITY.md` | Visual preference |
| What each screen is for, its entry and status | `docs/phase1/SCREEN_INVENTORY.md` | — |
| Navigation and hierarchy | `docs/phase1/INFORMATION_ARCHITECTURE.md` | — |
| How it looks and feels | `docs/phase1/prototype/liftria.html` (open in a browser; pick screen and state) | Nothing. It's a reference, **not code to port** |
| Milestone decisions and open items | `MILESTONE_1A…1D_REVIEW.md`, `MILESTONE_1C/1D_BRIEF.md` | — |

**The prototype is HTML for review only.** Rebuild every screen natively in React Native from the specs and tokens. Never copy its CSS, its example data or its prototype-only shortcuts (the state picker, the auto-advancing "analyzing" screen, example diaries).

## 2. Gates (from the Phase 0 roadmap, do not reorder)

| Gate | Status today | Unlocks |
|---|---|---|
| **Core = GO** (C1–C4 on the S22) | **Waived by the owner 2026-10-22.** C1, C2 and C4 PASS. C3 key delete → restart and Clear → 0 are moved into Phase 2's device checklist | **Phase 2 may start** |
| **Claude AI = READY** (Test A text + Test B photo on the device) | PENDING | Hiku meal analysis in Phase 4 (otherwise: design stays, the feature ships disabled with "Not available yet") |
| **Workout wearable = READY** (watch HR + sessions + steps with origin) | PENDING | Watch data in Train and Health beyond "pending" (Phase 3+). Otherwise these stay `pending` rows |
| **Daily calories = READY** (measured daily active/total energy) | PENDING | Energy in Today, Health and any target adjustment (Phase 4+). Otherwise "No measured source" stays |

A build agent **must check the current gate status in `docs/PHASE_0_REPORT.md` before starting a phase**, and must stop and report if its gate isn't met.

## 3. Feature map

Status: **Confirmed** = proven on the owner's device in Phase 0 · **Core-pending** = covered by the Core gate · **Pending** = needs a device verification gate · **Future** = designed or noted, not in V1.

### Phase 2: foundation (blocked on Core = GO)

| Feature | Screens | Capability status | Data source | Shared components | Prerequisites | Acceptance criteria |
|---|---|---|---|---|---|---|
| App shell and navigation | Capsule nav, tab roots, focus-flow rule, Settings stack | Core-pending | — | `CapsuleNav`, `Screen`, `Header`, `Sheet` | Core GO | 5 tabs. Focus routes hide the capsule. Android back never discards data. Deep links return to the origin. Safe areas and gesture navigation correct on the S22 |
| Design system | All | Confirmed (fonts are OFL) | `tokens.ts` generated from DESIGN_SYSTEM.md | Tokens, `Card` (rim), `Button`, `Chip`, `Banner`, `Snackbar`, `Stepper`, `Toggle`, `Field`, `ListRow`, `EmptyState`, `Skeleton`, `Orb`, `Ring` | — | Every value comes from tokens. Dark, light and system. Aurora Rim + Solid, with Solid automatic under high-contrast text. Contrast table in ACCESSIBILITY.md reproduced by a unit test |
| Onboarding | ON-1…ON-9 | Core-pending (HC permission UI: Confirmed) | profile, settings, SecureStore | Choice list, unit input, step indicator | Shell, design system | Every step except Welcome and Privacy is skippable. Mifflin-St Jeor target with the safety floor (EA-6 floor sheet). Reaches Today in < 2 min |
| Today | TD-1…TD-7 (Pulse Orb) | Orb: Core-pending · Activity: steps **Confirmed (phone)**, HR **Pending (origin)**, energy **not measured** | profile/target; HC steps and HR | `Orb`, deck `Card`, provenance chips | Onboarding | Phase 2 shows the first-day and no-target states truthfully (meals arrive in Phase 4, workouts in Phase 3). Phone steps are labeled Phone. HR is labeled Samsung Health + Unverified. Energy is "No measured source". The 1,565 kcal estimate is never shown as data |
| Health (read-only) | HE-1…HE-6 | Steps, HR read: Confirmed. Sessions, energy, sleep, weight: Pending | Health Connect via `src/services/health` (pagination, `no-source`) | Definition list, source rows, chart, permission rows | Shell | Every type shows exactly one of: value with source, `pending`, No data, Not allowed, Not available, `stale`. The estimate is hidden with "Show estimate". Clear-cache re-imports |
| Settings | ST-1…ST-7 | Core-pending | settings, SecureStore | Rows, toggles, danger card, typed-confirm sheet | Shell | Theme, style, units and hide-numbers apply live. Delete all removes the DB, key and files, then restarts into onboarding. Export shows as disabled Future with the warning |
| Hiku key management | ST-4, ON-8, HK-1 `nokey`/`offline` | Key storage: Confirmed (C3 partly) · Test key: Claude Pending | SecureStore; `src/services/anthropic` | Key card, masked suffix | Settings | The key is never in logs, SQLite or Git. Test key shows the real outcome and maps 401/403/429/offline to plain words |
| Phase 0 diagnostics | Hidden route | Confirmed | existing | — | — | Kept as a hidden developer screen (7 taps on the version in ST-7) for regression; removed only by an owner decision |

### Phase 3: gym (after Phase 2; watch features gated)

| Feature | Screens | Status | Notes and acceptance |
|---|---|---|---|
| Exercise library, muscles, detail | TR-4…TR-6 | Future (offline) | Bundled free-exercise-db JSON (Unlicense), **no images**. 17-category ↔ 17-region body map unit test. Stable exercise IDs |
| Templates, plans | TR-1…TR-3 | Future (offline) | Weekly + rotation plans; a plan never blocks training |
| Active workout | TR-7, TR-8, TR-10 | Future (offline) · rest notification **Pending** (TR-9 spike) | Every set saved on Log set. Undo. Suggested ≠ logged. Deadline-based rest timer. Per-type rules (dumbbell each, assisted, unilateral, body weight, warm-up). `expo-keep-awake` |
| Rest notification on lock screen | TR-9 | **BLOCKED** until the Phase 3 device spike | Test matrix in MILESTONE_1B_REVIEW. Never promise an exact alert until proven |
| History, session edit, records | TR-11…TR-13 | Future | Edit-only sessions, records recalculated, 8 s Undo on delete |
| Strength progress | PR-2 | Future | Source "From your workouts in Liftria" |
| Watch workout data | TR-10 HR/calories rows | **Pending** (Workout wearable gate) | Link, don't add (≥ 50% overlap rule); no calories from sets |

### Phase 4: nutrition (after Phase 3; Claude and calories gated)

| Feature | Screens | Status | Notes and acceptance |
|---|---|---|---|
| Diary, add food, portions, meals, custom foods | EA-1…EA-5, QA-1 | Future (offline) | Bundled USDA FDC subset; grams canonical; one diary total feeds Today and Eat; "Not logged yet" ≠ 0; 4 s / 8 s Undo |
| Targets | EA-6, ST-2 | Future | Floor < 1,200 kcal or > 25% deficit gets the gentle sheet; profile changes propose, never silently change, a target |
| Nutrition trends, body | EA-7, PR-3, PR-4, PR-6 | Future | Logged days only; weight is local, HC weight shown with its source |
| Hiku meal analysis | HK-1…HK-6 | **Pending** (Claude gate) | Before-sending panel; context off by default; JSON schema + Zod; nothing saved without confirm; every HK-5 state; image ≤ 1024px; store the original estimate and the edits |
| Energy in Today/Health | TD Activity, HE-2 energy | **Pending** (Daily calories gate) | One energy figure or none; never add active + basal + total |

## 4. Cross-cutting rules every phase must keep

1. **Data honesty** (DESIGN_SYSTEM §6): every health number has a source and an age; no data ≠ 0; estimate ≠ measured; phone ≠ watch.
2. **Local-first:** no backend, accounts or analytics. The only app-initiated network traffic is a Hiku request the user started.
3. **Privacy copy is feature-scoped** (1C): the diary stays local; Hiku sends only what the user chose.
4. **Accessibility:**
   - 48dp minimum (64dp for in-workout controls)
   - contrast per ACCESSIBILITY.md, including `color.border.control` for glass outlines (1D)
   - TalkBack labels as specified
   - 200% font scale reflow
   - reduced motion: the orb doesn't breathe, no fills animate
5. **Performance on the S22:** no live blur under cards (only the capsule and sheets); the ambient glow is a fixed background.
6. **No silent changes:** suggestions are styled apart and never become data without a tap; destructive actions confirm, and reversible ones offer Undo.
7. **Licensing:**
   - Exercise text: free-exercise-db (Unlicense), no images.
   - Food data: USDA FDC (public domain).
   - Fonts: Archivo and Figtree (SIL OFL), bundled.
   - The body map is original art.
   - No react-native-body-highlighter artwork.

## 5. Open items carried into the build

| Item | Owner | When |
|---|---|---|
| Core gate: C3 delete → restart, Clear → 0 | Owner (device) | Before Phase 2 |
| Claude Test A/B on the device | Owner | Before Phase 4 Hiku |
| A watch day + a recorded workout, then re-read | Owner | Before Phase 3 watch features |
| TR-9 rest-alert spike (test matrix in the 1B review) | Build agent + owner | Early Phase 3 |
| 200% renders for the remaining Train screens | Build agent | Phase 3 |
| Real one-handed gym session | Owner | After the Phase 3 build |
| USDA subset size, portion coverage, price table source | Build agent | Phase 4 |
| Dedup rule for phone vs watch steps | Build agent | When watch steps appear |
| Items listed in `MILESTONE_1D_REVIEW.md` | — | See that file |
