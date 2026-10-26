# LIFTRIA Phase 5: tasks and review notes

Claude's task list for the build agent. **This file is Claude's.** Don't edit it on PR branches. Put progress in your PR description.

**Goal (owner, 2026-10-26):** finish the app. The owner's phone tests no longer block work. Claude reviews every PR on the emulator; the owner tests the finished build.

Background for the choices below: `docs/COMPETITIVE_REVIEW.md` → "Next (Phase 5 candidates)".

**Start PR L now, from `main`** (it doesn't depend on PR K #22, which only waits on Claude's screenshots). Each later PR starts from `main` once the previous PR's `verify` is green; stack on the previous branch only if it hasn't merged yet (merge `main` in later with a merge commit, never rebase).

---

## Order

1. **PR L: `Phase 5 / Gym parity`** (Hevy features people expect)
   - **Plate calculator:** from the target weight and the bar (20 kg / 45 lb default, editable in Settings), show the plates per side. Use the "small plates" setting that already exists. Unit-test the greedy split and the "can't make this exact weight" case (show the closest lower load).
   - **Warm-up calculator:** a "Warm-up sets" action on a working exercise adds suggested warm-up rows (e.g. bar × 10, 40% × 5, 60% × 3, 80% × 1, rounded to loadable plates). They are suggestions until the user logs them, the same as other suggested values (never saved as data until logged).
   - **Supersets:** link 2–3 exercises in a template or an active workout. Logging a set moves focus to the next exercise in the superset (smart scrolling), and the rest timer starts after the last exercise of the round.
   - **RPE / RIR per set:** optional, off by default (Settings → Training). One small field per set; null when not entered, never 0.
   - **Exercise notes:** a note per exercise in a workout (exists in the schema? if not, an additive migration). Show the last note on the next session of the same exercise, and in History.
   - **Rest timer notification:** when rest starts and the app goes to the background, schedule a local notification for the end of rest (`expo-notifications`, already installed; `POST_NOTIFICATIONS` is allowed). Cancel it when the user returns or skips. **No foreground service, no exact-alarm permission** (the release permission gate blocks them).
   - Screenshots: add `dev/demo-*` routes for a superset workout and the plate calculator.
