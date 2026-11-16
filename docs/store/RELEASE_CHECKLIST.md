# Store release metadata and screenshot checklist

The four localized listing files here contain copyable console fields. Remove Markdown headers and formatting before pasting.

| Field | Google Play | Apple App Store |
| --- | --- | --- |
| Name | 30 characters | 30 characters |
| Short description / subtitle | 80 characters | 30 characters |
| Full description | 4000 characters | 4000 characters |
| Promotional text | — | 170 characters |
| Keywords | — | 100 bytes |

## Screenshot routes — real application UI only

In a development build or a CI build with `EXPO_PUBLIC_LIFTRIA_DEV_ROUTES=1` (never the signed store build), open `liftria://dev/store-gallery?panel=eat&lang=en&appearance=light`. The gallery **redirects to real application screens**, never renders marketing cards. Direct entry `/dev/store/[panel]` uses the same redirect.

| Panel | Destination after opening the dev route | On-screen content |
| --- | --- | --- |
| `today` | `/dev/demo-diary?auto=1&view=today` → Today tab | Actual dashboard with bundled-food demo diary |
| `eat` | `/dev/demo-diary?auto=1` → Eat tab | Actual meal diary, foods from bundled Egyptian/USDA packs, three demo water glasses (read-only) |
| `train` | `/dev/demo-workout?auto=1` → active workout | Actual workout UI with two pack exercises and zero logged sets |
| `progress` | `/dev/demo-trends?auto=1&view=body` → Body | Actual trends chart; synthetic weights are visibly marked `Demo fixture` |
| `privacy` | `/settings/privacy` | Actual localized privacy page |
| `hiku` | `/dev/demo-hiku?auto=1` → Hiku review | Actual review UI with bundled food values, explicitly marked demo; Save disabled |

`lang=en|ar` and `appearance=light|dark` set the app's real language and theme preferences *before* redirecting. **For RTL screenshots, relaunch the app with Arabic device locale** if React Native requests a native direction restart; check the rendered screen rather than trusting query values alone.

**Fixture warning:** These are developer screenshot helpers, not isolated marketing screens. `demo-diary` adds missing food entries to the device's **local diary**; `demo-workout` starts or resumes a local session; `demo-trends` adds explicitly labeled synthetic weights and food entries. Use a clean disposable test installation, never personal user data, and reset app data between store screenshot sets. The Hiku demo makes **no API request and cannot Save**. Screenshot captures should use actual screen UI after navigation finishes, not the transient loading page.

Capture required iPhone and Android phone sizes from a running build. Never submit a screenshot of a developer setup page, a caption-only panel or an Android Health Connect screen as an iPhone feature. Compare light/dark, English/Arabic and device-safe-area results; remove misleading demo fixtures and follow the App Store's rule that screenshots show the app in use.

## What a store build contains (checked against `npx expo prebuild`, 2026-11-16)

| Item | Value |
| --- | --- |
| Application id | `com.liftria.app` (Android and iPhone) |
| Version | name from `src/config/releaseVersion.json` (1.0.0). The Android version code is `100 + run number` on a trusted `main` build, otherwise the JSON `androidCode`. Play needs it to rise on every upload. |
| Android SDK | min 28 (Android 9), compile and target 36, edge-to-edge, portrait only, light and dark |
| Android permissions | `INTERNET`, `POST_NOTIFICATIONS` (rest-timer alert, asked in context), `CAMERA` (only when the person taps "Take a photo" for Hiku), `VIBRATE` (normal permission, no prompt), and read-only Health Connect: steps, heart rate, active and total calories, basal metabolic rate, exercise, sleep, weight, body fat, lean body mass, and history |
| Not present, and blocked in config | exact alarms, boot receiver, foreground service, microphone, overlay, location, storage, media. The Phase 0 workflow fails the build if any appears in the merged release manifest. |
| iPhone texts | camera, photo library and Apple Health (read only) strings in `locales/en.json` and `locales/ar.json`, shown in English and Arabic |
| Android backup | `allowBackup=false`. Neither Google cloud backup nor phone-to-phone transfer copies the database, the saved API key or photos. The key is in the Android Keystore through `expo-secure-store`, whose own exclusion rules are also kept as a second layer. Trade-off: a new phone starts empty unless the person uses Settings, Data and storage, Export a backup. The store text says exactly this. |
| Network | HTTPS only (`usesCleartextTraffic=false`); only `api.anthropic.com`, and only when the person sends a Hiku request or tests their key |
| Developer screens | `app/dev/*`, the dev menu in Settings and the demo backup preview are off unless `EXPO_PUBLIC_LIFTRIA_DEV_ROUTES=1` or a development build. A deep link such as `liftria://dev/demo-diary` goes to Today in a store build. The workflow sets the flag to `0` for a signed release. |
| Not enabled yet | R8 minify and resource shrinking (the release APK is larger but behaves as tested). Turn on with `expo-build-properties` `enableMinifyInReleaseBuilds` and `enableShrinkResourcesInReleaseBuilds` only after a full device test of the result. |

