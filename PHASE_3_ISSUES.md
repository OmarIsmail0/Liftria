# LIFTRIA Phase 3: tasks and review notes

Claude's task list for the build agent. **This file is Claude's.** Don't edit it on PR branches: edits cause merge conflicts, and a conflicted PR runs no CI. Put progress in your PR description.

Build plan and definition of done: `docs/phase3/PHASE_3_PROMPT.md`.

---

# Next up (2026-10-25)

**Order:**
1. ~~Phase 2~~ DONE: PR #12 merged 2026-10-25. **Follow-up in PR D:** the ST-6 "Workouts" count must read the real `sessions` table (it counts the Phase 0 test table today).
2. ~~PR D: Library and data~~ DONE in PR #13 (merged 2026-10-25; verify + Android build green, emulator screenshots approved by Claude).
3. ~~PR E: Train and active workout~~ DONE in PR #14 (merged 2026-10-25; verify + Android build green, emulator screenshots checked by Claude). Claude fixed on the way: Hermes-safe `newGymId()` (never call `crypto.*`), the blocked legacy storage permissions, and the TR-8 dock's bottom safe-area inset.
4. ~~PR F: History, records and progress~~ DONE in PR #15 (merged 2026-10-25; verify + Android build green, emulator screenshots checked by Claude).
5. ~~PR G: Import from other apps~~ DONE in PR #16 (merged 2026-10-25; verify + Android build green, emulator screenshots checked; the owner's real Hevy export (76 workouts) verified locally by Claude, not committed). Strong and FitNotes columns are still unverified.
6. **Phase end:** APK built 2026-10-25 (run 40184295645); the owner is testing it. **Phase 4 has started: see `PHASE_4_ISSUES.md`.** Claude runs the Android build on `main` and the owner does the S22 checks in PHASE_3_PROMPT §5.

**Rules (same as Phase 2):**
- **Builds:**
  - Every push runs only `verify`.
  - Claude adds the `build` label for emulator screenshots when a PR's code review is clean.
  - The phase-end APK is built by hand on `main`.
- **Merging:** Claude merges once `verify` is green and the review is clean (plus screenshots when requested). Keep PRs as drafts.
- **Commits:** one commit per sub-step (e.g. "v3 schema", "TR-4", "TR-8 logging", "TR-8 rest timer"). Batch your pushes.
- **PR description:**
  - a checklist of every screen ID, each marked built / tested / not done
  - CI evidence
  - "Visual check" routes, so Claude can add them to the emulator check
- **New dependencies:** the owner **approved** the four in PHASE_3_PROMPT §2 (expo-keep-awake, expo-notifications, expo-document-picker, expo-file-system). Add each in the PR that needs it and ask Claude to regenerate the lockfile. Nothing else without asking.
- **Never:**
  - workflow edits
  - fabricated results
  - suggested values saved as data
  - Phase 4 features
  - anything from openGym (AGPL)

**Carried over from Phase 2:**
- **Delete all (ST-6):** deletes the whole database file, so new tables are covered. Still add the new tables to the reset test (every read returns its default after deletion). If you add any file (e.g. an import cache), Delete all must remove it too.
- **Owner device checks still open:**
  - signing secrets and the N → N+1 update test (TASK-4)
  - Schema version and the theme flash (Step 4)
  - the full Phase 2 flow on the phase-end APK