2. **PR M: `Phase 5 / Adaptive expenditure`** (MacroFactor's main feature; the competitive review's #1)
   - **Estimate:** daily expenditure ≈ average logged intake − (change in **trend** weight × 7,700 kcal/kg) ÷ days, over the last 14–28 days. Use only logged days for intake.
   - **When to show it:** at least 14 days of history, at least 10 logged days and at least 4 weigh-ins in that window. Before that, show "Needs N more logged days / weigh-ins", never a number.
   - **Label:** always "Estimated burn" with the estimate chip. Never mix in watch or Health Connect calorie data (the "Daily calories NOT READY" gate stays).
   - **Weekly check-in:** once a week, *propose* a new calorie target from the estimate and the goal (lose / maintain / build, with the same safety floor and sheet as EA-6). The user accepts, edits or dismisses. Never change the target silently. Record the proposal and the answer.
   - Unit-test the estimate with fixed data, including gaps, a weight plateau and too-little-data cases.
3. **PR N: `Phase 5 / Backup, water and fiber`**
   - **Backup and restore (important for a local-first app):** Settings → Data → "Export a backup" writes one JSON file with every table (versioned, with the schema version). "Restore from backup" reads it, shows what it contains, and replaces local data only after a typed confirmation. Use `expo-document-picker` and `expo-file-system` (both already installed) plus the system share sheet; no new permissions. Test a round trip.
   - **CSV export** of workouts and the food diary for spreadsheets.
   - **Water:** a simple glass counter on Today and Eat (glass size in Settings, 250 ml default). Not logged ≠ 0.
   - **Fiber, sugar and sodium** in the diary and trends. The packs have all three (Claude rebuilt them on 2026-10-26: `sugar` in g and `sodium` in mg per 100 g). Any of them, and protein/carbs/fat too, can be **null** when the source doesn't report it: show "—" and never count it as 0. Snapshot them into diary entries like the macros (additive migration).
4. **PR O: `Phase 5 / Hiku photo (Beta)`** — owner decision 2026-10-26: build it now, labeled **Beta**; the owner tests it whenever they can.
   - **Take a photo or pick one** with `expo-image-picker` (installed). The camera is approved (owner, 2026-10-26): Claude already enabled the permission and its English/Arabic prompt texts for Android and iPhone. Ask for camera access only when the user taps "Take a photo"; if they decline, explain once and offer the gallery.
   - **Before sending:** downscale with `expo-image-manipulator` (installed) to a 1024 px long edge, JPEG quality 0.7, which also strips EXIF/location. Show the exact image that will be sent, plus the optional text note, before the user taps Send.
   - **Request:** the same client and rules as text (selected model, `effort: 'low'`, `max_tokens: 8000`, JSON schema, 45 s timeout, cost recorded in `hiku_requests` with `kind: 'photo'`). Send the image as a base64 `image` content block before the text block.
   - **Review:** the same HK-4 review screen. Every item is an estimate the user checks and edits before Save; Egypt-pack matches still override the model's numbers. A "Beta" chip on the photo button and on the review screen, with one line: "Photo estimates are new. Check every item before saving."
   - **Privacy:** no photo is kept after the request unless Settings → Hiku → "Keep photos" is on (off by default). Add it to Delete all and the backup.
   - Test: the resize/EXIF step (mock the manipulator), the request body shape (image block first, no `thinking`/`temperature`), and that nothing saves without the review.
   - Screenshots: a `dev/demo-hiku-photo?auto=1` route using a bundled sample image and pack values, with Save disabled and no API call.
5. **PR S: `Phase 5 / iPhone`** (owner, 2026-10-26: "don't forget about iPhone")
   - The app must run on iPhone from the same code. Claude added the iPhone config (bundle id `com.liftria.app`, permission texts in English and Arabic, right to left from the first launch) and a CI job that builds it for the iPhone simulator (`ios-build.yml`; label a PR `ios` to run it). **It builds green on `main` (2026-10-26)**; it selects the newest Xcode on the runner because Expo needs Swift 6.2.
   - **Health:** Health Connect is Android-only. On iPhone, every Health Connect screen and call must be behind `Platform.OS === 'android'`; on iPhone show an honest "Apple Health support is coming" state, never fake data. Apple Health (HealthKit) is a separate later PR: Claude picks the library and asks the owner.
   - Check every Android-only call (Health Connect, the Android notification channel, back-button handling) and every screen in the iPhone layout: safe areas (notch and home bar), the keyboard on Field screens, and swipe-back on stack screens.
   - Rest notifications, Hiku, backup/restore (share sheet and document picker) and the camera must work on iPhone too.
   - Screenshots: Claude adds an iPhone simulator screenshot pass once the build is green.
   - **Owner:** an Apple Developer account (US$99/year) is needed to install on a real iPhone or ship on the App Store; the simulator build needs nothing.
6. **PR R: `Phase 5 / Release readiness`**
   - Final app icon and splash in light and dark, the Play Store short and full descriptions (English and Arabic), and screenshot routes for the store images.
   - **Hiku polish (from PR #22's screenshots):** show costs as "less than $0.01" / "$0.03" (not "$0.00000"), and the price source as a tappable link, not a raw URL.
   - **Chart polish (from PR #21's screenshots):** axis labels (dates and values in the user's unit), larger nutrition dots or bars, and a Health Connect chip without a check mark when there are 0 Health Connect entries.
   - A privacy page in Settings → About that matches what the app actually does (local data, BYO key, what Hiku sends).
   - Remove or hide every `dev/*` route in release builds, except what the emulator check needs (Claude will gate those behind a build flag).
   - Owner: Android signing secrets in GitHub (`LIFTRIA_*`), then Claude builds the signed release. App Store descriptions (English and Arabic) too, for iPhone.

**Not in Phase 5:** barcode scanning (Claude first measures how many Egyptian products Open Food Facts has), Wear OS (wearable gate), social features, ads.

**Rules (same as Phase 4):**
- Every push runs `verify`. Claude adds `build` for emulator screenshots and merges when `verify` is green and the screenshots are clean.
- One commit per sub-step. Batch your pushes. Run nothing you can't check; Claude runs the checks.
- **New dependencies:** none approved. `expo-document-picker`, `expo-file-system` and `expo-notifications` are already installed. Ask in the PR before adding anything else; Claude regenerates the lockfile.
- **Never:** workflow edits, fabricated results, invented nutrition numbers, `crypto.*` (use `newGymId()`), suggested values saved as data, anything from openGym (AGPL), `Intl` APIs other than `NumberFormat` / `DateTimeFormat` / `Collator`.
- Every new string in English and Arabic. Every new table is covered by Delete all and by the backup.
