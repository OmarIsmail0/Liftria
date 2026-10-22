# Information Architecture

**Milestone:** 1A, 1B, 1C, 1D · **Status:** for owner review

## Primary navigation

A five-item navigation bar, always visible on top-level screens. It's drawn as a floating glass **capsule**: icons for every tab, plus a label on the active one (see DESIGN_SYSTEM §5):

| Tab | Purpose | Why it's a top-level tab | Designed in |
|---|---|---|---|
| **Today** | The day at a glance: food vs. target, planned workout, activity, Hiku shortcut, week strip | The app's home and the answer to "how am I doing today?" | 1A |
| **Train** | Workouts, templates, plans, exercise library, history, records | Used every gym session; needs one-tap access | 1B |
| **Eat** | Food diary, add food, targets, nutrition history | Used several times a day | 1C |
| **Progress** | Trends for strength, nutrition, body and activity, plus Health Connect details and sources | Where history and health data are explored | 1D |
| **Hiku** | AI meal analysis (chat is pending, later) | Distinct mode (online, costs money), so it gets its own clearly labeled place | 1C |

**Settings** sits behind the profile button in the Today header, not in the bar. It's used rarely, and keeping it out leaves room for daily destinations.

### Why this structure

- **Matches how the app is used.** Daily use is "log food" and "train". Those two get dedicated tabs; Today ties them together.
- **Health lives inside Progress, not as its own tab.** Health data is read-only, partly unverified, and mostly useful as context or trend. Today shows the current snapshot; Progress → Health shows the detail and provenance.
- **Hiku gets a tab** instead of a floating button, because it needs a persistent conversation, a key setup state and an offline state. It's also reachable from where meals are logged (Today and Eat) through a "Photo" shortcut.
- **Thumb reach.** Train and Eat sit in the easiest reach zone for a right-handed thumb on a 6.8" screen. Today is the default landing tab.

### Alternatives considered

| Option | Why not chosen |
|---|---|
| Centre "+" button for quick add | Duplicates actions already on Today and Eat; one more icon to learn. Quick add is a sheet on Today instead. |
| Separate Health tab | Would show many empty or pending screens until the watch is verified, and splits trends across two tabs. |
| Hiku as a floating button on every screen | Hides offline and no-key states; easy to tap by accident in a workout. |

## Hierarchy (full app, depth ≤ 3 from a tab)

```
Today
├── Profile & Settings (header button)
│   ├── Profile · Goals & targets · Units · Theme
│   ├── Hiku: API key · AI privacy · usage
│   ├── Health Connect permissions · Sources
│   ├── Local data: storage · delete all · export/backup (future)
│   └── About · Help & troubleshooting
├── Quick add sheet (QA-1) → Log a meal / Photo a meal / Describe a meal / Start workout / Log weight (1D)
└── Cards link to → Eat diary · Workout · Progress → Health source details
Train (TR-1)
├── Workout preview (TR-7) → Active workout (TR-8) → Summary (TR-10)
│   └── Rest timer sheet · lock-screen notification (TR-9)
├── Plans & templates (TR-2) → Template editor (TR-3) → Exercise library
├── Exercise library (TR-4) → Muscles (TR-5) → Exercise detail (TR-6)
├── Muscles card → Muscle recovery map (TR-14) [Recent · Volume · Untrained] → Muscles (TR-5) filtered to one muscle   (1E)
├── History (TR-11) → Session detail (TR-12) → edit / delete   ["Imported from <app>" source line on imported sessions (1E)]
   └── empty History → "Switching from another app?" → Import (IM-1)   (1E)
└── Records (TR-13) → Exercise detail
Eat (EA-1)
├── Quick add (QA-1, the "+" in the header)
├── Add food (EA-2) → Portion picker (EA-3)
│   ├── Create a food (EA-5) / Quick add calories → Portion picker
│   └── Hiku Photo / Describe → Before sending (HK-2)
├── Meal detail (EA-4) → edit an item · delete (confirmation sheet)
├── Targets (EA-6) → safety-floor sheet · hide numbers
└── History and trends (EA-7) → a day's EA-1
Progress (PR-1) [4 W · 3 M · 1 Y]
├── Strength (PR-2) → Exercise detail (TR-6) · Records (TR-13) · Muscle map (TR-14, 1E)
├── Nutrition trends (PR-3)
├── Body (PR-4) → Log weight (PR-6 sheet): add · edit · delete
├── Activity (PR-5) → Health details
└── Health (HE-1) [Activity → Health details; Today Activity card → HE-2; Today HR row → HE-3]
    ├── Metric detail (HE-2): Steps · Heart rate · Active energy · Sleep · Exercise sessions
    │   └── Record and source detail (HE-3)
    ├── Connection and permissions (HE-4) → Android permission screen (reference)
    ├── Samsung Health sync guide (HE-5)
    └── Troubleshoot missing watch data (HE-6) → HE-5
Settings (ST-1) [from the Today avatar; no capsule nav]
├── Profile and goals (ST-2) → Targets (EA-6)
├── Units and appearance (ST-3)
├── Hiku and API key (ST-4) → Usage and privacy (HK-6)
├── Notifications (ST-5)
├── Health Connect (HE-4)
├── Data and storage (ST-6) → Delete all data (confirmation sheet)
│   └── Import workouts from another app (1E) → Choose source (IM-1) → Android file picker → Preview (IM-2) → Importing (IM-3) → Done (IM-4) → History (TR-11)
│       └── Undo import (after an import, until the next one) → confirmation sheet
└── About and help (ST-7) → Troubleshoot (HE-6) · How Hiku works (HK-1)
Hiku (HK-1)
├── Welcome / no key / offline / first time (states of HK-1)
├── Before sending (HK-2) → Analyzing (HK-3) → Result review (HK-4) → Save to Eat
│   └── Errors (HK-5): Retry · Check key · Describe instead · Log manually
├── Usage and privacy (HK-6) → API key (Settings, 1D)
└── Chat (pending, marker only; not designed as a working feature)
```

