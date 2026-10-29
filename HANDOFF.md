# Handoff: the next Claude session (cloud)

You are continuing Liftria from an earlier cloud Claude session (handoff written 2026-10-28).
Read this file, then `PHASE_5_ISSUES.md`, before you do anything else.

## The project

- **Liftria:** a local-first fitness app (train, eat, health, progress) for Android 9+ and
  iPhone. No accounts; each user's data stays on their phone. Egypt is the first market:
  English and Arabic, right to left.
- **Stack:** React Native 0.86.3, Expo SDK 57, TypeScript strict, SQLite (schema **v6**),
  SecureStore, Health Connect, Reanimated 4.5 + worklets 0.10.
- **Hiku:** the AI assistant. The user brings their own Anthropic key; Haiku is the default,
  Sonnet optional. It handles text meals and, since PR O, meal photos (Beta).
- **Repo:** `OmarIsmail0/Liftria` (public). Claude's branch is
  `claude/eager-heisenberg-0kia5c`. Small Claude-owned changes go straight to `main`.

## Roles (set by the owner)

- **Claude (you):** designs, writes the builder's tasks in `PHASE_5_ISSUES.md`, reviews every
  PR, and merges (squash) once `verify` is green and the review and screenshots are clean.
  You also own `.github/**`, lockfiles, `app.config.ts` infrastructure and the food data packs.
  The design system primitives (`src/design/**`) are now yours too (PR #27).
- **Builder:** GPT (the owner's ChatGPT) has built everything so far, one draft PR per task.
  The owner relays this line to it after each review:
  > Read PHASE_5_ISSUES.md on main and the latest comments on your open PR, and do the next open task.
- **Cursor CLI (2026-10-28):** a second builder, run by Claude. The owner decided both builders
  work in parallel: the owner relays tasks to GPT, and Claude sends tasks to Cursor directly
  (see "Cursor" below). The task file names which builder owns each task.
- **Owner:** decides scope and design, tests on their phone, creates secrets. Their phone tests
  no longer block work ("I wanna finish this app").

## Where things stand

- **Phase 5 tasks** (`PHASE_5_ISSUES.md`):
  - Done: L (gym parity, #23), M (adaptive expenditure, #24), N (backup, water, fiber, #25),
    O (Hiku photo Beta, #26).
  - **Next for the builder: PR S (iPhone).** Then **PR R** (release polish). R has a growing
    list of screenshot findings: wording, Arabic units in the Hiku totals, Hiku review rows.
- **PR #27, Claude's design polish (open, draft):**
  - Contents: an even hairline card edge, opaque light cards, a soft layered shadow, a white
    back-button disc, an opaque sheet with a scrim, and no trailing row divider. Motion: press
    scale, cards fade up, sliding segmented control / toggle / tab pill, sheets slide.
  - **Screenshots verified on `f01e129`** (2026-10-28): the tab pill and segmented thumb sit on
    the right option, including a bar that first opens on Hiku, in English and Arabic.
    **Waiting only on the owner's approval to merge.** They have seen the before-and-after.
  - After it merges, tell the builder to merge `main` into its open branch.
- **Owner items:** Android signing secrets (`LIFTRIA_*`) for the signed release, and an Apple
  Developer account for real iPhone installs.

## Cursor

- **How (owner, 2026-10-28): Cursor Cloud Agents.** Each Cursor task runs on Cursor's servers, so the
  owner can watch it live at cursor.com/agents. The agent pushes its own branch and opens its own PR;
  review that PR like GPT's.
- **API:** `https://api.cursor.com/v0`, basic auth with `-u "$CURSOR_API_KEY:"`. Never print the key.
  - Check: `GET /v0/me`, `GET /v0/agents`, `GET /v0/models`.
  - Launch: `POST /v0/agents` with JSON
    `{"prompt":{"text":"..."},"source":{"repository":"https://github.com/OmarIsmail0/Liftria","ref":"main"},"target":{"autoCreatePr":true,"branchName":"cursor/<task>"},"model":"<id>"}`.
  - Follow: `GET /v0/agents/{id}` (status) and `GET /v0/agents/{id}/conversation`.
  - Steer: `POST /v0/agents/{id}/followup` with `{"prompt":{"text":"..."}}`.
- **Environment:** the owner saved a Liftria Cloud Agent environment (install `npm ci` +
  `npx expo install --check`). It has no Android SDK; screenshots still come from GitHub Actions.
- **Allowed hosts here:** `cursor.com`, `downloads.cursor.com`, `*.cursor.sh`, `api.cursor.com`.
- **The prompt** names the task in `PHASE_5_ISSUES.md`, the rules from this file, the files it must not
  touch, and "draft PR, one commit per sub-step".
- **Local CLI (fallback):** `~/.local/bin/cursor-agent -p "<task>" --trust --force`. PR #29 (R1) was
  built this way.
- **Model:** always set `model` when launching. Without it Cursor picks its own default, which missed
  things on PR T (guessed status names instead of reading the code). PR U on
  `claude-opus-5-thinking-high` was clean. Owner (2026-10-28): prefer Opus 5.5 (`claude-opus-5-5-high`;
  the CLI lists it, the API's /v0/models list doesn't yet, so check the launch is accepted).
  A running agent can't change model: stop it and launch a new one.
  **Quota (owner, 2026-10-29):** the Pro plan's "Other Models" quota is used up; launches beyond
  the included "Cursor Models" (Cursor Grok `cursor-grok-4.5-high`, Composer) can fail mid-run with
  "On-demand usage is required" and lose unpushed work. Owner's current pick: **Grok 4.7**
  (`grok-4.7-high`). Tell agents to commit and push after every step.
- **Treat Cursor like GPT (owner, 2026-10-28: "it might be an idiot"):** its output is a claim. Run the
  checks yourself, read the whole diff, verify its assumptions against the code, and keep the same rules.

## How to review a builder PR

1. Fetch the branch and run `npm ci`, `npx tsc --noEmit -p .`, `npx eslint .` and `npx jest`.
   Report exact numbers.
2. Check that nothing protected changed: `git diff --stat origin/main...HEAD -- .github
   package.json package-lock.json PHASE_5_ISSUES.md HANDOFF.md app.config.ts`.
3. For UI work, add its demo routes to `.github/scripts/visual-check.sh` on `main`. `SCREENS`
   lists English screens and `AR_SCREENS` the Arabic ones; quote deep links. Then add the
   `build` label. The `build` label exists only for screenshots: the APK for the owner's phone
   is built once per phase, by hand on `main`.
4. CI: `phase0.yml` runs `verify` and `android-build`. After that, `visual-check.yml` posts a
   comment and pushes PNGs to the `visual-checks` branch under `pr-N/<sha7>/`, including
   `logcat-crash-<lang>.txt`. Fetch with `git show FETCH_HEAD:pr-N/<sha7>/<name>.png` after
   `git fetch origin visual-checks`, and read the images.
5. Post one numbered review comment, then give the owner the relay line.
6. Merge: mark ready, then squash with `expectedHeadSha`. Then update `PHASE_5_ISSUES.md`.

## Technical gotchas (learned the hard way)

- **Hermes:** only `Intl.NumberFormat`, `DateTimeFormat` and `Collator` exist. Use
  `pluralForm()`, never `Intl.PluralRules`. No `crypto.*`; use `newGymId()`.
- **RTL:**
  - `‹›` glyphs mirror, so chevrons are the SVG `ChevronIcon` plus `chevronPointsLeft()`.
  - Android lays out RTL only with `forceRTL`; `plugins/withArabicFirstLaunchRtl.js` forces
    it natively on the first launch of an Arabic phone.
  - Sliding indicators use a logical row plus a growing spacer, never a physical `left`.
- **Reanimated:**
  - Use `.get()` / `.set()`; the React Compiler lint rejects `.value =`.
  - Slide indicators (tab pill, segmented thumb, toggle knob) move with `translateX`, mirrored
    for RTL. Animating a spacer's `width` from the UI thread was not applied on Android.
  - A value measured in `onLayout` that an animated style multiplies by must itself be a
    shared value, and the animated view must be mounted from the first frame. A dependency
    array is not enough: when a bar first mounts on a later
    option, nothing re-runs the style after layout, and the pill sits on the first option.
  - Check sliding indicators on a screen that opens directly on a later option (for example
    `hiku/photo`), not only by switching tabs.
- **Locales:** the `locales/en.json` / `ar.json` keys sit under `"ios"`. Otherwise Android lint
  fails with ExtraTranslation.
- **Hiku API:**
  - Send `output_config: {effort:'low', format:{type:'json_schema', schema}}` and
    `max_tokens: 8000`. No `thinking` and no `temperature`.
  - Handle the `max_tokens` and `refusal` stop reasons.
  - For photos, the base64 JPEG image block comes before the text block.
- **Dependencies:** `expo-sharing` is approved and installed. Anything new needs the owner's
  approval, and you regenerate the lockfile. `api.expo.dev` is blocked, so pin versions from
  `expo/bundledNativeModules.json` and use `npm install`.
- **Git on your branch:** force-push is blocked. To replace merged history, use
  `git merge -s ours`.

## Rules that never bend

- **Results:** never fabricate them. A check passes only with real output. Builder "done" is a
  claim.
- **Secrets:** never expose, log or commit any secret (API keys, the keystore, `CURSOR_API_KEY`).
- **Git:** never rebase or force-push someone else's branch. Use merge commits. No empty
  commits, and never skip or disable tests.
- **Builders:** they must not edit workflows or the task files.
- **openGym:** it's AGPL-3.0, so take ideas only.
- **Data honesty:**
  - No data is not 0.
  - An estimate is labeled as one, and never presented as a measurement.
  - No invented nutrition numbers.
  - No red and no shaming.
- **Private data:** the owner's Hevy export is private; never commit it.
- **Commits:** end them with the attribution trailers in the current session's instructions.
  Never put a model id anywhere else.
- **GitHub comments:** end with `---` and `_Generated by [Claude Code](https://claude.ai/code)_`.

## First steps for you

1. `git pull` on `main`. Read `PHASE_5_ISSUES.md`.
2. Run `cursor-agent status`. If it isn't installed, install it as above.
3. Ask the owner whether to merge PR #27 (screenshots already verified on `f01e129`).
4. Check the builder's open PR (PR S once it exists) and review it.
