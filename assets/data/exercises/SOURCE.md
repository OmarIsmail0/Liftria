# Exercise data source

- **Project:** free-exercise-db by yuhonas, https://github.com/yuhonas/free-exercise-db
- **File:** `dist/exercises.json` at commit `f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5` (fetched 2026-10-24)
- **License:** The Unlicense (public domain), copied in `LICENSE.md` next to this file.
- **Changes:** the `images` field was removed (Liftria uses no images from the pack; every illustration is Liftria's own body map). Entries are sorted by `id`. Nothing else was changed.
- **Contents:** 876 exercises. Fields: `id` (stable, never changes), `name`, `category`, `equipment`, `force`, `level`, `mechanic`, `primaryMuscles`, `secondaryMuscles`, `instructions`.
- **Muscles (17):** abdominals, abductors, adductors, biceps, calves, chest, forearms, glutes, hamstrings, lats, lower back, middle back, neck, quadriceps, shoulders, traps, triceps. These map 1:1 to the 17 regions of Liftria's body map (DESIGN_SYSTEM §5).
- **Updating:** replace the file from a newer commit, keep the same field stripping, update the commit hash here, and keep every old `id` in the database as "retired" if the pack drops it (workout data contract §1).
