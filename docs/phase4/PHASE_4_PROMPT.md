# LIFTRIA — PHASE 4: NUTRITION, ARABIC, EGYPT (build prompt)

**For:** the build agent (GPT) · **Written by:** Claude (design lead and reviewer) · **Reviewed by:** Claude, per pull request
**Start:** now (Phase 3 code is merged; the owner tests the Phase 3 APK in parallel). Your task list and the live order are in `PHASE_4_ISSUES.md` at the repo root.

Phase 4 makes Liftria a full daily app for its **first market, Egypt**:
- **Arabic and English**, with a right-to-left layout.
- An offline food diary that knows **Egyptian food**.
- Calorie and macro targets, weight tracking and nutrition trends.
- **Hiku** meal estimates from a description, using the user's own Anthropic key.

## 0. Owner decisions (2026-10-25)

1. **Egypt first.** Launch users are in Egypt. Food search, examples and defaults must work for Egyptian meals.
2. **Arabic and English in Phase 4.**
   - A language setting: System (default) / العربية / English.
   - The full UI is translated, with an RTL layout.
   - Arabic is the main Egyptian-market language, so treat it as a first-class language, not an afterthought.
3. **Hiku stays bring-your-own-key.** Each user pastes their own Anthropic key, as in Phase 2. No server and no accounts. A paid option is decided later.

## 1. Read first

1. `docs/phase1/PHASE_1_HANDOFF.md`:
   - §2, the gates: Claude = **PARTIAL** (text PASS, photo not yet tested); Daily calories = **NOT READY**.
   - §3 **"Phase 4: nutrition"**.
   - §4, the cross-cutting rules.
2. `docs/phase1/SCREEN_SPECIFICATIONS.md`: Eat (EA-1…EA-7), QA-1, Hiku (HK-1…HK-6), PR-3, PR-4, PR-6, ST-2 and ST-3.
3. `docs/phase1/MILESTONE_1C_REVIEW.md`:
   - "Technical concerns for Phase 4" (all 8).
   - The **decisions table**, which settles the formula, hide-numbers, meal presets, the mismatch rule, "Snacks", and the date switcher.
4. `docs/phase1/MILESTONE_1D_REVIEW.md`, item 9: Health Connect weight is display-only (see §4).
5. `docs/phase1/DESIGN_SYSTEM.md`, `INTERACTION_AND_STATES.md` and `ACCESSIBILITY.md`, plus the prototype for the look only.
6. `PHASE_3_ISSUES.md`: the process rules carry over unchanged.

## 2. Fixed stack, dependencies and data

- **Stack:** the same stack as Phase 3.
- **New dependencies allowed:**
  - `expo-localization` (~57.0.2), to read the device language.
  - Ask Claude to regenerate the lockfile in the PR that adds it.
  - Nothing else without asking. Specifically: no i18n library; write a small typed dictionary (§3).
