# LIFTRIA Phase 2: Review Issues and Tasks

Claude's review notes for the build agent, written as tasks. Work through them in order. When you finish a task, change its **Status** to `DONE (commit <sha>)` in this file, in the same commit as the fix. Never mark a task done without real CI output.

---

# Next up (updated 2026-10-24, Step 4 starts in parallel with PR #8)

**Order:**
1. ~~TASK-6 to TASK-10: visual fidelity~~ DONE in PR #6.
2. ~~Step 3: navigation shell~~ DONE in PR #7 (merged 2026-10-24; CI green, emulator check approved by Claude).
3. **TASK-4: build and signing:** open as draft PR #8. Its versionCode fix (`7526c67`) is in; Claude's final review waits on android-build and the emulator check. **Don't push to PR #8 unless a new review comment asks you to.**
4. **Step 4: data layer. Start now, in parallel** (see "Step 4: data layer" below). Add **TASK-13** (theme control) to the same PR.
5. **TASK-11 and TASK-12: orb and card polish.** One new draft PR, `Phase 2 / TASK-11–12: empty orb and card depth`, branched from `main`. Start it after Step 4's first green CI. It touches only `src/design/**` (primitives and tokens) and the tests for them.
6. Then steps 5–9 of PHASE_2_PROMPT.md §3 in order.

## Owner feedback on the emulator, 2026-10-24 (Today screen, light theme)

> "The circle at the top looks ugly and cheap, same with the squares. Also I couldn't change to dark mode."

Compare with `docs/phase1/reference/today-light.png` and `today-dark.png`. Much of Today's content is still the Step 3 placeholder (Step 6 builds the deck, the checklist and real data). These three tasks fix what's wrong **now**, in the primitives every screen uses.

