# LIFTRIA — PHASE 3: GYM (build prompt)

**For:** the build agent (GPT) · **Written by:** Claude (design lead and reviewer) · **Reviewed by:** Claude, per pull request
**Start:** after Phase 2's last PR (#12) is merged. Your task list and the live order are in `PHASE_3_ISSUES.md` at the repo root.

Phase 3 turns the Train tab into a real gym log: an offline exercise library, templates and plans, a one-handed active workout with a reliable rest timer, history with editing, records, strength progress, the muscle recovery map, and importing history from Hevy, Strong, FitNotes or any CSV. Phase 4 (nutrition) comes after.

## 1. Read first

1. `docs/phase1/PHASE_1_HANDOFF.md` §3 **"Phase 3: gym"** table: scope and acceptance criteria, including the import (8 criteria) and the muscle map (7 criteria). §4 cross-cutting rules.
2. `docs/phase1/SCREEN_SPECIFICATIONS.md`:
   - **"Train (TR-1 … TR-13)"**: the shared rules (units, exercise types, set kinds, volume, Epley, records), every screen and **"Active workout behavior (TR-8)"**
   - **"Workout data contract"**: stable IDs, sources, no double counting, energy
   - **"Import and muscle map (IM-1 … IM-4, TR-14)"**
   - **PR-2 Strength** in the Progress section
3. `docs/phase1/DESIGN_SYSTEM.md`:
   - §5 **1B components (Train)**: set row, steppers, rest orb, body map, sheets, mini bar
   - the recovery shading
