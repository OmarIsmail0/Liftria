# Accessibility

**Milestone:** 1A, 1B, 1C · **Target:** WCAG 2.2 AA, Android accessibility guidelines

## Contrast (measured)

Ratios were computed with the WCAG formula on 2026-10-21. Requirement: 4.5:1 for text, 3:1 for UI component boundaries.

| Token | Dark on `bg.surface` `#161A20` | Light on `bg.surface` `#FFFFFF` |
|---|---|---|
| `text.primary` | 15.41 | 18.15 |
| `text.secondary` | 10.15 | 7.31 |
| `text.tertiary` | 7.62 (6.89 on `bg.raised`) | 5.63 (5.16 on `bg.base`) |
| `domain.train` | 7.81 | 6.24 |
| `domain.eat` / `macro.carbs` | 11.92 | 5.89 |
| `domain.health` | 10.52 | 6.43 |
| `domain.hiku` | 9.06 | 5.76 |
| `macro.protein` | 9.08 | 5.05 |
| `macro.fat` | 8.84 | 5.25 |
| `status.success` / `warning` / `danger` | 9.03 / 9.49 / 6.29 | 5.38 / 5.19 / 5.17 |
| `border.strong` (control outline) | 3.33 | 3.54 |
| Primary button (chalk) | 16.57 | 18.15 |
| Train button text (gradient, both ends) | 8.51 / 6.81 | 6.24 / 5.94 (white) |

### Aurora Rim, worst case

Each card was measured where its brightest part (the top sheen) sits over each glow at full strength. Lowest ratios:

| Token | Dark (card .62 + sheen .10) | Light (card .78) |
|---|---|---|
| `text.secondary` | ≥ 6.45 | ≥ 6.77 |
| `text.tertiary` | ≥ 4.99 (`#A3ACBA`) | ≥ 5.05 (`#5E6878`) |
| Domain colors used as text (chips) | ≥ 5.12 (train) | ≥ 5.28 (eat) |
| Macro colors | ≥ 5.79 | ≥ 4.52 (protein) |

**History:**
- The first glass draft failed (tertiary 4.34–4.50).
- The first Aurora Rim draft failed in light mode for eat, train and health used as text (4.12–4.47), and for tertiary over the lavender glow (4.42).
- All of these were fixed by darkening the light tokens and brightening the dark ones.

### Pulse Orb

Orb ink `#120B22` on the orb fill, measured where text can sit: dark ≥ 6.28 (13.07 at the centre, 8.57 on coral), light ≥ 10.19. The ring is backed by the "eaten of target" text line, so it never carries the value alone.

**Reduce transparency:** if Android's high-contrast text or "Reduce transparency" (where available) is on, Liftria switches to the Solid style automatically.

The first palette draft failed in five places: tertiary text in both themes, and the light-theme train, health and success colors, at 4.14–4.38. Control borders were also at 1.55–1.69. All of these were corrected before this milestone was committed.

## Rules

1. **Touch targets** are at least 48 × 48dp. Primary buttons are 48dp tall; nav items are 56dp. Chips are not tappable on their own; tapping the row opens the source detail.
2. **Color is never the only signal.** Provenance chips have an icon *and* text. Macro bars have text values. Week-strip days have an accessible text summary. The pressed state of a choice adds an outline, not just a color.
3. **Screen reader labels** (TalkBack):
   - Each metric reads as one sentence: "Steps, 6,214, counted by the phone, updated 12 minutes ago".
   - The Pulse Orb reads "1,230 kilocalories left. 1,420 of 2,650 eaten, estimated target". With no target: "1,420 kilocalories eaten, no target set".
   - Capsule navigation items are icon-only when inactive, so each has a label ("Train", "Eat"…) and announces "selected" on the active tab. The visible label on the active tab tells sighted users where they are.
   - The deck is a horizontal list: TalkBack reads "Training, 1 of 4", and every card is reachable by swipe navigation.
   - Icon-only buttons have labels ("Profile and settings", "Back").
4. **Font scaling up to 200%:**
   - Cards grow vertically. Two-column layouts (ring + macros, onboarding unit fields) stack into one column when the system font scale is ≥ 1.3.
   - Metric numbers scale and may wrap to their own line. Text is never truncated without an expand action.
5. **Reduced motion:** honor Android's "Remove animations". There are no ring or bar fill animations, the orb doesn't breathe, and screen changes are instant.
6. **Focus order** follows visual order. The navigation capsule is last. Dialogs and sheets trap focus and return it on close.
7. **Language:** plain, short sentences. Errors say what happened and what to do next. Health language is nonjudgmental (no "bad", "cheat" or "failed").
8. **One-handed reach on the S22 Ultra:** primary actions sit in the lower half or the bottom bar; the top area is for reading, not for frequent actions.
9. **Right-to-left readiness:** layouts use start/end, not left/right. Icons that imply direction (back, chevron) mirror in RTL. V1 ships English only.

