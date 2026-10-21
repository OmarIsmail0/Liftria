# Liftria Phase 0 — evidence report

Generated 2026-10-19. **Phase 0 NOT APPROVED.** No actual S22 Ultra / Watch 4 session took place. CI APK compilation, release bundle and signing were verified separately; they are not a physical-device test.

## Environment evidence

- Execution host: Linux container, Node `v22.16.0`, npm `10.9.2`, global TypeScript `5.8.3`. No configured ANDROID_HOME / Android Studio SDK.
- `npm view expo version --json --fetch-timeout=8000` timed out (registry access unavailable). Direct `git ls-remote` from container failed DNS: `Could not resolve host: github.com`. GitHub repository updates instead used the authorized connected GitHub integration.
- Android phone/Watch not connected; Android prebuild PASS, debug Gradle build FAILED on CI disk exhaustion, no on-device logs.
- Independent CI-style container testing at commit `644edfa` was later recorded in `PHASE_0_ISSUES.md`: clean npm install, strict tsc, lint and Jest boot initially failed; after a temporary Jest setup, 16/17 tests passed. Remediation commits address these findings, and were independently re-tested. CI run #4 and subsequent run #5 PASS reproducible install, strict TypeScript, lint and 22/22 Jest tests. Run #5 PASSED prebuild but FAILED on disk exhaustion during debug APK compilation; release NOT RUN; no device integration evidence.

## Status table

