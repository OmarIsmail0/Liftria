# Liftria

Product context for design work (read by the impeccable skill). Written from the owner's
design brief of 2026-11-16 and the repository; items marked (to confirm) await the owner.

## Platform
adaptive

One shared React Native design (Expo) that respects Apple's Human Interface Guidelines on
iPhone and Material 3 on Android.

## Users and job
People who train with weights and track food and body progress on their own phone. They open
the app several times a day, often mid-workout with one hand, to log a set, log a meal or
check today's numbers. (to confirm)

## What it does
- Train: routines, a Hevy-style workout screen, exercise library, history and records.
- Eat: food diary with calorie and macro targets, offline food search including Egyptian dishes.
- Progress: weight, measurements, photos, strength and nutrition trends, Health Connect / Apple Health (read only).
- Hiku: an optional AI assistant for meal estimates that uses the user's own API key.

## Constraints that never change
- Local-first: data stays on the phone; no analytics.
- English and Arabic (full right-to-left), light and dark mode, Android and iPhone.
- Data honesty: never invent or imply data the user did not log.
- Accessibility: 48 dp touch targets, WCAG AA contrast in both modes, text scaling, labels on every control.
- Keep: the workout screen layout, the exercise drawings (src/features/train/exercisePoses.ts), the muscle body map.

## Voice
Plain, calm and direct. No hype, no jargon. All copy goes through src/i18n.

## Design direction (owner's brief)
Familiar first, one job per screen, calm visuals, one accent colour (orange).
See docs/design-v2/ for the audit, the v2 rules and the mockup.
