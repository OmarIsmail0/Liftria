# Liftria Design System

**Milestone:** 1A (foundation; components are extended in 1B to 1D), 1C and 1D added below · **Status:** for owner review

The tokens in the prototype (`prototype/src/liftria-1a.html`, the `:root` blocks) are the source of truth for values. Token names use the form `category.role.variant`. In CSS they become `--category-role-variant`; in the React Native theme object (Phase 2) they become `theme.color.text.primary`.

## 1. Color

### Neutrals and text

| Token | Dark | Light | Use |
|---|---|---|---|
| `color.bg.base` | `#0F1216` | `#F3F5F8` | App background |
| `color.bg.surface` | `#161A20` | `#FFFFFF` | Cards, sheets |
| `color.bg.raised` | `#1E232B` | `#FFFFFF` | Inputs, tracks, nested tiles |
| `color.bg.glass` | `rgba(30,35,43,.78)` | `rgba(255,255,255,.82)` | Bottom navigation in the Solid style |
| `color.border.subtle` | `#272D37` | `#E1E5EB` | Dividers, card outlines (decorative) |
| `color.border.strong` | `#636D7B` | `#808996` | Input, choice and secondary-button outlines in the **Solid** style (3.33 / 3.54 on the surface) |
| `color.border.control` | `#929CAA` | `#5F6978` | **Aurora Rim only (1D):** outlines of controls, 3:1 against the worst-case page or card over the brightest glow (3.38 / 3.25). See ACCESSIBILITY.md |
| `color.text.primary` | `#EEF1F5` | `#12161C` | Headings, values |
| `color.text.secondary` | `#BFC6D1` | `#4D5767` | Body and supporting text |
| `color.text.tertiary` | `#A3ACBA` | `#5E6878` | Labels, timestamps, placeholders |
| `color.track` | `rgba(255,255,255,.09)` | `rgba(18,22,28,.09)` | Empty part of rings and bars (works on solid and glass) |
| `color.action.primary.bg` / `.fg` | `#EEF1F5` / `#0F1216` | `#12161C` / `#FFFFFF` | Primary "chalk" buttons |

Neutrals lean slightly blue-grey, so the warm domain colors read clearly against them.

### Domain colors (meaning, not decoration)

| Token | Dark | Light | Means |
|---|---|---|---|
| `color.domain.train` | `#FF8F6B` | `#A83E18` | Workouts, sets, records |
| `color.domain.eat` | `#FFCF5E` | `#855D00` | Calories eaten, meals |
| `color.domain.health` | `#46E0BC` | `#126B57` | Activity, heart rate, measured health data |
| `color.domain.hiku` | `#BDB1FF` | `#6150D8` | Hiku and AI-generated content |
| `color.on.train` / `color.on.hiku` | `#1A0D06` / `#120E2B` | `#FFFFFF` / `#FFFFFF` | Text on filled domain buttons |
| `color.tint.{domain}` | domain at 14–15% alpha | domain at 10% alpha | Icon tiles, soft backgrounds |

### Macros and status

| Token | Dark | Light |
|---|---|---|
| `color.macro.protein` | `#8CBEFF` | `#2E6BD3` |
| `color.macro.carbs` | `#FFCF5E` | `#855D00` |
| `color.macro.fat` | `#FF9AC0` | `#B8406F` |
| `color.status.success` | `#5BD08F` | `#177A45` |
| `color.status.warning` | `#F2B44C` | `#8A5C00` |
| `color.status.danger` | `#FF7A7A` (was `#FF6B6B`) | `#C93636` |

**Rules**
- Danger red is only for destructive actions and real errors. **Never** use it for eating "too much" or missing a target.
- Domain colors never carry meaning alone. Every colored element also has a label, icon or position (see ACCESSIBILITY.md).
- All text colors meet WCAG AA (4.5:1) on `bg.base`, `bg.surface` and `bg.raised` in both themes. The measured ratios are in ACCESSIBILITY.md.

### Aurora Rim style (default)

**Chosen by the owner on 2026-10-21** from the direction board (`prototype/liftria-directions.html`, option 5). It combines Aurora's frosted glass over color glows with Neon rim's section-colored card edges. **Solid** stays available in Settings → Appearance and is the automatic fallback (see rule 2).

