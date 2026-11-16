# LIFTRIA Phase 6: design pass v2 (tasks and review notes)

Claude's task list for the build agent. **This file is Claude's.** Don't edit it on PR branches. Put progress in your PR description.

**Goal (owner, 2026-11-16):** make Liftria look clean, calm and familiar, like Apple Fitness, Hevy or MyFitnessPal. The owner approved the direction, the system font and the standard labelled tab bar. Builder: Cursor (Grok), run by Claude. If Cursor fails a task, Claude hands it to a Sonnet agent.

**Read first, every task:**
- `docs/design-v2/mockup.html`: open it in a browser. It is the target look. The CSS block that starts `.lv{` holds the exact colours; the `V={...}` object holds each screen's layout.
- `docs/design-v2/AUDIT.md`: the problems each task fixes.
- `docs/design-v2/README.md` and `PRODUCT.md`.
- `HANDOFF.md`: "Technical gotchas" and "Rules that never bend".

## Rules for every task

- **Design and layout only.** No change to data, the database schema, business logic, routes or features. Every action a screen offers today must still be reachable.
- **No new dependencies.** Use what is installed (react-native-svg, reanimated, safe-area-context, expo-router).
- `npm run check` must pass. Never skip or weaken a test. If a test pins an old colour, size or layout on purpose, update it and say why in the PR description.
- All copy goes through `src/i18n/en.ts` and `ar.ts`. No English in the Arabic UI. No letter-spacing and no uppercase transforms anywhere.
- Layouts must mirror in Arabic: use `start`/`end` style props, never `left`/`right`, and flip chevrons.
- Touch targets 48 dp or more. Text contrast WCAG AA in both modes. Every control has an `accessibilityLabel` (or visible text) and role.
- Data honesty stays: no data is not 0, estimates are labelled, **no red and no green judgement on a user's numbers** (red is only for destructive actions such as Delete; "done" green is only for a ticked set).
- Don't touch `.github/`, this file, `src/features/train/exercisePoses.ts`, `rotatePath.ts` or the body map drawing.
- One PR per task, named as given, small commits, merge commits only. Don't add the `build` label; Claude does that to get emulator screenshots.
- If a task needs a screenshot route that doesn't exist, say so in the PR description; Claude adds it.

## Design tokens v2 (exact values)

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg.base` | `#F4F3F1` | `#0D0E10` | page |
| `bg.surface` | `#FFFFFF` | `#18191C` | cards, lists, tab bar, sheets |
| `bg.raised` (control fill) | `#ECEAE6` | `#232529` | inputs, neutral buttons, chips, tracks |
| `border.subtle` (divider) | `#E3E1DC` | `#2B2D32` | row dividers, tab bar top line |
| `text.primary` | `#17181A` | `#F2F3F5` | |
| `text.secondary` | `#5C6066` | `#A9ADB4` | |
| `text.tertiary` | `#6E7279` | `#8D9199` | placeholders, inactive tabs |
| `accent` | `#C2410C` | `#FF8A5C` | filled buttons, links, active tab |
| `on.accent` | `#FFFFFF` | `#1A0D06` | text on a filled button |
| `tint.accent` | `#FBE9DF` | `#3A2218` | tonal buttons, selected chips |
| `status.success` | `#177A45` | `#5BD08F` | ticked set |
| `tint.success` | `#E3F3E9` | `#16301F` | ticked set row |
| `status.danger` | `#B3261E` | `#FF7A7A` | destructive actions only |
| `macro.protein / carbs / fat` | `#2E6BD3` / `#9A6C00` / `#B8406F` | `#8CBEFF` / `#FFCF5E` / `#FF9AC0` | macro bars only |

- **Type** (system font: no `fontFamily`, so iPhone uses San Francisco and Android uses Roboto; Arabic uses the system Arabic face): metric 44/48 bold, large title 30/36 bold, title 20/26 semibold, body 16/22 regular (semibold for buttons and row titles that need it), secondary 14/20, caption 12/16. Numbers use `fontVariant: ['tabular-nums']`.
- **Spacing:** 4, 8, 12, 16, 24, 32. Screen edge 16. Gap between sections 24, inside a card 12.
- **Radius:** 8 small controls, 12 cards and buttons, 16 sheets, fully round only for chips.
- **Depth:** flat. No shadow on cards. Sheets and the rest bar may have a shadow or a top divider.
- **Motion:** 120 ms press, 220 ms screens and sheets; keep reduce-motion handling.

## Order

