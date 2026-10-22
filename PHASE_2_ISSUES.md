# LIFTRIA Phase 2: Review Issues and Tasks

Claude's review notes for the build agent, written as tasks. Work through them in order. When you finish a task, change its **Status** to `DONE (commit <sha>)` in this file, in the same commit as the fix. Never mark a task done without real CI output.

---

# Next up (updated 2026-10-22, after PR #4 merged)

**Order:**
1. **TASK-5: Step 2, primitives** (new draft PR from the latest `main`).
2. **Step 3: navigation shell.** This is the first PR the owner can *see* on the phone: 5 tabs with the floating capsule nav, Settings stack, focus-flow rule, and honest "Coming in Phase 3/4" placeholders on tab roots that aren't built yet. Do it right after step 2.
3. **TASK-4: build and signing.** After step 3, before any APK goes to friends.
4. Then steps 4–9 of PHASE_2_PROMPT.md §3 in order.

**Process rules (from Review 1):**
- Never add or change workflows to run npm or push commits (no `contents: write`). If you need a lockfile regenerated, say so in the PR, and Claude will do it.
- One draft PR per step; it must be green before asking for review.
- Update this file's task table as you finish each task.

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
