# Store privacy answers: Google Play Data safety and Apple privacy labels

Derived from the code on 2026-11-16 (Phase 7 security review, Liftria 1.0.0). Every answer
below was checked against the source; the file and test that back each fact are listed in
"Evidence". If the app changes (a new network call, SDK, or data type), redo this file.

## What the app does with data (verified)

- **No Liftria server, no account, no analytics, no ads, no crash reporting, no remote config,
  no update checks.** `expo-updates` is not a dependency. The only outbound requests in the
  code are the Anthropic calls below.
- **Outbound requests, complete list:**
  1. `GET https://api.anthropic.com/v1/models?limit=1` or `/v1/models/<model>`: the user taps
     "Test key" (Settings and onboarding). Sends the user's own API key in the `x-api-key`
     header and nothing else. 20 s timeout.
  2. `POST https://api.anthropic.com/v1/messages`: the user taps Send in Hiku. Sends the meal text
     the user typed, or the re-encoded photo (1024 px long edge, JPEG, no EXIF/GPS) plus the
     optional note, plus the "Include today" / "Include training" summaries only if the user
     turned them on (calories eaten and target for today; title of today's workout). 45 s
     timeout, no automatic retry, HTTPS only, key in a header (never in a URL).
  3. User-tapped links open the system browser or the store (Health Connect install page,
     Anthropic's price list). These are not requests made by the app itself.
- **On device:** SQLite database in app-private storage, the API key in the platform secure
  store (Android Keystore through expo-secure-store, iPhone Keychain, this-device-only). Progress
  photos and optional kept Hiku photos are stored inside the SQLite database (base64), not as
  files. Temporary files (picker/manipulator copies, export copies) are in the cache and are
  deleted after use and by Delete all. Android auto-backup is off (`allowBackup: false`).
- **Health Connect (Android) and Apple Health (iPhone):** read-only, requested only after the
  user taps the grant button; values stay on the phone and are never sent to Hiku or anywhere.
- **Delete all** removes every table, the API key, temporary files and scheduled notifications.

## Google Play: Data safety form

Section "Data collection and security"

| Question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data types? | **Yes** (see note on Hiku below; choose Yes because Hiku sends user content to a third party the user configures). |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS to api.anthropic.com is the only transmission). |
| Do you provide a way for users to request that their data be deleted? | **Yes**: Settings, Data and storage, Delete all (everything is local; nothing is held by Liftria). |
| Committed to the Play Families Policy | **No** (not directed at children under 13). |

Reasoning for "Yes": Google counts data transmitted off the device to a third party as "shared"
unless an exemption applies. The Hiku request goes to Anthropic, under the user's own key, only
when the user taps Send, and this is a user-initiated transfer. Google's exemption for
"user-initiated transfer to a third party the user explicitly chose" may allow answering **No
data shared** for Hiku, but that is Google's judgement call and is the owner's decision (see
"Decisions for the owner"). The conservative answer below declares it as shared.

Data types (declare only these; everything else is **not collected**):

| Data type | Collected | Shared | Optional | Purpose | Notes |
| --- | --- | --- | --- | --- | --- |
| Photos (Photos and videos) | No | **Yes**, only the Hiku meal photo | Yes (Hiku photo is Beta, off until used) | App functionality | Sent to Anthropic only when the user taps Send. Not stored on any Liftria server. |
| Food diary text (User-generated content: Other) | No | **Yes**, only the meal text typed into Hiku | Yes | App functionality | Same as above. |
| Health and fitness: Fitness info | No | **Yes**, only if the user turns on "Include today" / "Include training" in Hiku settings (calories eaten, calorie target, title of today's workout) | Yes | App functionality | Off by default. Health Connect values are never sent. |
| Personal identifiers, location, contacts, messages, financial info, device ID, app activity, web browsing, audio, files, calendar | No | No | n/a | n/a | Not accessed. |

Why "Collected: No" for those rows: "collected" means transmitted to the developer or to a service
the developer controls. Liftria has no server, so nothing is collected by the developer; the
third party is Anthropic, reached through the user's own key. If the owner prefers to follow
Google's wording strictly ("collected = sent off the device by the app"), mark the three rows
as Collected: Yes, Shared: Yes, Optional, App functionality. That is the safer reading.

Security practices:
- Data is encrypted in transit: **Yes**.
- Users can request data deletion: **Yes** (in-app Delete all; no server-side data exists).
- Independent security review: **No**.

Other Play forms that depend on these facts:
- Permissions: INTERNET, POST_NOTIFICATIONS, `android.permission.health.READ_*` (steps, heart rate,
  active and total calories, basal metabolic rate, exercise, sleep, weight, body fat, lean body
  mass, and read health data history). Camera is requested at runtime only for "Take a photo".
  No storage, location, audio, exact-alarm, boot, or overlay permissions
  (blocked in `app.config.ts`).
- Health Connect permissions declaration: read-only; purpose "show your steps, heart rate,
  calories, sleep, weight and body measurements next to your workouts and food diary inside
  the app". The data is not shared, not sold, not used for ads.
- Advertising ID: **No**. Ads: **No**. Account creation: **No**.

## Apple App Store: App privacy (nutrition labels)

Question "Do you or your third-party partners collect data from this app?" Apple defines
collect as "transmit data off the device in a way that allows you and/or your third-party
partners to access it for longer than needed to service the request in real time". Hiku
requests are processed by Anthropic under the user's own API key; Liftria and the owner never
receive them.

Recommended answer: **Data Not Collected**, because Liftria (the developer) never receives any
data and has no third-party SDK. Apple's guidance excludes data a user sends to a service the
user chose, where the developer cannot access it.

If the owner or App Review decides the Anthropic transfer counts, declare exactly this and no
more, each linked to no identity, not used for tracking, purpose "App Functionality":
- Health and Fitness: Fitness (only the optional Include today / Include training summaries)
- Photos or Videos: Photos or Videos (Hiku meal photo)
- User Content: Other User Content (Hiku meal text)

Tracking: **No** (no ATT prompt, no ad SDK, no cross-app identifiers).

Other iPhone answers:
- HealthKit: read only (`NSHealthShareUsageDescription` set, `NSHealthUpdateUsageDescription`
  omitted). Health data is not used for advertising or sold and is not sent to Anthropic.
- Camera and photo library usage strings are in `app.config.ts` (`expo-image-picker`).
- Required-reason APIs and the privacy manifest are generated by Expo; re-check the generated
  `PrivacyInfo.xcprivacy` in the first iOS build.
- Export compliance: HTTPS only, standard encryption (exempt).

## Evidence (where each fact was verified)

| Fact | Code | Test |
| --- | --- | --- |
| Key only in SecureStore | `src/services/secure-storage/index.ts` | `deleteAllCoverage.test.ts` (only one SecureStore user, one key) |
| Key not in backup, JSON or CSV | `src/features/settings/backup.ts`, `csvExport.ts` | `keyExclusion.test.ts` |
| Delete all clears tables, key, temp files, notifications | `src/features/settings/storage.ts` | `deleteAllCoverage.test.ts` |
| Only Anthropic requests | `src/features/hiku/client.ts`, `settings/keyTest.ts`, `services/anthropic/index.ts` (developer diagnostics only) | `grep fetch(` over `app` and `src` |
| Photo is re-encoded, EXIF/GPS dropped, 1024 px | `src/features/hiku/photo.ts`, `features/progress/progressPhotoFile.ts` | `hiku` and `progress` photo tests |
| Health read-only | `src/services/health/android.ts`, `appleHealth.ts`, `app.config.ts` | `src/services/health/__tests__` |
| Dev routes absent in release | `app/dev/_layout.tsx`, `src/navigation/devRoutes.ts` | `src/navigation/__tests__` |
| No auto backup | `app.config.ts` `allowBackup: false` | n/a |

## Decisions for the owner

1. **Play "shared" for Hiku.** Declare Hiku content as shared (conservative, listed above) or
   claim the user-initiated-transfer exemption. Both are defensible; Google decides.
2. **Apple "Data Not Collected" versus listing the three Hiku data types.** Recommended: Data
   Not Collected. Ask App Review if unsure.
3. **Privacy policy contact.** `site/privacy.html` points to the GitHub issues page. Google Play
   and Apple may expect a monitored contact email on the policy page. Add one if wanted.
4. **Anthropic's own retention.** The policy links Anthropic's privacy policy. Liftria cannot
   delete what Anthropic holds.
