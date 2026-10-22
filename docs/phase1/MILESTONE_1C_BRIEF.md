# Milestone 1C Design Brief: Nutrition and Hiku

**Author:** Claude (design decisions) · **Builder:** a Sonnet 5.5 agent implements this brief into the prototype and specs · **Review:** Claude, then the owner
**Prompt:** [PHASE_1C_PROMPT.md](PHASE_1C_PROMPT.md) · **Style:** Aurora Rim + Pulse Orb, as signed off in 1A and 1B

This brief records every design decision for 1C, so the build has nothing to guess. If something isn't covered here, follow the closest 1A/1B pattern and list it as an open question in `MILESTONE_1C_REVIEW.md`.

---

## 1. Principles for 1C

1. **One number, one source.** Today's orb, Eat's orb, the meal totals and Hiku's "after saving" preview all read the same diary total. The example day used across the whole prototype is: **Breakfast 520 + Lunch 680 + Snack 220 = 1,420 kcal**, P 96 / C 152 / F 41, target 2,650 (Estimate), Dinner not logged.
2. **AI proposes, you decide.** Nothing Hiku returns is saved until the user taps Save. Every item is editable or removable, and totals update live.
3. **Not logged ≠ 0.** A meal with nothing in it reads "Not logged yet", never "0 kcal". Week averages use logged days only and say so ("avg of 5 logged days").
4. **Calm food language.** No red for eating and no "bad", "cheat", "junk" or "over budget". Over target is honey, "+180 kcal over". The safety floor warning is gentle and explains why.
5. **Feature-scoped privacy.** The food diary stays on the phone. A Hiku request sends only the photo or text the user chose, plus any context they allowed, to Anthropic, and only on Send.
6. **Integrated, not a mini-app.** Eat and Hiku reuse Today's orb, chips, cards, sheets and the shared Quick add. Training appears in Eat only as read-only context.

## 2. Navigation

- **Eat tab** root = EA-1. **Hiku tab** root = HK-1. Replace the `tab-eat` and `tab-hiku` placeholders.
- **Quick add** (QA-1) is one shared bottom sheet: Log a meal · Photo a meal (Hiku) · Describe a meal (Hiku) · Start workout · Log weight (weight is 1D; show it disabled with "Coming in Progress").
  - Opened from Today's "Log a meal" long-press, Eat's "+" header button, and a long-press on the Today tab.
- **Focus flows (no capsule nav):** EA-3 portion picker, EA-5 custom food, HK-2 before sending, HK-3 analyzing, HK-4 result review, and every confirmation sheet.
- Today integration:
  - Today's "Log a meal" → EA-2 with the meal preset by time of day (dinner after 17:00).
  - Today's "Photo" → HK-2.
  - Today's Meals card "Dinner, not logged yet" gets an "Add" link → EA-2 (dinner).

## 3. Screens and states

IDs continue the inventory. Each state is a prototype `VARIANTS` entry.

### Eat (honey `domain.eat`)

