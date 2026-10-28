# LIFTRIA Phase 5: tasks and review notes

Claude's task list for the build agent. **This file is Claude's.** Don't edit it on PR branches. Put progress in your PR description.

**Goal (owner, 2026-10-26):** finish the app. The owner's phone tests no longer block work. Claude reviews every PR on the emulator; the owner tests the finished build.

Background for the choices below: `docs/COMPETITIVE_REVIEW.md` → "Next (Phase 5 candidates)".

**PR L, M, N and O are done. Two builders now work in parallel (owner, 2026-10-28): GPT does PR S (iPhone, #28), then PR R2. Cursor (run by Claude) does PR R1.** Each takes only its own task; neither edits the other's files beyond what its task needs. If both touch `src/i18n/en.ts` / `ar.ts`, the later PR merges `main` in with a merge commit. Claude's design polish (PR #27: card edges, back button, motion) lands in the shared primitives; build on them, don't restyle per screen. (it doesn't depend on PR K #22, which only waits on Claude's screenshots). Each later PR starts from `main` once the previous PR's `verify` is green; stack on the previous branch only if it hasn't merged yet (merge `main` in later with a merge commit, never rebase).

---

## Order

1. ~~**PR L: `Phase 5 / Gym parity`**~~ DONE: PR #23 merged (2026-10-26). (Hevy features people expect)
   - **Plate calculator:** from the target weight and the bar (20 kg / 45 lb default, editable in Settings), show the plates per side. Use the "small plates" setting that already exists. Unit-test the greedy split and the "can't make this exact weight" case (show the closest lower load).
   - **Warm-up calculator:** a "Warm-up sets" action on a working exercise adds suggested warm-up rows (e.g. bar × 10, 40% × 5, 60% × 3, 80% × 1, rounded to loadable plates). They are suggestions until the user logs them, the same as other suggested values (never saved as data until logged).
   - **Supersets:** link 2–3 exercises in a template or an active workout. Logging a set moves focus to the next exercise in the superset (smart scrolling), and the rest timer starts after the last exercise of the round.
   - **RPE / RIR per set:** optional, off by default (Settings → Training). One small field per set; null when not entered, never 0.
   - **Exercise notes:** a note per exercise in a workout (exists in the schema? if not, an additive migration). Show the last note on the next session of the same exercise, and in History.
   - **Rest timer notification:** when rest starts and the app goes to the background, schedule a local notification for the end of rest (`expo-notifications`, already installed; `POST_NOTIFICATIONS` is allowed). Cancel it when the user returns or skips. **No foreground service, no exact-alarm permission** (the release permission gate blocks them).
   - Screenshots: add `dev/demo-*` routes for a superset workout and the plate calculator.
2. ~~**PR M: `Phase 5 / Adaptive expenditure`**~~ DONE: PR #24 merged (2026-10-27). (MacroFactor's main feature; the competitive review's #1)
   - **Estimate:** daily expenditure ≈ average logged intake − (change in **trend** weight × 7,700 kcal/kg) ÷ days, over the last 14–28 days. Use only logged days for intake.
   - **When to show it:** at least 14 days of history, at least 10 logged days and at least 4 weigh-ins in that window. Before that, show "Needs N more logged days / weigh-ins", never a number.
   - **Label:** always "Estimated burn" with the estimate chip. Never mix in watch or Health Connect calorie data (the "Daily calories NOT READY" gate stays).
   - **Weekly check-in:** once a week, *propose* a new calorie target from the estimate and the goal (lose / maintain / build, with the same safety floor and sheet as EA-6). The user accepts, edits or dismisses. Never change the target silently. Record the proposal and the answer.
   - Unit-test the estimate with fixed data, including gaps, a weight plateau and too-little-data cases.
3. ~~**PR N: `Phase 5 / Backup, water and fiber`**~~ DONE: PR #25 merged (2026-10-27).
   - **Backup and restore (important for a local-first app):** Settings → Data → "Export a backup" writes one JSON file with every table (versioned, with the schema version). "Restore from backup" reads it, shows what it contains, and replaces local data only after a typed confirmation. Use `expo-document-picker` and `expo-file-system` (both already installed) plus the system share sheet; no new permissions. Test a round trip.
   - **CSV export** of workouts and the food diary for spreadsheets.
   - **Water:** a simple glass counter on Today and Eat (glass size in Settings, 250 ml default). Not logged ≠ 0.
   - **Fiber, sugar and sodium** in the diary and trends. The packs have all three (Claude rebuilt them on 2026-10-26: `sugar` in g and `sodium` in mg per 100 g). Any of them, and protein/carbs/fat too, can be **null** when the source doesn't report it: show "—" and never count it as 0. Snapshot them into diary entries like the macros (additive migration).
4. ~~**PR O: `Phase 5 / Hiku photo (Beta)`**~~ DONE: PR #26 merged (2026-10-28). — owner decision 2026-10-26: build it now, labeled **Beta**; the owner tests it whenever they can.
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
6. ~~**PR R1: `Phase 5 / Release polish: text, Hiku and charts`**~~ DONE: PR #29 merged (2026-10-28). (builder: **Cursor**)
   - **Hiku polish (from PR #22's screenshots):** show costs as "less than $0.01" / "$0.03" (not "$0.00000"), and the price source as a tappable link, not a raw URL.
   - **Chart polish (from PR #21's screenshots):** axis labels (dates and values in the user's unit), larger nutrition dots or bars, and a Health Connect chip without a check mark when there are 0 Health Connect entries.
   - **Wording (from PR #24's screenshots):** the burn card says "smoothed weight change", but the estimate now uses a fitted weight trend; say "weight trend". In Arabic, numbers 11 and above take the singular ("14 يومًا", not "14 أيام"); check every counted phrase through `pluralForm()`.
   - **More from PR #24/#25's screenshots:** "1 weigh-ins" on the burn card (use `pluralForm()`); the restore sheet has both "Keep current data" and "Cancel" (keep one); the Eat ring shows "kcal" in English in Arabic, and the over-target ring draws a dark square behind the circle in Arabic.
   - **From PR #26's screenshots:** in Arabic, the Hiku review totals line mixes English units into Arabic text and the order comes out scrambled ("924 kcal · 31 بروتين g …"); use translated units and one direction-safe string per value. Hiku review items are pill buttons with long concatenated labels that wrap into two centered lines; make them list rows (name, grams · kcal, trailing status).
   - A privacy page in Settings → About that matches what the app actually does (local data, BYO key, what Hiku sends).
   - **Don't touch** `src/design/**` (Claude's, PR #27), the Health screens, or the stack layouts (PR S). Build on the existing primitives.
7. ~~**PR T: `Phase 5 / Arabic copy sweep`**~~ DONE: PR #30 merged (2026-10-28). (builder: **Cursor**; started from PR #29's branch, so merge `main` in with a merge commit now that #29 has merged)
   - **Units in Arabic:** no Latin `kcal`, `g`, `mg` or `ml` inside Arabic sentences. Use سعرة / غ / ملغ / مل. `kg` and `lb` stay Latin (app convention).
   - **One direction-safe value:** every number with its unit is one string with a no-break space (U+00A0) between them, wrapped with `bidiIsolate()` where it sits inside Arabic text, so it never wraps or reorders.
   - **Counted phrases:** every remaining Arabic count goes through `pluralForm()` with correct forms (11–99 take the singular accusative: "14 يومًا"). Where a count sits in "X of Y" phrasing, reword to avoid a counted noun ("الأيام المسجلة: 27 من 28").
   - **Untranslated values on screen:** Hiku usage rows show the raw model id and request status; show the model's display name and a translated status.
   - **Guard test:** a Jest test that fails if any `ar.ts` value contains Latin `kcal`, ` g`, ` mg` or ` ml`, and one that checks every `*.many` count key in `ar.ts` uses the singular accusative.
   - **Don't touch** `src/design/**` (Claude's; the Orb's "kcal" label is Claude's to fix there), the Health screens or the stack layouts (PR S).
8. **PR U: `Phase 5 / Number fields`** (builder: **Cursor**, branch from `main`) — from PR #30's screenshots
   - **Bug:** Eat → Targets fills its fields with raw floats ("23.112000000000002", "240.058"): `app/(tabs)/eat/targets.tsx` uses `String(value)` for the prefill. Find every `Field` in the app whose value is prefilled from a stored or computed number (targets, profile, portion, custom food, water size, plate/bar weights, onboarding) and format it for editing: kcal as a whole number; grams, kg and lb to at most 1 decimal; no trailing zeros; Western digits. Never change what is stored unless the user edits and saves.
   - One shared helper (e.g. `formatEditableNumber(value, kind)`), unit-tested with float noise (0.1+0.2, 23.112000000000002), integers, null (stays empty, never "0") and negative/NaN input.
   - **Arabic gram label:** the portion chip says "جم" while the rest of the app now says "غ". Use "غ" everywhere.
   - **Don't touch** `src/design/**` or the Health screens and stack layouts (PR S).
   - **Claude (not this PR):** the over-target Eat ring still draws a dark square in Arabic (PR #30 screenshots); R1's `EatRing` wrapper didn't fix it. Claude fixes it in `Orb` after PR #27 merges and removes the wrapper.
9. **PR R2: `Phase 5 / Release readiness`** (builder: **GPT**, after PR S merges)
   - Final app icon and splash in light and dark, the Play Store short and full descriptions (English and Arabic), App Store descriptions (English and Arabic), and screenshot routes for the store images.
   - Owner: Android signing secrets in GitHub (`LIFTRIA_*`), then Claude builds the signed release.
   - **Claude does these in the shared code:** long screen titles (at most two lines, ellipsis, break between words) in `Header`, and gating every `dev/*` route out of release builds except what the emulator check needs.

**Not in Phase 5:** barcode scanning (Claude first measures how many Egyptian products Open Food Facts has), Wear OS (wearable gate), social features, ads.

**Rules (same as Phase 4):**
- Every push runs `verify`. Claude adds `build` for emulator screenshots and merges when `verify` is green and the screenshots are clean.
- One commit per sub-step. Batch your pushes. Run nothing you can't check; Claude runs the checks.
- **New dependencies:** `expo-sharing` approved and installed by Claude (2026-10-27) for backup/CSV export on Android and iPhone. `expo-document-picker`, `expo-file-system` and `expo-notifications` are already installed. Ask in the PR before adding anything else; Claude regenerates the lockfile.
- **Never:** workflow edits, fabricated results, invented nutrition numbers, `crypto.*` (use `newGymId()`), suggested values saved as data, anything from openGym (AGPL), `Intl` APIs other than `NumberFormat` / `DateTimeFormat` / `Collator`.
- Every new string in English and Arabic. Every new table is covered by Delete all and by the backup.
