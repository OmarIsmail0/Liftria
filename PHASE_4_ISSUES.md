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
   7. **New body map art** (owner approved, 2026-10-25). Replace the drawing inside `BodyMap` with **`react-native-body-highlighter@3.2.0`** (MIT, built on the `react-native-svg` we already use).
      - **New dependency:** approved. Ask Claude to regenerate the lockfile. Keep the license credit in Settings → About → Licenses.
      - **Keep `BodyMap`'s own API and the 17 muscles.** Map them to the library's regions:

        | Liftria muscle | Library region |
        |---|---|
        | abdominals | `abs` + `obliques` |
        | adductors | `adductors` |
        | abductors | `gluteal` (hip abductors sit on the side of the glutes) |
        | biceps | `biceps` |
        | calves | `calves` |
        | chest | `chest` |
        | forearms | `forearm` |
        | glutes | `gluteal` |
        | hamstrings | `hamstring` |
        | lats | `upper-back` |
        | middle back | `upper-back` |
        | lower back | `lower-back` |
        | neck | `neck` |
        | quadriceps | `quadriceps` |
        | shoulders | `deltoids` |
        | traps | `trapezius` |
        | triceps | `triceps` |

        Where two muscles share a region, the stronger state wins (primary over secondary, the higher recovery band). The text rows and the accessibility text still name all 17, so no meaning is lost. Unit-test the mapping: every one of the 17 maps to at least one region.
      - Use our colors, not the library's: the base is the neutral body fill token; primary is the train domain color; secondary and "some load" are the 55% tint. The dashed outline for "untrained" becomes a lighter tint plus the row text.
      - The library has no `hair`. Hide the head, hands and feet details if they look busy at small sizes.
      - Use it in TR-5, TR-6, TR-14, TR-7 preview, recovery and everywhere `BodyMap` appears.
   8. **Mini muscle map thumbnails** (owner choice, instead of photos). Every exercise row (library, pick, template, history, import mapping) gets a small round thumbnail on the start side: the front or back body, whichever shows more of the exercise's primary muscles, with those muscles highlighted.
      - No images are bundled. It renders from the same component at about 48dp.
      - Make it cheap for long lists: memoize by exercise id.
   9. **TR-8 muscles this workout.**
      - A small two-view body icon in the workout header opens a sheet: a front/back body map of the muscles worked so far, and a list of the 17 muscles with completed working sets (primary = 1, secondary = 0.5, warm-ups 0, the same rules as TR-14).
      - "Not logged yet" rows show "—", not 0.
   10. **Arabic fixes from the PR #17 emulator check:**
       - Mirror the back chevron in RTL.
       - Translate equipment words ("body only", "barbell", "machine", "other", "foam roll").
       - Translate the Strength range control (`1 Y / 3 M / 4 W`).
       - Wrap number+unit and date ranges in bidi isolates (`\u2068…\u2069`), so "0 kcal" and "start – end" read in order in Arabic.
       - **Hermes rule:** only `Intl.NumberFormat`, `Intl.DateTimeFormat` and `Intl.Collator` exist on Android. For plurals use `pluralForm()`.
   - **For screenshots:** list the routes for Today, Settings, Profile, onboarding profile/goal, and Train home in the PR description.
4. **PR I: `Phase 4 / Diary, search and targets`.**
   - Starts when PR P's `verify` is green; branch from PR P.
   - **Also in PR I, from the competitive review (`docs/COMPETITIVE_REVIEW.md`):**
     - **Fast repeat logging:** copy a meal or a whole day, **saved meals** (a combo logged in one tap), favorites, and recents ranked by time of day. Target: a repeat meal in 2 taps, a searched food in ≤ 4 taps.
     - **Ramadan mode:** meals can be renamed, with a one-tap preset **Suhoor / Iftar / Snacks**. It's a setting, off by default, with no medical advice.
   - It uses `assets/data/foods/`: the USDA pack (8,171 foods) and the Egypt pack (29 dishes, Arabic and English). Both are on `main`; see `SOURCE.md` there and PHASE_4_PROMPT §2.
5. **PR J: `Phase 4 / Trends and body`.** Starts when PR I's `verify` is green.
   - Add a **trend weight** (exponential moving average) line over the daily dots. The headline shows the trend, labeled "Trend". Unit-test the smoothing.
6. **PR K: `Phase 4 / Hiku meal estimates`.**
   - Starts when PR J's `verify` is green.
   - Text is live. Photo stays behind `pending` until the owner's Test B.
   - **Egyptian dialect:** Hiku accepts Egyptian Arabic descriptions. When an item matches an Egypt-pack dish, use the pack's id, portion and values (labeled as the pack estimate), not the model's numbers.
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
- **New dependencies:** `expo-localization` (PR H) and `react-native-body-highlighter@3.2.0` (PR P) are approved. Nothing else without asking.
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