1. **PR A: `Phase 6 / Tokens and primitives`**
   - `src/design/tokens.ts`: replace the palette, type, spacing and radius with the v2 values above. Keep token paths that screens already use (`theme.color.bg.base`, `theme.color.text.primary`, `theme.space[4]` and so on) so screens keep compiling; map old names to the nearest v2 value (for example `domain.train`, `domain.eat`, `domain.health` and `domain.hiku` all become the accent for interactive use; `action.primary` becomes accent on on-accent). List the mapping in the PR description.
   - Remove the aurora style: `effectiveStyle` is always `solid`. Delete `AmbientBackdrop`, `AuroraCardDecoration`, `TrainGradient`, `cardOuterGlow` and their uses; delete the glass, rim, ambient and orb token groups once nothing reads them. If Settings → Appearance has a visual-style choice, remove that control (keep stored preferences readable so old installs don't crash).
   - `src/design/fonts.ts`: stop loading Archivo, Figtree and IBM Plex Sans Arabic; `Typography` sets no `fontFamily`. Delete the font files and the font-loading step if nothing else needs it. Keep the app from flashing or crashing at startup.
   - `Typography`: sizes become `metric`, `largeTitle`, `title`, `body`, `secondary`, `caption`. Keep the old size names as aliases mapped to these six so screens compile (`display`→`largeTitle`, `head`→`title`, `metric-xl`→`metric`, `metric-l`/`metric-m`→`title`, `small`→`secondary`, `label`→`caption` with **no** uppercase and no letter-spacing).
   - `Button`: variants `primary` (accent fill), `tonal` (accent tint, accent text), `neutral` (control fill), `plain` (accent text, no fill), `destructive` (danger text, no fill). Radius 12, height 48 (`sm` 36, radius 8). Map the old variants onto these. No outlined pills, no gradients.
   - `Card`: flat surface, radius 12, padding 16, no border, no shadow, no rim, no title dot. A card title uses `title` size.
   - `ListRow`: min height 52, title in body size, optional detail line in secondary, optional value text at the end, chevron when pressable, divider between rows. Add a small `ListGroup` wrapper (surface, radius 12, clips its rows) and a `SectionHeader` (secondary size, semibold, optional end action as plain text button).
   - `Header`: two modes. `large` for tab screens (large title, optional secondary line, end slot for icon buttons). `inline` for pushed screens (back chevron, 17 pt semibold title, end slot). No circled back button, no pill actions in the header.
   - `SegmentedControl`: control-fill track radius 8, selected segment on surface. `Chip`: control fill, selected uses accent tint and accent text. `Field`: control fill, radius 12, height 48, label above in secondary. `Stepper`: two 36 dp square neutral buttons inside a 48 dp touch area. `Toggle`: the platform `Switch` with the accent as track colour. `Sheet`: surface, top radius 16, opaque. `EmptyState`: centred title, secondary line, optional tonal button. `Banner` and `Snackbar`: flat, no dashed borders.
   - Add a `StatBlock` (value in title size, caption label under it) and a `ProgressBar` (8 dp track, radius 4).
   - Leave `Orb` and `CapsuleNav` compiling for now (later tasks remove them) but restyle them flat with the new tokens so nothing glows.
   - Update `src/design/__tests__`, `src/design/primitives/__tests__` and the dev stories under `app/dev/primitives` so every primitive has a story in the new style. Add stories with ids `list-group`, `stat-block` and `progress-bar`.
   - Done when: `npm run check` passes, no file imports a deleted effect, and `grep -rn "letterSpacing\|textTransform" app src` finds nothing outside tests.

2. **PR B: `Phase 6 / Navigation`**
   - Replace `CapsuleNav` with a standard bottom tab bar: surface background, top divider, five tabs (Today, Train, Eat, Progress, Hiku), icon above a 11 to 12 pt label, active tab in accent, inactive in tertiary text, each tab at least 48 dp tall, bottom safe-area padding. Keep the existing tab icons. Labels come from `nav.*` in i18n. In Arabic the order mirrors.
   - `WorkoutMiniBar`: a flat surface bar above the tab bar with a top divider (no orange outline, no pill): workout name, time and sets in secondary, a plain "Resume" action. Keep the rules for where the bar and tab bar hide.
   - Every tab root screen uses `Header` in `large` mode; every pushed screen uses `inline` mode. Remove the repeated "on this phone" subtitles from headers (keep the strings only where Privacy or onboarding use them).
   - Header actions become icon buttons (search icon on Train, gear on Today). Add the icons to `TabIcon.tsx` in the same stroke style.
   - Content must not sit under the tab bar or the Android system bar: add bottom padding from safe-area insets.
   - Delete `CapsuleNav`, its story and its tests; add a `tab-bar` story.

3. **PR C: `Phase 6 / Today`**
   - Layout from the mockup: large header with the date; a **Calories card** (remaining kcal in metric size with "kcal left", a progress bar, "eaten · target" line, three macro columns with thin bars, a tonal "Log food" button); a **Training** section (next routine name, secondary line, a filled "Start" button; if a workout is running show "Resume"; if there are no routines show "Start empty workout"); a **Today** list group (Water row with the stepper, Steps row and Weight row only when data or a connection exists).
   - Remove the `Orb` from Today and the "Quick actions" card.
   - With no calorie target: show "eaten" as the big number and a tonal "Set a target" button in the card. With nothing logged: show the honest empty text, never 0 as if measured. Over target: say "N kcal over" in words, in the normal text colour.
   - Keep every existing action reachable (settings, log a meal, water add/remove, weekly check-in and any banners that exist today).

4. **PR D: `Phase 6 / Train`**
   - **Train home:** large header with a search icon; one filled "Start empty workout" button; "Routines" section header with a plain "New" action and a list group of routines (name, "N exercises · last done …" when known); starter routines appear as plain rows in that list labelled "Starter" until created; a "Library" list group (Exercises, History, Records, Muscles and recovery, Templates and plans); one row for "Import from Hevy, Strong or CSV".
   - **Workout in progress** card: "Resume workout" filled; "Discard workout" becomes a `destructive` text button that asks for confirmation in a sheet.
   - **Active workout:** keep the layout and behaviour exactly (set table, hold to delete, rest bar, supersets, notes, marks, RPE). Restyle only: flat card per exercise, exercise name in accent, inputs on control fill, a ticked set row uses the success tint and a success-filled tick, "Add set" is a neutral small button, "Finish" is a small filled button, stats row uses `StatBlock`. Replace the dashed hint box with one plain secondary line. Rest bar: surface with top divider, time in title size, −15 / +15 neutral, Skip tonal.
   - **History:** remove the visible "Delete" button on each row; delete moves to hold (long-press) and to the workout's detail screen, both with a confirmation sheet. Month summary uses `StatBlock`s.
   - **Library, picker, exercise detail, records, plans, templates, plates, recovery, summary:** move to list groups, the inline header, the new chips and fields. The exercise figures and body map keep their drawings and their colours' meaning (primary muscle in accent).

5. **PR E: `Phase 6 / Eat`**
   - **Day screen:** large header; a date row with previous and next arrow buttons around the date ("Today, Nov 16"); the summary card (same component as Today's); then one section per meal (Breakfast, Lunch, Dinner, Snacks): header with the meal's kcal, a list group of its foods (name, amount, kcal) ending in an accent "+ Add food" row; then the Water row. Quick add moves into the add-food flow or a header icon.
   - Remove the `Orb` from Eat. After this task nothing uses `Orb`: delete it, its story, its tests and its tokens.
   - **Search, portion, quick add, custom food, targets, meal, history:** inline header, fields on control fill, results as list rows with a tonal or icon add action, the meal picker as a segmented control or chips.
   - Fiber, sugar and sodium stay visible where they are today.

6. **PR F: `Phase 6 / Progress`**
   - **Home:** large header; range segmented control (4 weeks, 3 months, 1 year); a weight card (latest value in metric size, the change over the range in secondary text and normal colour, a simple line chart with at most three gridlines and the accent line); then a list group: Strength, Nutrition, Measurements, Photos, Health, each showing its latest value at the end when one exists. With no weight data show the empty state with "Log weight".
   - **Body, strength, nutrition, measurements, photos, health and its detail screens:** the big number first, then the chart, then the explanatory text in secondary size below. Charts: few gridlines, accent line, no glow.

7. **PR G: `Phase 6 / Hiku`**
   - **Home without an API key:** one card explaining Hiku in two lines with a single filled "Add API key" button. **With a key:** "Describe a meal" filled, "Analyze a meal photo" tonal with the Beta chip, then a list group for Usage and privacy.
   - Describe, review, photo and usage screens: inline header, list groups, estimate chips kept, flat cards.

8. **PR H: `Phase 6 / Settings and onboarding`**
   - **Settings:** grouped list as in the mockup (Appearance, Your plan, Preferences, Data), each row showing its current value at the end; theme and language open a choice sheet or stay as segmented controls inside the group; "Delete all data" is a destructive text button with the existing confirmation.
   - All settings sub-screens: inline header, list groups, platform `Switch`.
   - **Onboarding:** one idea per screen, large title, at most two lines of secondary text, one filled button at the bottom, a plain "Skip" where it exists today. No empty-looking screens: the welcome screen lists the three things Liftria does (Train, Eat, Progress) as plain rows.
   - Final sweep: `grep` for leftover uses of removed tokens, hard-coded colours and font sizes outside `tokens.ts`; fix them.