## Owner steps to ship (Android first)

Plain language, in order. Nothing here needs code.

1. **Make the upload key (once, on your computer).** Install Java, then run:
   `keytool -genkeypair -v -storetype PKCS12 -keystore liftria-upload.jks -alias liftria-upload -keyalg RSA -keysize 2048 -validity 10000`
   Choose a strong password and write the file, password and alias in your password manager. Keep two copies of the `.jks` file somewhere safe and offline. Never commit it or paste it in chat.
2. **Put four secrets in GitHub** (repository Settings, Secrets and variables, Actions, New repository secret). Names only, you type the values:
   - `LIFTRIA_KEYSTORE_BASE64`: the `.jks` file as one line of text (`base64 -w0 liftria-upload.jks` on Linux, `base64 -i liftria-upload.jks` on Mac).
   - `LIFTRIA_KEYSTORE_PASSWORD`: the keystore password.
   - `LIFTRIA_KEY_ALIAS`: `liftria-upload` (or the alias you chose).
   - `LIFTRIA_KEY_PASSWORD`: the key password (the same as the keystore password with PKCS12).
   Only a build of `main` started by hand can read them. If any one is empty the workflow still builds but marks the APK "NOT FOR SHARING".
3. **Build.** Actions, "Phase 0 code and Android verification", Run workflow on `main`. When it is green, download the artifact `liftria-phase0-s22-arm64-apks`. The signed file is the `release` APK without "NOT-FOR-SHARING" in its name. The workflow already checks the package, API 28, the permission list and the signature.
4. **Play needs an app bundle (.aab), not an APK, for a new app.** The signed build on `main` now also produces one: download the `liftria-play-store-bundle` artifact from that run and upload the `.aab` to Play Console. Use the APK only for your own phone and testers outside Play.
5. **Play Console (one-time setup).** Create the app (name "Liftria: Food & Workout Log", default language English, add Arabic, free). Then complete: App content (Privacy policy `https://omarismail0.github.io/Liftria/privacy.html`; Ads: none; App access: no login; Content rating questionnaire; Target audience: 18 and over is simplest; News: no; Government: no; Financial features: none; **Health apps** declaration; **Data safety**); and the **Health Connect permissions declaration** (explain each read-only type, as in the permission table above). Data safety answers: nothing is collected by Liftria; the optional Hiku request sends the typed text or chosen photo to Anthropic only when the person sends it, with the person's own key; data is not sold; data is encrypted in transit; people can delete data inside the app (Settings, Data and storage, Delete all). Use the two Google Play listing files here for the English and Arabic text.
6. **Screenshots and icon.** Phone screenshots from the checklist above (a clean install, never your own data), a 512 px icon (export `assets/brand/icon-light.svg`) and a 1024 x 500 feature graphic.
7. **Upload and test.** Create a Play App Signing key when asked (let Google manage the app signing key; your keystore is only the upload key). Release to **Internal testing** first and install it from the Play link on a real phone: onboarding, a workout, a meal, Hiku with your key, Arabic and RTL, dark mode, open a CSV from Files, rest-timer notification. If your Play developer account is a new personal account, Google requires a closed test with at least 12 testers for 14 days before Production; check your account page.
8. **Production.** Promote the tested build, choose countries (Egypt first), and roll out. Raise the Android version code on every later build (the workflow does it for you).

## Owner / Claude release gates
- Owner: the steps above, and keep the keystore backed up. If it is lost Play can reset the upload key, but only with Google support and time.
- Owner: Apple Developer membership for iPhone device builds and App Store submission (not needed for the Android release). `ITSAppUsesNonExemptEncryption` is already `false` in the app config.
- Support and privacy policy pages: `site/` is published by `.github/workflows/pages.yml` to https://omarismail0.github.io/Liftria/support.html and https://omarismail0.github.io/Liftria/privacy.html (Arabic at `#ar`). One-time owner step: Settings, Pages, Source: GitHub Actions. Use the privacy URL in Play Console and App Store Connect. Keep `site/privacy.html` in step with the in-app privacy page (`p4.privacy.*`).
- Owner and Claude: check Hiku's user-triggered Anthropic processing, optional photo Beta, privacy disclosures, permissions, age and category questionnaires, the local-first claim, and both localized store listings.
- Claude: verify the iPhone light and dark app icon, the Android adaptive and themed icon, the native splash in light and dark, and the screenshots.

Store guides: https://support.google.com/googleplay/android-developer/answer/9859152 and https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information