### TASK-11: the empty Pulse Orb must look like a glass orb, not a flat disc
**Cause:** in `OrbArtwork`, `progress === null` draws a flat `glass.card` circle with a `glass.border` hairline. There's no gradient, no depth and no glow, so on light ambient it reads as a white plate.
**Spec (DESIGN_SYSTEM §1 "first day shows an empty glass orb"):**
1. **Fill:** the same radial sphere as the filled orb (`orb.1` centre → `orb.2` → `orb.3` edge), at **0.22 opacity in light** and **0.30 in dark**, drawn over `glass.card`. It must read as the same orb, unlit.
2. **Rim:** a 1.5dp circular stroke with a linear gradient at 140°: `glass.highlight` at 0.9 (top-left) → `orb.3` at 0.35 (bottom-right). No flat grey hairline.
3. **Halo:** a radial glow behind the orb in `orb.3`, about 1.3× the orb's radius, from 0.18 at the edge of the orb to 0 (light), 0.28 (dark). Use the existing `orbGlow*` visual tokens; add tokens rather than literals if you need new values.
4. **Highlight:** no white specular blob in **light** mode (that's the grey smudge PR #7 removed). In dark mode keep the highlight at `orbHighlightOpacity × 0.5`.
5. **No ring** without a target (spec: "never a ring against an invented target"). Ink stays `color.text.primary`, and contrast must still pass the token contrast test on the new fill (add the pair).
6. **Solid style:** unchanged (`bg.raised` + `border.strong`). Reduced motion: no breathe (already).
7. **Tests:** a unit test for the empty-orb fill opacities per mode, and the existing orb tests stay green. Add the empty orb to the primitives story so the emulator visual check shows it in both themes.

### TASK-12: cards need depth (the "squares" look flat)
**Cause:** in light mode `rim.strength` is 0.15 and `rim.glow` 0.07, `rim = 'none'` cards get no outer shadow, and there's no drop shadow at all. On the light ambient the cards look like flat white rectangles.
**Spec (prototype `.card` and the reference images):**
1. **Drop shadow on every Aurora card** (all rims, including `none`, but not `flat`), with RN 0.86 `boxShadow`: light `0 8px 24px rgba(18,22,28,0.08)` plus `0 1px 2px rgba(18,22,28,0.06)`, dark `0 10px 30px rgba(0,0,0,0.35)`. Put them in tokens (`elevation.card`), not literals.
2. **Light-mode rim:** `rim.strength` 0.15 → **0.35** and `rim.glow` 0.07 → **0.10**. Dark stays as it is.
3. **Neutral rim (`none`):** use `color.border.strong` at the rim's start stop instead of `glass.border`, so the 140° rim line is visible on light.
4. **Card fill (light):** the sheen's top stop should read whiter than the body. Check `glass.highlight` against the reference; if it's lower than about 0.9, raise it in tokens.
5. Re-run the contrast test. Secondary text on the new fill must still pass 4.5:1.
6. **Visual check section** in the PR: Today and the primitives story in light and dark, compared with `today-light.png` and `today-dark.png`. Claude compares them with the emulator screenshots.

### TASK-13: let the owner switch theme and style now (do it in the Step 4 PR)
**Cause:** `ThemeProvider` only follows the system theme, and ST-3 was planned for Step 8, so there's no in-app control.
1. Add `app/settings/appearance.tsx`, the **Appearance** part of ST-3 only:
   - Theme: System / Dark / Light
   - Style: Aurora Rim / Solid, with the line "Solid turns on by itself with high-contrast text or Reduce transparency."
   - Both are segmented controls using the existing primitives. They apply live and persist through Step 4's settings repository (`theme`, `style`). Units stay for Step 8.
2. Make the "Units and appearance" row in `app/settings/index.tsx` open it. That's the one allowed edit to that file. If PR #8 has merged by then, merge `main` first.
3. On cold start, the saved theme must apply before the first frame (hydrate before `ready`), so there's no Light → Dark flash. Add a test.
4. Ask Claude in the PR to add `liftria://settings/appearance` to the emulator visual check.

## Step 4: data layer (one new draft PR, `Phase 2 / Step 4: data layer`)

PHASE_2_PROMPT.md §3 item 4. **Branch from `main`, not from PR #8.** To keep the two PRs from conflicting, don't edit `app.config.ts`, `.github/**`, `src/config/**`, `scripts/**` or `app/settings/index.tsx` (PR #8 owns them). If you need one of them, ask in the PR; after PR #8 merges, merge `main` into your branch (a merge commit, no rebase).

1. **Migration v2** in `src/services/database/` (`DB_SCHEMA_VERSION = 2`):
   - Migrations are an ordered list (`v1`, `v2`, …). Each runs in its own `withExclusiveTransactionAsync`, ends with `PRAGMA user_version = n`, and uses `IF NOT EXISTS` so it's idempotent. A fresh install runs v1 then v2; a v1 database runs only v2. Keep the "schema is newer than app" guard.
   - Keep every v1 table and the energy provenance guards unchanged (`saveHealthValues` / `listCachedHealth`). The Phase 0 diagnostics route must keep working.
   - Rename the file from `liftria-phase0.db` to `liftria.db`. `com.liftria.app` is a fresh install, so no data is lost, and it's cheaper now than after friends have data.
2. **`profile`:** one row (`id = 1`) with name (optional, ≤ 30), `sex_for_formula` (`male` | `female` | `unspecified`), `birth_year`, `height_cm`, `weight_kg`, activity (`sitting` | `some` | `active`), goal (`lose` | `maintain` | `build`), `updated_at`. Every field except `id` is nullable: onboarding steps are skippable. Store `birth_year`, not age (ON-3 asks for age; convert with the current year). Validate with zod against ON-3's ranges (age 16–100, 120–230 cm, 35–300 kg), always in metric. Units are a setting, never a stored conversion.
3. **`settings`:** reuse the existing `app_settings` key/value table; don't add a second one. Add a typed repository with zod and a default per key: `theme` (system/dark/light, default system), `style` (aurora/solid, default aurora), `units.weight` (kg/lb), `units.height` (cm/ftin), `units.energy` (kcal only), `hideNumbers`, `keepScreenOn`, `haptics` (booleans), `onboarding.step` (number) and `onboarding.completedAt` (ISO or null). An invalid stored value reads as the default and never throws. Wire the existing ThemeProvider to persist theme and style through it.
4. **`targets`** (append-only history): `id`, `kcal`, `protein_g`, `fat_g`, `carbs_g`, `source` (`estimate` | `manual`), `inputs_json` (for an estimate: the profile values and factors used; null for manual), `created_at`. The current target is the newest row. The repository refuses `kcal < 1000` (ON-5: can't be saved). No row means "No target yet" (TD-7), never 0. Don't put the Mifflin formula here; Step 5 owns it.
5. **Don't** create gym, nutrition or weight-log tables (Phases 3 and 4).
6. **Tests** (Jest, in the style of the existing mock-backed `database.test.ts`): fresh install → v2; v1 → v2 keeps `app_settings` and both health-cache tables; running v2 twice is a no-op; newer-than-app is rejected; profile validation edges; settings defaults and invalid-value fallback; target history order, `< 1000` rejected, and no target ≠ 0. Say clearly in the PR that these are mock-backed, not proof of Android SQLite.
7. **Device check (owner):** add a "Schema version" row and the profile/targets/settings counts to the Phase 0 diagnostics route, so the owner can read them on the S22 after installing.

**Done when:** CI is green and the PR lists what was verified (CI output) and what wasn't (device).

---

## TASK-4 notes (kept for reference)

**Notes for PR #8 (TASK-4: build and signing):**
   - You **may** edit `.github/workflows/phase0.yml` for signing only: read the keystore from secrets (`LIFTRIA_KEYSTORE_BASE64`, `LIFTRIA_KEYSTORE_PASSWORD`, `LIFTRIA_KEY_ALIAS`, `LIFTRIA_KEY_PASSWORD`), decode it to a temp file, never `echo` or log any of them, and keep `permissions: contents: read`. Pull-request builds from forks have no secrets: fall back to an unsigned/debug-signed release and say so in the log.
   - Keep the PR-build `RELEASE_ARCHS` logic: pull requests must still include `x86_64` (the emulator visual check needs it). Main/release builds become `arm64-v8a,armeabi-v7a`.
   - Keep the artifact name `liftria-phase0-s22-arm64-apks` and `*release*.apk` in the file name, or ask Claude to update `visual-check.yml` in the same PR review.
   - Write the owner's step-by-step keystore instructions in the PR description (a `keytool` command the owner runs on their own computer, then the four GitHub secrets). Never generate a key in CI.

## Rules for every PR

**Lessons from PR #6 (follow them in every new screen):**
- `react-native-svg` on Android drops the alpha of `rgba()` stop colors. Always use `stopProps()` from `VisualGeometry.ts`.
- For CSS-angle gradients use `cssLinearGradient(angle, width, height)` with `gradientUnits="userSpaceOnUse"`.
- Size an `absoluteFill` `Svg` from the parent's measured `onLayout` width/height, never `"100%"` (it resolves to the wrong box).
- No large `rx` on an SVG `Rect` for pills; let the rounded, `overflow: 'hidden'` parent clip it.
- The **Visual check** workflow posts emulator screenshots of the tab screens, Settings and `liftria://dev/primitives/*` on every PR build. To add new screens to it, **ask in the PR**; Claude edits `visual-check.yml` and `.github/scripts/visual-check.sh`.

**Process rules:**
- Never add or change workflows to run npm or push commits (no `contents: write`). If you need a lockfile regenerated, say so in the PR, and Claude will do it.
- One draft PR per step; it must be green before asking for review. **Don't ask the owner to merge before Claude's review.**
- **Every UI PR gets a "Visual check" section** that lists which reference images in `docs/phase1/reference/` it should match. The owner sends phone screenshots and Claude compares them. A UI PR isn't done until it visually matches.
- Update this file's task table as you finish each task.

---

# Review 2: PR #5, Step 2 (primitives), merged before review (2026-10-22)

**Follow-up:** TASK-6 through TASK-10 are DONE (PR #6 merged 2026-10-24 after green CI, emulator screenshots and the owner's phone check).

**Verdict: CHANGES NEEDED (visual fidelity).** The structure, tokens, touch sizes, TalkBack labels and tests are good. But on the owner's phone the result doesn't look like the design. The owner's screenshot of the Primitive lab shows hard-edged solid circles, Roboto text and flat card borders.

**Root cause:** every graphic was built from flat, solid `View`s. `react-native-svg` (approved in PHASE_2_PROMPT §2) was never installed, so there are no gradients anywhere, and the fonts were never bundled (`expo-font`, also approved).

**Visual target:** `docs/phase1/reference/` holds rendered screenshots of the prototype: `ambient-dark.png`, `ambient-light.png`, `today-dark.png`, `today-light.png`, `train-home-dark.png`, `settings-dark.png`. Also open `docs/phase1/prototype/liftria.html` in a browser; its CSS in the `.screen.glass`, `.orb`, `.card::before` and `.btn-train` rules is the exact specification.

| Task | What | Status |
|---|---|---|
| TASK-6 | Ambient background: soft radial glows, not circles | DONE (PR #6, merged `cf83680`; CI green, emulator + owner phone check) |
| TASK-7 | Bundle Archivo and Figtree | DONE (PR #6, merged `cf83680`; CI green, emulator + owner phone check) |
| TASK-8 | Card: rim gradient edge, outer glow, glass sheen | DONE (PR #6, merged `cf83680`; CI green, emulator + owner phone check) |
| TASK-9 | Orb: radial gradient fill + continuous ring arc | DONE (PR #6, merged `cf83680`; CI green, emulator + owner phone check) |
| TASK-10 | Gradient on the Train button | DONE (PR #6, merged `cf83680`; CI green, emulator + owner phone check) |

## TASK-6: Ambient background (soft radial glows)

**Prompt:**
Install `react-native-svg` with `npx expo install react-native-svg`; it's approved, and if the lockfile needs regenerating, ask in the PR. Rewrite the `Screen` ambient background in `src/design/primitives/Surfaces.tsx` as **one full-screen SVG** behind the content.

- Fill the base color first: `aurora.base` (dark `#06070C`, light `#EEF0F7`).
- Then draw **four ellipses, each filled with a `RadialGradient`** that goes from the glow color at its center to **fully transparent at 70% of its radius**. These are the exact prototype values; percentages are of the screen width (rx, cx) and height (ry, cy):

| Glow | Token | Center (cx, cy) | Radii (rx, ry) |
|---|---|---|---|
| top-left | `ambient.train` | 12%, 6% | 55%, 32% |
| right | `ambient.hiku` | 98%, 32% | 60%, 34% |
| lower-left | `ambient.health` | 2%, 72% | 60%, 34% |
| bottom-right | `ambient.eat` | 92%, 96% | 55%, 30% |

- Gradient stops: offset 0 = token color (its alpha is already in the token); offset 0.7 = same color, opacity 0; offset 1 = opacity 0.
- No hard edge may be visible anywhere. Compare with `ambient-dark.png` and `ambient-light.png`.
- It's fixed: it doesn't scroll, animate or re-render on scroll (render once per screen size and theme; memoize).
- The **Solid** style draws no glows, just `color.bg.base`.
- Don't use `expo-blur` for this. A gradient is cheaper and is what the design specifies.

**Done when:** the Primitive lab background on the phone looks like `ambient-dark.png` (soft color clouds fading into black, no circle outlines), and the same in light mode.

## TASK-7: Bundle Archivo and Figtree

**Prompt:**
Install `expo-font` (approved). Add these static TTF files from the official Google Fonts repository (`github.com/google/fonts`, folders `ofl/archivo` and `ofl/figtree`, SIL Open Font License) under `assets/fonts/`, with their `OFL.txt`:
- **Archivo SemiExpanded:** Bold and ExtraBold. These are the design's 108–116% width display and number face. Android can't use variable-font axes, so use the static SemiExpanded instances.
- **Figtree:** Regular, SemiBold and Bold.

Rules:
- Load them with `useFonts` and keep the splash screen up until both the fonts and the accessibility check from TASK-2 are ready.
- Map each type token to an exact family name per weight. On Android each weight is its own `fontFamily`, so don't rely on `fontWeight` to pick it.
- Apply the tokens in `Typography` and every primitive that renders text:
  - display, title, head and metric styles use Archivo SemiExpanded
  - body, small, label and button styles use Figtree
- Metrics use `fontVariant: ['tabular-nums']`.

**Done when:** headings on the phone have the wide, heavy Archivo look of `today-dark.png`, body text is Figtree, and nothing renders in Roboto.

## TASK-8: Card rim, glow and glass sheen

**Prompt:**
In the Aurora style a section card has three parts (DESIGN_SYSTEM.md §1, "The rim"):

1. **Fill:** `glass.card`, plus a **sheen** on top: a linear gradient at 165° from `glass.highlight` to transparent at 45%.
2. **Rim:** a **1.2px edge in the section color, brightest at the top-left corner, fading along the card**. That's an SVG rounded rect stroke with a `LinearGradient` at 140°:
   - 0% = the rim color at full strength
   - 30% = the rim color at `rim.strength` (25% dark, 15% light)
   - 55% = transparent
   - 100% = the rim color at 8%

   It is **not** a solid full-color border all the way around. Neutral cards use a faint white instead of a section color.
3. **Glow:** a soft outer glow in the rim color at `rim.glow` (12% dark, 7% light), blur about 34px. Use React Native's `boxShadow` style on the New Architecture. If it isn't available on this RN version, draw an SVG blurred rect behind the card, and say which one you used in the PR.

Also remove the small colored dot next to the card title; the rim already shows the section, and the title and dot pattern is only for the Solid style.

**Solid style:** a plain `bg.surface` card with a `border.subtle` border, as already implemented.

**Done when:** cards on the phone match the cards in `today-dark.png` and `train-home-dark.png`: a glowing edge that fades from the top-left corner, not a uniform line.

## TASK-9: The Pulse Orb

**Prompt:**
Replace the three stacked solid circles in `Orb` with the design's orb (DESIGN_SYSTEM.md, "The Pulse Orb"):
- **Fill:** an SVG circle with a `RadialGradient` centered at (50%, 62%): `orb.1` at 0%, `orb.2` at 46%, `orb.3` at 100%. On top of it, a soft white highlight: a second radial gradient at (34%, 28%), white at 50% opacity, fading to transparent by 30%.
- **Glow:** an outer glow in `orb.2` at 45% (about 60px) and `orb.3` at 35% (about 120px), using the same technique as TASK-8.
- **Ring:** **one continuous SVG arc** (`stroke-dasharray` / `strokeDashoffset`), 4px wide, `domain.eat` on a `color.track` circle. Don't use separate dots or segments. With no target, draw no ring.
- **Empty (first day):** a glass circle (`glass.card` + `glass.border`) instead of the gradient, with "0 kcal eaten" in `text.primary`.
- **Label text:** `orb.ink`, using the Archivo metric style from TASK-7.
- Keep the breathe animation and the reduced-motion rule as they are; they're correct.

**Done when:** the orb on the phone matches `today-dark.png` and `today-light.png`: a smooth glowing sphere with a thin continuous ring.

## TASK-10: Train button gradient

**Prompt:**
In the Aurora style, the `train` button variant is a 135° linear gradient from `domain.train` to `train.gradEnd`. It's the only gradient button in the app. Solid style keeps the flat `domain.train`. Use SVG or `experimental_backgroundImage` if your React Native version supports it, and say which in the PR.

**Done when:** "Start workout" on the phone matches the button in `train-home-dark.png`.

---

# Review 1: PR #4, Step 1 (tokens and theme), commit `f6b1c7b` (2026-10-22)

**Verdict: APPROVE.** No blocking issues. Verified locally: typecheck, lint and Jest 70/70; CI `verify` and `android-build` green.

| Task | Where | Priority | Status |
|---|---|---|---|
| TASK-1 | `src/design/ThemeProvider.tsx` | Do on this branch | DONE (commit `3e9a670`; implementation and regression test) |
| TASK-2 | `src/design/ThemeProvider.tsx`, `app/_layout.tsx` | Do on this branch | DONE (commit `3e9a670`; startup fallback regression tests) |
| TASK-3 | `app/index.tsx` (Phase 0 diagnostics) | Do on this branch | DONE (existing branch implementation; verified in CI run #42) |
| TASK-4 | Build config, CI | Separate PR, **after step 3**, and before any APK goes to friends | OPEN |
| TASK-5 | Step 2 | **Next PR: start now** (PR #4 merged 2026-10-22) | OPEN |

---

**Verification for TASK-1 through TASK-3:** GitHub Actions [run #42](https://github.com/OmarIsmail0/Liftria/actions/runs/39803387632), `verify` step "TypeScript, lint, Jest" completed successfully on commit `3e9a670`. The Android build must separately finish before PR #4 is merged. Owner-run device checks remain: no Solid → Aurora flash on Android cold start, and diagnostics status-bar content readable in light system mode. The tests were added in a follow-up commit because the implementation files were already updated on this branch before the requested review pass. TASK-4 and TASK-5 remain OPEN by instruction.

## TASK-1: Default to dark when the system theme is unknown

**Prompt:**
In `src/design/ThemeProvider.tsx`, the system-mode resolution is `systemColorScheme === 'dark' ? 'dark' : 'light'`. When `useColorScheme()` returns `null` (not yet known, or unsupported), this falls back to **light**. The design's default is **dark** (docs/phase1/PRODUCT_UX_VISION.md: "Dark graphite by default").

- Change it to `systemColorScheme === 'light' ? 'light' : 'dark'`.
- Add a unit test for the resolution with `null`, `'light'` and `'dark'`. Extract a small pure function, e.g. `resolveMode(preference, systemScheme)`, so it's testable without rendering.

**Done when:** the test proves `null → dark`, `light → light`, `dark → dark`, and an explicit preference always wins over the system value.

## TASK-2: No Solid → Aurora flash on Android cold start

**Prompt:**
`ThemeProvider` starts Android in Solid (`highTextContrast` initial state `true`) until `AccessibilityInfo.isHighTextContrastEnabled()` resolves. That's the right safe default, but for most users (high-contrast text off) every cold start paints Solid and then switches to Aurora Rim: a visible flash.

1. Track whether the accessibility checks have resolved (a `ready` flag in the provider, exposed through `useTheme()`).
2. Keep the native splash screen up until `ready` with `expo-splash-screen` (`preventAutoHideAsync()` at module load, `hideAsync()` when ready). It's part of Expo; install it with `npx expo install expo-splash-screen` and **list it in the PR description** as a dependency addition.
3. Render the app tree only once `ready`, so the first frame already has the right style.
4. Keep the conservative fallback: if the check **rejects**, use Solid (not Aurora) and still hide the splash.
5. Add a timeout of about 1.5 s: if the check hasn't answered, hide the splash and use Solid.

**Done when:** a unit test covers resolved-true → Solid, resolved-false → Aurora, rejected → Solid, and timeout → Solid. The PR notes that the on-device check ("no style flash on cold start") is owner-run.

## TASK-3: Phase 0 diagnostics screen under the light system theme

**Prompt:**
`app.config.ts` now uses `userInterfaceStyle: 'automatic'`. The Phase 0 diagnostics screen (`app/index.tsx`) has hard-coded dark colors (`#11151C` background and light text). In light system mode, Android may draw **dark status-bar icons on that dark page**, making them unreadable.

- On the diagnostics screen, set the status bar explicitly to light content (`expo-status-bar` if already available through Expo, or React Native's `StatusBar barStyle="light-content"`). Don't add another dependency for this.
- Don't restyle the diagnostics screen otherwise. It moves behind the hidden developer route in Step 3 and keeps working for regression.

**Done when:** the status bar is set explicitly on that screen, CI is green, and the PR lists "diagnostics status bar readable in light mode" as an owner-run phone check.

## TASK-4: Build and distribution settings (separate PR, required before friends get an APK)

**Prompt:**
Open a separate draft PR named `Phase 2 / Build: app identity, Android 9+, signing`. It implements PHASE_2_PROMPT.md §2 (Devices, Signing, App identity):

1. `app.config.ts`:
   - `android.package` → `com.liftria.app`, app name "Liftria"
   - `minSdkVersion` **28** via `expo-build-properties`
   - `versionCode` read from one place and incremented for every release
2. CI (`.github/workflows/phase0.yml`, or a new release workflow):
   - The release build covers `arm64-v8a` **and** `armeabi-v7a`. The debug build can stay arm64 only.
   - **Signing:** read the keystore from GitHub Actions secrets: `LIFTRIA_KEYSTORE_BASE64`, `LIFTRIA_KEYSTORE_PASSWORD`, `LIFTRIA_KEY_ALIAS`, `LIFTRIA_KEY_PASSWORD`. Decode the keystore into the runner's temp dir, sign the release, then delete it.
   - **Never print, echo, upload or commit key material.** If the secrets are missing, build unsigned or debug-signed and label the artifact clearly as **"NOT FOR SHARING"**.
   - Keep the merged-manifest permission check. Update the expected package name.
3. In the PR description, write **exact owner steps** for creating the keystore once and adding the four secrets, using plain numbered clicks on github.com. Also warn that losing the keystore means friends can't receive updates without reinstalling.
4. Note that `com.liftria.app` is a fresh install: Phase 0 `com.liftria.diagnostics` data doesn't carry over.

**Done when:**
- CI produces a signed release APK when the secrets exist, and a clearly labeled unsigned one when they don't.
- The owner-run update test passes: install release N, add data, install N+1 over it, and the data is still there.

## TASK-5: Continue with Step 2 (primitives)

**Prompt:**
After PR #4 merges, start PHASE_2_PROMPT.md §3 **step 2, Primitives**, in a new draft PR.
- Use only tokens from `src/design/tokens.ts`. No raw colors or sizes in components.
- 48dp minimum targets.
- TalkBack labels exactly as the specs give them.
- Reduced motion respected (the Orb doesn't breathe).
- A test screen for each primitive in the hidden developer route.

If TASK-1 or TASK-2 is still open, do it there.
