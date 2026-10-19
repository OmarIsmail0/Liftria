# Phase 0 issue remediation ledger — 2026-10-19

Original independent report: [PHASE_0_ISSUES.md](../PHASE_0_ISSUES.md), tested against **644edfa**. The original findings and test outputs are historical and are not a fresh passing re-test.

| Issue | Code/document response | Validation now |
|---|---|---|
| 1 Dependency mismatch & Jest boot | Updated React Native to 0.86.3, Expo 57 library versions, and added `@react-native/jest-preset@0.86.3`. Added an npm-based validation/lockfile regeneration workflow. | **PENDING RE-TEST**: verify clean `npm ci` and committed `package-lock.json`. Never use `--legacy-peer-deps` to hide broken peer dependencies. |
| 2 Workout ID undefined | Capture insert ID outside exclusive transaction callback (which returns void). Mock now matches transaction void behavior. | Code fixed; **PENDING RE-TEST** on Jest + phone. |
| 3 Orphaned sets | Explicitly delete test sets before sessions, also explicit delete for individual workout in its own transaction. Added 0-sets verification. | Code fixed; **PENDING RE-TEST** on actual SQLite connection. |
| 4 TypeScript config/tests | Move cleartext option to `expo-build-properties`, use globalThis, explicitly type DB mock. | Code fixed; **PENDING RE-TEST** for tsc/prebuild. |
| 5 Negative retry-after | Numeric negative input returns null before Date.parse; regression test retained. | Code fixed; **PENDING RE-TEST**. |
| 6 Timeout hides long backoff | Compare requested retry delay to remaining total timeout; return rate-limited or overloaded instead of timeout, regression case for 429/60s. | Code fixed; **PENDING RE-TEST**. |
| 7 Health pagination | Follow next page token until exhausted; fail closed on token loops or 100 pages. | Code fixed; **PENDING_DEVICE_TEST** for genuine high volume. |
| 8 Lint / test imports | Use async effect network read; place imports before Jest mocks (Jest hoists mocks). | Code fixed; **PENDING RE-TEST** for lint. |
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
