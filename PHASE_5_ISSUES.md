# LIFTRIA Phase 5: tasks and review notes

Claude's task list for the build agent. **This file is Claude's.** Don't edit it on PR branches. Put progress in your PR description.

**Goal (owner, 2026-10-26):** finish the app. The owner's phone tests no longer block work. Claude reviews every PR on the emulator; the owner tests the finished build.

Background for the choices below: `docs/COMPETITIVE_REVIEW.md` → "Next (Phase 5 candidates)".

**Start Phase 5 only after PR K (#22) is merged.** Each PR starts from `main` once the previous PR's `verify` is green; stack on the previous branch only if it hasn't merged yet (merge `main` in later with a merge commit, never rebase).

---

## Order

1. **PR L: `Phase 5 / Gym parity`** (Hevy features people expect)
   - **Plate calculator:** from the target weight and the bar (20 kg / 45 lb default, editable in Settings), show the plates per side. Use the "small plates" setting that already exists. Unit-test the greedy split and the "can't make this exact weight" case (show the closest lower load).
   - **Warm-up calculator:** a "Warm-up sets" action on a working exercise adds suggested warm-up rows (e.g. bar × 10, 40% × 5, 60% × 3, 80% × 1, rounded to loadable plates). They are suggestions until the user logs them, the same as other suggested values (never saved as data until logged).
   - **Supersets:** link 2–3 exercises in a template or an active workout. Logging a set moves focus to the next exercise in the superset (smart scrolling), and the rest timer starts after the last exercise of the round.
   - **RPE / RIR per set:** optional, off by default (Settings → Training). One small field per set; null when not entered, never 0.
   - **Exercise notes:** a note per exercise in a workout (exists in the schema? if not, an additive migration). Show the last note on the next session of the same exercise, and in History.
   - **Rest timer notification:** when rest starts and the app goes to the background, schedule a local notification for the end of rest (`expo-notifications`, already installed; `POST_NOTIFICATIONS` is allowed). Cancel it when the user returns or skips. **No foreground service, no exact-alarm permission** (the release permission gate blocks them).
   - Screenshots: add `dev/demo-*` routes for a superset workout and the plate calculator.
2. **PR M: `Phase 5 / Adaptive expenditure`** (MacroFactor's main feature; the competitive review's #1)
   - **Estimate:** daily expenditure ≈ average logged intake − (change in **trend** weight × 7,700 kcal/kg) ÷ days, over the last 14–28 days. Use only logged days for intake.
   - **When to show it:** at least 14 days of history, at least 10 logged days and at least 4 weigh-ins in that window. Before that, show "Needs N more logged days / weigh-ins", never a number.
   - **Label:** always "Estimated burn" with the estimate chip. Never mix in watch or Health Connect calorie data (the "Daily calories NOT READY" gate stays).
   - **Weekly check-in:** once a week, *propose* a new calorie target from the estimate and the goal (lose / maintain / build, with the same safety floor and sheet as EA-6). The user accepts, edits or dismisses. Never change the target silently. Record the proposal and the answer.
   - Unit-test the estimate with fixed data, including gaps, a weight plateau and too-little-data cases.
3. **PR N: `Phase 5 / Backup, water and fiber`**
   - **Backup and restore (important for a local-first app):** Settings → Data → "Export a backup" writes one JSON file with every table (versioned, with the schema version). "Restore from backup" reads it, shows what it contains, and replaces local data only after a typed confirmation. Use `expo-document-picker` and `expo-file-system` (both already installed) plus the system share sheet; no new permissions. Test a round trip.
   - **CSV export** of workouts and the food diary for spreadsheets.
   - **Water:** a simple glass counter on Today and Eat (glass size in Settings, 250 ml default). Not logged ≠ 0.
   - **Fiber** in the diary and trends (the packs already have it; null when unknown). Claude adds sodium and sugar to the food pack first; GPT shows them when Claude says the pack is updated.
4. **PR O: `Phase 5 / Hiku photo`** — scope depends on the owner's answer about the Test B gate (Claude will update this item).
5. **PR R: `Phase 5 / Release readiness`**
   - Final app icon and splash in light and dark, the Play Store short and full descriptions (English and Arabic), and screenshot routes for the store images.
   - A privacy page in Settings → About that matches what the app actually does (local data, BYO key, what Hiku sends).
   - Remove or hide every `dev/*` route in release builds, except what the emulator check needs (Claude will gate those behind a build flag).
   - Owner: signing secrets in GitHub (`LIFTRIA_*`), then Claude builds the signed release.

**Not in Phase 5:** barcode scanning (Claude first measures how many Egyptian products Open Food Facts has), Wear OS (wearable gate), social features, ads.

**Rules (same as Phase 4):**
- Every push runs `verify`. Claude adds `build` for emulator screenshots and merges when `verify` is green and the screenshots are clean.
- One commit per sub-step. Batch your pushes. Run nothing you can't check; Claude runs the checks.
- **New dependencies:** none approved. `expo-document-picker`, `expo-file-system` and `expo-notifications` are already installed. Ask in the PR before adding anything else; Claude regenerates the lockfile.
- **Never:** workflow edits, fabricated results, invented nutrition numbers, `crypto.*` (use `newGymId()`), suggested values saved as data, anything from openGym (AGPL), `Intl` APIs other than `NumberFormat` / `DateTimeFormat` / `Collator`.
- Every new string in English and Arabic. Every new table is covered by Delete all and by the backup.