| Check | Status | Evidence / required action |
|---|---|---|
| GitHub repository and committed source | **PASS** | Connected GitHub API reports completed commits to `main`; inspect source files |
| Dependencies/npm install + lockfile | **PASS** | GitHub Actions run #2: strict install, `npm ci`, Expo dependency alignment succeeded; `package-lock.json` committed in `3cd51e6` |
| Expo Android prebuild | **PASS** | GitHub Actions run #9 and run #5 completed `npx expo prebuild --clean --platform android --no-install`; Health Connect permission **UI** still PENDING_DEVICE_TEST |
| Android debug `assembleDebug` | **PASS (run #9)** | ARM64 Gradle build succeeded; uploaded test APK artifact; run #5 disk failure is historical |
| Debug APK installation on S22 Ultra | **PENDING_DEVICE_TEST** | No device access or installation logs |
| Embedded-bundle release `assembleRelease` | **PASS (run #9)** | ARM64 Gradle build and artifact upload succeeded; local-test-signed APK, offline startup still needs phone test |
| Release APK install and offline test on S22 Ultra | **PENDING_DEVICE_TEST** | No device access or release installation logs |
| Strict typecheck | **PASS** | GitHub Actions [run #4](https://github.com/OmarIsmail0/Liftria/actions/runs/39311214769): `tsc --noEmit` zero errors |
| ESLint | **PASS** | GitHub Actions run #4: `eslint .` zero errors or warnings |
| Jest SQLite CRUD/migration, Claude error, schema and normalization tests | **PASS** | GitHub Actions run #4: 4/4 suites, 22/22 tests; mocked contracts only, not device integration |
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
| Embedded APK airplane-mode startup/storage/cache/API failure | **PENDING_DEVICE_TEST** | Embedded-bundle APK and v2 signature verified by [artifact audit](https://github.com/OmarIsmail0/Liftria/actions/runs/39390684453); no actual airplane-mode phone test |

## Corrections and known limitations

- Library support is not data coverage. The library's history permission response can be unreliable ([upstream #276](https://github.com/matinzd/react-native-health-connect/issues/276)).
- All health read rows currently show **PENDING_DEVICE_TEST**; do not copy documentation support into the "data present" column.
- Adapter now follows Health Connect continuation tokens (verified by mock test); real high-volume pagination remains PENDING_DEVICE_TEST.
- Android 14+ rationale alias must be **functionally** exercised, not inferred from plugin documentation.
- Dependency versions and lockfile were resolved by `npm ci` and Expo check in CI; Native Reanimated and Worklets versions are now aligned with Expo SDK 57, as verified by npm ls and run #9.
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

## Updated GitHub evidence (2026-10-19)

- [Actions run #4](https://github.com/OmarIsmail0/Liftria/actions/runs/39311214769): reproducible npm ci, Expo dependencies, tsc, eslint, and all **22/22** tests PASS.
- [Actions run #5](https://github.com/OmarIsmail0/Liftria/actions/runs/39311475054): verification job PASS and `expo prebuild --clean --platform android --no-install` PASS. The debug APK build **FAILED** after 27m 49s due to runner disk exhaustion (`No space left on device` while compiling Reanimated C++). `assembleRelease` **NOT RUN**. Neither APK was uploaded. This is a failed CI build, not a proven native-code defect.
- The original `PHASE_0_ISSUES.md` captures older failures at `644edfa`; see `docs/PHASE_0_FIXES.md` for fix-by-fix code and evidence.

## Re-test 2 follow-up (2026-10-19)

[Independent re-test summary](../PHASE_0_ISSUES.md) confirms ISSUE-1 through ISSUE-10 fixed (code/automated checks), ISSUE-11–14 addressed in docs, and records 5 new tasks. GitHub Actions [run #5](https://github.com/OmarIsmail0/Liftria/actions/runs/39311475054) **failed** on available CI disk space; the release task and APK upload did not run. C1 and Core GO remain blocked until both APKs compile, upload and pass S22 Ultra installation/offline tests. Do not treat prebuild PASS as APK PASS.

## Re-test 2 remediation evidence (2026-10-19)

- [CI dependency refresh](https://github.com/OmarIsmail0/Liftria/actions/runs/39319967346): Expo-system-ui, Reanimated 4.5.1 and Worklets 0.10.1 installed with Expo; `npm ls` shows no invalid packages; lockfile committed as `7860a33`.
- [New read-only CI run #7](https://github.com/OmarIsmail0/Liftria/actions/runs/39320193305): repeatable `npm ci`, `npx expo install --check`, peer dependency tree, TypeScript, lint, Jest, disk cleanup, Expo Android prebuild and source manifest inspection **PASS** at the time of this record. **Debug and release Gradle outcomes still pending**. Do not claim APK or installation PASS until real output exists.
- Release signing for eventual Play Store remains separate from CI's locally signed/test-build artifact. A signed APK compiled in CI is not a physical-device test.

## CI native build resolution and device handoff (2026-10-20)

[Successful Actions run #9](https://github.com/OmarIsmail0/Liftria/actions/runs/39326177878) at commit `c1de298`: strict npm, Expo check, TypeScript, ESLint and Jest **22/22 PASS**. Native ARM64 debug and release APK compilation **PASS**; APK artifact upload **PASS** ([artifact](https://github.com/OmarIsmail0/Liftria/actions/runs/39326177878/artifacts/12223183918)); release merged-manifest permission check **PASS**. This supersedes historical FAILED run #5 and formerly pending run #7. No APK has been installed on the owner's actual S22 Ultra and no real Watch 4, Health Connect, Claude key or airplane-mode validation was observed. **Every independent device verdict remains pending**. See [PHASE_0_HANDOFF.md](PHASE_0_HANDOFF.md). Later source changes require a matching new green APK build; never use the run #9 artifact as evidence for a newer source commit.

## APK static integrity audit (2026-10-20)

[APK artifact audit run](https://github.com/OmarIsmail0/Liftria/actions/runs/39390684453) **PASS** for run #9 artifacts: both `app-debug.apk` and `app-release.apk` exist and pass Android `apksigner verify --verbose` with v2 signatures; release has `com.liftria.diagnostics`, `minSdkVersion 26`, `assets/index.android.bundle` and `lib/arm64-v8a/` binaries. Release SHA-256: `0b2fe93c551b3adb1eef0d6ef18a2673a0980d49b576e6b4c335ad9312b914be`; debug SHA-256: `60b1d97f4d8e4feb5c0fb517a0e28172de55e03cae876a2138c3b3864871b306`. These exact hashes belong to run #9 only. The audit workflow runs automatically for subsequent successful full CI. This demonstrates self-contained signed build *packaging*, not actual offline startup or watch/Claude functionality.

## Device test 1: owner's S22 Ultra (2026-10-21)

Source: in-app **Export report** generated 2026-10-21T12:02:04Z on `samsung SM-S908E`, Android 16 (API 36), app 0.0.1 (build 1, run #14 APK, commit `9ed3a86`). The pasted log was cut off after its first entries.

| Check | Status | Evidence |
|---|---|---|
| Release APK installs and starts on S22 Ultra (C1) | **PASS** | Report generated on the device; `[App] Started` logged |
| SQLite migration | **PASS** | `Schema v1 initialized` |
| SQLite persistence across restart (C2) | **PASS** | 2026-10-21 Read shows 6 workouts / 6 sets / 6 meals with marker `2026-10-20T19:57:55Z` written the previous day |
| SQLite Clear → 0 | **PENDING_DEVICE_TEST** | Not visible in the truncated log |
| SecureStore save + restart + delete (C3) | **PENDING_DEVICE_TEST** | Key ends `ready (masked)`; one `malformed` save attempt logged; restart/delete sequence not visible |
| Offline startup + offline API failure (C4) | **PENDING_DEVICE_TEST** | Offline section `Not tested` |
| Claude Test A / Test B | **PENDING_OWNER_TEST** | Claude section `Not tested` |
| Health Connect availability + permissions | **PASS** | `Availability: available`; all 10 read permissions `granted` |
| History permission | **PENDING_DEVICE_TEST** | `unverified` |
| Watch-originated data in Health Connect | **FAIL (config, fixable)** | Samsung Health (`com.sec.android.app.shealth`) contributed **no** records. Steps: 26 records, all from `com.android.healthconnect.phone.*` on device `SM-S908E`, which is Android 16's own phone step tracking, not the Watch 4. Heart rate, exercise, sleep, calories and body composition: `empty`. |
| Daily energy aggregates | **NOT REAL DATA** | Every day: active 0.0, total 1564.5, basal 1564.5, `dataOrigins` empty, and today's partial day also 1564.5. These are Health Connect's own estimates with no contributing app. The app now labels such rows `no-source` and never caches them. |

**Verdicts after device test 1**
- **Core:** PENDING. C1 and C2 PASS; C3 (SecureStore restart/delete) and C4 (offline) not yet observed.
- **Claude AI:** PENDING. Not tested on the device.
- **Workout wearable:** PENDING. Fixable issue open: Samsung Health → Health Connect write sync appears off. Corrective action: Samsung Health → ⋮ → Settings → Health Connect → allow Samsung Health to write all types, confirm the watch has synced in Samsung Health, then re-run Read 7 days. If records still don't appear from `com.sec.android.app.shealth`, this becomes the Samsung Health Data SDK trigger in spec §6.2.
- **Daily calorie tracking:** PENDING. No source data yet (same corrective action). The observed values must not be used as TDEE.

## Device test 2: owner's S22 Ultra (2026-10-21, 12:18Z)

Source: in-app Export report generated 2026-10-21T12:18:09Z (same device and APK as test 1; pre-`af72e6a` build, so daily rows still show `ok`/`unknown`). The pasted log was cut off after 8 of its 20 entries.

| Check | Status | Evidence |
|---|---|---|
| Offline cold start + local DB (C4) | **PASS** | App started with `Network: Offline`; `Schema v1 initialized` while offline |
| Offline Claude failure is graceful (C4) | **PASS** | `Offline Claude test: offline — You're offline. Claude requires internet.`; no crash |
| SecureStore persists across restart (C3, part) | **PASS** | `API key: ready (masked)` logged at app start after restart |
| SecureStore delete → restart → missing (C3, part) | **PENDING_DEVICE_TEST** | Not yet run |
| Samsung Health → Health Connect sync | **STARTED** | First record from `com.sec.android.app.shealth`: 1 heart-rate series at 2026-10-21T12:15:08Z. No device metadata on the record; the S22 Ultra has no heart-rate sensor, so it almost certainly came from the Watch 4. |
| Steps from Samsung Health / watch | **PENDING_DEVICE_TEST** | Steps still only from `com.android.healthconnect.phone.*` (phone) |
| Exercise sessions, active/total energy from Samsung Health | **PENDING_DEVICE_TEST** | Still empty; daily totals still the Health Connect estimate (1564.5, no origin). Samsung Health appears to sync new data only after the connection was enabled, not history. |

**Verdicts after device test 2**
- **Core:** PENDING. C1, C2 and C4 PASS. Remaining: SecureStore delete → restart → `missing`, and Clear test data → Read shows 0.
- **Claude AI:** PENDING. Test A / Test B not yet run online.
- **Workout wearable:** PENDING. The sync now works (first Samsung Health heart-rate record). Corrective action: wear the watch for a day and record one workout on it, then re-read.
- **Daily calorie tracking:** PENDING. Waiting for Samsung Health energy data.

## Additional device feedback safeguard (2026-10-21)

The first and second S22 exports were produced from an APK predating the `no-source` safeguard, with 21 unattributed cached aggregates. The current code makes no-source energy output ineligible for caching and an additional fix caps the current-day aggregation window at the read timestamp (avoiding next-midnight/future hours). Health Connect permission state now refreshes before each user-requested Health Connect reading, rather than remaining visually `not checked` after app restart. These are code changes, **not new phone evidence**. Android installation and Watch 4 provenance must be rechecked on the latest successfully built APK.
