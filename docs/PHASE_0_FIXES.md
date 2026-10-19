# Phase 0 issue remediation ledger — 2026-10-19

Original independent report: [PHASE_0_ISSUES.md](../PHASE_0_ISSUES.md), tested against **644edfa**. The original findings and test outputs are historical and are not a fresh passing re-test.

| Issue | Code/document response | Validation now |
|---|---|---|
| 1 Dependency mismatch & Jest boot | Updated React Native to 0.86.3, Expo 57 library versions, and added `@react-native/jest-preset@0.86.3`. Added an npm-based validation/lockfile regeneration workflow. | **VERIFIED (CI run #4 / independent Re-test 2)**: clean npm ci and committed lockfile; no legacy peer flag. |
| 2 Workout ID undefined | Capture insert ID outside exclusive transaction callback (which returns void). Mock now matches transaction void behavior. | **VERIFIED (CI run #4 / independent Re-test 2)** in mocked Jest; physical phone transaction behavior remains PENDING_DEVICE_TEST. |
| 3 Orphaned sets | Explicitly delete test sets before sessions, also explicit delete for individual workout in its own transaction. Added 0-sets verification. | **VERIFIED in code/tests** (CI run #4 / independent Re-test 2); actual SQLite connection remains PENDING_DEVICE_TEST. |
| 4 TypeScript config/tests | Move cleartext option to `expo-build-properties`, use globalThis, explicitly type DB mock. | **VERIFIED (CI run #4 and #5 / independent Re-test 2)**: typecheck and prebuild pass. |
| 5 Negative retry-after | Numeric negative input returns null before Date.parse; regression test retained. | **VERIFIED (CI run #4 / independent Re-test 2)** by Jest regression test. |
| 6 Timeout hides long backoff | Compare requested retry delay to remaining total timeout; return rate-limited or overloaded instead of timeout, regression case for 429/60s. | Code fixed; **PENDING RE-TEST**. |
| 7 Health pagination | Follow next page token until exhausted; fail closed on token loops or 100 pages. | **VERIFIED in mocked Jest** (CI run #4 / independent Re-test 2); genuine device high-volume pagination still PENDING_DEVICE_TEST. |
| 8 Lint / test imports | Use async effect network read; place imports before Jest mocks (Jest hoists mocks). | **VERIFIED (CI run #4 / independent Re-test 2)**: lint zero errors/warnings. |
| 9 Daily energy | Add day-scoped Health Connect active/total/basal energy aggregates, cache with exact operation/window/source origins; no energy balance computation. | Code fixed; **PENDING_DEVICE_TEST**. |
| 10 On-device CRUD | Add Update last workout / Delete last nutrition buttons and follow-up reread. | Code fixed; **PENDING_DEVICE_TEST**. |
| 11 Samsung all-day data limitations | Explicit diagnostic warning that exercise-only data cannot establish full-day active/total energy; conditional SDK fallback remains separate. | **PENDING_DEVICE_TEST**, not a confirmed missing-data finding yet. |
| 12 Samsung Health Data SDK requirements | Updated setup docs with Samsung Health version, physical Android device, developer mode, partner certification and exact aggregate names. | Research/documentation only, actual SDK intentionally not integrated until need established. |
| 13 Samsung sync path | Full Samsung Health → Settings → Health Connect → App permissions path in manual steps. | Documentation updated; **PENDING_DEVICE_TEST**. |
| 14 License review | Clarified CC BY-SA exercise art, unlicensed/unclear exercise imagery, and body-highlighter SVG peer requirement. | Documentation updated; no third-party assets copied. |

## Evidence / remaining gates

The environment available to this agent has Node 22 but no Android SDK, Galaxy S22 Ultra, Galaxy Watch 4, Anthropic key or npm registry access (`EAI_AGAIN` when contacting registry.npmjs.org on 2026-10-19). Code changes in GitHub are real; **no passing npm/Jest/tsc/lint/native APK evidence has been produced by the agent in this environment**.

On a networked build machine, run `npm ci`, `npx expo install --check`, `npm run check` and `npx expo prebuild --clean --platform android`, then both APK builds and the manual checklist. If a CI workflow produces results, record its run URL and observed status here before promoting PASS. A generated lockfile is only PASS if it is committed and npm verifies it.

**Four independent readiness verdicts remain CORE PENDING, CLAUDE PENDING, WORKOUT WEARABLE PENDING, DAILY CALORIES PENDING. Phase 1 UI design may proceed; Phase 2 implementation remains blocked until CORE GO.**

## GitHub Actions run #1 (new evidence)

[Workflow run #1](https://github.com/OmarIsmail0/Liftria/actions/runs/39310163977): clean `npm install` **PASS** (1,419 packages installed without `--legacy-peer-deps`). `npx expo install --fix` **FAIL**: an unconstrained optional `react-dom@19.3.1` resolved against pinned React 19.2.3. Expo also expected Jest 29 rather than Jest 30. Follow-up pinned `react-dom@19.2.3`, `jest@~29.7.0`, and `@types/jest@29.5.14`. No lockfile or passing test result was produced by run #1.

## GitHub Actions run #2 (new evidence)

[Workflow run #2](https://github.com/OmarIsmail0/Liftria/actions/runs/39310591613): **PASS** for strict `npm install`, `npx expo install --fix`, clean `npm ci`, and `npx expo install --check`. Workflow committed a genuine `package-lock.json` (GitHub commit `3cd51e6`). Typecheck **FAIL** on obsolete Expo SDK 57 option `newArchEnabled` in `app.config.ts`. This field has now been removed. Subsequent CI is **read-only** and uses `npm ci`; no auto dependency mutations.

## GitHub Actions run #3

[Workflow run #3](https://github.com/OmarIsmail0/Liftria/actions/runs/39311024190): `npm ci` **PASS**, `npx expo install --check` **PASS**, `tsc --noEmit` **PASS** (zero errors). ESLint **FAIL** at the JSX text apostrophe in app/index.tsx, line 307. Corrected the text to remove the unescaped apostrophe. Jest was not reached in run #3.

## GitHub Actions run #4: JS/TS validation GREEN

[Workflow run #4](https://github.com/OmarIsmail0/Liftria/actions/runs/39311214769): clean reproducible `npm ci` **PASS**, Expo dependency alignment **PASS**, `tsc --noEmit` **PASS**, `eslint .` **PASS** (zero warnings), Jest **PASS** (4 suites, **22 tests**). This validates the corrected code under mocked adapters; it does **not** validate SQLite in Android, Health Connect on the phone, real Claude API, or a generated APK.

A separate GitHub Actions native build job now attempts `expo prebuild`, `assembleDebug`, and `assembleRelease`. Only mark these PASS when that job completes with evidence.

## GitHub Actions run #5 — native CNG evidence

[Run #5](https://github.com/OmarIsmail0/Liftria/actions/runs/39311475054): verification job PASS; `expo prebuild --clean --platform android --no-install` PASS on Ubuntu, validating generated Android project configuration. Debug Gradle compilation **FAILED** on runner disk exhaustion (`No space left on device`) after 27m 49s. Release **NOT RUN**; no APK artifact uploaded. This supersedes the earlier in-progress wording. Device and Watch 4 checks remain PENDING_DEVICE_TEST.

## Independent Re-test 2 — new TASK-1 to TASK-5

[Re-test 2](../PHASE_0_ISSUES.md) verifies the 14 original fixes and documents new native build/disk, report, permission, dark-style dependency, and Reanimated/Worklets alignment tasks. [Run #5](https://github.com/OmarIsmail0/Liftria/actions/runs/39311475054) **FAIL** (out of CI storage during Reanimated C++); release **NOT RUN**. No hardware result is claimed. Do not promote native APK or Core to PASS on the basis of generated source.
