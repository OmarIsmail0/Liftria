# Competitive review (2026-10-25)

**Goal (owner):** make Liftria the best app for its first market, Egypt.

**Method:** web research on the leading apps, plus the owner's own Hevy export and screenshots.

Most comparison articles are written by competitors, so treat their claims as directional. Prices change; check the stores before quoting them.

## Who we compare against

| App | Best at | Weak spots relevant to us |
|---|---|---|
| **Hevy** (gym) | Fast, clean logger. Supersets with smart scrolling, plate calculator, warm-up calculator, per-set RPE, rest timer, exercise thumbnails, muscle distribution, social feed. Free tier, Pro is cheap | No nutrition (coaches ask for it). Some users want more preloaded exercises and an automatic timer after each set. Account/cloud required |
| **Strong** (gym) | Minimal, fast logging for barbell routines | No AI, no social, little beyond logging |
| **Fitbod** (gym) | Generates workouts from history and recovery | No free tier; ~$80–96/yr |
| **Jefit** (gym) | Deepest analytics, biggest library | Busy UI |
| **MacroFactor** (food) | **Adaptive expenditure:** works out your real daily burn from logged food and the weight trend, then adjusts targets in a weekly check-in. Smoothed **trend weight**. Fast logging: copy food, meals or whole days, smart history, timeline (no fixed meals), describe-a-meal AI, photo AI | Paid only. Western food database |
| **Cronometer** (food) | Verified data (USDA and others), 80+ nutrients | Slower logging (MacroFactor's own test: 17 actions vs 10) |
| **MyFitnessPal** (food) | Biggest crowdsourced database, barcode | Crowdsourced entries are often wrong; ads; heavy |
| **Sahnain, Khtwa** (Egypt/Arabic) | Egyptian dishes (koshary, foul, hawawshi), Arabic UI, chat- or photo-based logging, dialect-aware ("make it 300 calories"), saved meals | Small, new, iOS-first. AI estimates only, no verified database. No gym features |

## Where Liftria already wins

- **One app for gym, food and health.** Hevy has no food tracking, and MacroFactor has no workouts. Hevy coach users ask for nutrition, and we have both.
- **Local-first and private.** No account, it works offline, and your data stays on the phone. Hevy and MacroFactor need accounts and the cloud.
- **Honest data:**
  - estimates are labeled as estimates
  - "not logged" is never shown as 0
  - phone steps and watch steps are kept separate
- **Egypt-first:**
  - Arabic UI
  - 29 Egyptian dishes with Egyptian portions
  - a verified USDA database underneath
  - AI estimates (Hiku) for anything else
- **Hevy import** that works on a real export (76 workouts verified), so switching costs nothing.
- **Bring-your-own AI key**, with a choice of model. There's no subscription for us to charge yet.

## Gaps to close, by priority

### Now (fold into Phase 4)
1. **Fast repeat logging** (MacroFactor, Khtwa) → **PR I**:
   - Copy a meal or a whole day ("Same as yesterday's breakfast").
   - **Saved meals** (a combo of foods, logged in one tap).
   - Favorites, plus recents ranked by time of day.
   - Target: a repeat meal in **2 taps**; a searched food in ≤ 4 taps.
2. **Ramadan mode** (Egypt-specific; no big competitor does this well) → **PR I**:
   - Meal names can be renamed, with a one-tap preset **Suhoor / Iftar / Snacks**.
   - The day's meals follow iftar time.
   - It's a setting that is off by default. Nothing about it is medical advice.
3. **Trend weight** (MacroFactor) → **PR J**:
   - A smoothed weight line (exponential moving average) drawn over the daily dots.
   - The headline number is the trend, not the noisy day.
   - Labeled "Trend". Unit-test the smoothing.
4. **Egyptian dialect in Hiku** (Khtwa, Sahnain) → **PR K**:
   - The prompt accepts Egyptian Arabic ("طبق كشري وسط وكوباية شاي بسكر").
   - It maps dishes to our Egypt pack ids when they match, so portions and values come from the pack, not the model. Only unknown items are pure estimates.

### Next (Phase 5 candidates, in order)
1. **Adaptive expenditure** (MacroFactor's killer feature).
   - It needs only logged food and weight, **not a watch**, so it works around the "Daily calories NOT READY" gate honestly.
   - It shows "Estimated burn" after about 2–3 weeks of data, as an estimate, with a weekly check-in that *proposes* a new target (never silently).
2. **Gym parity with Hevy:**
   - plate calculator
   - warm-up calculator
   - supersets with smart scrolling
   - optional RPE/RIR per set
   - exercise notes in history
3. **Ongoing rest-timer notification**, the Android equivalent of a Live Activity. This follows the TR-9 spike results from the owner's S22.
4. **Water tracking**: a simple glass counter on Today.
5. **Barcode scanning**.
   - Open Food Facts covers Egyptian packaged products only thinly, and it's online-only.
   - Its license is ODbL (attribution and share-alike for the database).
   - Decide after measuring how many Egyptian products it has.
6. **Wear OS companion**, gated on the wearable gate.
7. **Micronutrients**: the USDA pack already has them at the source. Add fiber, sodium and sugar first.

### Not planned
- A social feed (conflicts with local-first and privacy).
- Crowdsourced food entries (accuracy).
- Ads.
- Auto-generated workouts (Fitbod style) until Hiku has a validated coaching design.

## Design lessons from the owner's review
- Use the clean icon-only bottom bar.
- Use anatomical body art with highlighted muscles, and mini muscle thumbnails in exercise lists (Hevy's rows prove it scans fast).
- No developer wording anywhere in the UI. Even spacing everywhere.

## Sources
- [Fitbod vs Strong vs Jefit vs Hevy (Jefit blog)](https://www.jefit.com/blog/fitbod-vs-strong-vs-jefit-vs-hevy)
- [Hevy vs Strong vs Fitbod (SensAI; vendor)](https://www.sensai.fit/blog/hevy-vs-strong-vs-fitbod)
- [Hevy features: track workouts](https://www.hevyapp.com/features/track-workouts/)
- [Hevy: supersets](https://www.hevyapp.com/features/what-are-supersets/)
- [Hevy help center: Features](https://help.hevyapp.com/hc/en-us/sections/35650637568407-Features)
- [Hevy Coach reviews (G2)](https://www.g2.com/products/hevy-coach/reviews)
- [MacroFactor vs Cronometer (MacroFactor; vendor)](https://macrofactor.com/macrofactor-vs-cronometer/)
- [MacroFactor review (Outlift)](https://outlift.com/macrofactor-review/)
- [MacroFactor July 2026 update](https://macrofactor.com/mm-july-2026/)
- [MacroFactor vs Cronometer 2026 (Welling; vendor)](https://www.welling.ai/articles/macrofactor-vs-cronometer-2026)
- [Sahnain (App Store, Egypt)](https://apps.apple.com/eg/app/sahnain/id6777599299)
- [Khtwa listing (Similarweb)](https://www.similarweb.com/app/apple/6781622650/)
