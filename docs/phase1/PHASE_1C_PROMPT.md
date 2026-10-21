# LIFTRIA — PHASE 1C: NUTRITION AND HIKU (design only)

**Base:** `PHASE_1_PROMPT.md` (approved) plus everything decided in 1A and 1B:
- Aurora Rim style and the Pulse Orb Today
- the capsule nav
- the data-honesty chips
- the workout data contract

Extend the single prototype `prototype/src/liftria.html` and the existing spec files. **Stop for owner review when done.** No app code, no Phase 2.

## 1. Screens

**Eat**
- **Eat home:** today's orb (the same component as Today), the macro row, and the diary by meal (breakfast, lunch, dinner, snacks). "Not logged yet" is different from 0 kcal.
- **Add food:**
  - search the bundled USDA FoodData Central pack, offline
  - recents and favorites
  - custom food
  - a quick-add with calories only
  - Hiku photo / Hiku text
- **Portion picker:** grams, household units, servings, with live macros. There's no barcode scanner in V1, because Open Food Facts is a future add-on.
- **Meal detail:** edit, move to another meal, delete with Undo.
- **Targets and settings:**
  - the estimated target (labeled Estimate) and a manual override
  - the **safety-floor warning** (< 1,200 kcal or a deficit > 25%), carried over from 1A
  - macro split
  - the hide-numbers setting
- **History and trends:** day and week, with defined empty states.

**Hiku**
- **Welcome / no key / offline** states.
- **Meal analysis from a photo or text:** loading with Cancel, then an **editable structured result** (items, grams, kcal, macros, confidence wording).
  - Nothing is saved until you confirm.
  - Every item can be edited or removed.
  - Totals update live.
- **Errors:** offline, invalid key (401/403), rate limit (429), server (5xx), refusal, cut-off response, timeout. Each one keeps the input and offers retry or "log manually".
- **Cost and token transparency** per request and per month (estimated, labeled).
- **Context controls:** what Hiku may see (training day yes or no, today's totals yes or no). Off by default. Shown before sending.
- **Chat:** multi-turn chat with personal context is marked **future / pending verification**. Only single-shot meal analysis is confirmed, and even that is **untested on the device**.

## 2. Integration (required: an open condition from 1B)

- Today's orb, Eat's orb and the summary all use **one calorie number from one source**.
- Today's deck shows the meals card and the training card together. Meals logged in Eat appear on Today immediately.
- **One shared Quick add** (long-press Today, or "Log a meal"): log meal, photo meal, start workout, log weight.
- Training-day context reaches Eat and Hiku only through the opt-in context control. Nutrition never writes workout data, and Train never writes nutrition data.
- **No calories burned are added to the target**, because there's no measured energy source (Phase 0). The target never auto-adjusts until Daily calories = READY.

## 3. Honesty and safety

- AI estimates carry the `estimate` chip and the words "check before saving". Hiku never claims perfect recognition, never diagnoses, and never invents data.
- No "bad food" labels, red numbers for eating, or shame copy. Going over target is shown in a neutral color.
- Privacy copy is **feature-scoped**: food logs stay local; a Hiku request sends only the photo or text you chose, plus any context you allowed, to Anthropic, and only when you tap Send.

## 4. States (every screen where relevant)

Loading, empty, populated, offline, error, partial, stale, success with Undo, confirmation. **Plus:** no key, no internet, Claude failures, no target, first-time user.

## 5. Flows

- **3:** add a meal manually → edit → save.
- **4:** meal photo → Hiku → review and correct → save.
- **6 (request part):** first AI request after adding a key.
- **10 (meals):** edit or delete a meal.

## 6. Quality (same bar as 1B)

- Screen checklist marked PASS / NEEDS REVISION / BLOCKED.
- Automated checks across every new screen and state: no script errors, no overflow, every button ≥ 48dp.
- Contrast measured for anything new.
- A **200% render** of the portion picker and the Hiku result.
- Dark and light, Aurora Rim and Solid.
- Write `MILESTONE_1C_REVIEW.md`, with technical concerns for Phase 4.