## Train (1B)

**Contrast.**
- Rest-orb ink `#120B22`, where the label sits: dark ≥ 8.57 (12.31 at the centre), light ≥ 11.14.
- Text on the Log set button is the same as the train button: 8.51 dark, 6.24 light.
- Record badges use the domain eat color on its tint, measured like the other chips (≥ 5.12).

**In the gym** (sweaty hands, gloves, one hand on a dumbbell):
- Log set and the steppers are **64dp**. Set ticks are 48dp. Everything needed mid-set sits in the bottom 40% of the screen.
- No gestures are required: swipes (rail, sheet) always have a tap equivalent.
- **Undo instead of confirm** for single sets. Confirmation sheets are only for discarding a whole workout or deleting a session.

**Screen reader:**
- A set row reads "Set 3, last time 70 kilograms by 8, now 72.5 by 8, not done". Ticked rows say "done" and their action is "undo".
- Steppers announce the new value.
- The rest timer is a `timer` role. It announces at start, at 30 s, at 10 s and at 0, **not every second**.
- The body map's text alternative lists primary and secondary muscles. Group chips replace tapping regions.
- The week strip and chart have text summaries.

**Reduced motion:**
- The rest orb doesn't breathe, and the countdown ring updates without easing.
- Sheets appear without sliding.

**Font scaling (rendered and checked at 200% for TR-8):**
- Text grows (nonlinearly above about 20sp, as Android 14 does); dp sizes don't.
- Each set becomes two lines: "Set 2 · last 70 × 8" over "72.5 kg × 8", with the tick on the right.
- The steppers stay side by side, with the − and + buttons kept at 52dp.
- The current set is scrolled into view above the dock.
- First render finding, now fixed: stacked steppers took about 45% of the screen and hid the current set, and narrowing the buttons to fit made them 44dp.
- Other Train screens use standard rows that wrap; they're specified, not drawn, and get the same check in Phase 3.

**Fixed during this review:** the Today profile button was 40dp (1A); it's now 48dp.

**Suggested vs. logged values** differ by color *and* style (italic), and the screen reader says "suggested" before a suggested value.

## Eat and Hiku (1C)

### Contrast (measured 2026-10-22)

Same method as 1A: the WCAG formula, with each pair measured on the brightest part of the card (glass .62 with the .10 sheen in dark, .78 in light) over each of the four glows at full strength, and on the Solid surface. The lowest value is reported. Requirement: 4.5:1 for text, 3:1 for icons and control outlines.

| New or newly used pair | Dark (worst case glass / Solid) | Light (worst case glass / Solid) |
|---|---|---|
| `chip-hiku` text: `domain.hiku` on `tint.hiku` | 4.74 / 6.95 | 4.87 / 5.00 |
| Confidence chip "Check amount": `status.warning` on `tint.warning` | 4.81 / 7.16 | **4.96** / 5.09 (see below) |
| Week chart labels, target label: `text.tertiary` on the card | 5.14 / 7.62 | 5.48 / 5.63 |
| "+180 kcal over": `domain.eat` on the card | 8.04 / 11.92 | 5.74 / 5.89 |
| Hint text (mismatch, missing name): `status.warning` on the card | 6.40 / 9.49 | 5.66 / 5.81 |
| Supporting text: `text.secondary` on the card | 6.85 / 10.15 | 7.11 / 7.31 |
| Source chip "USDA": `domain.health` on `tint.health` | 5.48 / 8.15 | 5.54 / 5.68 |
| Switch outline, off state: `text.tertiary` on the card (3:1) | 5.14 / 7.62 | 5.48 / 5.63 |
| Add "+" glyph: `domain.eat` on `tint.eat` (3:1) | 5.93 / 8.83 | 5.06 / 5.20 |
| `btn-hiku` label: `on.hiku` on `domain.hiku` | 9.70 | 5.76 |
| Switch knob when on: `text.inverse` on the Hiku or honey track (3:1) | 9.74 / 12.82 | 5.76 / 5.89 |
| Orb words "On track" / "A bit over" (26px bold, large text, needs 3:1): `orb.ink` on the lowest orb stop | 4.39 (≥ 6.28 where the text sits, per the 1A measurement) | 9.22 |

