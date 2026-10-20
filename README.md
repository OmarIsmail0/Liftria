# Liftria — Phase 0 feasibility PoC

Private, local-first Android diagnostics for a Samsung Galaxy S22 Ultra and Galaxy Watch 4. **Not a finished fitness app.** No backend, analytics, account, or cloud database. The only intentional app-initiated network request is the user-triggered Anthropic Messages API call.

## Status

The JavaScript code checks and Android ARM64 debug/release builds **have passed GitHub Actions**, with uploaded APKs. Actual Android installation, restart, airplane-mode operation, Claude calls, and Galaxy Watch 4 / Health Connect data **still require physical-device verification**. See [Phase 0 handoff](docs/PHASE_0_HANDOFF.md) and [report](docs/PHASE_0_REPORT.md).

## Windows prerequisites

Node.js 22+, Android Studio with Android SDK 36, Java 17, an S22 Ultra with USB debugging enabled, Samsung Health and Health Connect configured, and a locally held Anthropic API key (never commit it).

## Develop

```powershell
npm ci
npx expo install --check
npm run typecheck
npm run lint
npm test -- --runInBand
npx expo prebuild --clean --platform android
npx expo run:android --device
```

Expo Go is not supported. The generated `android/` directory is gitignored (Continuous Native Generation).

## APK tests (PowerShell)

```powershell
cd android
.\gradlew.bat assembleDebug
cd ..
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```

For the offline test, install a **self-contained JavaScript-bundled release** APK from the newest green GitHub Actions run; alternatively build and sign locally. Do not commit any keystore. Full instructions and the mandatory device checklist are in `docs/DEVICE_TESTS.md`. A development APK connected to Metro does **not** prove offline operation.

For the exact dependency and SDK choices see `docs/TECHNICAL_DECISIONS.md`. For readiness and blockers see `docs/PHASE_1_READINESS.md`.

Follow-up issue and verification ledger: [docs/PHASE_0_FIXES.md](docs/PHASE_0_FIXES.md).