| Token | Dark | Light | Use |
|---|---|---|---|
| `aurora.base` | `#06070C` | `#EEF0F7` | Background under the glow |
| `glass.card` | `rgba(12,13,24,.62)` | `rgba(255,255,255,.78)` | Card, choice and banner fill |
| `glass.highlight` | `rgba(255,255,255,.10)` | `rgba(255,255,255,.75)` | Diagonal sheen, fading out by 45% of the card |
| `glass.border` | `rgba(255,255,255,.08)` | `rgba(255,255,255,.90)` | Base 1px edge (under the rim) |
| `glass.shadow` | inset top highlight + `0 18px 44px rgba(0,0,0,.5)` | inset white + `0 14px 34px rgba(60,70,120,.14)` | Lift |
| `rim.strength` / `rim.glow` | 25% / 12% | 15% / 7% | How strongly the section color shows in the edge, and in the soft outer glow |
| `ambient.train` / `.hiku` / `.health` / `.eat` | pink-coral .45 / violet .50 / teal .38 / honey .26 | peach .60 / lavender .55 / mint .50 / butter .50 | Four radial glows (top-left, right, lower-left, bottom-right) |
| `train.gradEnd` | `#FF6A6A` | `#B8322E` | The training Start button is a coral gradient (the only gradient button) |

**The rim.** Each section card gets a 1.2px edge in its section color, brightest at the top-left corner and fading along the card, plus a soft glow in the same color:

| Card | Rim |
|---|---|
| Nutrition, target | `domain.eat` (honey) |
| Training | `domain.train` (coral) |
| Activity, health | `domain.health` (teal) |
| Hiku | `domain.hiku` (lavender) |
| Neutral cards (week, getting started) | faint white |

Like every color in Liftria, the rim is backed by the card's title and dot, so it never carries meaning alone.