| ID | Screen | States | Layout and content |
|---|---|---|---|
| **EA-1** | Eat home | `rich` · `first` · `over` · `notarget` · `hidden` | Header "Eat" with a date switcher (‹ Today ›) and a "+" button (Quick add). **Orb**: reuse `orb()` at 200px (`orb-wrap sm`) with the same numbers as Today. Estimate chip line. Macro bars (protein/carbs/fat, `x / target g`). A read-only context chip: "Training day · Upper A". Meal cards (honey rim), each listing its items with kcal, a meal total and an "Add" button. Dinner shows "Not logged yet" + Add. Below: "History and trends" and "Targets" rows. **first**: empty glass orb, "0 kcal eaten", four meal cards each "Not logged yet". **over**: 2,830 eaten → orb "180 kcal over" in honey, ring full, no red anywhere. **notarget**: no ring, "kcal eaten", macros in grams only, "Set a target" link. **hidden**: the hide-numbers setting is on, so the orb shows "On track" / "A bit over" words and the macro bars show without numbers, plus a "Show numbers" link. |
| **EA-2** | Add food | `recents` · `search` · `noresults` · `offline` | Focus-like screen with back. Meal selector chip at the top ("Adding to Dinner ▾"). Search field. Two Hiku buttons (lavender): Photo, Describe. Tabs: Recents · Favorites · My foods. Rows show name, portion and kcal, a source chip ("USDA", "My food", "Hiku estimate"), and a one-tap "+" (48dp) that adds the last-used portion with an Undo snackbar. Bottom links: "Quick add calories" and "Create a food". **search** "greek yog": USDA results with per-100 g kcal. **noresults** "shawarma wrap": "Not in the food pack" + Create a food / Quick add calories / Describe it to Hiku. **offline**: the Hiku buttons are disabled with "Needs internet"; everything else works. |
| **EA-3** | Portion picker | `default` · `large` (200% text) | Food name + "USDA FoodData Central" chip. A unit segmented control: g · cup · piece · serving. An amount stepper (64dp) with keypad entry. A live result card: kcal (metric) and P/C/F grams. "Per 100 g: 59 kcal" reference line. Meal selector. Dock: **Add to Dinner** (primary). Example: Greek yogurt, plain, nonfat · 170 g = **100 kcal**, P 17.0 / C 6.1 / F 0.7. **large**: 200% text, the result card wraps, the stepper keeps its 52dp buttons, the dock stays visible. |
| **EA-4** | Meal detail | `view` · `edit` · `delete` | Lunch, 680 kcal. Items with portion, kcal and source chip; one item is a Hiku estimate (lavender "Hiku estimate" chip). Meal macros. Actions: Add item, Move to another meal, Delete meal. **edit**: an item's portion opens inline with a stepper, plus Remove item. **delete**: confirmation sheet "Delete lunch? 4 items, 680 kcal. You can undo for 8 s." with Keep (primary) / Delete. |
| **EA-5** | Create a food | `empty` · `invalid` | Name, serving size (g), kcal, protein, carbs, fat, optional brand. **invalid**: kcal 150 but macros imply 260 → gentle hint "Calories and macros don't match (macros add up to ~260 kcal). Check the label." Save is allowed after confirming. A missing name blocks Save, with a hint. |
| **EA-6** | Targets | `estimate` · `manual` · `floor` | **estimate**: 2,650 kcal with the Estimate chip and "How this is calculated" (Mifflin-St Jeor × activity 1.55, from the profile). Macro split P 155 / C 340 / F 75 with editable percentages. "Set my own numbers". **manual**: "Your target" chip, 2,400 kcal. **floor**: the user typed 1,100 → sheet "That's below 1,200 kcal a day" with a calm explanation and "Use 1,200" (primary) / "Keep 1,100" (secondary, requires a tick "I'm doing this with professional guidance"). The deficit > 25% case gets the same sheet with the deficit wording. Plus the hide-numbers switch. |
| **EA-7** | History and trends | `week` · `empty` | Week bars (honey) against a dashed target line. Days with nothing logged are a dashed outline with "—", **not a zero bar**. Averages: "avg 2,210 kcal · 5 of 7 days logged". Protein average. Tap a day → that day's EA-1. **empty**: "Log a few days to see trends." |
| **QA-1** | Quick add sheet | `default` | Sheet with 5 rows (icon tile + label + one-line hint). Weight is disabled ("Coming in Progress, 1D"). Hiku rows are disabled with a reason when offline or there's no key. |

### Hiku (lavender `domain.hiku`)

