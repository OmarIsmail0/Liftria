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
5. ~~**PR S: `Phase 5 / iPhone`**~~ DONE: PR #28 merged (2026-10-29). (owner, 2026-10-26: "don't forget about iPhone")
   - The app must run on iPhone from the same code. Claude added the iPhone config (bundle id `com.liftria.app`, permission texts in English and Arabic, right to left from the first launch) and a CI job that builds it for the iPhone simulator (`ios-build.yml`; label a PR `ios` to run it). **It builds green on `main` (2026-10-26)**; it selects the newest Xcode on the runner because Expo needs Swift 6.2.
   - **Health:** Health Connect is Android-only. On iPhone, every Health Connect screen and call must be behind `Platform.OS === 'android'`; on iPhone show an honest "Apple Health support is coming" state, never fake data. Apple Health (HealthKit) is a separate later PR: **PR AA** (library chosen and approved 2026-10-29).
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
8. ~~**PR U: `Phase 5 / Number fields`**~~ DONE: PR #31 merged (2026-10-28). (builder: **Cursor**, branch from `main`) — from PR #30's screenshots
   - **Bug:** Eat → Targets fills its fields with raw floats ("23.112000000000002", "240.058"): `app/(tabs)/eat/targets.tsx` uses `String(value)` for the prefill. Find every `Field` in the app whose value is prefilled from a stored or computed number (targets, profile, portion, custom food, water size, plate/bar weights, onboarding) and format it for editing: kcal as a whole number; grams, kg and lb to at most 1 decimal; no trailing zeros; Western digits. Never change what is stored unless the user edits and saves.
   - One shared helper (e.g. `formatEditableNumber(value, kind)`), unit-tested with float noise (0.1+0.2, 23.112000000000002), integers, null (stays empty, never "0") and negative/NaN input.
   - **Arabic gram label:** the portion chip says "جم" while the rest of the app now says "غ". Use "غ" everywhere.
   - **Don't touch** `src/design/**` or the Health screens and stack layouts (PR S).
   - ~~**Claude (not this PR):** the over-target Eat ring draws a dark square in Arabic.~~ Claude's PR (2026-10-29): the Orb's glow is drawn in SVG instead of a native `boxShadow`, the `EatRing` wrapper is gone, the Orb shows the same big number and caption in Arabic, and long `Header` titles shrink, then wrap to two lines with an ellipsis.
