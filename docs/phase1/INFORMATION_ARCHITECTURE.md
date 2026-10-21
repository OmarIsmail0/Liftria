# Information Architecture

**Milestone:** 1A · **Status:** for owner review

## Primary navigation

A five-item navigation bar, always visible on top-level screens. It's drawn as a floating glass **capsule**: icons for every tab, plus a label on the active one (see DESIGN_SYSTEM §5):

| Tab | Purpose | Why it's a top-level tab | Designed in |
|---|---|---|---|
| **Today** | The day at a glance: food vs. target, planned workout, activity, Hiku shortcut, week strip | The app's home and the answer to "how am I doing today?" | 1A |
| **Train** | Workouts, templates, plans, exercise library, history, records | Used every gym session; needs one-tap access | 1B |
| **Eat** | Food diary, add food, targets, nutrition history | Used several times a day | 1C |
| **Progress** | Trends for strength, nutrition, body and activity, plus Health Connect details and sources | Where history and health data are explored | 1D |
| **Hiku** | AI meal analysis and chat | Distinct mode (online, costs money), so it gets its own clearly labeled place | 1C |

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
├── Quick add sheet → Log meal / Start workout / Log weight
└── Cards link to → Eat diary · Workout · Progress → Health source details
Train
├── Workout home → Start workout → Active workout → Summary
├── Templates & plans → Edit template
├── Exercise library → Muscle group → Exercise detail
└── History → Session detail · Exercise progress · Records
Eat
├── Diary (by meal) → Meal detail → Edit food entry
├── Add food → Search local pack / Recents / Custom food / Hiku photo
├── Targets & settings
└── History & trends
Progress
├── Strength · Nutrition · Body · Activity
└── Health → Steps · Heart rate · Exercise sessions · Energy · Sleep → Source & provenance detail
Hiku
├── Welcome / setup (no key)
├── Conversation → Meal analysis result (editable) → Confirm & save to Eat
└── Usage & privacy
```

## Navigation rules

1. **Bottom bar** is visible on all tab roots and hidden during focus flows: onboarding, active workout, Hiku review-before-save, and destructive confirmations.
2. **Back** (Android gesture or system back) always goes one level up. It never discards entered data without a confirmation sheet.
3. **The active workout persists.** If you leave it, a mini bar ("Upper A · 23:10 · Resume") shows above the navigation capsule on every screen until you finish or discard it. (1B)
4. **Deep links** between tabs open the destination as its own stack, so back returns to where you were. Example: Today → "Log a meal" opens Eat's add-food screen with back to Today.
5. **Settings** opens as a pushed stack from Today with its own back button. No bottom bar inside Settings.
6. **No dead ends.** Every empty, error and permission state has at least one forward action (set up, retry, log manually) and a way back.

## Onboarding sequence (1A)

`Welcome → Privacy → Profile* → Goal & activity* → Estimated target → Health Connect* → Galaxy Watch* → Hiku key* → Done → Today`

`*` means skippable. Only Welcome and Privacy are required. Skipping everything lands on Today in the "first day" state with a getting-started checklist.
