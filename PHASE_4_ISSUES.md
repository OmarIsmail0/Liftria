# LIFTRIA Phase 4: tasks and review notes

Claude's task list for the build agent. **This file is Claude's.** Don't edit it on PR branches: edits cause merge conflicts, and a conflicted PR runs no CI. Put progress in your PR description.

Build plan and definition of done: `docs/phase4/PHASE_4_PROMPT.md`. **Read §0 first:** Egypt first, Arabic and English, and bring-your-own-key Hiku.

---

# Next up (2026-10-25)

**Order:**
1. ~~Phase 3~~ DONE: PRs #13–#16 merged. The phase-end APK is with the owner for S22 checks; their findings arrive as a separate fix task.
2. **PR H: `Phase 4 / Arabic and RTL`. Start now** (new draft PR from `main`).
   - PHASE_4_PROMPT §3: the `t()` dictionaries (en and ar), the language setting in ST-3, RTL layout, IBM Plex Sans Arabic (already in `assets/fonts/`), and Western digits.
   - Translate every existing screen: onboarding, Today, Health, Settings, and all of Train and Progress.
   - Add `expo-localization` and ask Claude to regenerate the lockfile.
   - List the Arabic chip and safety wording in the PR description for the owner to confirm.
3. **PR I: `Phase 4 / Diary, search and targets`.**
   - Starts when PR H's `verify` is green; branch from PR H.
   - It uses `assets/data/foods/` (USDA + Egypt packs, from Claude). If they aren't on `main` yet, code against their `SOURCE.md` shape with a tiny fixture.
4. **PR J: `Phase 4 / Trends and body`.** Starts when PR I's `verify` is green.
5. **PR K: `Phase 4 / Hiku meal estimates`.**
   - Starts when PR J's `verify` is green.
   - Text is live. Photo stays behind `pending` until the owner's Test B.
6. **Phase end:** Claude builds the APK on `main`, and the owner does PHASE_4_PROMPT §7.

**Rules (same as Phase 3):**
- **Builds:**
  - Every push runs only `verify`.
  - Claude adds `build` for emulator screenshots.
  - The phase-end APK is built by hand on `main`.
- **Merging:** Claude merges once `verify` is green and the review is clean (plus screenshots). Keep PRs as drafts.
- **Commits:** one commit per sub-step. Batch your pushes.
- **PR description:**
  - a screen-ID checklist (built / tested / not done)
  - CI evidence
  - "Visual check" routes, including a `dev/demo-*?auto=1` route for any screen that needs data
- **New dependencies:** only `expo-localization` is approved. Nothing else without asking.
- **Never:**
  - workflow edits
  - fabricated results
  - invented nutrition numbers
  - `crypto.*` (use `newGymId()`)
  - suggested values saved as data
  - anything from openGym (AGPL)

**Carried over:**
- **Delete all** must cover every new table and any file you add.
- **Owner device checks still open:**
  - signing secrets
  - the Phase 3 S22 checklist
  - Claude Test B (photo)
