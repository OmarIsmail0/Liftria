# Liftria Phase 0 — evidence report

Generated 2026-10-19. **Phase 0 NOT APPROVED.** No actual S22 Ultra / Watch 4 session took place. Source control commits alone are not Android compatibility evidence.

## Environment evidence

- Execution host: Linux container, Node `v22.16.0`, npm `10.9.2`, global TypeScript `5.8.3`. No configured ANDROID_HOME / Android Studio SDK.
- `npm view expo version --json --fetch-timeout=8000` timed out (registry access unavailable). Direct `git ls-remote` from container failed DNS: `Could not resolve host: github.com`. GitHub repository updates instead used the authorized connected GitHub integration.
- Android phone/Watch not connected; no Android Gradle prebuild/build output or device logs.
- Independent CI-style container testing at commit `644edfa` was later recorded in `PHASE_0_ISSUES.md`: clean npm install, strict tsc, lint and Jest boot initially failed; after a temporary Jest setup, 16/17 tests passed. Remediation commits address these findings, but **there is not yet a passing re-run of updated source**. Android prebuild/build and device integration still have no evidence.

## Status table

| Check | Status | Evidence / required action |
|---|---|---|
| GitHub repository and committed source | **PASS** | Connected GitHub API reports completed commits to `main`; inspect source files |
| Dependencies/npm install + lockfile | **PENDING RE-TEST** | Old install failed (ISSUE-1). Pinned RN 0.86.3 and Jest preset; lockfile still needed via npm with registry access |
| Expo prebuild manifest (including Health Connect rationale) | **BLOCKED** | No local Android SDK / install; owner run commands in DEVICE_TESTS.md |
| Android dev-client `assembleDebug` + install | **BLOCKED** | No SDK, Gradle build, or device observed |
| Android self-contained signed release + install | **BLOCKED** | No SDK, key, Gradle build, or device observed |
| Strict typecheck and lint | **PENDING RE-TEST** | Old run failed (7 TS errors; 1 lint error). Corrections committed; no new completed run |
| Jest SQLite CRUD/migration, Claude error, schema and normalization tests | **PENDING RE-TEST** | Old 16/17 result after workaround. Mock corrected; new regressions added; cannot claim PASS |
| SQLite migration on phone | **PENDING_DEVICE_TEST** | Run Init then check schema 1 |
| SQLite CRUD / transactions on phone | **PENDING_DEVICE_TEST** | Test Add/Read/Clear and settings |
| SQLite persists after force-stop and restart | **PENDING_DEVICE_TEST** | See DEVICE_TESTS.md |
| SecureStore save, restart persistence and delete | **PENDING_DEVICE_TEST** | See DEVICE_TESTS.md |
| Claude model + structured Test A (real key) | **PENDING_OWNER_TEST** | Owner must enter private key and run text request |
| Claude image Test B with **real photo** | **PENDING_OWNER_TEST** | Not verified; owner must select and run a photo |
| Claude offline, 401, 429, 529, timeout, truncation, refusal states | **PENDING_OWNER_TEST** | Static handlers and mocked tests authored, not executed on phone |
| Health Connect availability and Android permissions | **PENDING_DEVICE_TEST** | No physical evidence |
| Watch-originated steps/HR/exercise sessions | **PENDING_DEVICE_TEST** | No physical evidence |
| Daily active / daily total / resting / exercise energy | **PENDING_DEVICE_TEST** | No physical evidence; don't infer daily totals from HC types |
| Sleep/body composition + full validation matrix | **PENDING_DEVICE_TEST** | No physical evidence |
| Embedded APK airplane-mode startup/storage/cache/API failure | **PENDING_DEVICE_TEST** | No signed JS-embedded APK or airplane-mode device test |

## Corrections and known limitations

- Library support is not data coverage. The library's history permission response can be unreliable ([upstream #276](https://github.com/matinzd/react-native-health-connect/issues/276)).
- All health read rows currently show **PENDING_DEVICE_TEST**; do not copy documentation support into the "data present" column.
- Current adapter reads first page (1000 entries) per type, with no verified pagination. If a continuation token appears, implement pagination and re-test before declaring complete seven-day coverage.
- Android 14+ rationale alias must be **functionally** exercised, not inferred from plugin documentation.
- Version ranges still require actual npm resolution and `expo install --fix`.
- SecureStore cannot remove the intrinsic risk of a direct on-device API key; use Anthropic spend controls.

## Required owner sign-off evidence

Record: machine versions, npm lock hash, `npx expo install --check`, `npm run check` output, Android manifest inspection, both Gradle build outputs, APK package/version/installation, force-stop persistence, SecureStore lifecycle, real Claude outputs sans key, Health Connect permissions, 7-day metric table and Samsung Health comparison, airplane-mode result with Metro fully detached.

## Four provisional verdicts

| Independent verdict | Result | Why |
|---|---|---|
| Core offline foundation | **PENDING** | C1–C4 have no installed on-device evidence |
| Claude AI | **PENDING** | No real owner key/text/image test |
| Workout wearable (HR + session + steps) | **PENDING** | S22 Ultra / Watch 4 not tested |
| Daily calorie tracking | **PENDING** | No verified daily active/total energy or overlap comparison |

**Roadmap:** Phase 1 **UI/UX design may proceed** with feature-readiness labels. Phase 2 foundation **MUST NOT start** until Core = GO. Phase 3 watch features require wearable READY or explicit descope. Phase 4 daily energy requires calorie READY or explicit descope. See PHASE_1_READINESS.md.