**Found and fixed in this milestone:**
- The confidence chip (`status.warning` text on its tint) measured **4.43** in light over the lavender glow, below 4.5. This is the same pair as the 1A "2 d ago" chip. Light `status.warning` was darkened from `#946300` to `#8A5C00`; it now measures 4.96 in the worst case, and the hint text improved too.
- The first switch draft used `border.strong` for its off outline, which measured **2.25** in dark over a glow (below the 3:1 for controls). The outline now uses `text.tertiary`.
- Not fixed, recorded: `border.strong` on glass (steppers, inputs, secondary buttons) is 3.33 on the Solid surface but lower over a bright glow. That is a 1A style question, not new in 1C.

### Rules

1. **Touch targets.** Every button in the 1C screens and states passed the automated 48dp check (text links were measured separately, because the check script skips them): the food-row "+", the switch (56 × 48), the unit control (52dp), the macro-split − / + and the date arrows included. The Today "Add" link for dinner was brought to 48dp.
2. **Color is never the only signal.**
   - Confidence is a word ("Sure", "Check amount"), with an icon on the chip.
   - Source chips are icon + text.
   - Over target is the words "kcal over" and "+180 kcal over", not just the honey ring.
   - Unlogged days in the week chart are dashed outlines with "—" and a text line "Not logged".
   - The "After saving" bar has the numbers beside it.
3. **Screen reader wording:**
   - **Orb, hidden numbers:** "On track for today's target. Numbers are hidden." or "A bit over today's target. Numbers are hidden." The "Show numbers" link is next to it. Meal cards read "Lunch, 4 items".
   - **Orb, over target:** "180 kilocalories over an estimated target of 2,650, 2,830 eaten."
   - **Result rows:** "Olive oil, 10 grams, 88 kilocalories, check the amount. Edit." A "Sure" row says "Hiku is sure"; a "Guess" row says "Hiku is guessing". Confidence is read as a word, never a number.
   - **Estimate:** the `estimate` chip reads "Estimate", and Hiku results are announced "Hiku estimate. Check before saving."
   - **Week chart:** an image with this alternative: "Calories per day, 14 to 20 October, against a target of 2,650: Tue 14, 2,540 kilocalories; Wed 15, 2,310 kilocalories; Thu 16, not logged; …" The day list under the chart repeats every day and opens that day.
   - **Switches** are `role="switch"` and announce "on" or "off" with their title ("Today's totals, off"). The **unit control** is a radio group. The **tick row** is a checkbox.
   - **One-tap add** announces "Greek yogurt, 170 grams added to Dinner. Undo" and the Undo button is reachable from the snackbar. The row's "+" is labeled "Add 170 grams of Greek yogurt, plain, nonfat to Dinner".
   - **HK-3** announces "Hiku is looking" and, at 10 s, "Still working". **HK-5** titles are alerts. The rate-limit countdown is a timer: it announces at the start, at 10 s and at 0, not every second.
   - **Sheets** trap focus and return it on close. The disabled "Keep" button explains itself through the tick row above it.
4. **Reduced motion:** the plate shimmer is static (a still band), the orb doesn't breathe, ring and bar fills don't animate, and the HK-3 wait is only text and the static shimmer.
5. **Nothing happens by gesture only.** Long-press on Today's "Log a meal" or tab opens Quick add, and the Eat "+" button does the same. The week chart's days are also a list.
6. **Calm language** is an accessibility rule here too: no shame words, no red for eating, "Not logged yet" instead of 0.

### Font scaling at 200% (rendered for EA-3 and HK-4, dark and light)

- **EA-3 Portion picker.**
  - The unit control becomes a two-by-two grid.
  - The title and the "stored in grams" line wrap.
  - The result card wraps its macros onto two lines.
  - The stepper keeps its 52dp buttons.
  - The dock ("Add to Dinner") stays visible, and the page scrolls above it with enough bottom padding to reach the meal selector.
- **HK-4 Result review.**
  - Rows become two lines: the name, then "150 g · 248 · Sure" (or the Check amount chip).
  - The header title wraps to two lines.
  - The total, the "After saving" line and the link wrap and stay reachable above the dock.
- **First-render finding, fixed:** the first HK-4 attempt stacked each row into four short lines (name, grams, kcal, confidence), which made the list long and hard to scan. It is now two lines.
- The other 1C screens use the same wrapping rows and cards; they are specified, not drawn at 200%, and get the same check in Phase 4.

## Testing plan (Phase 2+)

- Automated contrast check of the token file in CI.
- TalkBack walkthrough of onboarding, Today, logging a meal, a Hiku estimate (send, review, save) and a full workout (log, rest, finish) on the S22 Ultra.
- A real gym session: log a workout one-handed with the phone on a bench, and the rest timer with the screen locked.
- Manual check at Android font size "Largest" plus display size "Largest".
