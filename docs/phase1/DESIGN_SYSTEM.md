# Liftria Design System

**Milestone:** 1A (foundation; components are extended in 1B to 1D) · **Status:** for owner review

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
| `color.border.strong` | `#636D7B` | `#808996` | Input, choice and secondary-button outlines (≥ 3:1) |
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
| `color.status.warning` | `#F2B44C` | `#946300` |
| `color.status.danger` | `#FF6B6B` | `#C93636` |

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
1. **Glass frames, never fills, the data.** Numbers, chips, inputs, macro bars and buttons stay solid and high-contrast. Only cards, choice rows, banners, the bottom navigation and sheets are glass.
2. **The ambient glow is fixed** (it doesn't scroll or animate). That lets Phase 2 build cards as plain translucent views over one pre-rendered background, with **no live blur under cards**: cheap, smooth and battery-friendly on Android. Live blur (e.g. `expo-blur`) is used only for the bottom navigation and bottom sheets, where content moves underneath. It falls back to a more opaque fill if blur is unavailable or "Reduce transparency" is on.
3. **Contrast is checked against the worst case**: a card's sheen sitting on the brightest glow. To pass, dark text tokens were brightened (secondary `#BFC6D1`, tertiary `#A3ACBA`), dark domain colors were brightened, and light-mode domain and tertiary colors were darkened. Every text token now passes 4.5:1 there (see ACCESSIBILITY.md).
4. **The glow carries no meaning.** It is decoration, so it never signals state.
5. **Only one gradient button**: the training Start. The primary action stays solid chalk, so the eye goes to it first.

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
| **Calorie ring** | with target / without target | 132px, 12px stroke. With no target, it shows only the eaten value and a "Set target" action. Never a ring against an invented target. |
| **Macro bar** | protein, carbs, fat | Label + bar + "96/155 g". Over-target continues in the same color with a "+12 g" label, never red. |
| **Metric row** | with chip | Icon tile, value, unit, provenance chip row. |
| **Week strip** | 7 days | A dot means logged; a train-tinted cell means workout day. Also has a text alternative. |
| **Bottom navigation** | 5 items | 56px targets, active pill, glass background. |
| **Choice list** | single-select | Full-width rows, at least 56px, pressed state shown by an outline (not color alone). |
| **Unit input** | number + unit suffix | Numeric keyboard; units switch in Settings. |
| **Step indicator** | n of 8 | Segmented bar with an accessible label "Step n of 8". |
| **Checklist row** | done / to do / skipped | Getting-started list on the first day. |

Components for workout logging, the rest timer, food search, Hiku messages, charts, sheets, dialogs and snackbars are added in 1B–1D.

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
- No looping animations. Haptics for set logged, timer done and destructive confirmations (specified in 1B).
