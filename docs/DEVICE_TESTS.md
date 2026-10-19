# Owner device verification — Windows, Samsung S22 Ultra + Watch 4

No test below has been executed by the agent. Record real timestamps, device/OS versions, commands, screenshots (WITHOUT keys), and results in PHASE_0_REPORT.md. Do not mark anything PASS based on mocked output.

## 1. Install toolchain and build

1. Install Node 22+, JDK 17, Android Studio, SDK Platform 36, SDK Build Tools, Android platform-tools. Set JAVA_HOME and ANDROID_HOME if needed.
2. In PowerShell in the cloned repo:
   ```powershell
   npm install
   npx expo install --fix
   npm run typecheck
   npm run lint
   npm test -- --runInBand
   npx expo prebuild --clean --platform android
   ```
3. Inspect native setup:
   ```powershell
   Select-String -Path android\app\src\main\AndroidManifest.xml -Pattern "READ_HEART_RATE","READ_STEPS","READ_HEALTH_DATA_HISTORY","ACTION_SHOW_PERMISSIONS_RATIONALE","VIEW_PERMISSION_USAGE","START_VIEW_PERMISSION_USAGE"
   ```
   Check the rationale/Android14+ activity-alias actually works, not merely that the manifest contains strings.
4. Enable USB Debugging on S22 Ultra, attach with a data USB cable, approve fingerprint:
   ```powershell
   adb devices -l
   cd android
   .\gradlew.bat assembleDebug
   cd ..
   adb install -r android\app\build\outputs\apk\debug\app-debug.apk
   ```
   Alternatively `npx expo run:android --device` installs a dev client. Launch while Metro is running for development. **This does not prove offline.**

## 2. Embedded-bundle release APK

1. Do not store release credentials in Git. For a private manual PoC, ensure the generated Android release build has a **local** signingConfig (the generated template may use a debug signing key; verify rather than assume). A debug-signed release variant is acceptable for this manual proof, not for public distribution.
2. With the locally generated `android/` and its Gradle wrapper:
   ```powershell
   cd android
   .\gradlew.bat assembleRelease
   cd ..
   adb install -r android\app\build\outputs\apk\release\app-release.apk
   ```
   If the generated release configuration is unsigned, configure a local keystore on the Windows machine and repeat; never commit its file/password.
3. Disconnect USB and stop Metro (`Ctrl+C` in the bundler terminal). Confirm release starts without Metro. If it does not, mark **FAIL** and investigate JS bundling, signing, package name and logs.

## 3. SQLite, SecureStore and restart

1. On device, tap SQLite **Init → Add test data → Read**. Note session/sets/nutrition counts and the timestamp marker.
2. Tap **Write setting → Read setting**. Copy the timestamp.
3. Set a real Anthropic key using the masked field, tap **Save key**. Verify only masked hint appears; do **not** capture raw API keys in screenshots.
4. Force-stop and relaunch:
   ```powershell
   adb shell am force-stop com.liftria.diagnostics
   adb shell monkey -p com.liftria.diagnostics 1
   ```
   (Reconnect USB as needed for ADB, but do not keep Metro attached for the offline test.)
5. Tap SQLite **Read**, **Read setting**, and Claude **Check key**. The data and key must survive restart. Tap **Delete key**, force-stop/reopen, and verify `missing`. Re-save later if needed.
6. **Clear test data** must clear workout and nutrition diagnostic rows; imported health sample data is intentionally retained.

## 4. Claude Test A and Test B

1. Disable airplane mode. Confirm Anthropic key has billing/permission to access `claude-haiku-5-5`. Set a spend limit in Anthropic Console.
2. Tap **Test A / key**. Verify validated foods, quantity, unit and confidence, plus token counts. Retry/cancel behavior can be tested by disabling network mid-flight.
3. Tap **Pick photo**, choose a representative meal (not confidential data), then **Test B / photo**. Check the image is resized/compressed locally and result is visibly labeled an estimate. Confirm real-photo results in report; a test with synthetic data does not count.
4. Check distinct states for invalid key (401), permission (403), rate-limit (429), overloaded (529) where safely reproducible; do not deliberately rack up charges. Error mapping unit tests complement but never replace a real API call.

## 5. Samsung Health → Health Connect

1. Pair/refresh Galaxy Watch 4 with Samsung Health; make sure there is recent Watch 4 step/heart-rate/exercise data and a sleep night if available.
2. In Samsung Health → **Settings → Health Connect**, enable synchronization/sharing for the relevant data. Open Android **Settings → Health Connect** and review app permissions.
3. Open Liftria. Tap **Check availability → Grant read-only → Permissions**. Verify read grants for the ten requested types, no writes. Test the Health Connect privacy-policy/rationale link.
4. Tap **History grant** **separately** and verify grant in Android settings. An `unverified` code result is not a denial or PASS.
5. Tap **Read 7 days**. For every metric capture: Health Connect permission, count, unit, source dataOrigin, device, timestamp interval, and any failure/empty state.
6. Compare apples to apples against Samsung Health for the *same dates*, with same units/time windows, not just a similar number. Check origin `com.sec.android.app.shealth` and device metadata to establish Watch 4 provenance. Investigate deviations above 5%, but under 5% is not automatic proof.
7. For energy explicitly record four distinct categories: exercise-only energy, daily active energy, daily **total** energy, and basal/resting rate/energy. Determine if a supposed total covers a workout interval only and whether intervals overlap.
8. If HR or daily usable energy or sleep/exercise data is missing, investigate Samsung Health Data SDK; **do not assume missing data** simply from an empty HC query.

## 6. Airplane-mode validation

1. Use the embedded-bundle release APK only. Disconnect Metro, unplug USB. Turn on airplane mode, disable Wi-Fi.
2. Force-stop/relaunch. Verify startup (no JS bundler dependency).
3. In SQLite: Init, Add, Read, Clear; Write/Read setting; later close/restart and read again. Confirm no crash/data loss.
4. Tap **Read health cache** and verify imported samples display. Health Connect native reads may still work locally.
5. Tap **Network status**, then **Test offline API failure**: result must be `offline`, with no actual API request.
6. Record PASS/FAIL with evidence, return to online mode only after tests.