| ID | Screen | States | Layout and content |
|---|---|---|---|
| **HK-1** | Hiku home | `ready` · `nokey` · `offline` · `first` | Header "Hiku" + a "Usage" link. A lavender rimmed hero: "Estimate a meal" with **Photo** and **Describe** buttons. "Recent" analyses (3 rows, with saved/discarded state). A **Chat** card marked `pending` and "Coming later": not designed as a working feature. A usage line: "This month ≈ $0.42 · 61 requests (estimate)". **nokey**: explains Hiku, "Add API key" → Settings (1D stub), logging works without it. **offline**: "Hiku needs internet. Log manually meanwhile." + "Log manually". **first**: a short "How Hiku works" explainer with 3 steps (send, check, save). |
| **HK-2** | Before sending | `photo` · `text` | Focus screen. **photo**: an illustrated plate placeholder (original SVG; no real photo), an optional note field ("e.g. cooked in a little olive oil"). **text**: a multiline field "2 eggs, 2 slices of toast with butter, a coffee with milk". **What's sent** panel: the photo or text, plus context switches **Today's totals** (off) and **Training day** (off), each with exactly what it adds ("adds: 1,420 kcal eaten, 2,650 target"). "Estimated cost ≈ $0.004" (estimate chip). Privacy line: "Sent to Anthropic's Claude API with your key. Not stored by Liftria anywhere but this phone." Dock: **Send to Hiku** (hiku button). |
| **HK-3** | Analyzing | `working` · `slow` | The plate placeholder with a lavender shimmer (static under reduced motion), "Hiku is looking…", **Cancel** (always visible). **slow** (after 10 s): "Still working… This can take up to 45 s." + Cancel. |
| **HK-4** | Result review | `result` · `editing` · `large` | Title "Dinner · Hiku estimate", with the `estimate` chip and "Check before saving." Items (each a row with name, grams, kcal, a confidence word): Chicken breast, roasted · 150 g · 248 kcal · *Sure*; White rice, cooked · 200 g · 260 kcal · *Sure*; Broccoli, steamed · 80 g · 28 kcal · *Sure*; Olive oil · 10 g · 88 kcal · **Check amount** (warning tint chip). Total **624 kcal**, P 54 / C 62 / F 16. "Add item" and a "Not what you ate? Describe instead" link. An "After saving" preview: "Today 2,044 of 2,650 kcal". Dock: **Save to Dinner** (primary) + "Discard" (ghost; discard asks only if items were edited). **editing**: the olive oil row expanded with a grams stepper (10 → 15 g) and Remove; the total updates to 669 kcal. **large**: 200% text, rows wrap to two lines. Confidence is words, never a percentage. |
| **HK-5** | Errors | `offline` · `auth` · `ratelimit` · `server` · `refusal` · `cutoff` · `timeout` | One card per state, in place of the result. Each has a title, one plain sentence of cause, what was kept ("Your photo is still here"), and actions. offline → Retry / Log manually; auth (401/403) → "Your API key was rejected" / Check key / Log manually; ratelimit (429) → "Too many requests right now. Try again in about 30 s." with a countdown / Log manually; server (5xx) → Retry / Log manually; refusal → "Hiku couldn't estimate this. It works best with a clear photo of food." / Describe instead / Log manually; cutoff → "The answer was cut off, so nothing was filled in." / Retry; timeout (45 s) → Retry / Log manually. **No partial result is ever shown as complete.** |
| **HK-6** | Usage and privacy | `default` | Monthly estimate with a per-request list (date, type photo/text, tokens in/out, ≈ cost), labeled estimate. "Prices from Anthropic's published rates; your Anthropic console shows the exact bill." Context defaults (both off). What's never sent (the diary, health data, workouts, unless you switch context on for a request). A key link → Settings (1D). |

## 4. Food data (use these numbers; they're USDA FDC per-100 g approximations)

| Food | kcal | P | C | F |
|---|---|---|---|---|
| Greek yogurt, plain, nonfat | 59 | 10.2 | 3.6 | 0.4 |
| Oats, rolled, dry | 379 | 13.2 | 67.7 | 6.5 |
| Banana, raw | 89 | 1.1 | 22.8 | 0.3 |
| Egg, whole, hard-boiled | 155 | 12.6 | 1.1 | 10.6 |
| Chicken breast, roasted | 165 | 31.0 | 0 | 3.6 |
| White rice, cooked | 130 | 2.7 | 28.2 | 0.3 |
| Broccoli, steamed | 35 | 2.4 | 7.2 | 0.4 |
| Olive oil | 884 | 0 | 0 | 100 |
| Almonds | 579 | 21.2 | 21.6 | 49.9 |
| Whole-wheat bread | 252 | 12.5 | 42.7 | 3.5 |

