# Liftria

Liftria is a local-first food, training, and progress app for Android and iPhone. It is in English and Arabic (right to left), and it is built for Egypt first. There is no account, no backend, no ads, and no analytics. Data stays on the phone. Optional Hiku meal estimates use the person's own Anthropic API key.

## Features

### Today

- Calorie ring against the day's target. Missing protein, carbs, or fat is shown as "—", not zero.
- Water glasses, today's workout from the active plan, and shortcuts to log food or open Hiku.
- On Android, a read-only Health Connect card for steps and heart rate. Energy from Health Connect is not shown as a number.

### Eat

- Diary of Egyptian foods (Arabic names and aliases) and USDA foods, with portions, custom foods, and targets.
- Water on Today and Eat. The default glass is 250 ml (Settings). Not logged is not zero.
- Fiber, sugar, and sodium. A nutrient the source does not report stays unknown ("—") and is not counted as zero. Egyptian recipe values are labeled as estimates.

### Train

- Library of 876 exercises from free-exercise-db, with Arabic display names. The stored and imported name stays English.
- Templates, weekly plans, supersets, a rest timer, a plate calculator, and personal records (estimated 1RM is labeled as an estimate).
- Hevy and Strong CSV import.

### Progress

- Weight trend. Weigh-ins saved in Liftria stay separate from cached Health Connect readings.
- Adaptive expenditure ("Estimated burn"), from logged intake and the weight trend. It appears only after enough history, and missing days are gaps, not zero. Watch calories are not included.
- Strength over time from workouts logged in Liftria.

### Health

- Android: Health Connect, read only. Liftria does not write or delete records in Health Connect. Empty or unconfirmed data is not shown as zero.
- iPhone: the health screens say Apple Health support is coming and show no health data. Read-only Apple Health is in progress (PR AA in [PHASE_5_ISSUES.md](PHASE_5_ISSUES.md)).

### Hiku

- Text meal estimates, and photo estimates labeled Beta (camera or gallery). Each item is reviewed and can be edited before it is saved.
- The default model is Haiku. Sonnet is optional. Both use the key saved on the phone.

### Settings

- Theme (system, light, dark), language (system, Arabic, English), and units.
- Backup and restore: one versioned JSON file, with a typed confirmation before local data is replaced.
- CSV export of workouts and the food diary.
- Delete all: the local database and the saved Anthropic API key.

## Status

This is a development build. There is no App Store or Play Store listing.

- CI runs typecheck, lint, and tests, and it can build the Android app and an unsigned iPhone simulator app.
- A signed Android release is produced on `main` only when the `LIFTRIA_*` signing secrets are set. Without them the workflow uploads a release APK marked not for sharing.
- Installing on a real iPhone needs an Apple Developer account. The simulator build does not.
- Apple Health screens are not in the app yet.

Android supports API 28 and up (Android 9). The iPhone target is a phone (`supportsTablet` is false in `app.config.ts`).

## Tech stack

Versions are from `package.json`.

- React Native 0.86.3 and React 19.2.3
- Expo SDK ~57.0.31, Expo Router ~57.0.29, and a development client (Expo Go is not supported)
- TypeScript ~6.0.3 with `strict` in `tsconfig.json`
- SQLite via `expo-sqlite` ~57.0.3 (schema v6, SQLCipher off)
- Reanimated 4.5.1 and `react-native-worklets` 0.10.1
- Hermes, the JavaScript engine shipped with this React Native version (it is not a direct dependency, so it has no version line in `package.json`)
- Zod ^4.1.0

Package id on both platforms: `com.liftria.app`. Android compile and target SDK are 36.

## Develop

Prerequisites: Node.js 22 or newer, Android Studio with the Android SDK and Java 17 for Android, and Xcode on a Mac for iPhone.

```bash
npm ci
npm run check          # typecheck, lint, and Jest (--runInBand)
npm run prebuild       # expo prebuild --clean --platform android
npm run android        # expo run:android
npm start              # expo start --dev-client
```

There is no `ios` script. The iPhone CI job generates the native project with:

```bash
npx expo prebuild --clean --platform ios
```

Generated `android/` and `ios/` directories are gitignored.

## CI

