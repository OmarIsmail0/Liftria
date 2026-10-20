# LIFTRIA Phase 0: Test Results and Issues

# Re-test 3: commit `af45b18` (2026-10-20)

Review of the 5 commits after the CI fix (`c1de298`): diagnostics polish, the APK audit workflow, the handoff doc, and report updates.

| Check | Result |
|---|---|
| `npm ci`, `tsc`, `eslint`, Jest | **PASS**: 22/22 tests, run locally from a clean install |
| Full CI on code commits | **PASS**: [run #10](https://github.com/OmarIsmail0/Liftria/actions/runs/39390420651) and [run #12](https://github.com/OmarIsmail0/Liftria/actions/runs/39390684476). Run #11 was cancelled because a newer queued run replaced it, which is expected concurrency behavior. |
| APK audit workflow | **PASS**: apksigner, package name, embedded JS bundle and ARM64 libraries all checked. `actionlint` clean. |
| Code changes (`5039a42`) | **OK**: `model_context_window_exceeded` is now treated as truncation (tested). Health read errors show their code. The key field clears when the key is deleted. A "Clear photo" button was added. Health reads can't overlap daily reads. |

**Fixed directly in this re-test:**
- **TASK-2 was not actually finished.** `PHASE_0_FIXES.md` said the malformed table row had been split, but 3 rows in `docs/PHASE_0_REPORT.md` still contained a literal `\n`, which merged them into the row above. All 3 are now real rows.
- **The audit workflow was tied to an expiring artifact.** Its `push` trigger and its `workflow_dispatch` default both pointed at run #9, whose artifact expires 2026-10-26. After that date, any edit to the workflow would have failed it. I removed the push trigger and the hard-coded default, so it now runs after each successful CI run, or manually with a run ID you choose.
- **A precaution in the audit's library check.** `unzip | grep -m 3` under `set -o pipefail` can fail if `grep` exits early. I couldn't reproduce it, but it's now replaced with a count check.

**Note for the owner:** to test the newest code, use the APK from **run #12** (commit `9875c00`). The later commits only changed docs and workflows, so the app code is identical, and the run #9 APK is older code. Both expire 7 days after their run.

No new tasks for the implementing agent. Phase 0 is now waiting only on the S22 Ultra / Watch 4 / API key device tests in `docs/PHASE_0_HANDOFF.md`.

---

# Re-test 2: commit `420c771` (2026-10-19)

> **Historical independent review.** This section describes findings at commit `420c771`, not the current branch verdict. Updated fixes and evidence: [docs/PHASE_0_FIXES.md](docs/PHASE_0_FIXES.md), [docs/PHASE_0_REPORT.md](docs/PHASE_0_REPORT.md).

Independent re-test of `main` after the fixes recorded in [docs/PHASE_0_FIXES.md](docs/PHASE_0_FIXES.md). Run from a clean `node_modules` in a Linux container with Node 22. There's still no Android SDK, phone or watch here. The Android build result below comes from the repo's own GitHub Actions run.

## Results

| Check | Result | Evidence |
|---|---|---|
| `npm ci` from committed lockfile | **PASS** | 1025 packages, no `--legacy-peer-deps` |
| Versions vs Expo SDK 57 | **PASS** | Every installed Expo module matches `expo/bundledNativeModules.json` (react-native 0.86.3, react 19.2.3, jest-expo 57.0.6, …) |
| `tsc --noEmit` (strict) | **PASS** | 0 errors |
| `eslint .` | **PASS** | 0 errors, 0 warnings |
| `jest` | **PASS** | 4 suites, 22/22 tests |
| `expo prebuild --platform android` | **PASS** (warning) | Manifest generated. Health Connect rationale filter and `VIEW_PERMISSION_USAGE` alias are present. minSdk 26, target/compile 36, cleartext off, backup off. Warning: `userInterfaceStyle` needs `expo-system-ui` (TASK-4). |
| Android `assembleDebug` (GitHub Actions run #5) | **FAIL** | [Run #5](https://github.com/OmarIsmail0/Liftria/actions/runs/39311475054) `android-build` failed after 27m 49s: `No space left on device` while compiling `react-native-reanimated` C++ (TASK-1) |
| Android `assembleRelease` | **NOT RUN** | The job stopped before it |
| Device / watch / real Claude key | **PENDING** | Not testable here |

## Status of the original issues (from `644edfa`)

| Issue | Status | Verified by |
|---|---|---|
| 1 Install / Jest boot | **FIXED** | Clean `npm ci` and Jest pass |
| 2 `createWorkout` ID lost | **FIXED** | ID captured outside the transaction; test asserts `typeof value === 'number'` |
| 3 Orphaned sets | **FIXED** | Explicit `DELETE FROM test_workout_sets` in clear and in `deleteWorkout` |
| 4 TypeScript errors | **FIXED** | `tsc` clean; cleartext setting moved to `expo-build-properties` (present in the generated manifest) |
| 5 `retryAfterMs('-5')` | **FIXED** | Test passes |
| 6 Timeout vs retry-after | **FIXED** | New regression test passes |
| 7 Health pagination | **FIXED** | Follows `pageToken`; fails closed on loops and over 100 pages; tested |
| 8 Lint | **FIXED** | 0 problems |
| 9 Daily energy aggregates | **FIXED** (code) | Uses the correct `react-native-health-connect` result keys (`ACTIVE_CALORIES_TOTAL`, `ENERGY_TOTAL`, `BASAL_CALORIES_TOTAL`, checked against the library's types), and keeps `dataOrigins`. Device test pending. |
| 10 On-device CRUD | **FIXED** (code) | "Update last workout" and "Delete last nutrition" buttons, with read-back |
| 11–14 Docs / research | **ADDRESSED** | Docs updated; device checks pending |

**Verdict:** the JavaScript/TypeScript side is now in good shape. What's left blocking Core GO is **the Android build** (TASK-1), then the device tests.

## New issues: tasks for the implementing agent

Each task below is written as a prompt you can paste straight into the agent fixing the code.

### TASK-1: Android CI build runs out of disk (High, blocks Core C1)

**Copy-paste prompt:**

> The `android-build` job in `.github/workflows/phase0.yml` fails in GitHub Actions run #5 with `fatal error: ... No space left on device` while compiling `react-native-reanimated` C++ (BUILD FAILED in 27m 49s). Fix it as follows:
> 1. Build only the S22 Ultra's CPU architecture: pass `-PreactNativeArchitectures=arm64-v8a` to both `./gradlew assembleDebug` and `./gradlew assembleRelease`.
> 2. Add a disk-cleanup step at the start of the job. Remove `/usr/share/dotnet`, `/opt/ghc`, `/usr/local/share/boost` and `/opt/hostedtoolcache/CodeQL`, and run `df -h` before and after.
> 3. Keep `--no-daemon`.
> 4. Make the workflow also run on `pull_request` (and on `workflow_dispatch`, already present), so fixes are verified before merging.
> 5. Trigger the workflow. Record the real run URL and the outcome of each step in `docs/PHASE_0_REPORT.md`. Mark the APK builds PASS only if both Gradle tasks succeed **and** the APK artifact uploads.
>
> Don't skip or remove the release build. Don't mark anything PASS without a completed run.

### TASK-2: Report says the build is "in progress", but it failed (Medium, accuracy)

**Copy-paste prompt:**

> Correct `docs/PHASE_0_REPORT.md` and `docs/PHASE_0_FIXES.md`:
> 1. Run #5 has **completed with failure**: `android-build` ran out of disk space (`No space left on device`). Replace every "still in progress" or "no APK result" wording for run #5 with **FAIL** and that reason.
> 2. In the `PHASE_0_REPORT.md` status table, the "Strict typecheck" row contains a literal `\n` that merges the ESLint row into it. Split it into two proper table rows.
> 3. The `assembleDebug` and `assembleRelease` rows say "No SDK, Gradle build, or device observed". Update them to: debug **FAIL** (CI run #5, disk space); release **NOT RUN**. Keep "install on device" as PENDING_DEVICE_TEST.
> 4. In `PHASE_0_FIXES.md`, change items 1–8 from "PENDING RE-TEST" to **VERIFIED**, citing CI run #4 and the independent re-test in `PHASE_0_ISSUES.md` (Re-test 2).
>
> Don't claim any device result.

### TASK-3: Remove permissions the app doesn't need (Medium, privacy rule in spec §12)

The generated `AndroidManifest.xml` includes `android.permission.RECORD_AUDIO` and `android.permission.SYSTEM_ALERT_WINDOW`. Neither is used by Phase 0. `RECORD_AUDIO` comes from `expo-image-picker`'s default config.

**Copy-paste prompt:**

> In `app.config.ts`:
> 1. Configure the `expo-image-picker` plugin as `['expo-image-picker', { cameraPermission: false, microphonePermission: false }]`. Phase 0 only picks from the photo library.
> 2. Add `android.blockedPermissions: ['android.permission.RECORD_AUDIO', 'android.permission.SYSTEM_ALERT_WINDOW']`.
> 3. Run `npx expo prebuild --clean --platform android --no-install`. Paste the resulting `<uses-permission>` list into `docs/TECHNICAL_DECISIONS.md` as evidence, and confirm it contains only INTERNET, the Health Connect READ permissions, and the storage permissions capped at maxSdk 32.
> 4. Confirm the "Pick photo" flow still compiles (`npm run check`).

### TASK-4: Dark style setting has no effect without `expo-system-ui` (Low)

Prebuild warns: *"android: userInterfaceStyle: Install expo-system-ui in your project to enable this feature."*

**Copy-paste prompt:**

> Run `npx expo install expo-system-ui`, commit the updated `package.json` and `package-lock.json`, and confirm `npx expo prebuild --clean --platform android --no-install` no longer prints the `userInterfaceStyle` warning. Run `npm run check`.

### TASK-5: Reanimated and worklets versions don't match Expo SDK 57 (Medium)

| Package | Installed (transitive, via `expo-router`) | Expo SDK 57 expects |
|---|---|---|
| `react-native-reanimated` | 4.7.1 | 4.5.1 |
| `react-native-worklets` | 0.13.0 | 0.10.1 |

`npm ls` also flags worklets 0.13.0 as outside `expo-modules-core`'s peer range. `expo install --check` doesn't catch this, because neither package is a direct dependency. Both are native modules that get compiled into the APK (they're what was compiling when TASK-1 ran out of disk). A native version mismatch can crash the app at startup.

**Copy-paste prompt:**

> `react-native-reanimated@4.7.1` and `react-native-worklets@0.13.0` are installed transitively via `expo-router`, but Expo SDK 57's `bundledNativeModules.json` expects `react-native-reanimated ~4.5.1` and `react-native-worklets 0.10.1`. Run `npx expo install react-native-reanimated react-native-worklets` so both become direct dependencies pinned to the SDK 57 versions. Commit the regenerated `package-lock.json`. Then confirm `npm ls react-native-worklets react-native-reanimated` shows no `invalid`, and that `npx expo install --check` and `npm run check` pass. If Reanimated needs its Babel plugin, follow the Expo SDK 57 docs. Verify on the device that the app starts without a worklets/reanimated error.

### Recommended order

TASK-1 → TASK-2 → TASK-3 → TASK-4 → TASK-5, then build the APK and run `docs/DEVICE_TESTS.md` on the S22 Ultra.

---

# Original test: commit `644edfa` (historical)

> These findings were against commit `644edfa`. See "Status of the original issues" above for what has since been fixed.

Independent test of the Phase 0 implementation on `main` (commit `644edfa`), checked against `LIFTRIA_PHASE_0_FINAL` (the frozen spec). Tested 2026-10-19 in a Linux cloud container with Node 22. No Android SDK, phone or watch was available.

## Summary

| Check | Result | Notes |
|---|---|---|
| `npm install` (clean) | **FAIL** | Dependency conflict (ISSUE-1). Works only with `--legacy-peer-deps`. |
| Lockfile committed | **FAIL** | No `package-lock.json`, so installs aren't reproducible. |
| `tsc --noEmit` (strict) | **FAIL** | 7 errors (ISSUE-2, 3, 4). |
| `eslint .` | **FAIL** | 1 error, 6 warnings (ISSUE-8). |
| `jest` as committed | **FAIL** | Jest can't start: missing `@react-native/jest-preset` (ISSUE-1). |
| `jest` after a temporary dependency fix | **16 / 17 pass** | 1 real failure (ISSUE-5). |
| `expo prebuild` / Gradle APK builds | **BLOCKED** | No Android SDK in this environment. |
| Device, watch and real-API tests | **PENDING_DEVICE_TEST / PENDING_OWNER_TEST** | Not testable here. |

**Honesty check: PASS.** The original `docs/PHASE_0_REPORT.md` marks install, typecheck, lint, tests and builds as **BLOCKED (never run)**, and every device item as PENDING. It doesn't claim results it didn't get, and nothing was fabricated. The problem is only that the code was never executed, and it doesn't pass when it is.

**Overall:** the architecture and most of the code follow the spec well. Typed services, the Health Connect adapter, provenance-preserving normalization, aggregate separation, the Claude error handling and the diagnostics screen are all there. But the project **doesn't install, typecheck, lint or run its tests cleanly**, and there are two real logic bugs in the SQLite layer. Fix ISSUE-1 to ISSUE-6 before building the APK.

---

## Must fix before building

### ISSUE-1: Clean install fails; Jest can't run (High)

- **Evidence:**
  - `npm install` fails with `ERESOLVE`: `react-native@0.86.2` is pinned, but `jest-expo@57.0.6` needs `@react-native/jest-preset@^0.86.3`.
  - Expo SDK 57's `bundledNativeModules.json` expects `react-native 0.86.3`.
  - Running `jest` then fails: *"The React Native Jest preset that jest-expo relies on has moved to a separate package. Please install @react-native/jest-preset."*
- **Fix:** run `npx expo install --fix` (it sets `react-native` to `0.86.3` and aligns the other Expo packages). Add `@react-native/jest-preset` (`0.86.3`) to `devDependencies`. Commit the resulting `package-lock.json`.
- **Verified:** with `react-native@0.86.3` and `@react-native/jest-preset@0.86.3` installed temporarily, Jest runs (16/17 pass).
- **Other version drift `expo install --fix` will also correct:**

  | Package | Pinned | Expo 57 expects |
  |---|---|---|
  | expo-router | ~57.0.10 | ~57.0.28 |
  | expo-image-picker | ~57.0.0 | ~57.0.20 |
  | expo-image-manipulator | ~57.0.0 | ~57.0.21 |
  | expo-dev-client | ~57.0.0 | ~57.0.20 |
  | expo-build-properties | ~57.0.0 | ~57.0.22 |

### ISSUE-2: `createWorkout` loses the new workout ID (High, real bug)

- **Where:** `src/services/database/repositories.ts:6`
- **Problem:** `withExclusiveTransactionAsync` returns `Promise<void>`, so `return result.lastInsertRowId` inside it is discarded. At runtime, `createWorkout` returns `{ ok: true, value: undefined }` instead of the new ID. TypeScript reports this as 2 errors. The mocked unit test doesn't catch it, because the mock returns the callback's value, which the real API doesn't.
- **Fix:** capture the ID in an outer variable inside the transaction, then return it after the transaction completes.

### ISSUE-3: "Clear test data" leaves orphaned workout sets (High, real bug)

- **Where:** `src/services/database/index.ts:16` and `:118`
- **Problem:** `PRAGMA foreign_keys = ON` is set on the main connection only. In `expo-sqlite`, `withExclusiveTransactionAsync` **opens a new connection** (confirmed in `node_modules/expo-sqlite/src/SQLiteDatabase.ts`, class `Transaction`), and SQLite foreign-key enforcement is per-connection and **off by default**. So `ON DELETE CASCADE` doesn't fire when `clearTestData` deletes sessions. The rows in `test_workout_sets` survive, and "Read" will still show `sets > 0` after "Clear".
- **Fix:** either delete `test_workout_sets` explicitly in `clearTestData`, or run `PRAGMA foreign_keys = ON` at the start of every exclusive transaction. Add an on-device check to `DEVICE_TESTS.md`: Add → Clear → Read must show 0 sets.

### ISSUE-4: TypeScript errors in config and tests (Medium)

- **`app.config.ts:32`:** `usesCleartextTraffic` isn't a valid `expo.android` property, so it's a type error and is **silently ignored** at build time. Move it into the `expo-build-properties` plugin's `android` options, which does support `usesCleartextTraffic`. Cleartext is already off by default for targetSdk 28+, so there's no security impact, just a non-compiling config.
- **`src/services/anthropic/__tests__/anthropic.test.ts:39,53`:** uses `global`, which isn't typed. Use `globalThis`.
- **`src/services/database/__tests__/database.test.ts:13,65`:** the `mockDb` self-reference makes the type implicitly `any` under strict mode. Add explicit types.

### ISSUE-5: `retryAfterMs('-5')` returns 0 instead of null (Low, failing test)

- **Where:** `src/services/anthropic/index.ts:77`
- **Problem:** a negative number falls through to `Date.parse('-5')`, which JavaScript parses as a valid date (year −5). That gives a finite value clamped to `0`. The committed test expects `null` and fails.
- **Fix:** if the value is numeric (matches `/^-?\d+(\.\d+)?$/`), return `null` when it's negative and never try `Date.parse` on it.

### ISSUE-6: The timeout also cuts off rate-limit retries (Low)

- **Where:** `src/services/anthropic/index.ts:106`
- **Problem:** one 45-second timer covers all attempts, including waits after 429/529. A `retry-after` of 60 seconds (allowed up to 120) aborts with `timeout`, not `rate-limited`, so the user sees the wrong reason.
- **Fix:** cap each retry wait to the time left, and if `retry-after` exceeds it, return `rate-limited` straight away.

---

## Should fix in Phase 0

### ISSUE-7: Health reads ignore pagination, so data can be lost silently (Medium)

- **Where:** `src/services/health/index.ts:69`
- **Problem:** `readRecords` is called once with `pageSize: 1000`, and `pageToken` is ignored. A week of Watch 4 heart rate, steps or calories can exceed 1000 records, and the rest is dropped without any warning. That undercounts the very data the validation matrix (§6.4) compares against Samsung Health.
- **Fix:** loop while `pageToken` is returned, or at minimum report "truncated" in the row status.

### ISSUE-8: Lint error in the diagnostics screen (Low)

- **Where:** `app/index.tsx:89`
- **Problem:** `react-hooks/set-state-in-effect` (the effect calls `refreshNetwork`, which sets state). There are also 6 `import/first` warnings in the test files caused by `jest.mock` ordering.
- **Fix:** restructure the effect (for example, read the network state in the effect and set state from its result), or disable the rule for that line with a reason. Run `eslint --fix` for the warnings.

### ISSUE-9: No daily energy aggregates are read (Medium)

- **Problem:** the `AggregateValue` type, its table and its storage exist, but nothing produces aggregates. The daily calorie verdict (§14.4) needs daily totals. Health Connect offers `aggregateRecord` with `ActiveCaloriesBurned` and `TotalCaloriesBurned` totals and `BasalMetabolicRate` `BASAL_CALORIES_TOTAL` (Energy). Without them, the device test can only show raw records, which (per ISSUE-11) may only cover workouts.
- **Fix:** add a read-only "Daily totals (last 7 days)" action that calls Health Connect's aggregate API per local day and stores the results as `AggregateValue` with the operation and window.

### ISSUE-10: Update and delete aren't reachable from the diagnostics screen (Low)

- **Problem:** `updateWorkout`, `deleteWorkout`, `updateNutrition` and `deleteNutrition` exist and are unit-tested against a mock, but the screen only exposes Add, Read and Clear. §3 requires CRUD to be verified, and on-device it currently can't be.
- **Fix:** add one "Update last workout title" and one "Delete last nutrition entry" button.

---

## Research findings that affect the device test

From the earlier spec verification (official Android docs; Samsung pages via search excerpts).

### ISSUE-11: Samsung may not sync all-day watch activity to Health Connect (High, expectation)

Samsung's developer blog says **activity-tracker (all-day) data isn't synced** to Health Connect; exercise sessions and their calories are. A Samsung forum thread reports active calories written per workout only. Expect the **daily calorie verdict to be PARTIAL** through Health Connect. It will likely need the Samsung Health Data SDK, which isn't implemented (documented only, which the spec allows as conditional). Daily watch steps may also be missing. Check this explicitly on the device.

### ISSUE-12: Samsung Health Data SDK requirements to document (Medium)

- Requires Samsung Health 6.30.2+ and Android 10+; no emulators.
- Reading on your own device works in **developer mode**: tap the version line in Samsung Health → About about 10 times, then turn on data read.
- Publishing needs Samsung partner approval (package name + SHA-256 certificate).
- The valid aggregate names are `TOTAL_CALORIES_BURNED` and `TOTAL_ACTIVE_CALORIES_BURNED`. There is no `TOTAL_CALORIES`; another SDK reported that the wrong name silently returned a different operation.

### ISSUE-13: Health Connect sync must be enabled from Samsung Health (Low)

The path is **Samsung Health → Settings → Health Connect → App permissions**; starting from the Health Connect app doesn't work the same way. The diagnostics screen hint is close but shortened; put the full path in `DEVICE_TESTS.md`.

### ISSUE-14: Licensing details for the open-source review (Low)

- **Ischys:** code is MIT, but its exercise line art is **CC BY-SA 4.0** (credit required, and edited art must be shared under the same license). Fonts are OFL.
- **free-exercise-db:** Unlicense; no separate image license is stated.
- **react-native-body-highlighter:** MIT, needs `react-native-svg ^15.9.0`.

Check that `docs/OPEN_SOURCE_REVIEW.md` reflects these.

---

## Verified as correct

- **Claude service:** model `claude-haiku-5-5`, `output_config.format` JSON schema, effort `low`. No sampling parameters, no prefill, no `budget_tokens`. Text block found by type. `stop_reason` is checked before parsing (`max_tokens` → truncated, `refusal` → declined). zod validation, offline check before reading the key, at most 2 retries on 429/529 only, and cancellation. All match Anthropic's current Haiku 5.5 guidance.
- **Key handling:** SecureStore only, a masked hint, no logging of the key or response content (only token counts are logged).
- **Health Connect:** read-only permissions only. The `react-native-health-connect` v4 Expo plugin adds the permissions-rationale intent filter and the `VIEW_PERMISSION_USAGE` alias, and supports the `ReadHealthDataHistory` permission.
- **Data model:** basal metabolic rate is stored as a rate (power), not energy. Records without a source ID are dropped, never given invented IDs. Aggregates are kept separate. Health data is never sent to Claude.
- **Images:** resized on the device to 1024px JPEG before upload; sent only on an explicit tap.
- **Repo hygiene:** `.gitignore` covers `android/`, keystores, `.aar`, `.env`, and database files.
- **Docs:** the release-APK offline test is documented without Metro.

## Recommended order

1. ISSUE-1 (versions + lockfile), then confirm `npm run check` passes.
2. ISSUE-2, 3, 4, 5 (code fixes), and re-run `npm run check`.
3. ISSUE-7, 9, 10 (small additions so the device test produces useful evidence).
4. Build the APKs on Windows, run `DEVICE_TESTS.md`, and record evidence in `PHASE_0_REPORT.md`.
