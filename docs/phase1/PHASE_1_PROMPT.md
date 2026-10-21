# LIFTRIA — PHASE 1: UI/UX DESIGN (approved prompt)

You are a senior product designer, Android UX architect and technical design lead. Design **Liftria**, a premium, local-first nutrition, gym and health app with an AI companion called **Hiku**.

**This phase is design only.** Do not implement production screens, change runtime behavior, replace the Phase 0 diagnostics app, or start Phase 2.

Work in four milestones. **Stop after each one for owner review** before starting the next:

| Milestone | Scope |
|---|---|
| **1A** | Context, information architecture, visual direction, design system, Home, onboarding, and the cross-cutting states (§6) |
| **1B** | Gym and workout experience |
| **1C** | Nutrition and Hiku |
| **1D** | Health and wearables, Progress, Settings and privacy, final handoff and quality report |

Commit directly to `main` (the owner has approved this). Never overwrite Phase 0 evidence.

---

## 1. Read first

`README.md`, `docs/PHASE_0_REPORT.md` (including the device tests), `docs/PHASE_1_READINESS.md`, `docs/TECHNICAL_DECISIONS.md`, `docs/HEALTH_INTEGRATION.md`, `docs/OPEN_SOURCE_REVIEW.md`, `docs/DEVICE_TESTS.md`. The latest repository evidence is authoritative. Never present an unverified capability as working.

Roadmap (do not reorder): Phase 0 feasibility → **Phase 1 design** → Phase 2 app foundation (blocked until Core = GO) → Phase 3 gym → Phase 4 nutrition.

## 2. Fixed constraints

- **Target:** Samsung Galaxy S22 Ultra (Android 16) + Galaxy Watch 4. React Native + Expo + TypeScript. One personal user.
- **No** backend, cloud database, account, login, subscription or payment. Local-first; core features work offline.
- SQLite for app data. Android secure storage for the Anthropic API key. Health Connect is the health integration. Samsung Health Data SDK only if device testing proves it necessary.
- **No Galaxy Watch app.** The watch is a data source through Samsung Health → Health Connect only. Do not design watch screens.
- **Hiku** is the product name of the assistant. It calls the Anthropic Claude API (currently the model `claude-haiku-5-5`; "Haiku" is the model, "Hiku" is the product). Hiku is never an offline or on-device model.
- **Language:** English only for V1. Use logical start/end layout so right-to-left can be added later without redesign.

## 3. Phase 0 device findings: fixed design inputs

These were observed on the owner's S22 Ultra and must shape the design:

1. Health Connect steps can come from **the phone itself** (`com.android.healthconnect.phone…`, device `SM-S908E`), not the watch. Phone steps and watch steps must be distinguishable.
2. With no contributing app, Health Connect returned **active 0, total = basal = 1564.5 kcal every day**, with no data origin. This is an estimate. It must never be shown as measured expenditure. The app labels it `no-source`.
3. Samsung Health appears to sync **only new data after the connection is enabled**, not history. Design for "data starts from the day you connected".
4. Samsung Health heart-rate records arrived **without device metadata**. Provenance can show the source app, but may not be able to prove "from your watch".
5. Workouts, sleep, active energy and body composition from the watch are **not yet verified**. Claude (text and photo) is **not yet tested on the device**. Mark every dependent feature with its verification status.

## 4. Decisions already made (use these defaults)

- **Calorie target:** estimated from the user's profile with the Mifflin-St Jeor formula × an activity factor. Always labeled "Estimated target". The user can override it manually. Watch-based energy can adjust it **only** once Daily calories = READY. Never add active, basal and total together.
- **Food data:** a bundled local data pack from **USDA FoodData Central** (public domain), plus user-created foods and recents. **Open Food Facts** (ODbL, share-alike) is only an optional future add-on, with its license obligations documented. No online food search is assumed.
- **Exercise data:** **free-exercise-db** JSON (Unlicense) for names, muscles and instructions. **Do not use its images** (provenance disputed). Do not reuse **react-native-body-highlighter** SVG artwork until its rights are verified. Design an original anatomy/muscle illustration style instead.
- **Notifications:** the rest timer and optional reminders use local notifications. Design the Android notification permission prompt and the "timer keeps running with the screen locked" behavior.
- **Backup:** local-only means losing the phone loses the data. Design export/backup screens as a **future** feature with an honest warning. Do not imply it exists.

## 5. Health and safety guardrails

- Never suggest calorie targets below a safe floor (flag anything under roughly 1,200 kcal/day or a deficit above about 25% of the estimated target). Use gentle, nonjudgmental language about food and weight. Show no "bad food" labels or shame messaging.
- Hiku never gives medical diagnoses, and never claims perfect food recognition or data the app doesn't have.
- Provide a way to hide weight and calorie numbers on the dashboard.

## 6. Cross-cutting states (required everywhere relevant)

Loading, empty, populated, offline, error, permission denied, unsupported, partial data, stale data (with a last-updated time), success, confirmation.

Give special treatment to: no API key · no internet · Claude failure, rate limit or refusal · watch data missing or unverified · Health Connect off · no calorie target · **no energy source vs. zero vs. estimate** · first-time user with no history.

