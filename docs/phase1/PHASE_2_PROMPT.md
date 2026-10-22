# LIFTRIA — PHASE 2: APP FOUNDATION (build prompt)

**For:** the build agent · **Written by:** Claude (Phase 1 design lead) · **Reviewed by:** Claude, per pull request
**Precondition: the owner waived the Core = GO gate on 2026-10-22, so Phase 2 may start now.** Core is mostly proven on the S22 (C1, C2 and C4 PASS). Two checks are still unobserved: SecureStore delete → restart, and Clear → 0. They're now part of this phase's device checklist (§4, items 7 and 8). If either fails, fix it before any Phase 2 PR merges that depends on it. The other gates (Claude AI, Workout wearable, Daily calories) are **not** waived; respect them as `PHASE_1_HANDOFF.md` §2 describes.

You are building the foundation of Liftria: a private, local-first Android fitness app for one person (Galaxy S22 Ultra, Android 16; Galaxy Watch 4 as a data source only). Phase 1 designed every screen. Your job is to turn the foundation part of that design into a working React Native app. The rest comes in Phases 3 (gym) and 4 (nutrition).

## 1. Read first

1. `docs/phase1/PHASE_1_HANDOFF.md`: the feature map, gates, sources of truth and cross-cutting rules. **Your scope is its "Phase 2: foundation" table.**
2. `docs/phase1/DESIGN_SYSTEM.md`, `ACCESSIBILITY.md`, `INFORMATION_ARCHITECTURE.md`.
3. `docs/phase1/SCREEN_SPECIFICATIONS.md`, `INTERACTION_AND_STATES.md`, `USER_FLOWS.md` (flows 1, 5, 6, 7, 8, 10-all-data): the onboarding, Today, Health and Settings sections.
4. `docs/phase1/prototype/liftria.html` in a browser for the look. **Reference only, never port its HTML/CSS.**
5. `docs/TECHNICAL_DECISIONS.md` and the existing code in `src/services/*` (database, health, anthropic, secure-storage). Reuse these services; they encode Phase 0's lessons (pagination, `no-source`, key handling, exclusive transactions).

## 2. Fixed stack (don't change without asking)

- **Platform:** Expo SDK 57, React Native 0.86.3, React 19.2.3, TypeScript strict, Expo Router.
- **Storage and services:** `expo-sqlite`, `expo-secure-store`, `react-native-health-connect`, `zod`, raw `fetch` to Anthropic.
- **Pins:** `react-native-reanimated@4.5.1` / `react-native-worklets@0.10.1` stay pinned. CI must keep passing `npx expo install --check`.
- **New dependencies allowed in Phase 2** (install with `npx expo install`, nothing else without asking):
  - `expo-font` (bundle Archivo and Figtree, SIL OFL)
  - `react-native-svg` (orb ring, charts, body map later, ambient glow)
  - `expo-blur` (capsule nav and sheets only, with an opaque fallback)
  - `expo-haptics`
- **Not allowed:** backend, accounts, analytics, crash reporting services, cloud sync, ads, an AI SDK, UI kits that replace the design system.
- **App identity:** applicationId **`com.liftria.app`**, name "Liftria".
  - The Phase 0 diagnostics screen moves into the app as a hidden developer route (7 taps on the version in ST-7). Keep its tests passing.
  - Note in the PR that installing the new id is a fresh install: the diagnostics app's data does not carry over.

## 3. Build (in this order, one pull request each, each green before the next)

1. **Tokens and theme.**
   - `src/design/tokens.ts` holds every token from DESIGN_SYSTEM.md with its documented name (`color.*`, `glass.*`, `ambient.*`, `rim.*`, `orb.*`, `rest.*`, `type.*`, `space.*`, `radius.*`, `motion.*`, `color.border.control`).
   - A `ThemeProvider` handles system/dark/light and the Aurora Rim/Solid style, with Solid automatic under Android high-contrast text.
   - A unit test reproduces the ACCESSIBILITY.md contrast table from the tokens: it fails if any pair drops below its recorded minimum.
2. **Primitives:**
   - `Screen` (safe areas, the fixed ambient background)
   - `Header`
   - `Card` with `rim` = eat/train/health/hiku/none
   - `Button` (primary/secondary/ghost/train/hiku/danger, sm/md/xl)
   - `Chip` (measured, phone, estimate, pending, stale, off, hiku)
   - `Banner`, `Snackbar` (with Undo), `Sheet`
   - `Stepper`, `Toggle`, `Field`, `ListRow`, `EmptyState`, `Skeleton`
   - `Orb` (Pulse Orb + ring; breathe off under reduced motion), `CapsuleNav`

   Rules:
   - All touch targets ≥ 48dp.
   - TalkBack labels exactly as specified.
   - Each primitive has a story-like test screen in the hidden developer route.