## Navigation rules

1. **The navigation capsule** is visible on tab roots and their browse screens. It's hidden during focus flows: onboarding, template editor, workout preview, active workout, workout summary, session edit, and every confirmation sheet. **1C focus flows:** the portion picker (EA-3), Create a food (EA-5), Before sending (HK-2), Analyzing (HK-3), Result review (HK-4) and the confirmation sheets (delete meal, safety floor, discard an edited estimate). Add food (EA-2), Eat home, Targets, History, Hiku home, Usage and the error cards (HK-5) keep the capsule.
2. **Back** (Android gesture or system back) always goes one level up. It never discards entered data without a confirmation sheet.
3. **The active workout persists.** If you leave it, a mini bar ("Upper A · 23:10 · Resume") shows above the navigation capsule on every screen until you finish or discard it. (1B)
4. **Deep links** between tabs open the destination as its own stack, so back returns to where you were. Example: Today → "Log a meal" opens Eat's add-food screen with back to Today; Today → "Photo" opens Hiku's Before sending screen.
   - **Quick add** is one shared sheet (QA-1): Eat's "+", a long-press on Today's "Log a meal", or a long-press on the Today tab.
   - Training reaches Eat and Hiku only as a read-only chip or an opt-in context switch. Nutrition and Train never write each other's data.
5. **Settings** opens as a pushed stack from Today with its own back button. No bottom bar inside Settings. **1D deep links:** Today Activity card → HE-2; Today HR row → HE-3; EA-6 → ST-2; HK-1, HK-5 and HK-6 → ST-4; TR-8 "Turn on" → ST-5. Back always returns to the screen the user came from (the prototype's `data-ret`).
   - **1D focus flows:** the Log weight sheet (PR-6), the Android permission reference screen (HE-4) and every Settings screen and confirmation sheet hide the capsule. The workout mini bar is also hidden inside Settings (open question).
   - **Progress and Health keep the capsule** with Progress selected.
6. **No dead ends.** Every empty, error and permission state has at least one forward action (set up, retry, log manually) and a way back.
7. **Import is a pushed focus flow (1E).** IM-1 to IM-4 hide the capsule nav, like onboarding and Settings, and Back returns to where the import started (ST-6, the first-time Train home or the empty History). IM-3 has no back and no cancel (one transaction). Reached from three places, so it can be deeper than three levels from a tab (Today → Settings → Data and storage → IM-1 → IM-2…); that is acceptable because it is a linear, modal flow that nothing else links into. **The Muscle map (TR-14) is a Train browse screen** (capsule visible, Train selected) with two entry points (the TR-1 Muscles card, PR-2 Strength); Back returns to the entry point, and a muscle opens TR-5 one level deeper.

## Onboarding sequence (1A)

`Welcome → Privacy → Profile* → Goal & activity* → Estimated target → Health Connect* → Galaxy Watch* → Hiku key* → Done → Today`

`*` means skippable. Only Welcome and Privacy are required. Skipping everything lands on Today in the "first day" state with a getting-started checklist.
