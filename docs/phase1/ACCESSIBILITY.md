# Accessibility

**Milestone:** 1A · **Target:** WCAG 2.2 AA, Android accessibility guidelines

## Contrast (measured)

Ratios were computed with the WCAG formula on 2026-10-21. Requirement: 4.5:1 for text, 3:1 for UI component boundaries.

| Token | Dark on `bg.surface` `#161A20` | Light on `bg.surface` `#FFFFFF` |
|---|---|---|
| `text.primary` | 15.41 | 18.15 |
| `text.secondary` | 7.97 | 7.31 |
| `text.tertiary` | 5.13 (4.64 on `bg.raised`) | 4.94 (4.52 on `bg.base`) |
| `domain.train` | 7.52 | 4.95 |
| `domain.eat` / `macro.carbs` | 10.40 | 4.95 |
| `domain.health` | 8.04 | 5.25 |
| `domain.hiku` | 7.39 | 5.76 |
| `macro.protein` | 8.08 | 5.05 |
| `macro.fat` | 7.70 | 5.25 |
| `status.success` / `warning` / `danger` | 9.03 / 9.49 / 6.29 | 5.38 / 5.19 / 5.17 |
| `border.strong` (control outline) | 3.33 | 3.54 |
| Primary button (chalk) | 16.57 | 18.15 |
| Train button text | 8.19 | 4.95 (white on `#C04A20`) |

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
