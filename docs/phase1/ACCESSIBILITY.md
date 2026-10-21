# Accessibility

**Milestone:** 1A · **Target:** WCAG 2.2 AA, Android accessibility guidelines

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

**Reduce transparency:** if Android's high-contrast text or "Reduce transparency" (where available) is on, Liftria switches to the Solid style automatically.

The first palette draft failed in five places: tertiary text in both themes, and the light-theme train, health and success colors, at 4.14–4.38. Control borders were also at 1.55–1.69. All of these were corrected before this milestone was committed.

## Rules

1. **Touch targets** are at least 48 × 48dp. Primary buttons are 48dp tall; nav items are 56dp. Chips are not tappable on their own; tapping the row opens the source detail.
2. **Color is never the only signal.** Provenance chips have an icon *and* text. Macro bars have text values. Week-strip days have an accessible text summary. The pressed state of a choice adds an outline, not just a color.
3. **Screen reader labels** (TalkBack):
   - Each metric reads as one sentence: "Steps, 6,214, counted by the phone, updated 12 minutes ago".
   - The calorie ring reads "1,420 of 2,650 kilocalories eaten, estimated target".
   - Icon-only buttons have labels ("Profile and settings", "Back").
4. **Font scaling up to 200%:**
   - Cards grow vertically. Two-column layouts (ring + macros, onboarding unit fields) stack into one column when the system font scale is ≥ 1.3.
   - Metric numbers scale and may wrap to their own line. Text is never truncated without an expand action.
5. **Reduced motion:** honor Android's "Remove animations". There are no ring or bar fill animations, and screen changes are instant.
6. **Focus order** follows visual order. The bottom navigation is last. Dialogs and sheets trap focus and return it on close.
7. **Language:** plain, short sentences. Errors say what happened and what to do next. Health language is nonjudgmental (no "bad", "cheat" or "failed").
8. **One-handed reach on the S22 Ultra:** primary actions sit in the lower half or the bottom bar; the top area is for reading, not for frequent actions.
9. **Right-to-left readiness:** layouts use start/end, not left/right. Icons that imply direction (back, chevron) mirror in RTL. V1 ships English only.

## Testing plan (Phase 2+)

- Automated contrast check of the token file in CI.
- TalkBack walkthrough of onboarding, Today and logging a meal on the S22 Ultra.
- Manual check at Android font size "Largest" plus display size "Largest".
