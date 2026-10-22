# Liftria: Product and UX Vision

**Milestone:** 1A · **Status:** for owner review · **Prompt:** [PHASE_1_PROMPT.md](PHASE_1_PROMPT.md)

## The product in one line

A training log, food diary and health dashboard that lives on your phone and **never shows a number it can't stand behind**.

## Who it's for

People who train in a gym and track food toward body-composition goals, on **any Android 9+ phone**, with or without a watch that syncs to Health Connect.

- **Now:** the owner (Galaxy S22 Ultra + Galaxy Watch 4) is the only tester. Next, friends install it from a shared APK. Google Play comes later.
- **iPhone** is planned for later; the code stays portable (see PHASE_1_HANDOFF.md §4).
- Each person's data stays on their own phone. There are no accounts, social features, coaches or subscriptions.
- The S22 + Watch 4 setup is the reference test device, not the only target.

## Design principles

| # | Principle | What it means on screen |
|---|---|---|
| 1 | **Honest data first** | Every health number carries its source and age. "No data", "zero", "estimate" and "not allowed" look different. Phase 0 proved Health Connect will return a convincing but fake 1,565 kcal; Liftria never shows that as measured. |
| 2 | **Offline is the normal case** | Logging meals, running a workout and reading history never wait on the network. Only Hiku needs internet, and it says so. |
| 3 | **Fast in the gym** | The active workout is operable one-handed, mid-set, with sweaty fingers: big targets in the bottom half, one tap to log a set. (Designed in 1B.) |
| 4 | **AI proposes, you decide** | Hiku's estimates are always editable drafts. Nothing is saved until you confirm it. |
| 5 | **Private by construction** | Data lives in a local database. The only outbound traffic is a Hiku request you started, with the content you chose. |
| 6 | **Calm, not gamified** | No streak guilt, no "bad food" labels, no red numbers for eating. Progress is shown plainly. Weight and calories can be hidden. |
| 7 | **Ready for partial truth** | The watch may sync some data types and not others, or start mid-week. Every screen has a useful state for "some of it". |

## Identity

**Name and mark.** Liftria combines *lift* with *tria*, the three things it tracks: **train, eat, recover**. The mark is three rising bars, one in each domain color.

**Personality.** Precise like an instrument panel, warm like a good coach. Plain, direct copy: "Dinner, not logged yet", not "Uh oh, you forgot dinner!".

**Visual direction.** Dark graphite by default with a polished light theme. Neutral surfaces carry the content, and color is reserved for meaning:
- Each domain has one hue: training coral, nutrition honey, health sage-teal, Hiku lavender.
- Primary actions use high-contrast "chalk" (light on dark, ink on light), not a brand color. Color stays a signal, not decoration.
- **Aurora Rim is the default style** (owner's choice, 2026-10-21):
  - Frosted, translucent cards float over a deep, fixed aurora glow.
  - Each card's edge glows in its section color, so you know where you are at a glance: honey = food, coral = training, teal = health, lavender = Hiku.
  - Numbers and controls stay solid and high-contrast.
  - A calm Solid style remains available.
- Wide, athletic display type (Archivo) for numbers and headings, and a friendly, readable face (Figtree) for text.

**Signature element: provenance chips.** Small chips next to health and energy numbers: **Measured · Phone · Estimate · Pending · Stale · No data**. Users learn them once and can then trust every number at a glance. Most fitness apps don't do this, so it's the feature that sets Liftria apart.

## Hiku

Hiku is the in-app assistant. It runs on Anthropic's Claude through the user's own API key (bring-your-own-key for now; the model for friends and Play users is decided before Phase 4) (currently the `claude-haiku-5-5` model; Hiku is the product name, Haiku is the model).

- **Is:** friendly, calm, practical, nonjudgmental; good at turning "2 eggs and some rice" or a photo into editable numbers.
- **Isn't:** a doctor, an always-on companion, an offline model, or a source of facts about your body that the app doesn't actually have.
- **Shown as:** a lavender sparkle mark and a text label. No face or mascot, which keeps it useful without pretending to be a person.

## What success looks like

1. A new user reaches a working Today screen in under 2 minutes, without an API key or a watch.
2. Logging a meal manually takes under 20 seconds for a recent food.
3. Logging a set during a workout takes one tap when it matches last time.
4. A user can always answer "where did this number come from?" from the screen in front of them.
5. Nothing breaks, blanks out or lies when offline, when the watch is missing, or when Hiku fails.
