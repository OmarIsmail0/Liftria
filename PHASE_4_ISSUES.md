# LIFTRIA Phase 4: tasks and review notes

Claude's task list for the build agent. **This file is Claude's.** Don't edit it on PR branches: edits cause merge conflicts, and a conflicted PR runs no CI. Put progress in your PR description.

Build plan and definition of done: `docs/phase4/PHASE_4_PROMPT.md`. **Read §0 first:** Egypt first, Arabic and English, and bring-your-own-key Hiku.

---

# Next up (2026-10-25)

**Order:**
1. ~~Phase 3~~ DONE: PRs #13–#16 merged. The phase-end APK is with the owner for S22 checks; their findings arrive as a separate fix task.
2. **PR H: `Phase 4 / Arabic and RTL`.** In progress, PR #17.
   - PHASE_4_PROMPT §3: the `t()` dictionaries (en and ar), the language setting in ST-3, RTL layout, IBM Plex Sans Arabic (already in `assets/fonts/`), and Western digits.
   - Translate every existing screen: onboarding, Today, Health, Settings, and all of Train and Progress.
   - Add `expo-localization` and ask Claude to regenerate the lockfile.
   - List the Arabic chip and safety wording in the PR description for the owner to confirm.
3. **PR P: `Phase 4 / Design polish (owner's S22 review)`.**
   - Start when PR H's `verify` is green; branch from PR H.
   - The owner tested the Phase 3 APK on the S22 (2026-10-25). **Apply these rules on every screen, not only the ones named:**
   1. **Top-right avatar circle ("L") → a Settings gear icon.**
      - Same line style and size as the tab icons, with no outline circle and a 48dp touch target.
      - `accessibilityLabel` "Settings" / "الإعدادات".
      - It goes wherever the avatar is today.
   2. **Bottom capsule nav: icons only.**
      - Remove the text label on the active tab. The active tab is shown by the filled pill behind the icon only, and all five slots are equal width.
      - Keep the tab name as the accessibility label.
   3. **Spacing pass: it should feel smooth and even.** Use one rhythm from the tokens everywhere:
      - screen gutter
      - section gap (between cards)
      - card padding
      - gap inside a card
      - gap between a title and its subtitle

      Concrete Today fixes:
      - Remove the dead space between the header and the orb.
      - Center "Set a target" under the centered orb text, or left-align that whole block, but don't mix the two.
      - Give the card stack an even gap.

      Check Settings, Profile, Train home and the import screens with the same eye. No screen should have one-off margins.
   4. **No "Not set" segments, and no cramped 4-option segmented controls.**
      - An unanswered question shows nothing selected.
      - At most 3 short options in a segmented control. Longer or described choices become a vertical list of option rows (radio style), with a one-line description each.
      - **Sex** (ST-2 and onboarding): only **Male / Female**, nothing selected by default. No "Not set" and no "Prefer not to say". Under it, one grey line: "Used only for the calorie estimate. Leave it blank and the estimate uses an average." (Owner decision.)
      - **Activity:** 3 option rows: "Mostly sitting", "On my feet some of the day" and "Very active", each with its description from the spec.
      - **Goal:** 3 option rows: Lose fat, Maintain, Build muscle.
      - Apply the same rule to every other segmented control that has "Not set" or wraps to two lines.
   5. **Theme and language must be easy to find.**
      - Settings home starts with an **Appearance** card that has the controls inline:
        - **Theme:** System / Light / Dark
        - **Language:** System / العربية / English
      - "Units" becomes its own row. Remove the old combined "Units and appearance" page or reduce it to units.
   6. **Owner-facing copy only.** Remove developer or phase wording from the UI. Examples:
      - "Food logging and meal photos arrive in Phase 4. No meal entries are invented."
      - "future availability"
      - "Actual local counts, cache clearing and DELETE confirmation"
      - "Phase 0 test entries"

      Write plain, friendly lines instead. Keep the honesty rules (pending stays pending), but say it like a product, not a build log.
   - **For screenshots:** list the routes for Today, Settings, Profile, onboarding profile/goal, and Train home in the PR description.
4. **PR I: `Phase 4 / Diary, search and targets`.**
   - Starts when PR P's `verify` is green; branch from PR P.
   - It uses `assets/data/foods/`: the USDA pack (8,171 foods) and the Egypt pack (29 dishes, Arabic and English). Both are on `main`; see `SOURCE.md` there and PHASE_4_PROMPT §2.
5. **PR J: `Phase 4 / Trends and body`.** Starts when PR I's `verify` is green.
6. **PR K: `Phase 4 / Hiku meal estimates`.**
   - Starts when PR J's `verify` is green.
   - Text is live. Photo stays behind `pending` until the owner's Test B.
7. **Phase end:** Claude builds the APK on `main`, and the owner does PHASE_4_PROMPT §7.

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