Always distinguish: phone vs. watch steps · active vs. basal energy · total daily expenditure vs. exercise calories · measured vs. estimated · no data vs. zero · unsupported vs. permission denied · fresh vs. stale.

## 7. Design direction

Premium, modern and minimal. A distinctive identity, not a generic dashboard or an unmodified component library. Polished dark theme first, plus light. Restrained accents for nutrition, activity, progress and AI. Strong contrast. One-handed use on the S22 Ultra (primary actions in the bottom half). Respect safe areas, cutouts, gesture navigation, the keyboard, font scaling up to 200%, and reduced motion.

## 8. Screens

Navigation is yours to propose (a starting point: Home · Gym · Nutrition · Hiku · Progress, with Settings reachable from Home). Justify it.

- **1A:**
  - Onboarding: welcome, privacy and local storage, optional profile and goals, Health Connect intro, watch guidance, optional API key, done.
  - Every integration is skippable.
  - Home dashboard, in both rich-data and minimal-data versions.
- **1B:**
  - Gym home, exercise library and detail, muscle browsing.
  - Create and edit workouts, templates and plans.
  - Active workout with sets, reps and weight, rest timer, previous performance, finish summary.
  - History, exercise progress and personal records, edit and delete.
  - The whole flow must work fully offline without the watch.
- **1C:**
  - Nutrition dashboard, diary by meal, add meal (manual, search the local food pack, recents, custom food).
  - Portions, macros, meal detail, edit and delete, history and trends, targets and settings.
  - **Hiku:** welcome, chat, suggested prompts, text and photo meal analysis.
  - **Editable structured results with confirm-before-saving.**
  - API key setup, token and cost transparency, loading, cancel and retry, offline, auth, rate-limit and refusal errors, and controls over what context is shared.
  - Features beyond Phase 0's single-shot structured meal analysis (for example multi-turn chat with personal context) are marked **future / pending verification**.
- **1D:**
  - Health overview, the Health Connect connection and permission flow, Samsung Health sync guidance.
  - Steps, heart rate, exercise sessions, energy and sleep, each with source, provenance and last-updated details.
  - Troubleshooting for missing watch data.
  - Progress and analytics: every chart has a defined data source and a defined empty state.
  - Settings: profile, goals, units, theme, API key, AI privacy, health permissions, local data management, delete-all confirmation, export/backup (future), about and help.

## 9. User flows (assign each to its milestone)

1. First launch → onboarding → dashboard.
2. Create a workout → start → log sets → finish.
3. Add a meal manually → edit → save.
4. Pick a meal photo → Hiku → review and correct → save.
5. Connect Health Connect → permissions → inspect data and sources.
6. Set up an API key → first AI request.
7. Open with no internet → continue offline.
8. Investigate missing watch data.
9. Review progress.
10. Edit or delete existing data.

Each flow specifies actions, feedback, validation, cancel, confirmation and error recovery, with no dead ends.

## 10. Deliverables

Figma is not available. Deliver:

1. **A clickable HTML prototype** under `docs/phase1/prototype/`. Self-contained, no external network required, viewable on a phone, with a dark/light toggle. It covers the milestone's key screens **and** their important states. This is the high-fidelity deliverable.
2. **Specifications** in `docs/phase1/`:
   - `PRODUCT_UX_VISION.md`, `INFORMATION_ARCHITECTURE.md`, `DESIGN_SYSTEM.md` (tokens with implementation-ready names), `SCREEN_INVENTORY.md`, `USER_FLOWS.md`, `SCREEN_SPECIFICATIONS.md`, `INTERACTION_AND_STATES.md`, `ACCESSIBILITY.md`.
   - In 1D also `PHASE_1_HANDOFF.md` and `PHASE_1_REPORT.md`.
   - Each milestone adds its sections to these files.
3. **Screen inventory:** for each screen give its purpose, entry point, data shown, actions, states and feature dependencies, plus verification status: confirmed / pending device test / future.
4. **Handoff (1D):** for every feature give its target phase (2/3/4), confirmed vs. pending capability, data source, shared components, prerequisites and acceptance criteria.

## 11. Quality review (each milestone)

Do a screen-by-screen checklist marked PASS / NEEDS REVISION / BLOCKED. Cover:
- visual consistency, navigation (no dead ends) and dark/light themes
- contrast and touch targets (at least 48dp), font scaling and reduced motion
- offline behavior, privacy disclosures and data provenance
- the safety guardrails in §5 and one-handed reach on the S22 Ultra
- local-first feasibility
- that nothing unverified is described as working

Fix what you can, and document what you can't.

## 12. Boundaries

**Allowed:** design files, prototype HTML, diagrams, docs.

**Not allowed:** production screens, runtime changes, new dependencies in the app, databases or migrations, native integrations, workout or nutrition features, backend or cloud services. Do not declare Phase 0 passed, and do not start Phase 2.

Record technical concerns for the correct later phase instead of fixing them now.

## 13. Done (per milestone)

The milestone's screens and states are specified. The prototype shows them in dark and light. Its flows are documented. The checklist is complete. Unverified items are labeled. **Phase 1 is approved only by the owner after 1D.**