9. ~~**PR V: `Phase 5 / Data coverage guards`**~~ DONE: PR #33 merged (2026-10-28). (builder: **Cursor**, branch from `main`)
   - The rule "every new table is covered by Delete all and by the backup" has no test. Add guards that fail when it breaks:
     - **Backup:** every table the migrations create (read the `CREATE TABLE` statements in `src/services/database/index.ts`) is in `BACKUP_TABLES`, and every `BACKUP_TABLES` entry exists in the schema. A test that adds a fake table must make the guard fail.
     - **Delete all:** `app/settings/data.tsx` → Delete all removes every row of every table (except what the code documents it must keep, if anything: say why), the Anthropic key in SecureStore, and kept Hiku photo files on disk. Move the delete logic into a testable function in `src/features/settings/` if it lives in the screen, and test it against an in-memory or mocked database that lists every table.
     - **Restore:** a round trip (export → restore) keeps every table's rows; add a table to the fixture and the test must notice it's missing.
   - Fix any real gap the guards find (a table or file that isn't deleted or backed up), one commit per fix, and list each gap in the PR description.
   - **Don't touch** `src/design/**`, the Health screens or the stack layouts.
10. ~~**PR W: `Phase 5 / No English in the Arabic UI`**~~ DONE: PR #34 merged (2026-10-29). (builder: **Cursor**; bake-off won by Sonnet 5.5, PR #34; Grok 4.7's #35 closed).
   - **Bug (PR #30/#31 screenshots):** in Arabic the workout mini-bar shows "Resume" and "0 of 9 sets"; spoken labels are English too ("Resume …", "Rest timer, …", "Enter …", "edit with keypad"). `src/i18n/__tests__/screenLiteralCopy.test.ts` only scans `app/` and only catches literal props, so `src/features/**` and concatenated strings slip through.
   - **Guard:** extend the source guard to `src/features/**` (not `src/design/**`, not `dev`), and to English inside string concatenation and template literals that reach the screen: JSX text, `Typography`/`Text` children, and `accessibilityLabel` / `label` / `title` / `placeholder` / `description` props (e.g. `'Resume '+x`, `` `Enter ${label}` ``, `{a} of {b}`). Keep a short allow-list of real tokens (brand names, units like `kg`). It must fail on today's code.
   - **Fix** everything it finds: every user-facing string and every spoken label goes through `t()` with English and Arabic. Counts go through `pluralForm()`, and in Arabic a number with its unit uses a no-break space.
   - **Don't touch** `src/design/**` (Claude's), the Health screens or the stack layouts. List every file you changed in the PR description.
11. ~~**PR X: `Phase 5 / Rule guards`**~~ DONE: PR #36 merged (2026-10-29); ESLint now has no warnings. (builder: **Cursor**, Sonnet 5.5, branch from `main`)
   - The "never" rules in `HANDOFF.md` → "Technical gotchas" have no tests. Add source guards over `app/**` and `src/**` (tests excluded) that fail when someone breaks them:
     - **Hermes:** no `Intl.` API other than `NumberFormat`, `DateTimeFormat` and `Collator` (e.g. `Intl.PluralRules`, `Intl.RelativeTimeFormat`, `Intl.ListFormat`); no `crypto.` (use `newGymId()`).
     - **Reanimated:** no `.value =` / `.value +=` assignment on shared values (use `.set()`).
     - **Locales:** every key in `locales/en.json` and `locales/ar.json` sits under `"ios"` (Android lint fails otherwise), and both files have the same keys.
     - Each guard must fail on a planted example: test the scanner itself with small code strings, as PR W's `englishCopyScanner` tests do.
   - **Lint:** clear the existing ESLint warnings (`npx eslint .` shows 15) by fixing the code, not by disabling rules. If one can't be fixed safely, explain it in the PR.
   - **Don't touch** `src/design/**` (Claude's; leave its warnings and list them in the PR), the Health screens or the stack layouts.