4. `docs/phase1/USER_FLOWS.md`: the Train flows and **flow 11 (import)**.
5. `docs/phase1/INTERACTION_AND_STATES.md` and `ACCESSIBILITY.md`: the gym rules, **64dp in-workout controls**, rest-orb contrast and TalkBack.
6. `docs/phase1/MILESTONE_1B_REVIEW.md` concern 1: **the TR-9 rest-alert device spike and its test matrix.**
7. The prototype `docs/phase1/prototype/liftria.html` for the look (reference only; don't port HTML/CSS).
   - The **body map SVG geometry** in its `bodyMap()` function is Liftria's own art. You may reuse those shapes in `react-native-svg`.
8. `PHASE_2_ISSUES.md`, "Lessons from PR #6":
   - SVG alpha goes through `stopProps`.
   - CSS angles go through `cssLinearGradient`.
   - SVGs are sized from the measured `onLayout`.

## 2. Fixed stack and dependencies

- Same stack as Phase 2 (Expo SDK 57, RN 0.86.3, TypeScript strict, expo-sqlite, zod, the design system).
- **New dependencies allowed in Phase 3.** Add each with `npx expo install` in its PR, and **ask Claude in the PR to regenerate `package-lock.json`** (you can't run npm). Nothing else without asking.
  - `expo-keep-awake`: screen stays on during TR-8.
  - `expo-notifications`: TR-9 rest notification and the in-context permission ask.
  - `expo-document-picker`: IM-1 file choice through the Android picker. No storage permission.
  - `expo-file-system`: reads the picked file's text. No storage permission.
  - `expo-haptics`: already allowed in Phase 2; the light tick on Log set.
- **Permissions:**
  - Only `POST_NOTIFICATIONS` is added (Android 13+), and only in the TR-9 PR.
  - The merged-manifest check in CI must be updated in that same PR to allow exactly that permission. Ask Claude; Claude edits workflows.
  - No storage, alarm or exact-alarm permission without the spike's evidence and Claude's OK.
- **Exercise data is already in the repo:** `assets/data/exercises/free-exercise-db.json`.
  - 876 exercises with stable `id`s and the 17 muscles. Images stripped. Unlicense.
  - See `SOURCE.md` next to it. Don't download anything at build or run time.
- **No network in Train or Import.** Nothing in Phase 3 calls the network.

## 3. Data (schema v3)

One migration, `v3`, in the ordered `DB_MIGRATIONS` list (same pattern as v2: one exclusive transaction, `IF NOT EXISTS`, `user_version` inside the transaction).

- **Tables:**
  - `exercises`: the built-in pack, loaded once by `id` plus custom exercises (UUID).
    - Columns: `name`, `aliases`, `equipment`, `type` (weighted, dumbbell, assisted, bodyweight), `unilateral`, `primary_muscles`, `secondary_muscles`, `source` (`pack` / `custom` / `import`), `retired`.
  - `templates`, `template_exercises`, `plans`
  - `sessions`
    - Columns: `source` (`manual` / `imported-file`), `importer`, `import_batch_id`, `started_at`, `ended_at`, `edited_at`, `notes`, and the in-progress state.
  - `session_exercises`, `sets`
    - Sets have `kind` (working or warm-up), `side` (L, R or none), `weight`, `reps`, `logged_at`, and the rest `deadline` column.
  - `import_batches`
    - Columns: file hash, importer, counts, created exercises.
- **Records** are derived. Recalculate them from sets after every log, edit, delete and import, with one function and one test suite. Cache them if needed, but the cache is always rebuildable.
- **Types, Epley, volume and warm-up rules** follow the TR shared-rules table exactly. Unit-test every row of that table.
- **Stable IDs:**
  - Built-in exercises keep the pack's `id` forever.
  - When a pack update drops an `id`, that exercise is marked `retired` and is never deleted.

## 4. Build (in this order: four PRs)

The PR order, the review loop and the merge rules are in `PHASE_3_ISSUES.md`. Summary:

1. **PR D: Library and data.**
   - Schema v3 and repositories with tests.
   - Pack loader, plus a **17-category ↔ 17-region unit test** on the bundled pack.
   - `BodyMap` component (full and mini, primary solid, secondary 30% with a dashed outline, legend, text alternative).
   - TR-4 library (local prefix and fuzzy search, aliases like "OHP", "Create '<query>'", the data credit), TR-5 muscle browser, TR-6 exercise detail.
   - Custom exercises.
2. **PR E: Train and the active workout.**
   - TR-1 home (hero priority: in progress > plan's next > first time), TR-2 plans (weekly and rotation), TR-3 template editor, TR-7 preview.
   - **TR-8 active workout**, every rule in "Active workout behavior":
     - Log set saves to SQLite immediately.
     - Suggested ≠ logged.
     - Only the current row has a tick.
     - Undo now / Undo later / edit a logged set.
     - 64dp steppers with long-press repeat and keypad.
     - The exercise rail.
     - The **deadline-based rest timer** and rest orb.
     - Minimize to the mini bar on every tab.
     - Finish drops untouched sets.
     - Discard only from TR-1 and the summary.
     - Keep-awake.
   - **The workout survives an app kill:** reopening restores it, including a rest deadline that hasn't passed yet.
   - TR-10 finish summary. The HR and calories rows stay `pending` (the wearable gate isn't passed).
   - **Today:** the Training card shows today's planned or finished workout (read-only).
   - **TR-9 spike:** an ongoing rest notification with +30 s / Skip and the in-context permission ask.
     - The UI keeps the `pending` line "Lock-screen alert at 0:00 is being tested on your phone".
     - Add a hidden dev screen that runs the spike matrix (1, 3 and 5 min rests; locked or unlocked) and logs the actual alert delay, so the owner can run it on the S22.
     - Never promise an exact alert.
3. **PR F: History, records and progress.**
   - TR-11 history (8 s Undo on delete), TR-12 session detail with edit mode (records recalculated, the delete sheet names changed records), TR-13 records.
   - PR-2 Strength: weekly volume, top lifts with the Estimate chip, empty state.
   - **TR-14 muscle recovery map** and the TR-1 Muscles card.
     - The formula is unit-tested on the worked example in SCREEN_SPECIFICATIONS §2, including the boundaries at exactly 24, 48 and 72 h and scores of exactly 1 and 4.
     - Constants live in one tunable place.
     - The copy never says "fatigued", "damaged" or "not recovered".
     - No red. "Ready" is shown in neutral.
4. **PR G: Import from other apps.** IM-1…IM-4, flow 11, ST-6 rows and the TR-1 and TR-11 links. All 8 acceptance criteria in the handoff, in particular:
   - Units are never guessed.
   - Exact match → remembered match → *Suggested* (never auto-applied) → custom. No set is ever dropped.
   - Re-importing the same file adds nothing (file hash, and days that already have a workout are skipped).
   - The preview saves nothing, and the import is one transaction.
   - **Undo import removes exactly that batch**, with the byte-for-byte table test.
   - Parsers are tested on fixture files that match each app's real export columns. The owner supplies real exports when available; until then mark the column sets "unverified" in the PR.

## 5. Definition of done (Phase 3)

**Automated, on every PR:**
- `npm ci`, `npx expo install --check`, typecheck, lint, and Jest.
- Jest must include:
  - migration v2→v3, and fresh v3
  - the type, volume, Epley and warm-up table
  - records recalculation after edit, delete and import
  - the 17-region test
  - the rest-deadline math, including resume after a kill
  - the recovery formula fixtures
  - the import parsers, idempotent re-import, and undo import byte for byte
  - the manifest permission check

**Emulator screenshots (Claude, `build` label):**
- TR-1, TR-4, TR-6, TR-8 (with the rest sheet), TR-10, TR-11, TR-12 edit, TR-13, TR-14, PR-2 and IM-2.
- Dark and light, plus 200% text on TR-8 and TR-14.

**Owner, on the S22, with the phase-end APK:**
1. A real one-handed gym session: log about 20 sets, use Undo and edit, minimize mid-rest, lock the phone, kill the app mid-workout and reopen it (the workout and the rest timer resume).
2. The TR-9 spike matrix from the dev screen. Report the delays. TR-9 stays `pending` until it's proven.
3. Import a real Hevy or Strong export, re-import it (adds nothing), then Undo import.
4. TalkBack through Log set and the rest sheet. 200% text on TR-8.

## 6. Rules (same as Phase 2, plus Phase 3 specifics)

- **Process:**
  - Draft PRs only.
  - Batch your fixes into few pushes.
  - Never edit `PHASE_3_ISSUES.md` or workflows. Ask in the PR.
  - Claude labels `build` for screenshots and merges.
- **Never fabricate results.** Mock-backed tests aren't device proof; say so.
- **Suggestions are never data:**
  - A prefill becomes a set only when Log set is tapped.
  - A fuzzy import match is only applied after the user confirms it.
  - The est. 1RM always carries the `estimate` chip.
- **No watch data in Train.** HR and calories stay `pending`. Linking Health Connect sessions (≥ 50% overlap) waits for the wearable gate.
- **No calories from sets**, ever.
- **openGym is AGPL:** ideas only. Never read, copy or paraphrase its code, text, data or images.
- **Accessibility:**
  - 64dp in-workout controls and 48dp elsewhere.
  - TalkBack labels for set rows ("Set 3, 72.5 kilograms, 8 reps, logged"), the rest orb and the body map (text alternative).
  - 200% text reflows.
  - Reduced motion: no ring animation and no breathe.