Build the example meals from these so each meal's kcal equals the sum of its items (rounded), and the day sums to **1,420 kcal**. Macros should land near P 96 / C 152 / F 41 (within ±5 g each). Show the arithmetic you used in the review file.

## 5. Visual decisions

- **Eat surfaces** use the honey rim; **Hiku surfaces** use the lavender rim. Hiku primary actions use `btn-hiku`.
- **Source chips** (extend the provenance set, always icon + text):
  - `USDA` → existing `chip-measured` style, label "USDA"
  - `My food` → `chip-phone` style
  - `Hiku estimate` → a new `chip-hiku` style: lavender text on `tint-hiku` with the sparkle glyph
  - `Quick add` → `chip-estimate` dashed, label "Calories only"
- **Confidence words:** "Sure" = plain secondary text; "Check amount" / "Guess" = `chip-stale` style (warning tint). Never red, never a %.
- **Over target:** the orb ring stays honey and full, label "kcal over". The orb never changes to a warning palette.
- **Week chart:** honey bars, a dashed `text.tertiary` target line, and unlogged days as dashed outlines. A text alternative states each day.
- **Plate illustration:** original, simple geometric SVG (a plate circle with three rounded food shapes in honey, coral and teal tints). No stock or third-party art.
- **New tokens, only if needed:** `chip.hiku.bg/fg` (= `tint-hiku` / `domain-hiku`). Measure contrast for any new text-on-color pair in both themes, including the worst case over the glass glow, and record it in ACCESSIBILITY.md.

## 6. Behavior rules to write into the specs

- **Adding food:** "+" on a row adds the last-used portion to the selected meal instantly, with an Undo snackbar (4 s). Tapping the row opens EA-3.
- **Portions:** grams are canonical in storage; household units come from the food pack's portion list. A custom unit is not in V1.
- **Hiku request:** one request = one image or text plus the opt-in context. Timeout 45 s; "Still working" at 10 s; Cancel aborts the request (it may still be billed: say so in HK-6).
- **Result parsing:** if the response isn't valid structured JSON matching the schema, show the cutoff/refusal state. Never guess-fill.
- **Saving a Hiku result** creates diary items with `source = hiku-estimate`, keeps the original estimate alongside the user's edits (so trends can later show how often estimates were corrected), and stores **no photo** unless the user turns on "Keep photos" (default off, 1D Settings).
- **Context switches** reset to off for every request unless the user changes the default in HK-6.
- **Delete:** a meal or item delete gives Undo for 8 s; a whole-day clear is not in V1.
- **Hide numbers** applies to Today, Eat home and History; the Targets screen always shows numbers (you're there to change them).

## 7. Flows to document (USER_FLOWS.md, same table format as flows 2 and 10)

- **Flow 3:** Add a meal manually → edit → save (EA-2 → EA-3 → EA-1 → EA-4 edit).
- **Flow 4:** Meal photo → Hiku → review and correct → save (HK-2 → HK-3 → HK-4 editing → EA-1; plus each HK-5 branch).
- **Flow 6 (request part):** The first AI request after adding a key, including auth failure recovery.
- **Flow 10 (meals):** Edit or delete a meal or item, with Undo.

## 8. Quality bar

The same as 1B:
- Automated render of every new screen × state in dark and light, with no script errors, no horizontal overflow, and every button ≥ 48dp.
- A 200% render of EA-3 and HK-4.
- Contrast measured for new pairs.
- A screen checklist, cross-checks, technical concerns for Phase 4, and owner review asks in `MILESTONE_1C_REVIEW.md`.

**Technical concerns to record for Phase 4:**
- the USDA pack's size and subset choice
- portion data coverage
- Claude structured-output schema and validation
- image downscaling before upload (the Phase 0 `expo-image-manipulator`)
- the exact Anthropic price table source
- storing original vs. edited estimates
- the Hiku request being tested on the device (still Pending from Phase 0)