12. ~~**PR Y: `Phase 5 / Health charts in Arabic`**~~ DONE: PR #38 merged (2026-10-29). (builder: **Cursor**, Sonnet 5.5; starts once PR W #34 is merged, from `main`)
   - `src/features/health/HealthCharts.tsx` still shows English in Arabic: "No source-backed steps to plot.", "hourly"/"daily", "Midnight · 6 AM · Noon · 6 PM · Midnight", "7 days ago · Today", the heart-rate summary and its accessibility text. Translate all of it (English and Arabic; counts through `pluralForm()`; number+unit with a no-break space; times in the user's locale with Western digits).
   - Widen PR W's guard (`src/i18n/__tests__/englishInArabicUi.test.ts`) to scan `src/features/health/**`, keeping the exclusion only for the files PR S (#28) edits: `app/(tabs)/progress/health*.tsx`, `src/features/health/AppleHealthComing.tsx`, `src/features/health/useHealthSnapshot.ts`. Fix whatever else it finds in `src/features/health/**` outside those files.
   - **Don't touch** `src/design/**`, `src/services/health/**` or the files above.
13. ~~**PR R2: `Phase 5 / Release readiness`**~~ DONE: PR #47 merged (2026-10-30). Single-path L icon, Android adaptive and themed icon, store screenshots from real screens; Claude regenerated the splash marks. Still owner's: signing secrets, Apple Developer account, support/privacy URLs. (builder: **GPT**; owner 2026-10-29: start now from `main` on a new branch, without waiting for PR S. Don't touch the Health files or `src/services/health/**`; PR S and PR AA own them)
   - Final app icon and splash in light and dark, the Play Store short and full descriptions (English and Arabic), App Store descriptions (English and Arabic), and screenshot routes for the store images.
   - Owner: Android signing secrets in GitHub (`LIFTRIA_*`), then Claude builds the signed release.
   - ~~**Claude does these in the shared code:** long screen titles in `Header`~~ DONE: PR #40 merged (2026-10-29), with the Orb fixes and Western digits on iPhone. ~~Gating `dev/*` out of release builds~~ DONE: PR #32 merged (2026-10-28); CI APKs keep them via `EXPO_PUBLIC_LIFTRIA_DEV_ROUTES`.

14. ~~**PR Z: `Phase 5 / Arabic exercise names`**~~ DONE: PR #43 merged (2026-10-29). Built by Claude: Cursor's run crashed at the usage limit. The Arabic library sorts with one shared `Intl.Collator('ar')`; `localeCompare(x, 'ar')` per comparison froze it on Hermes.
   - In Arabic, every exercise name is English: the 876 bundled exercises come from `assets/data/exercises/free-exercise-db.json` (English data). Give each bundled exercise an Arabic display name.
   - **Data:** one file, `src/i18n/exerciseNamesAr.ts`, mapping the pack exercise `id` to its Arabic name. Don't edit the pack JSON, the database rows or the stored `name`: the English name stays the stored and imported (Hevy CSV matching) name, and backups don't change.
   - **Display:** one helper (e.g. `exerciseName(language, exercise)` in `src/i18n/`) returns the Arabic name for `source: 'pack'` exercises in Arabic, otherwise `exercise.name`. Custom exercises always show what the person typed. Use it everywhere an exercise name reaches the screen, a spoken label or the rest notification. Find every place (library, pick, muscles, template, active workout and its mini-bar, session, history, records, exercise detail, preview, strength progress, import preview, plans, notifications), and list each file in the PR description.
   - **Search:** in Arabic, the library and pick search match the Arabic name *and* the English name, so people can type either. Normalize Arabic before matching: strip diacritics and tatweel; treat أ إ آ as ا, ى as ي and ة as ه. Unit-test it, including partial words.
   - **Names: what people say in an Egyptian gym, written in Arabic letters.** Keep one term per concept across all 876. Start from this glossary and extend it consistently:

     | English | Arabic |
     |---|---|
     | Bench Press | بنش برس |
     | Squat | سكوات |
     | Deadlift | ديدليفت |
     | Curl | كيرل |
     | Row | سحب (e.g. Barbell Row: سحب بالبار) |
     | Pulldown / Pull-Up / Chin-Up | سحب أمامي / عقلة / عقلة بقبضة عكسية |
     | Press (shoulder) | ضغط كتف |
     | Fly | تفتيح |
     | Lunge | لانج |
     | Raise (lateral / front) | رفرفة جانبي / أمامي |
     | Extension / Kickback | تمديد / كيك باك |
     | Crunch / Sit-Up / Plank | كرانش / بطن / بلانك |
     | Stretch | إطالة |
     | Barbell / Dumbbell / Cable / Machine / Kettlebell / Smith | بالبار / بالدمبل / بالكابل / على الجهاز / بالكيتل بيل / على السميث |
     | Incline / Decline / Seated / Standing / Lying | مائل / مائل لأسفل / جالس / واقف / نائم |
     | Alternate / One-Arm / Single-Leg | بالتبادل / بذراع واحدة / برجل واحدة |

     Equipment words match `src/i18n/equipment.ts`. Proper names are transliterated (Arnold Press: ضغط أرنولد; Zottman Curl: كيرل زوتمان). Don't invent a muscle or a movement the English name doesn't say.
   - **Guards (tests):** every pack `id` has an Arabic name and every key is a real pack `id`; no name is empty or contains Latin letters (allow-list only real tokens such as `EZ`, `T`, `V`, `W`, `Y`); no two different exercises share the same Arabic name; glossary terms are used consistently (e.g. any English name containing "Bench Press" maps to an Arabic name containing "بنش برس"). Each guard must fail on a planted bad example.
   - Instructions stay English for now (out of scope).
   - **Don't touch** `src/design/**`, the Health screens or the stack layouts (PR S, #28), or the import matching.

15. ~~**PR AA: `Phase 5 / Apple Health`**~~ DONE: PR #44 and PR #52 merged (2026-10-29). (owner approved 2026-10-29). Split into two parts:
   - **Part 1, library + adapter + config + tests:** PR #44 (Cursor, Grok 4.7), based on PR S's branch. Claude fixed body fat (HealthKit's `%` is a 0–1 fraction) and made the iPhone build require the read text and forbid a write prompt. Merge after #28.
   - **Part 2, the iPhone screens:** after #28 and #44 merge. The spec below covers both parts.
   - **Library (owner approved):** `@kingstinct/react-native-healthkit` (MIT, maintained, New Architecture via Nitro) plus its peer `react-native-nitro-modules`. Install with `npx expo install`; Claude regenerates the lockfile if it needs to. No other new dependency.
   - **Config:** add its Expo config plugin in `app.json`, with read-only usage text in English (`NSHealthShareUsageDescription`, plus the Arabic string in `locales/ar.json` under `"ios"`). No write access: no `NSHealthUpdateUsageDescription`, and the app never writes to Apple Health. No background delivery.
   - **Adapter:** `src/services/health/appleHealth.ts` implements the existing `HealthDataSource` for every `MetricType` HealthKit has (steps, heart rate, active and basal energy, workouts, sleep, weight, body fat, lean body mass). Add `'apple-health'` to `SourceMeta['adapter']`. Fill `recordId` (HealthKit UUID), `dataOrigin` (source bundle id) and `device` from the sample. Normalize units to the existing ones (kg, %, kcal, bpm, count). Pick the adapter by `Platform.OS`; Health Connect stays Android-only.
   - **Honesty rules:** HealthKit never says whether *read* access was denied. `getPermissionStatus` returns `'unknown'` for reads after the request, never `'granted'`. An empty read shows the existing "no data" state with one line pointing to Settings → Health → Liftria, never a 0. No total is summed across sources that overlap (iPhone and Apple Watch steps): use HealthKit's statistics query (deduplicated) for daily totals, labeled as Apple Health's total.
   - **Screens:** replace PR S's "Apple Health support is coming" state with the real flow on iPhone: onboarding step 6, the Health tab, the metric screens and troubleshooting, with copy for iPhone ("Apple Health", "Settings → Health"). English and Arabic for every string.
   - **Tests:** the adapter's mapping and unit normalization run against recorded sample objects (mock the library), including the read permission staying `'unknown'`, an empty result and an error. The coverage guards (backup, Delete all) still pass. Nothing is stored that the guards don't cover.
   - **Checks:** the CI iPhone simulator (label `ios`) has little or no health data, so the shots show the empty and permission states. A real iPhone needs the owner's Apple Developer account. Say in the PR what couldn't be checked.
   - **Don't touch** `src/design/**`, the Android Health Connect adapter's behavior, or workflows.

16. ~~**PR AB: `Phase 5 / Accessibility guards`**~~ DONE: PR #48 merged (2026-10-29). (builder: **Cursor**, Grok 4.7, branch from `main`)
   - Add `src/i18n/__tests__/accessibility.test.ts`, a **TypeScript-AST** scanner (use the `typescript` package already in devDependencies; not regexes, because props span lines). It scans `app/**` and `src/features/**` (not `app/dev/**`, not tests) and fails when:
     1. a `Pressable`, `TouchableOpacity` or `TouchableHighlight` has no `accessibilityRole`, or has neither an `accessibilityLabel` nor a direct `Text`/`Typography` child with visible text;
     2. an `Image` has neither an `accessibilityLabel` nor `accessible={false}`;
     3. a `TextInput` has no `accessibilityLabel` (a placeholder isn't a label).
   - Test the scanner itself on small planted code strings: each rule must fail on a bad example and pass on a good one.
   - Fix every offender it finds: labels come from `t()` with English and Arabic strings. Don't change behavior or layout.
   - Don't touch `src/design/**` (the shared primitives already label themselves), the Health screens, `src/services/health/**`, or `app.config.ts`.

17. ~~**PR AC: `Phase 5 / Browse every exercise`**~~ DONE: PR #53 merged (2026-10-29). (builder: **Cursor**, Grok 4.7, branch from `main`)
   - The library shows only the first 60 of 876 exercises ("search to find more"), the muscle screen 50, and the picker 60. People can't browse the pack.
   - Make `app/(tabs)/train/library.tsx`, `pick.tsx` and `muscles.tsx` list **every** match with a virtualized list (`FlatList` / `SectionList`, keyed by exercise id, `getItemLayout` if rows have a fixed height). Keep the current look: the same `ListRow`s, card styling, headers, filters, the recent list and the empty state. Remove the "limited" message and its strings when nothing uses them.
   - The library in A–Z order gets section headers by first letter in English and in Arabic (Arabic order follows the Arabic names from PR Z: `searchExercises(..., language)` already sorts them).
   - Screen readers: the list stays navigable and the section headers are headers (`accessibilityRole="header"`).
   - Tests: the list data covers all 876 with no cap; section grouping in English and Arabic; the accessibility, English-in-Arabic and rule guards still pass.
   - Don't touch `src/design/**` (if `ListRow` can't sit inside a `FlatList` cleanly, say why in the PR instead), the Health screens, `src/services/health/**`, or `app.config.ts`.

18. ~~**PR AD: `Phase 5 / Arabic instructions for the common exercises`**~~ DONE: PR #55 merged (2026-10-29). GPT opened it twice; #51 closed as a duplicate. Claude replaced four "يحذّر المصدر" ("the source warns") phrasings with plain advice.
   - Exercise detail shows the pack's English instructions in Arabic too. Translate the instructions of the **100 most common gym exercises** listed in `docs/phase5/arabic-instructions-top100.txt` (pack ids, about 470 steps). The other 776 keep English, with a one-line note in Arabic ("التعليمات بالإنجليزية لهذا التمرين").
   - **Data:** `src/i18n/exerciseInstructionsAr.ts`, pack id → array of Arabic steps, **the same number of steps as the English**, in the same order. Don't change the pack JSON, the database or backups.
   - **Display:** `app/(tabs)/train/exercise/[id].tsx` shows the Arabic steps in Arabic when the id has them, otherwise the English steps plus the note. Custom exercises unchanged.
   - **Style:** plain Modern Standard Arabic a gym-goer understands, consistent with the Arabic exercise names (PR Z: بنش برس، سكوات، الخلفية…). Keep the safety meaning exact: never drop or soften a caution ("لا تقفل ركبتيك", "حافظ على استقامة ظهرك"). Western digits; number+unit with a no-break space.
   - **Guards (tests):** every listed id has a translation and no other ids; step counts match the English; no Latin letters except real tokens (EZ, V); each guard fails on a planted bad example.
   - Don't touch `src/design/**`, the Health screens, `src/services/health/**`, `app.config.ts`, or the library/pick/muscles screens (PR AC).

19. ~~**PR AE: `Phase 5 / Arabic instructions, next 120`**~~ DONE: PR #58 merged (2026-10-29). Cursor, Grok 4.7, about 20 minutes. Claude fixed two grammar slips.
   - Translate the instructions of the 120 pack ids in `docs/phase5/arabic-instructions-next120.txt`: dumbbell, cable and machine strength exercises, beginner level first, 618 steps. Add them to `EXERCISE_INSTRUCTIONS_AR` in `src/i18n/exerciseInstructionsAr.ts`, next to PR AD's 100. Don't change PR AD's entries.
   - **Same rules as PR AD:** the same number of steps as the English, in the same order; plain Modern Standard Arabic consistent with the Arabic exercise names; keep every caution exact and never soften it; Western digits; number+unit with a no-break space. Say what the step says; never write "the source says" (المصدر).
   - **Guards:** the existing test in `src/i18n/__tests__/exerciseInstructionsAr.test.ts` checks the ids against the top-100 list. Make it check against both lists together: every listed id has a translation and there are no other ids. The step-count, Latin-letter and empty-step guards then cover the new 120 with no other change.
   - **Commits:** one commit per 30 ids, pushed right after each one, so nothing is lost if the run stops.
   - Don't touch `src/i18n/exerciseInstructions.ts` (the display helper), `app/**`, `src/design/**`, the pack JSON, or workflows.

20. ~~**PR AF: `Phase 5 / Arabic instructions, batch 3`**~~ DONE: PR #61 merged (2026-10-29). Claude fixed one slip.
   - Same task as PR AE for the 150 pack ids in `docs/phase5/arabic-instructions-batch3.txt`: the remaining barbell, dumbbell, cable, machine and EZ-bar strength exercises, beginner level first, 766 steps.
   - Same rules as PR AD and PR AE. Add the third list file to the id guard's `listFiles`, and expect 370 ids.
   - Commit after every 30 ids and push right away.
   - Don't touch `src/i18n/exerciseInstructions.ts`, `app/**`, `src/design/**`, the pack JSON, or workflows.

21. ~~**PR AG: `Phase 5 / Arabic instructions, batch 4`**~~ DONE: PR #63 merged (2026-10-29). 520 of 876 exercises now have Arabic steps.
   - Same task as PR AF for the 150 pack ids in `docs/phase5/arabic-instructions-batch4.txt`: the remaining strength exercises (bodyweight, kettlebell, bands, other), beginner level first, 620 steps.
   - Same rules as PR AD to PR AF. Add the fourth list file to `listFiles`, and expect 520 ids.
   - Commit after every 30 ids and push right away.
   - Don't touch `src/i18n/exerciseInstructions.ts`, `app/**`, `src/design/**`, the pack JSON, or workflows.

22. ~~**PR AH: `Phase 5 / Arabic instructions, batch 5`**~~ DONE: PR #65 merged (2026-10-29).
   - Same task as PR AG for the 178 pack ids in `docs/phase5/arabic-instructions-batch5.txt`: the last strength exercises plus Olympic lifts, powerlifting, strongman and the first plyometrics, 744 steps.
   - Same rules as PR AD to PR AG. Add the list file to `listFiles`, and expect 698 ids.
   - Commit after every 30 ids and push right away.
   - Don't touch `src/i18n/exerciseInstructions.ts`, `app/**`, `src/design/**`, the pack JSON, or workflows.

23. ~~**PR AI: `Phase 5 / Arabic instructions, batch 6 (last)`**~~ DONE: PR #66 merged (2026-10-29). All 876 bundled exercises now have Arabic steps; the guard checks the lists equal the whole pack. Claude fixed رطل → رطلًا after 11–99 (14 places).
   - The last 178 ids in `docs/phase5/arabic-instructions-batch6.txt`: stretching, the rest of plyometrics, and cardio, 524 steps. After this, all 876 bundled exercises have Arabic steps.
   - Same rules. Expect 876 ids. Once every pack exercise is covered, the "instructions in English" note never shows for a pack exercise. Keep the helper's fallback and its test as they are: custom exercises and a future pack update still need them.

24. ~~**PR AJ: `Phase 5 / Arabic number agreement`**~~ DONE: PR #70 merged (2026-10-30). Claude removed the digit from one/two forms (يوم واحد، يومان) and fixed the adaptive and zero forms; a guard keeps it that way.
   - In Arabic the noun after a number changes with the number: 1 سعرة واحدة / يوم واحد, 2 يومان, 3–10 أيام (plural), 11–99 يومًا (singular accusative), 100+ يوم. Some Arabic strings in `src/i18n/ar.ts` put a variable count before a fixed noun, e.g. `{count} يوم`, `{count} تمرين`, `{count} مجموعة`, `{count} طلب`, `{count} قياسات`, `{remaining} سعرة`. They read wrong for most numbers.
   - **Count nouns** (days, weeks, months, hours, minutes, seconds, workouts, sets, sessions, reps, requests, items, measurements, records, foods): every string where a placeholder count comes right before one of these nouns becomes a plural key family (`.zero/.one/.two/.few/.many/.other`, in both `en.ts` and `ar.ts`, like `count.workouts.*`) chosen with `pluralForm()` at the call site. Arabic 11–99 forms use the singular accusative with tanween (`يومًا`, `تمرينًا`, `دقيقةً`, `مجموعةً`).
   - **Unit labels stay as they are:** غ, مل, كغ, سم, %, and سعرة used as an energy unit right after an amount (like "kcal": `{kcal} سعرة`). Don't pluralize units.
   - **Fixed numbers:** fix literal number+noun pairs the same way (`72 ساعة` → `72 ساعةً`, `45 ثانية` → `45 ثانيةً`) and typos such as `يوما` → `يومًا`.
   - **Guard (test):** fail when an Arabic value in a key that is not a plural form (`.zero` … `.other`) has a `{placeholder}` immediately followed by a count noun from a list in the test; fail on `يوما` without tanween; plant one bad example for each check. English keeps working through the same plural keys.
   - Update every call site to pass the count and pick the form. Don't touch `src/design/**`, Health adapters, `src/i18n/exerciseInstructionsAr.ts`, store assets, `app.config.ts`, or workflows.

25. ~~**PR AK: `Phase 5 / Arabic exercise search`**~~ DONE: PR #73 merged (2026-10-30). صدر، دمبل، the typo سكوت and a Latin "bench" all find the right exercises, 9–36 ms per search in tests.
   - In Arabic, `searchExercises` (`src/services/database/exerciseLibrary.ts`) only matches a substring of the Arabic name. English search also ranks word starts, forgives small typos and checks aliases. Bring Arabic up to the same level:
     - rank: exact name, name starts with, a word in the name starts with, name contains (keep `normalizeArabicSearch` for alef/ya/ta-marbuta/tashkeel);
     - small typos: a word of 4+ letters within edit distance 1 of a name word (lowest rank);
     - muscle and equipment words: typing an Arabic muscle or equipment name (the labels the app already shows, e.g. صدر، أكتاف، دمبل، كابل، جهاز) also returns exercises with that primary muscle or equipment, ranked below every name match;
     - a Latin query in Arabic mode still matches the English name and aliases (gym words are often typed in English).
   - Keep it fast on Hermes: precompute normalized names and words once per search, as the current code does; no `localeCompare` with a locale argument; one shared collator. Add a test that searches all 876 exercises in Arabic within a time budget.
   - Tests: each rank level, typo match, muscle and equipment matches ranked below name matches, Latin query in Arabic mode, empty query unchanged. English search unchanged (existing tests stay as they are).
   - Don't touch `src/design/**`, the library screens' layout, Health files, `exerciseInstructionsAr.ts`, or workflows.

26. **PR AL: `Phase 5 / Arabic weight units`** (builder: **Cursor**, Grok 4.7, branch from `main`)
   - In Arabic the weight unit shows as Latin `kg` / `lb` (e.g. "8,130 kg", "{weight} {unit}"): the `{unit}` placeholder and several screens use the raw setting value. Add one helper, `weightUnitLabel(language, unit)` in `src/i18n/` (Arabic: كغ and رطل; English: kg and lb, unchanged), and use it everywhere a weight unit is shown: every `{unit}` call site, the Strength/Progress volume figures, plate calculator, records, history, import preview, body weight.
   - Values and stored units stay as they are (`'kg' | 'lb'` in settings and the database). Only the shown text changes.
   - **Guard (test):** in Arabic, no translated string and no rendered weight label contains Latin `kg` or `lb` (extend the existing Arabic units guard, which already forbids `kcal` and `g`), with a planted failure. A unit test for the helper.
   - Don't touch `src/design/**`, Health adapters' stored units, `exerciseInstructionsAr.ts`, store assets, or workflows.

27. **PR AM: `Phase 5 / Body measurements`** (builder: **Cursor**, Grok 4.7, branch from `main`)
   - Hevy and MacroFactor both track body measurements; Liftria only tracks weight. Add the common tape measurements: waist, hips, chest, neck, shoulders, left and right arm, left and right thigh, left and right calf.
   - **Storage:** one additive migration (the next schema version after 6) adds `body_measurements` (`id` from `newGymId()`, `measured_at`, `site` with a CHECK for the 11 sites, `cm REAL NOT NULL CHECK(cm>0 AND cm<400)`, `note`, `source` = `'liftria'` like `weights`). Always stored in cm.
   - **Unit:** shown in cm, or in inches when the weight unit setting is `lb` (1 in = 2.54 cm; round to 0.1). In Arabic the unit is سم / بوصة, never Latin. Entry accepts the shown unit and converts it to cm.
   - **Screen:** on Progress → Body, a "Measurements" card under the weight section: the latest value per site with its date and the change since the previous entry. "Add measurements" opens a form for any subset of the sites (a blank field means not measured, never 0). Tapping a site shows its history as a simple line chart with the existing chart primitives and a list where each entry can be edited or deleted. With no entries, the card shows the existing empty-state style with one line saying what to measure.
   - **Coverage:** the new table is in the backup (export, restore and the round-trip test), in Delete all, and in the CSV export as its own file or section. `everyTableFixture` and the coverage guards must pass with it.
   - **Strings:** every new string in English and Arabic; counted phrases go through `pluralForm()`; values with units use `bidiIsolate()` and a no-break space like the rest of the app.
   - **Tests:** the migration on a v6 database keeps existing data; the repository (add, edit, delete, latest per site, change since the previous entry); the cm/inch conversion and rounding; blank fields are not saved; backup round trip.
   - **Screenshots:** a `dev/demo-measurements?auto=1` route with sample data (light and dark, English and Arabic) for Claude's emulator pass. Claude adds the route to the screenshot list (`.github/scripts/visual-check.sh`); don't edit it.
   - Don't touch `src/design/**`, Health adapters, `exerciseInstructionsAr.ts`, store assets, `app.config.ts`, or workflows.

**Not in Phase 5:** barcode scanning (Claude first measures how many Egyptian products Open Food Facts has), Wear OS (wearable gate), social features, ads.


**Rules (same as Phase 4):**
- Every push runs `verify`. Claude adds `build` for emulator screenshots and merges when `verify` is green and the screenshots are clean.
- One commit per sub-step. Batch your pushes. Run nothing you can't check; Claude runs the checks.
- **New dependencies:** `expo-sharing` approved and installed by Claude (2026-10-27) for backup/CSV export on Android and iPhone. `expo-document-picker`, `expo-file-system` and `expo-notifications` are already installed. `@kingstinct/react-native-healthkit` and `react-native-nitro-modules` approved for PR AA (owner, 2026-10-29). Ask in the PR before adding anything else; Claude regenerates the lockfile.
- **Never:** workflow edits, fabricated results, invented nutrition numbers, `crypto.*` (use `newGymId()`), suggested values saved as data, anything from openGym (AGPL), `Intl` APIs other than `NumberFormat` / `DateTimeFormat` / `Collator`.
- Every new string in English and Arabic. Every new table is covered by Delete all and by the backup.
