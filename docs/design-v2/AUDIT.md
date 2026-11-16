# Audit of the current design (2026-11-16)

Source: 250 emulator screenshots of main at 151bd9cb (light, dark, Arabic) and the design code,
scored with the impeccable native rules (ios.md, android.md, audit.native.md).

| Area | Score | Main finding |
|---|---|---|
| Platform conformance | 1/4 | Custom unlabelled tab bar, pill buttons, hand-made glass and glow, card stacks where lists belong |
| Visual hierarchy | 1/4 | Equal-weight cards; three styles of primary button |
| Appearance and theming | 3/4 | Tokens used almost everywhere (37 stray colours, 6 stray font sizes); dark mode carries the glow |
| Accessibility | 3/4 | 48 dp targets and labels; tab icons have no visible text |
| Performance, adaptivity | not scored | Not measured in this pass |

No P0 findings.

## Every screen

Screenshot: shots/today-light.jpg

- **P1 The tab bar is a floating capsule with icons and no labels.** People cannot tell Eat, Progress and Hiku apart without tapping. Apple and Android both ask for a labelled bar. Fix: standard bar, icon plus label.
- **P1 Three different looks for "the main button".** Orange gradient on Train, black pill on Hiku and onboarding, outlined pill on Today. Fix: one filled orange button per screen; a soft tinted one for second place; plain text for the rest.
- **P1 Everything is a rounded outlined pill or a card.** When all controls weigh the same, nothing stands out. Fix: lists for navigation, cards only for a summary.
- **P1 Aurora gradient, glass and glow on every screen.** Decoration competes with the content and looks unlike any familiar app. Fix: plain solid backgrounds.
- **P2 Headers differ on every tab.** Small title with date, title with subtitle and a Search pill, title with a Quick add pill, a circled back button. Fix: one header with a large title; actions as icons.
- **P2 The same privacy line repeats as a subtitle.** "On this phone", "Stored on your phone", "Finished sessions on this phone". Fix: say it once in onboarding and Privacy.
- **P2 Capital-letter labels with wide spacing, and a coloured dot before each card title.** Neither carries meaning, and wide spacing is wrong for Arabic. Fix: remove both.
- **P2 Dark mode is the light design with a purple glow.** Cards barely separate from the page. Fix: a neutral dark palette with clear surface steps.

## Today

Screenshot: shots/today-dark.jpg

- **P1 A glowing orb showing one number fills 40% of the screen.** Three grey lines under it explain the orb. Fix: a compact calories summary with eaten, target and macros.
- **P1 Training is missing from Today.** The next workout is not shown at all. Fix: a "next workout" row with a Start button.
- **P2 "Quick actions" is a card holding a single button.** Fix: put Log food inside the calories summary.
- **P2 "Remove glass" has the same weight as "Add glass".** Fix: a small minus and plus stepper on a Water row.

## Train

Screenshot: shots/trainactive-light.jpg

- **P1 "Discard workout" is a filled orange-red button right under "Resume workout".** Two similar buttons, one of which deletes your session. Fix: Resume stays filled; Discard becomes red text with a confirmation.
- **P1 Starter routines are two large outlined buttons inside a card.** They read as actions, not as routines you own. Fix: a plain Routines list with a "New" link.
- **P2 A loose sentence and two "Explore" headings.** "Start without a plan, or build a repeatable template." floats with no container; Explore appears as a label and again as a card title.
- **P2 History and Records are not on the first view.** Fix: a Library list with Exercises, History, Records, Muscles.
- **P3 Search is a large pill in the header.** Fix: a search icon.

## Workout

Screenshot: shots/workout-light.jpg

- **P2 The Finish button is a red-orange blob.** In light mode it reads as a warning. Fix: a normal small filled button.
- **P2 The hint sits in a dashed orange box.** Dashed borders look unfinished. Fix: a one-time plain tip, or drop it.
- **P2 The last rows scroll under the system buttons.** Fix: bottom padding for the system bar, and a rest bar pinned above it.

## Eat

Screenshot: shots/eat-light.jpg

- **P1 The meals are below the fold.** Logging food is the job of this screen, yet the orb and Water come first. Fix: summary, then Breakfast, Lunch, Dinner, Snacks with "Add food" in each.
- **P1 The day switcher looks like three tabs.** "Previous day / Today / Next day" as plain words. Fix: arrows around the date.
- **P2 "Set a target" is a lone pill on the left.** Fix: fold it into the summary when no target exists.
- **P2 Over target is shown with a yellow ring in Arabic and no other cue.** Fix: state it in words next to the number, in both languages.

## Progress

Screenshot: shots/progress-light.jpg

- **P1 Three cards of explanation and one small number.** A progress screen without a chart. Fix: the weight chart on the home, then a plain list to Strength, Nutrition, Measurements, Photos, Health.
- **P2 Each card exists to hold one link.** Fix: list rows that show the latest value on the right.

## Hiku, History, Settings

Screenshot: shots/history-light.jpg

- **P1 History shows a "Delete" button on every workout.** A destructive action is one tap away from a list people scroll. Fix: swipe or hold to delete, with a confirmation.
- **P2 Hiku offers "Describe a meal" as the main button before an API key exists.** Fix: without a key, the one main action is "Add API key".
- **P2 Settings groups are cards with descriptions under most rows.** Fix: a standard grouped list showing the current value on the right.
- **P3 The welcome screen is mostly empty.** Fix: tighten onboarding copy in the last pull request.

## Keep

The workout set table, hold to delete and rest timer; the exercise picker and filters; the exercise drawings and body map; RTL mirroring; honest empty states; the tokens file.