| Workflow | What it does |
| --- | --- |
| `.github/workflows/phase0.yml` | On code pushes and pull requests: `verify` (`npm ci`, `npx expo install --check`, `npm run check`). The Android ARM64 debug and release build runs by hand, or on a pull request labeled `build`. Markdown-only changes are ignored. |
| `.github/workflows/visual-check.yml` | After a successful pull-request Android build, screenshots the release APK on an Android 11 emulator (English dark, English light, Arabic) and pushes the PNGs to the `visual-checks` branch under `pr-<number>/<sha>/`. |
| `.github/workflows/ios-build.yml` | By hand, or on a pull request labeled `ios`: unsigned iPhone simulator build, then screenshots. |
| `.github/workflows/ios-visual-check.yml` | Publishes those iPhone screenshots on `visual-checks` (`pr-<number>/<sha>/`, or `<branch>/<sha>/` for a hand-started run) and comments on the pull request. |
| `.github/workflows/food-pack.yml` | Manual job. Builds the USDA food pack and pushes it to the `data/food-pack` branch. |
| `.github/workflows/claude-review.yml` | Posts a design review on a pull request when the repository Anthropic API key secret is set. |
| `.github/workflows/claude-mention.yml` | Replies to `@claude` on a pull request or issue when that secret is set. It does not push code. |

## Project layout

```
app/                     Expo Router screens
  (tabs)/today.tsx
  (tabs)/eat/            diary, search, portion, targets, custom food
  (tabs)/train/          library, plans, templates, active workout, plates, records
  (tabs)/progress/       body, nutrition, strength, health
  (tabs)/hiku/           text, photo, review, usage
  settings/              appearance, units, data, Hiku key, privacy, about
  onboarding/  import/  dev/
src/design/              theme, tokens, and UI primitives
src/features/            eat, train, progress, health, hiku, settings, import, onboarding, diagnostics
src/services/            database, health, anthropic, secure-storage
src/i18n/                English (en.ts) and Arabic (ar.ts)
src/navigation/  src/guards/  src/config/
assets/                  fonts, Egyptian and USDA foods, exercise pack
docs/                    phase notes and the design record
```

`dev/` routes stay out of a signed release (`EXPO_PUBLIC_LIFTRIA_DEV_ROUTES`).

`docs/` contains:

- `TECHNICAL_DECISIONS.md`, `HEALTH_INTEGRATION.md`, `DEVICE_TESTS.md`, `COMPETITIVE_REVIEW.md`, `OPEN_SOURCE_REVIEW.md`
- Phase 0 report, handoff, and fixes, plus `PHASE_1_READINESS.md`
- `phase1/` — information architecture, design system, screen specs, flows, milestone reviews, and the HTML prototype
- `phase3/` and `phase4/` — phase prompts
- `phase5/` — the exercise list for Arabic instructions

## Rules for contributors

Read [HANDOFF.md](HANDOFF.md) and [PHASE_5_ISSUES.md](PHASE_5_ISSUES.md) first. The task file is the list of done and open work. On a builder pull request, leave that file, `HANDOFF.md`, and `.github/` unchanged.

- **Data honesty.** No data is not zero. An estimate is labeled as an estimate. Do not invent nutrition numbers.
- **Copy.** Every user-facing string has an English and an Arabic entry.
- **Digits.** Numbers on screen use Western digits (`0–9`), including in Arabic.
- **Hermes.** The only `Intl` APIs in app code are `NumberFormat`, `DateTimeFormat`, and `Collator`. Counts use `pluralForm()`, because Hermes has no `Intl.PluralRules`. There is no `crypto`; new ids use `newGymId()`.
- **Secrets.** Do not commit API keys, keystores, or a person's real workout export.

## Privacy

The in-app page is Settings → About → Privacy.

A Hiku request leaves the phone only when the person sends it, to Anthropic (`api.anthropic.com`), with their own key from SecureStore. A text request sends the meal text. A photo request sends the preview JPEG (1024 px long edge, EXIF removed) and an optional note. "Include Today's totals" and "Include training day" add those summaries only when they are switched on. Photos are kept on the phone only when Settings → Hiku → Keep photos is on.

The SQLite database, profile, diary, workouts, and API key stay on the phone. There is no Liftria account or Liftria server. Health Connect is read only. Backup and CSV files are created on the phone and are shared only if the person shares them. Delete all removes the local database and the saved key from the device.

## Licenses

- Exercise names and instructions: free-exercise-db, The Unlicense. See `assets/data/exercises/LICENSE.md`.
- Body map artwork: react-native-body-highlighter, MIT.
- The same credits, plus the fonts (SIL Open Font License) and USDA FoodData Central (U.S. government public domain), are listed in the app under Settings → About → Licenses and attribution.

License for Liftria itself: to be decided by the owner.