3. **Navigation shell.**
   - 5 tabs with the capsule nav: Today, Train, Eat, Progress, Hiku.
   - Focus routes hide the capsule.
   - The Settings stack opens from the Today avatar, without the capsule.
   - Train, Eat and Hiku-analysis tab roots show an honest "Coming in Phase 3/4" empty state that uses the design system. Progress shows only its Health entry for now.
4. **Data layer.**
   - Schema migration v2 (monotonic, idempotent) adds `profile`, `settings` (key/value, typed), and `targets` (estimate vs manual, with history).
   - Keep the health cache tables and the Phase 0 provenance guards.
   - Repositories with tests.
   - **Don't** create gym or nutrition tables; Phases 3 and 4 own them.
5. **Onboarding ON-1…ON-9** per flow 1.
   - Every step after Privacy is skippable.
   - Mifflin-St Jeor × activity factor + goal adjustment exactly as ON-5 specifies, labeled Estimate.
   - The safety-floor sheet: < 1,200 kcal or > 25% deficit, the EA-6 `floor` design.
   - The Health Connect permission request through the real system screen.
   - The key saved through SecureStore.
6. **Today TD-1…TD-7.** The Pulse Orb with the target from `targets` and eaten = 0 (no meals until Phase 4). The deck shows:
   - Training: "Coming in Phase 3" card.
   - Activity: real Health Connect steps and HR **with provenance chips**. Phone steps are labeled Phone. HR from Samsung Health is labeled "Unverified" until the wearable gate passes. Energy reads "No measured source" and never shows the HC estimate.
   - Hiku: the no-key, offline and ready states.
   - Getting started.

   The offline banner uses `expo-network`. The no-target state follows TD-7.
7. **Health HE-1…HE-6** (read-only, inside Progress), per flows 5 and 8.
   - Every type shows exactly one state (value + source, pending, No data, Not allowed, Not available, stale).
   - Sources are listed separately; there's no merged total except single-origin steps.
   - Energy follows DS-1: the estimate is hidden with "Show estimate".
8. **Settings ST-1…ST-7.**
   - Theme, style, units and hide-numbers apply live.
   - ST-4: test key with real outcomes mapped to plain words; replace; delete with confirm.
   - ST-6: counts; Clear health cache; Export/backup disabled as Future with the warning; Delete all with typed "DELETE" (DB → key → files → restart into onboarding).
   - ST-7: licenses and the hidden developer route.
9. **Accessibility and polish pass.** 200% font scale on every Phase 2 screen, TalkBack walkthrough of flow 1, reduced motion, dark/light, Aurora/Solid.

## 4. Definition of done (Phase 2)

**Automated (CI on every PR):**
- `npm ci`
- `npx expo install --check`
- typecheck, lint
- Jest, including:
  - token contrast tests
  - migration v1→v2 tests
  - repository tests
  - onboarding target-formula tests (the sample profile gives 2,650; the floor triggers)
  - provenance tests (no-source energy never stored or shown as measured)
- arm64 debug + release APK build
- the merged-manifest permission check (only INTERNET and the read-only Health Connect permissions; `POST_NOTIFICATIONS` arrives in Phase 3 with the rest timer)

**On the owner's S22 Ultra** (owner-run, recorded in a Phase 2 report):
1. Fresh install of the release APK → onboarding to Today in under 2 minutes, skipping all optional steps.
2. Full onboarding with Health Connect allowed → Today shows phone steps labeled Phone and HR labeled Samsung Health + Unverified.
3. Kill and restart → profile, target, theme and style persist.
4. Airplane mode → cold start works, offline banner, Hiku shows offline, nothing waits on the network.
5. Android font size Largest → onboarding, Today, Health and Settings readable, nothing cut off.
6. TalkBack → flow 1 completes; the orb, chips and capsule tabs read as specified.
7. Settings → Delete all → typed DELETE → the app restarts into onboarding, and the key is gone (ST-4 shows no key).
8. Core leftovers from Phase 0: save a key → force-stop → reopen → the key is still there; delete it → force-stop → reopen → it's missing. Clear health cache → counts show 0 → reopen → still 0.

## 5. Rules

- **Never fabricate results.** A step is PASS only with real command output or the owner's device report. Await actual CI results before claiming them.
- **Secrets:** never log, commit or print the API key; show only the masked suffix.
- **Scope:** Phase 2 only. No gym or nutrition features, no Claude meal analysis, no watch-dependent features beyond `pending` rows.
- **Design fidelity:** use tokens and the specs. If a spec is ambiguous or impossible natively, ask in the PR instead of inventing; Claude answers design questions.
- **Branches and PRs:** one PR per step in §3, as drafts with a description of what was verified and what wasn't. Claude reviews each before merge.
- **Language:** English UI, layouts with start/end (RTL-ready).