- **Arabic font:** IBM Plex Sans Arabic Regular / SemiBold / Bold is already in `assets/fonts/` (OFL, see the README there). Register it with `expo-font`, like the others.
- **Food data:** Claude supplies both packs. **Never type nutrition numbers yourself.**
  - `assets/data/foods/usda-foods.json`: USDA FoodData Central, SR Legacy + Foundation. Public domain; see `SOURCE.md`.
    - Per 100 g: kcal, protein, carbs, fat, fiber.
    - Household portions in grams, where USDA has them.
    - Stable ids `usda:<fdcId>`.
  - `assets/data/foods/egypt-foods.json`: Egyptian dishes and staples, each with an **Arabic and an English name** and search aliases (e.g. كشري / koshari / koshary).
    - Values come from recipes of USDA ingredients, so they are an **Estimate**. They always carry the `estimate` chip and the line "Recipe estimate from USDA ingredients".
    - Portions are in grams (e.g. 1 baladi loaf, 1 plate, 1 ta'meya piece).
  - **Both packs are on `main` now** (8,171 USDA foods; 29 Egyptian dishes). The shapes:
    - USDA rows: `{id, name, category, source, kcal, protein, carbs, fat, fiber|null, portions: [[label_en, grams]]}`.
    - Egypt rows add `name_ar`, `aliases`, `estimate: true` and `recipe`, and their `portions` are `[[label_en, label_ar, grams]]`.
    - USDA names and portion labels stay English in Phase 4. Show them as they are in Arabic too.
    - Don't test against the full packs. Use small fixtures, plus one test that loads both packs and checks the ids are unique and the values finite.
- **No network** except Hiku (§6). Search, the diary, targets and trends work offline.

## 3. Arabic and RTL (PR H)

- **Strings:**
  - Every user-visible string goes through `t('key', params)`. The dictionaries are `src/i18n/en.ts` and `src/i18n/ar.ts`, with the same key set; a test fails if they differ.
  - Plurals use `Intl.PluralRules` (Arabic has six forms; never build Arabic plurals with `+'s'`).
  - Accessibility labels are translated too.
- **Language setting:**
  - It lives in ST-3, with the options System / العربية / English.
  - Store it in `app_settings`.
  - Arabic sets RTL with `I18nManager.allowRTL(true)` / `forceRTL(true)`.
  - Changing direction needs an app restart. Text switches at once; the layout direction applies after the user reopens the app. Show a sheet: "Close and reopen Liftria to finish switching the layout".
  - Don't add `expo-updates` just to reload.
  - On first launch, follow the device language, and apply RTL before the first screen renders.
- **Layout:**
  - Use `start` / `end` (`marginStart`, `paddingEnd`, `left`/`right` only for symmetric cases).
  - Flip directional icons (back chevron, ›) in RTL.
  - **Don't flip** the body map, charts' time axis, the rest orb or number+unit order.
  - Charts read left→right in time in both languages.
- **Numbers:**
  - Use Western digits (0–9) in both languages (common in Egyptian apps, and they match units).
  - Format with `Intl.NumberFormat(locale, { numberingSystem: 'latn' })`.
  - Units stay Latin (kg, kcal, g), and the unit always sits next to its number.
- **Fonts:**
  - Arabic text uses IBM Plex Sans Arabic at the same type scale.
  - Mixed lines (an Arabic label with a Latin number) must render without clipping. Check the line height at 200% text.
- **Translation:**
  - Modern Standard Arabic, short and friendly, matching the English tone rules: no shaming, "not logged yet" is never 0, an estimate is not a measurement.
  - Translate the chips' meanings carefully: Estimate = تقدير, Pending = قيد الاختبار, Measured = مُقاس. Confirm these with the owner in the PR.
- **Exercise names** (free-exercise-db) stay English in Phase 4. The 17 muscle names and all UI around them are translated.
- **Tests:**
  - The en/ar key parity test.
  - A test that each screen file has no hard-coded user-visible strings (lint rule or a test over `Typography` children).
  - RTL snapshot-free checks on the start/end helpers.
- **Emulator screenshots** run in Arabic as well. Claude adds an `ar-` set to the visual check.

## 4. Data (schema v4)

One migration `v4`, the same pattern as v2/v3.

- **Tables:**
  - `foods`: pack rows loaded once by id, plus custom foods (UUID via `newGymId()`) and Hiku-saved foods.
    - Columns: `name_en`, `name_ar`, `aliases`, `source` (`usda` / `egypt` / `custom` / `hiku`), `estimate` (bool), per-100 g kcal, protein, carbs, fat, fiber, `retired`.
  - `food_portions`: `food_id`, `label_en`, `label_ar`, `grams`.
  - `diary_entries`:
    - `id`, `day` (local `YYYY-MM-DD`), `meal` (breakfast / lunch / dinner / snacks), `food_id`, `grams`.
    - Snapshot values: kcal, protein, carbs and fat **computed at log time and stored**, so pack updates never change history.
    - `source` (`search` / `quick` / `hiku-estimate`), `hiku_request_id`, `original_json` (Hiku's original estimate), `created_at`, `edited_at`.
  - `weights`: `id`, `measured_at`, `kg`, `note`, `source` (`liftria`).
  - `targets`: as in Phase 2. Extend if needed; never overwrite history.
  - `hiku_requests`: `id`, `kind` (text / photo), `created_at`, `model`, `input_tokens`, `output_tokens`, `est_cost_usd`, `status`, `price_table_version`.
- **Rules:**
  - Grams are canonical.
  - **Quick add** stores kcal only (macros null, never 0).
  - Day boundary: local midnight at log time. The entry keeps its `day` even if the time zone changes.
- **Delete all (ST-6)** covers the new tables. Add them to the reset test.
- **Test:** migration v3→v4 and a fresh v4.

## 5. Build (4 PRs, in order)

1. **PR H: Arabic, RTL and the language setting** (§3).
   - Translate every existing screen (Phases 2–3).
   - Every later PR ships both languages.
2. **PR I: Diary, search, portions and targets.**
   - EA-1 Eat home, with the orb fed by the one diary total that Today also reads.
   - EA-2 search: offline prefix + fuzzy over Arabic and English names and aliases. Normalize Arabic (alef forms أإآ→ا, ى→ي, ة→ه, strip tashkeel). Egyptian foods rank first when names tie.
   - EA-3 portion picker, showing only the units that exist (grams always).
   - EA-4 meal detail (8 s Undo).
   - EA-5 create a food (warn if kcal differs from 4P+4C+9F by more than 20%; ask above 2,000 g).
   - QA-1 quick add.
   - EA-6 targets (the 1A formula; the gentle sheet below 1,200 kcal or above a 25% deficit).
   - ST-2: a profile change *proposes* a new target and never silently changes it.
   - Today's meals card and orb.
   - Meal presets by time of day (breakfast before 10:30, lunch 10:30–15:00, snacks 15:00–17:00, dinner after 17:00).
   - Hide numbers also hides per-meal and per-item kcal.
3. **PR J: Trends and body.**
   - EA-7 week view and PR-3 nutrition trends: logged days only, unlogged days as dashed outlines, averages over logged days.
   - PR-4 body and PR-6 log weight (0.1 kg stepper, date, note, 8 s Undo).
   - Health Connect weight is **display-only**, with its source chip. It never becomes the profile weight or the target input.
4. **PR K: Hiku meal estimates** (HK-1…HK-6), with §6.

## 6. Hiku (PR K)

- **Gate:** Claude = PARTIAL.
  - **Describe a meal (text) is live.**
  - **Photo** is built end to end, but stays behind the `pending` note "Still being tested on your phone" until the owner's device Test B passes. Claude flips it after the evidence.
- **Request:**
  - Use the user's key from SecureStore.
  - **The model is a setting, not hard-coded** (owner, 2026-10-25). In ST-4 "Hiku and API key", add a **Model** choice:
    - **Fast and low cost:** `claude-haiku-5-5` (the default).
    - **More accurate:** `claude-sonnet-5-5`.
    - Keep the list in one place (`src/features/hiku/models.ts`: id, display names in en/ar, and prices), so adding a model later is a one-line change.
    - Store the choice in `app_settings`.
    - The HK-2 cost estimate and HK-6 usage follow the chosen model. Each `hiku_requests` row records the model it used.
  - **"Test key"** sends a minimal request to the chosen model. If the account can't use that model (403/404), show "Your key works, but this model isn't available on your account" and offer the default model. Never switch models silently.
  - "Hiku" stays the feature name whichever model runs it.
  - Send one JSON schema (meal name, items: name_en, name_ar, grams, kcal, protein, carbs, fat, confidence `sure` / `check`) and validate it with zod.
  - Off-schema, truncated, empty or refused responses go to the HK-5 states. Never fill in missing fields.
  - The prompt asks for Egyptian portion sizes when the meal is Egyptian. Answers come in the UI language.
- **Before sending (HK-2):** show exactly what is sent. Context (profile, target) is **off by default**.
- **Photo:** downscale with `expo-image-manipulator` (long edge 1024 px, JPEG 0.7), which strips EXIF. No photo is stored unless "Keep photos" is on.
- **Review (HK-4):**
  - Nothing is saved without Save.
  - Each item stores the original estimate JSON beside the edited values, with `source = hiku-estimate`.
- **Errors (HK-5):** offline, 401, 429 (with retry-after), 5xx, refusal, cut-off, timeout at 45 s and Cancel. The user's input is always kept.
- **Usage (HK-6):**
  - Compute cost from response token counts × a bundled price table (in `src/features/hiku/models.ts`, per model, with its source URL and date).
  - It is always labeled Estimate. Cancelled requests count as "may be billed".
- **Tests:** schema validation fixtures (valid, truncated, off-schema, refusal), the cost math, and that nothing is written to the diary before Save. Mock the network.

## 7. Definition of done (Phase 4)

**Automated, on every PR:**
- `verify` plus Jest covering:
  - en/ar key parity
  - Arabic search normalization
  - migration v3→v4 and fresh v4
  - diary totals (Quick add kcal-only, snapshot values)
  - the target formula and floor
  - logged-days-only averages
  - weight Undo
  - Hiku schema, cost and no-save-before-confirm
  - Delete all covers the v4 tables

**Emulator screenshots (Claude, `build` label), in English and Arabic, dark and light:**
- EA-1 (first day and populated), EA-2 (search "كشري" and "koshari"), EA-3, EA-6, EA-7, PR-4, HK-1, HK-2, HK-4.
- 200% text on EA-1 and EA-3 in Arabic.

**Owner, on the S22:**
1. One real day logged in Arabic, with Egyptian food.
2. Switch the language both ways.
3. Two Hiku text estimates.
4. Test B (a photo), to unlock photo.
5. Log a weight, then Undo it.

## 8. Rules (same as Phase 3, plus)

- **No invented nutrition data.** Only the packs Claude supplies, the user's own foods, and Hiku estimates labeled as estimates.
- **"Not logged yet" ≠ 0** anywhere (Today, Eat, trends).
- **No calories from workouts or Health Connect** in the target or the orb (Daily calories gate NOT READY). Energy stays "No measured source".
- **IDs only via `newGymId()`.** Never `crypto.*`.
- **Never** edit workflows or `PHASE_4_ISSUES.md`. Draft PRs only. Claude merges.
