# Technical decisions — Phase 0 (2026-10-19)

## Platform and dependencies

- Expo SDK 57 (57.0.x), React Native 0.86.3, React 19.2.3, TypeScript strict mode.
- Expo Router 57.0.x, development client, prebuild/CNG. Android native directories are generated and gitignored.
- Android package `com.liftria.diagnostics`, `minSdk=26`, `compileSdk=36`, `targetSdk=36` via `expo-build-properties`. This covers the Android 14+ S22 Ultra target; actual OS and permission behavior still needs hardware validation.
- `expo-sqlite` for app data (schema 1); `expo-secure-store` for API key; `expo-network` for offline detection; Expo image picker/manipulator for photo input.
- `react-native-health-connect@^4.1.0` with the integrated Expo config plugin (v4+), **not** the deprecated `expo-health-connect`. Permissions are read-only and declared explicitly.
- `zod` for runtime schema validation of the Claude structured response; raw fetch instead of an SDK to minimize dependencies and eliminate backend needs.
- TypeScript and Jest tests are authored; the original independently reported failing installation, lint, typecheck and Jest tests against commit 644edfa. The code/versions have been updated to address those findings. Re-run validation on updated source before marking PASS. See `docs/PHASE_0_FIXES.md`; npm ci and a checked-in lockfile now pass in GitHub Actions run #4; code and mocked tests pass.

### Verified source references

- [Expo SDK 57 version matrix](https://docs.expo.dev/versions/latest/) and [Expo default template](https://github.com/expo/expo-template-default/blob/main/package.json)
- [Health Connect Expo integration](https://github.com/matinzd/react-native-health-connect) and [manifest plugin notes](https://github.com/matinzd/react-native-health-connect/blob/main/.claude/docs/expo-and-linking.md)
- [Expo SQLite / SQLCipher](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Anthropic Messages API](https://platform.claude.com/docs/en/api/overview), [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), [Haiku 5.5 migration](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide), [effort](https://platform.claude.com/docs/en/build-with-claude/effort), [vision limits](https://platform.claude.com/docs/en/build-with-claude/vision)

## Build

- First build priority: `npx expo prebuild --clean --platform android`; inspect resulting manifest and `gradlew.bat assembleDebug`.
- A release APK must be signed **locally**, contain an embedded JS bundle, and start with Metro stopped and USB unplugged. Do not substitute dev-client offline results.
- No Android SDK or physical test phone was available in the authoring environment. Debug CI build **FAILED** from GitHub Actions runner disk exhaustion in run #5; release **NOT RUN**. Both APK installations and device validation remain **PENDING_DEVICE_TEST**.
- EAS cloud builds are intentionally unnecessary. No analytics, servers, authentication, telemetry, or cloud database.

## Storage and privacy

- `PRAGMA user_version = 1`. Migrations are idempotent; future versions must add monotonic migrations. Foreign keys and exclusive transactions protect test workout/set rows.
- Separate settings, diagnostic workout/session/set, nutrition, raw normalized health **record**, and health **aggregate** tables. Record key is `adapter+recordId`; aggregate key is `adapter+operation+window`. No synthetic record IDs.
- App data in SQLite is currently **unencrypted**. Expo SQLite supports SQLCipher through `useSQLCipher: true` on a native build; that option was checked in the official Expo docs, but has **not** been compiled or performance-tested. Do not enable it in Phase 0.
- Android backups disabled to reduce accidental export of local records. App uninstall removes local SQLite records unless the OS/owner has a separate backup strategy; Phase 0 has no backup.
- Anthropic key only in Android Keystore-backed SecureStore. Key is not in SQLite, Git, environment, or logs. UI only shows suffix hint.
- API calls travel from phone directly to Anthropic. On a rooted, debugged, or compromised device, an attacker may extract the key and spend against the owner's Anthropic account. No server-side per-device rate gate or API abuse protection. **Set an Anthropic Console workspace spend limit, a dedicated key, and rotate/revoke on suspicion.**
- Direct Anthropic requests process the meal text/photo; they are the **only intentional app-initiated network traffic**. OS/system SDKs, package installers, Samsung Health, and Health Connect may perform their own network activity independently; Liftria does not control that.
- Android permission rationale is surfaced in diagnostics; inspect generated Android 13 and 14+ intent filters and test tapping the privacy policy link in Health Connect.

## Anthropic specifics

- Model `claude-haiku-5-5`, default effort `low` on PoC, `max_tokens=2048` includes adaptive thinking. No `thinking`, prefill, temperature, top_p, top_k, or budget_tokens.
- `POST /v1/messages` with `anthropic-version: 2023-06-01`, `content-type: application/json`, and `x-api-key` (currently supported by Anthropic; new deployments also support Bearer).
- Structured result sent via `output_config.format = { type: 'json_schema', schema }`, read content blocks by `type='text'`, validate at runtime with Zod. `max_tokens`/refusal/invalid response are distinct failures.
- Test A text only; Test B explicitly selected on-device resized/compressed JPEG, then user taps Test B. Images max 1024px edge, lower than Anthropic 8000px dimension limit and 10MB base64 API limit; image size should be checked if compression still exceeds limit.
- No automatic/background Claude requests; retries **only** HTTP 429 or 529 (up to two), bounded `Retry-After`, cancellation and timeout. Distinct 401/403/429/529/5xx/offline states. Only token counts logged.

## Health

- Health Connect first; Samsung Health Data SDK only if a device data gap is proven (HR, daily energy, exercise sessions or sleep stages). No Samsung .aar is bundled or committed.
- Basal metabolic rate is a power/rate (W or kcal/day), **not an energy total**. A rate must never be summed with daily calorie intervals without an explicit time integration method.
- Empty/read permission denied/not supported/data absent are not interchangeable. Imported origins may identify Samsung Health rather than Galaxy Watch itself.
- Health Connect historic read permission is requested **separately**. [Known library issue #276](https://github.com/matinzd/react-native-health-connect/issues/276): a history grant may not appear in results. Diagnose as `unverified` until confirmed on the actual phone.
- `readRecords` now follows continuation tokens across pages; repeated tokens or more than 100 pages abort import instead of presenting truncated counts. Device test still required.

### Updated validation evidence (2026-10-19)

A reproducible `package-lock.json` is committed. [Actions run #4](https://github.com/OmarIsmail0/Liftria/actions/runs/39311214769) passes `npm ci`, Expo check, strict typecheck, lint and all 22 mocked unit tests. These are genuine command results from a GitHub Actions Ubuntu runner, not native hardware evidence. The optional peer warning involving `react-native-worklets@0.13.0` remains in npm's install output despite exit code 0; verify native build compatibility before declaring the Android foundation PASS.

## Privacy/build mitigation after Re-test 2

The Expo image picker is configured for library-only selection; camera and microphone permissions disabled. Android additionally blocks `RECORD_AUDIO` and `SYSTEM_ALERT_WINDOW` inherited by dependencies. Actual merged manifest will be inspected by native GitHub Actions prebuild and must prove the list contains only INTERNET, read-only Health Connect permissions, and SDK-limited legacy storage permissions. Dark Android system UI requires `expo-system-ui`, and Expo SDK 57 expects direct `react-native-reanimated@~4.5.1` and `react-native-worklets@0.10.1`; resolution and real build need verification. No new services or runtime network traffic are added.