**Rules for glass**
1. **Glass frames, never fills, the data.** Numbers, chips, inputs, macro bars and buttons stay solid and high-contrast. Only cards, choice rows, banners, the navigation capsule and sheets are glass.
2. **The ambient glow is fixed** (it doesn't scroll or animate). That lets Phase 2 build cards as plain translucent views over one pre-rendered background, with **no live blur under cards**: cheap, smooth and battery-friendly on Android. Live blur (e.g. `expo-blur`) is used only for the navigation capsule and bottom sheets, where content moves underneath. It falls back to a more opaque fill if blur is unavailable or "Reduce transparency" is on.
3. **Contrast is checked against the worst case**: a card's sheen sitting on the brightest glow. To pass, dark text tokens were brightened (secondary `#BFC6D1`, tertiary `#A3ACBA`), dark domain colors were brightened, and light-mode domain and tertiary colors were darkened. Every text token now passes 4.5:1 there (see ACCESSIBILITY.md).
4. **The glow carries no meaning.** It is decoration, so it never signals state.
5. **Only one gradient button**: the training Start. The primary action stays solid chalk, so the eye goes to it first.

### The Pulse Orb (Today's hero)

The owner chose **Pulse Orb** as the Today concept (2026-10-21, from the A/B/C concept board). Today's calorie number sits in a glowing orb, wrapped by a progress ring, with the rest of the day in a swipeable deck of rimmed cards below it.

| Token | Dark | Light | Use |
|---|---|---|---|
| `orb.1` / `orb.2` / `orb.3` | `#FFCF5E` / `#FF8F6B` / `#7B5CFF` | `#FFE09A` / `#FFB496` / `#B9A8FF` | Radial fill: honey centre, coral middle, violet edge |
| `orb.ink` | `#120B22` | `#120B22` | Number and unit inside the orb |

- **Size:** 236px orb area; the ring uses `domain.eat` on `color.track`.
- **Orb ink contrast** (measured on the fill where text can sit): dark ≥ 6.28 (13.07 at the centre), light ≥ 10.19.
- **Label:** "1,230 kcal left" with a target; "1,420 kcal eaten" with no target (no ring, and macros show grams only, never `/target`); first day shows an empty glass orb, "0 kcal eaten" and "Your first meal lights it up."
- The orb is a summary. The Estimate chip and "eaten of target" line sit right below it, so the number's origin is never more than a glance away.
- **Over target:** the ring stays full in the same honey color and the label reads "+180 kcal over". Never red (principle 6).

## 2. Typography

| Token | Face | Size / line | Weight | Width | Use |
|---|---|---|---|---|---|
| `type.display` | Archivo | 34 / 36 | 800 | 112% | Onboarding headlines |
| `type.title` | Archivo | 22 / 26 | 700 | 108% | Screen titles |
| `type.head` | Archivo | 17 / 22 | 700 | 104% | Card titles |
| `type.metric.xl` | Archivo | 52 / 52 | 800 | 116%, tabular | Hero numbers (target, workout volume) |
| `type.metric.l` | Archivo | 30 / 30 | 800 | 116%, tabular | Ring centers |
| `type.metric.m` | Archivo | 24 / 24 | 800 | 116%, tabular | List metrics (steps, bpm) |
| `type.body` | Figtree | 15 / 22 | 400 | normal | Body text |
| `type.body.strong` | Figtree | 15 / 22 | 600 | normal | List titles |
| `type.small` | Figtree | 13 / 18 | 400 | normal | Secondary text, timestamps |
| `type.label` | Figtree | 11 / 14 | 700 | +0.09em, uppercase | Section labels |
| `type.button` | Figtree | 15 / 20 | 700 | normal | Buttons |

- Both faces are under the SIL Open Font License and get **bundled in the app** (`expo-font`, no network). Fallbacks are Roboto Condensed and Roboto.
- **All numbers use tabular figures**, so values don't jump as they change during a workout.
- Text scales with the Android font size up to 200%. Layout behavior is in ACCESSIBILITY.md.

## 3. Space, shape, elevation

| Token | Value | Token | Value |
|---|---|---|---|
| `space.1` | 4 | `radius.sm` | 8 (inputs' inner elements, small tiles) |
| `space.2` | 8 | `radius.md` | 14 (inputs, choices, banners) |
| `space.3` | 12 | `radius.lg` | 22 (cards, sheets) |
| `space.4` | 16 | `radius.pill` | 999 (buttons, chips) |
| `space.5` | 20 | `layout.gutter` | 18 (screen side padding) |
| `space.6` | 24 | `layout.cardGap` | 14 (between cards) |
| `space.8` | 32 | `size.touch.min` | 48 (minimum touch target) |
| `space.10` | 40 | `size.touch.primary` | 48–56 (primary buttons) |

**Elevation.** In dark, surfaces are separated by lighter fills plus a 1px inner top highlight (`elevation.card`). Large shadows look muddy on OLED. In light, a soft two-layer shadow is used. There are only three levels: base, card, sheet/overlay.

## 4. Iconography

- A custom 24px line icon set with a 1.8px stroke and rounded joins, drawn for Liftria (prototype `ICON` map). The provenance chips use 12px glyphs.
- Icons always come with a text label in navigation and buttons. Icon-only buttons have an accessible label.
- **Anatomy and muscle illustrations:** original artwork is to be drawn in 1B. Do **not** reuse free-exercise-db images or react-native-body-highlighter SVGs until their rights are verified (see `docs/OPEN_SOURCE_REVIEW.md`).

## 5. Components (1A set)

| Component | Variants | Notes |
|---|---|---|
| **Button** | `primary` (chalk), `secondary` (outline), `ghost`, `train`, `hiku`; sizes `md` (48dp, 15px text), `sm` (48dp touch, 14px text, tighter padding) | One primary per screen region. Destructive actions use a red `danger` variant in confirmation sheets only. |
| **Card** | `default` (raised), `flat` (no shadow) | Header row: domain dot, title, optional chip or link. |
| **Provenance chip** | `measured`, `phone`, `estimate` (dashed), `pending`, `stale`, `off` | Always icon + text. See §6. |
| **Banner** | `offline`, `warning`, `info` | Inline in content, never a blocking modal. Starts with an icon. |
| **Calorie ring** | with target / without target | 132px, 12px stroke (Solid style, Eat diary). On Today it wraps the Pulse Orb. With no target, it shows only the eaten value and a "Set target" action. Never a ring against an invented target. |
| **Pulse Orb** | with target / no target / empty | Today's hero. See §1 "The Pulse Orb". |
| **Deck card** | rim per section | Today's horizontal, snapping card deck (Training, Activity, Hiku, Meals; Getting started first on day one). Cards are 85% of screen width so the next one peeks. Dots below show position; every card is also reachable by TalkBack swipe. |
| **Macro bar** | protein, carbs, fat | Label + bar + "96/155 g". Over-target continues in the same color with a "+12 g" label, never red. |
| **Metric row** | with chip | Icon tile, value, unit, provenance chip row. |
| **Week strip** | 7 days | A dot means logged; a train-tinted cell means workout day. Also has a text alternative. |
| **Capsule navigation** | 5 items | Floating glass capsule above the gesture bar, 16px from the edges. Icons only, except the active tab, which shows its label in a chalk pill. 56px targets; every item has an accessible label. |
| **Choice list** | single-select | Full-width rows, at least 56px, pressed state shown by an outline (not color alone). |
| **Unit input** | number + unit suffix | Numeric keyboard; units switch in Settings. |
| **Step indicator** | n of 8 | Segmented bar with an accessible label "Step n of 8". |
| **Checklist row** | done / to do / skipped | Getting-started list on the first day. |

### 1B components (Train)

| Component | Variants | Notes |
|---|---|---|
| **Set row** | done / current / to do / editing / warm-up / large text | Columns: set, last time, kg (or *kg each*, *assist kg*, *+ kg*), reps, tick (48dp, current and logged rows only). Unlogged values use the **suggested** style (tertiary, italic) until logged. Warm-up rows are labeled "W" in honey. At large font scales a row becomes two lines: "Set 2 · last 70 × 8" over "72.5 kg × 8". Current row has a train tint and a 1.5px train outline (not color alone: it's also `aria-current`). Done ticks are filled train color. |
| **Stepper** | kg / reps / duration | 64dp tall, − and + 52dp wide, number in `type.metric.m` with a unit label. Glass fill in Aurora Rim. |
| **Log set button** | `train`, size `xl` | 64dp, full width, in the bottom dock, the one gradient button. |
| **Bottom dock** | with or without banner | Fixed to the bottom of focus screens, fading into the background (`dock-bg`); holds the screen's primary action in thumb reach. |
| **Rest orb** | running / over | The Pulse Orb in training colors (`rest.1–3`) with a countdown ring. 200px. |
| **Body map** | full (front + back) / mini glyph | Liftria's own geometric figure. Its **17 regions match free-exercise-db's 17 muscle categories one-to-one** (table below), so nothing is guessed. Primary = solid train color; secondary = 30% train fill **with a dashed outline**, so it doesn't rely on color alone. Always paired with a text legend ("Primary: Chest · Secondary: Triceps, Front delts"). The mini glyph shows whichever side holds the primary muscles. |
| **Exercise row** | default / with detail | Glyph tile, name, equipment · muscles, chevron. 64dp. |
| **Filter chip** | off / on | 48dp tall pill; on = chalk fill. Scrolls horizontally, edge to edge. |
| **Week plan strip** | done / today / planned / rest | 7 cells: done = filled with a tick; today = train outline; planned = template initials (UA, LB); rest = dashed. Plus a text alternative. |
| **Stat trio** | — | Three numbers with labels (duration, sets, volume). |
| **Line chart** | single series | Train-colored line and soft area, 3 gridlines with labels, last point emphasized. Needs ≥ 2 points; text alternative states start, end and range. |
| **Record badge** | "PR" / "Record" / dated | Honey on honey tint with a trophy icon. Records are achievements, so they use the honey color, not a status color. |
| **Bottom sheet** | info / permission / destructive | Grabber, icon tile, title, body, then stacked full-width buttons. In destructive sheets, the safe choice is the primary button. Glass sheets use `sheet.glass` (more opaque than cards). |
| **Mini bar** | workout in progress | Floats above the capsule nav on every tab. Train outline, live dot, name, time, sets, Resume. |
| **Snackbar** | info / with Undo | Chalk pill above the nav. 4 s, or 8 s with Undo. |
| **Search field** | idle / with query | 52dp pill with a search icon. |

| Token | Dark | Light | Use |
|---|---|---|---|
| `rest.1` / `rest.2` / `rest.3` | `#FFC2A3` / `#FF8F6B` / `#D9487A` | `#FFD9C7` / `#FFB496` / `#F08DB0` | Rest orb fill (centre → edge); ink is `orb.ink` |
| `sheet.glass` | `rgba(16,17,30,.94)` | `rgba(255,255,255,.95)` | Bottom sheets and the mini bar in Aurora Rim |
| `dock.bg` | `aurora.base` (Solid: `bg.base`) | same | The fade behind the bottom dock |

**Body map regions = free-exercise-db categories.** Region key = the category with spaces removed. A rendered test in the prototype checks that the set of drawn regions equals the 17 categories. Phase 3 keeps this as a unit test on the bundled pack.

| Category | Drawn as | Category | Drawn as |
|---|---|---|---|
| abdominals | front: centre block + two side blocks | lats | back: two outer back blocks |
| abductors | back: outer-hip slivers | lower back | back: block above the glutes |
| adductors | front: inner-thigh slivers | middle back | back: centre block between the lats |
| biceps | front: upper arms | neck | front and back: neck block |
| calves | front and back: lower legs | quadriceps | front: thighs |
| chest | front: two blocks | shoulders | front and back: shoulder caps (the data has no front/rear split) |
| forearms | front and back | traps | back: upper block |
| glutes | back: two blocks | triceps | back: upper arms |
| hamstrings | back: thighs | | |

### 1C components (Eat and Hiku)

| Component | Variants | Notes |
|---|---|---|
| **Meal card** | logged / not logged / numbers hidden | Honey rim. Header: meal name over its total ("520 kcal") or "Not logged yet", and an **Add** button (48dp). Items below, one row each: name, grams (and a Hiku chip where it applies) and kcal. Hidden-numbers mode replaces the total with an item count and drops the kcal column. |
| **Food row with one-tap add** | recent / search result | A 64dp row (name, portion and kcal, source chip) beside a **48dp "+"** in an honey tint. Row tap opens the portion picker; "+" adds the last-used portion and shows an Undo snackbar. |
| **Portion picker** | default / text 200% | Food name and source chip, **unit segmented control**, amount stepper, live result card, per-100 g line, meal selector, dock. |
| **Unit segmented control** | g / cup / piece / serving | Four equal 52dp segments with a chalk fill on the selected one (`role="radiogroup"`). At large text it becomes a 2 × 2 grid. |
| **Result item row (with confidence)** | Sure / Check amount / Guess / open for editing | Name and grams on the left; kcal and a confidence word on the right. "Sure" is plain secondary text; "Check amount" and "Guess" use the `stale` chip style with a warning icon. Confidence is **words, never a percentage**. At large text the row wraps to two lines. The open row shows a gram stepper, Remove item and Done. |
| **Total block** | estimate / edited | Big kcal, P / C / F with the macro dots, "Hiku said 624" once edited, and the "After saving" two-segment bar (eaten so far in honey, this meal in lavender) with the numbers in text. |
| **Week bar chart** | logged / not logged | Honey bars on a 0–3,000 kcal scale, a dashed `text.tertiary` target line with its label, day and date labels. **Days with nothing logged are dashed outlines with "—", not zero bars.** The `svg` carries a full text alternative, and the day list below repeats the values. |
| **Quick add sheet** | default / offline / no key | Bottom sheet: five rows (icon tile, label, one-line hint), disabled rows state why, then Close. |
| **Plate illustration** | large / small / shimmer | Original geometric SVG: a plate circle and three rounded food shapes in coral, honey and teal tints. A drawing, **not a photo**, and it says so in its label. The shimmer is a lavender band that sweeps across it and sits still under reduced motion. |
| **Source chips** | USDA / My food / Hiku estimate / Calories only | Always icon + text. See the table below. |
| **Switch** | off / on | A 56 × 48dp target around a 48 × 28 track. Off: outline and a secondary knob. On: a lavender (Hiku) or honey (Eat) track with an inverse knob. Always paired with a title and a line saying exactly what it does. |
| **Tick row** | unchecked / checked | A 56dp row with a 24dp box, used for "I'm doing this with professional guidance". |
| **Date switcher** | today | Two 48dp arrows around a centred label; the next-day arrow is disabled on today. |
| **Macro split row** | — | Name, grams, percent, and − / + buttons (48dp). |
| **Safety-floor sheet** | floor / deficit | Warning tile, calm explanation, safe value as the primary button, "Keep …" as the secondary button, disabled until the tick is on. |

**Source chips** extend the provenance set from §6:

| Source | Chip | Style |
|---|---|---|
| USDA | `measured`, label "USDA" | Teal text on `tint.health`, dot icon |
| My food | `phone`, label "My food" | Raised neutral with a phone icon |
| Hiku estimate | **`chip-hiku`** | `color.chip.hiku.fg` (`domain.hiku`) on `color.chip.hiku.bg` (`tint.hiku`), sparkle glyph |
| Quick add | `estimate`, label "Calories only" | Dashed outline, approx icon |

| New token | Dark | Light | Use |
|---|---|---|---|
| `color.chip.hiku.bg` / `.fg` | `tint.hiku` / `domain.hiku` (`rgba(169,156,255,.15)` / `#BDB1FF`) | `tint.hiku` / `domain.hiku` (`rgba(97,80,216,.10)` / `#6150D8`) | `chip-hiku`. Reuses existing values, so nothing new to measure beyond the combination (ACCESSIBILITY.md) |
| `color.status.warning` (changed) | `#F2B44C` | `#8A5C00` (was `#946300`) | Darkened in light so the confidence chip passes 4.5:1 over the lavender glow (it measured 4.43) |
| Orb 200px (`orb.sm`) | — | — | Eat's orb reuses `orb()` at 200px (the rest-timer size) |
| Orb words | `orb.ink` at 26px | same | Hidden-numbers mode: "On track" or "A bit over" in place of the number |

**Rules for 1C**
- Eat surfaces use the **honey rim**; Hiku surfaces use the **lavender rim** and `btn-hiku` for the action that sends or starts a Hiku request. Saving a result is a normal primary button.
- **Over target** keeps the honey ring full and uses "kcal over". The orb never changes to a warning palette, and nothing about eating is red.
- Hide-numbers mode keeps the ring (a shape, not a number) and replaces every calorie figure with words.

### 1D components (Progress, Health and Settings)

| Component | Variants | Notes |
|---|---|---|
| **Summary card with source line** | Strength / Nutrition / Body / Activity; populated / empty / hidden | Domain rim, a `t-head` title, a headline metric, a `t-small` **source line** and a 48dp card link. Empty: one sentence and one action. |
| **Source line** | — | `t-small` under every chart title: "From your workouts in Liftria", "From your food diary", "Logged in Liftria", "From Health Connect · Phone". |
| **Range chips** | 4 W / 3 M / 1 Y | 48dp `fchip`s, one pressed. |
| **Volume bars** | 8 periods | Coral bars on a 0–60k scale, values in thousands above each bar, a "Last 4 weeks" bracket. |
| **Sparkline** | up | 72 × 28, coral line and a dot on the last point; decorative (the row's label carries the numbers). |
| **Calorie line with gaps** | 28 days | Honey line and dots on logged days; an unlogged day is a gap with a dashed baseline tick. Dashed target line. |
| **Pip grid** | at / below / not logged | 28 pips in a Tue-to-Mon grid: filled with a check, outlined, dashed. Shape and fill carry the meaning, with a legend. |
| **Weight chart** | populated / hidden / with sources | Faint hollow dots (circle = You, diamond = Samsung Health), a **solid 2.5px 7-day average** in `domain.health`, the range low and high, the last entry emphasized. Never a red or green trend color. In hidden mode, no axis numbers. |
| **Steps by source** | phone only / two sources | Phone = **solid teal**, Samsung Health = **teal with diagonal stripes** (a pattern, so the source isn't color-only), with a legend showing both. Two sources are drawn **side by side, never stacked**: a stack would imply a sum, and phone and watch can count the same steps. Days with no data are dashed outlines. |
| **Health row** | value / empty / locked / stale | 64dp row: icon tile, name and value, then chips and age on a second line. Locked rows show `off` with a lock and open Health Connect. |
| **Switch-look** | on / off | A **picture** of a switch (48 × 28) plus the words "Allowed" or "Not allowed", inside a button that opens Health Connect. Not a control, so it has no `role="switch"`; the row's label says "Tapping opens Health Connect". |
| **Definition list** | — | `t-label` term, strong `t-body` value, a small explanation; package names in the monospace `.kbd` style. |
| **Check row** | ok / info / fail / waiting / checking | A 28dp status circle (icon, never color alone) with a word for screen readers, a title and one line. A failing row is **warning amber, not danger red**, and can expand with a fix. |
| **Sync guide step** | — | A 96 × 92 drawing of a phone screen (original geometric shapes), a numbered title and one line. |
| **System mock** | dark / light | Android's permission screen in neutral greys, Roboto-like type and a blue accent, **clearly not Liftria's style**, captioned "Android screen, for reference" (like TR-9). |
| **Settings row** | — | 64dp: neutral icon tile, title, one line, chevron. Settings cards have **neutral rims**. |
| **Segmented control (2–3)** | pressed / disabled | 48dp, chalk fill on the pressed option; a disabled option says why. Uses `border.control` in glass. |
| **Danger zone card** | — | A card with a **1.5px `status.danger` outline** (no rim gradient) and a danger text button. The confirmation sheet's destructive button is `btn-danger`, **disabled until the typed text matches**. |
| **Confirmation by typing** | empty / matched | "Type DELETE to confirm", an empty field, a disabled `btn-danger` button; enabled only for exactly DELETE. The safe choice is the primary button. |
| **Note box** | — | A raised, quiet box titled "What this means", or an example note. |

| New or changed token | Dark | Light | Use |
|---|---|---|---|
| `color.border.control` | `#929CAA` | `#5F6978` | Glass-style control outlines: `.btn-secondary`, `.iconbtn`, unpressed `.fchip`, `.search`, `.stepper`, `.field` inputs, `.choice` buttons, `.tick-btn`, `.addrow`, segmented controls, `.avatar` |
| `color.status.danger` (changed) | `#FF7A7A` | `#C93636` (unchanged) | Lightened in dark so danger text measures ≥ 4.5 over the brightest glow (it was 4.25 with `#FF6B6B`) |

**Rules for 1D**
- **Charts:** gridlines `border.subtle`, labels `text.tertiary`. Strength coral, Nutrition honey, Body and Activity teal.
- **Health is never merged:** each origin is listed separately; a total appears only for steps with one origin.
- **Red** is only for destructive actions (Delete entry, Delete key, Delete all data). A failed check or missing source is amber.
- Settings is a pushed stack: no capsule nav, neutral rims.

### 1E components (import and the muscle map)

| Component | Variants | Notes |
|---|---|---|
| **Recovery shading** | none (ready) / 25% / 55% + dots / solid; untrained | The train domain color in **three steps of fill**, plus a **dot pattern on the middle step**, so the bands are never color-only. **Ready** uses the neutral region fill (`color.track`), **not green**: readiness is the default, not a reward. **No red anywhere.** Tokens in the table below. |
| **Recovery map** | recent / volume / untrained / empty (neutral) / mini (TR-1 card) | The same 17-region body map as TR-5 (the region test still applies), drawn with the shading above. Region outline 0.9 in `color.border.control` (neutral regions) or `color.domain.train` (shaded regions). Always paired with the legend, the list, and a text alternative (ACCESSIBILITY). |
| **Recovery legend** | recent (3 swatches) / volume (4) / untrained (2) | A swatch **and words** for every step, always visible under the map. Swatches are drawn with the same fill, pattern and outline as the regions. |
| **Muscle row** | recent / volume / trained / untrained with action | 64dp, min. A swatch, the muscle name, a value in **words and a number** ("8 sets · trained yesterday" with "Higher load"), a chevron. The untrained row is not itself a button; it carries a 48dp **Find exercises** button. |
| **Mode control** | Recent · Volume · Untrained | The 3-way segmented control (1D), 48dp, one pressed; `border.control` in glass. |
| **Muscles card (TR-1)** | rich / hidden on first time | A button-card with a mini front/back map (124dp wide) in `recent` mode, the title "Muscles" + `estimate` chip, one line, "Muscle map" with a chevron. |
| **Estimate note** | — | The `estimate` chip with its one-line explanation: "Counted from the sets you log in Liftria. It doesn't know your sleep, soreness or food." Always on TR-14. |
| **Mapping row** | suggestion chosen / kept as own | One per unmatched exercise (IM-2). Top: the file's exercise name and "N sets in the file". Second line: the `estimate`-style chip **Suggested** and the library exercise with its equipment. Third: a **two-way control** (48dp), "Use “<library exercise>”" and "Keep as my own". The default selection is "Keep as my own" (suggestions are never applied for the user). When no close match exists the second line reads "No close match in the library" and the control is replaced by one line, "Kept as your own exercise". |
| **Import summary card** | with / without a unit question | Domain (train) rim; label "Ready to import" and a `From <app>` chip; the workout count in `type.metric.xl`; sets and the date range as two stats. |
| **Provenance chip: From <app>** | — | `chip-file`: `bg.raised`, `text.secondary`, a file icon, `border.subtle`. Means "read from a file you imported". Added to the chip legend. |
| **Source line (sessions)** | TR-11 row / TR-12 card | A 16dp file icon and "Imported from Hevy" in `t-small` (`text.secondary`). TR-12 adds the import date and "Weights and reps are as in the file; Liftria worked out volume and records." |
| **Import progress card** | running | A card with the count in `type.metric.xl` ("61" then "of 142 workouts"), a 12dp bar in the train color, the all-or-nothing note. No cancel control. `role="progressbar"`. |
| **File picker mock** | dark / light | Android's document picker in the neutral system-mock style (HE-4), captioned "Android file picker, for reference". |

| Token (derived) | Dark | Light | Use |
|---|---|---|---|
| `recovery.3` | `color.domain.train` 100% (`#FF8F6B`) | 100% (`#A83E18`) | Higher load / 12+ sets |
| `recovery.2` | `color.domain.train` at 55% over the card, **plus the dot pattern** | same | Some load / 6–11 sets |
| `recovery.1` | `color.domain.train` at 25% | same | 1–5 sets (volume only) |
| `recovery.0` | `color.track` (white at 9%) | `color.track` (ink at 9%) | Ready / none: the neutral region fill |
| `recovery.untrained` | 25% fill, **dashed** train outline (3 on, 2 off, 1.6 wide) | same | No direct sets in 10+ days |
| `recovery.dots` | `color.text.primary` | `color.text.primary` | The dot pattern on `recovery.2` |
| `recovery.outline.neutral` | `color.border.control` (`#929CAA`) | `#5F6978` | Outline of neutral regions (≥ 3:1) |
| `recovery.outline.active` | `color.domain.train` | `color.domain.train` | Outline of shaded regions |

**The dot pattern.** A 5 × 5 tile in the map's own units, with a base of `recovery.2` and two dots of radius 0.85 at (1.25, 1.25) and (3.75, 3.75). It scales with the map (×1 for the full map, ×1.3 in legend swatches, ×2.4 in the TR-1 mini map so the dots stay visible). Each map instance gets its own pattern id in SVG (several maps can be on one screen).

**Rules for 1E.** Colour only where it means something: the train color marks "worked", never "good" or "bad". Region shading is always repeated in words (legend, list, text alternative). Copy never says "fatigued", "damaged" or "not recovered". The imported-source chip is neutral, not a domain color.

Further components are added in the build phases.

## 6. Data-honesty patterns (the core of the system)

| State | Chip | How the value is shown |
|---|---|---|
| Measured by a named source | `measured` + source name | Value + unit + "12 min ago" |
| Counted by the phone (not the watch) | `phone` | Value + unit; never labeled as watch data |
| Calculated by Liftria (e.g. target) | `estimate` (dashed, ≈ icon) | Value, with an explanation one tap away |
| Health Connect estimate with no contributing app | `estimate` "Health Connect estimate" | **Value hidden by default**, with an explanation; the user can reveal it |
| Measured zero | `measured` | "0", with its source |
| No data | `off` "No data" | Em dash "—" plus a setup or explanation link. **Never "0".** |
| Permission denied | `off` with a lock "Not allowed" | Link to Health Connect permissions |
| Older than the freshness limit | `stale` "2 d ago" | Value shown dimmed + a sync hint |
| Designed but not verified on device | `pending` | Hidden from totals; shown only on detail screens |

**Freshness limits** (default; tunable in Phase 2): steps and heart rate are stale after 6 h; daily energy after 24 h; weight after 14 days.

**Energy rule:** never add active + resting + total. Show **one** energy figure, labeled with which kind it is, or none.

## 7. Motion

| Token | Duration | Easing | Use |
|---|---|---|---|
| `motion.quick` | 120 ms | standard | Press states, chip changes |
| `motion.base` | 220 ms | `cubic-bezier(.2,.8,.2,1)` | Screen enter, sheet open |
| `motion.slow` | 500–600 ms | same | Ring and bar fills on first show |

- Under Android's "Remove animations" setting (`prefers-reduced-motion`), there are no transitions, and values appear at their final state.
- No looping animations, with **one exception**: the Pulse Orb "breathes" (3% scale and slight saturation, 5 s cycle). It is off under "Remove animations", paused when Today isn't visible, and carries no meaning. 
- **Haptics (1B):**
  - light tick on Log set
  - a double pulse at rest 0:00 (vibration also goes through the notification when the screen is off)
  - a heavy tick when confirming a destructive action

  There are no haptics on steppers, to keep the phone quiet mid-set. Haptics follow the Android system setting.
