# LIFTRIA Phase 2: Review Issues and Tasks

Claude's review notes for the build agent, written as tasks. Work through them in order. When you finish a task, change its **Status** to `DONE (commit <sha>)` in this file, in the same commit as the fix. Never mark a task done without real CI output.

---

# Next up (updated 2026-10-22, after PR #5 merged)

**Order:**
1. **TASK-6 to TASK-10: visual fidelity fix for the primitives** (one new draft PR, `Phase 2 / Step 2b: Aurora Rim visual fidelity`). **Do this before step 3**, because every screen is built on these primitives.
2. **Step 3: navigation shell.** The first PR the owner can *see* as real Liftria screens.
3. **TASK-4: build and signing.** After step 3, before any APK goes to friends.
4. Then steps 4–9 of PHASE_2_PROMPT.md §3 in order.

**Process rules:**
- Never add or change workflows to run npm or push commits (no `contents: write`). If you need a lockfile regenerated, say so in the PR, and Claude will do it.
- One draft PR per step; it must be green before asking for review. **Don't ask the owner to merge before Claude's review.**
- **Every UI PR gets a "Visual check" section** that lists which reference images in `docs/phase1/reference/` it should match. The owner sends phone screenshots and Claude compares them. A UI PR isn't done until it visually matches.
- Update this file's task table as you finish each task.

---

# Review 2: PR #5, Step 2 (primitives), merged before review (2026-10-22)

**Verdict: CHANGES NEEDED (visual fidelity).** The structure, tokens, touch sizes, TalkBack labels and tests are good. But on the owner's phone the result doesn't look like the design. The owner's screenshot of the Primitive lab shows hard-edged solid circles, Roboto text and flat card borders.

**Root cause:** every graphic was built from flat, solid `View`s. `react-native-svg` (approved in PHASE_2_PROMPT §2) was never installed, so there are no gradients anywhere, and the fonts were never bundled (`expo-font`, also approved).

**Visual target:** `docs/phase1/reference/` holds rendered screenshots of the prototype: `ambient-dark.png`, `ambient-light.png`, `today-dark.png`, `today-light.png`, `train-home-dark.png`, `settings-dark.png`. Also open `docs/phase1/prototype/liftria.html` in a browser; its CSS in the `.screen.glass`, `.orb`, `.card::before` and `.btn-train` rules is the exact specification.

| Task | What | Status |
|---|---|---|
| TASK-6 | Ambient background: soft radial glows, not circles | OPEN |
| TASK-7 | Bundle Archivo and Figtree | OPEN |
| TASK-8 | Card: rim gradient edge, outer glow, glass sheen | OPEN |
| TASK-9 | Orb: radial gradient fill + continuous ring arc | OPEN |
| TASK-10 | Gradient on the Train button | OPEN |

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
