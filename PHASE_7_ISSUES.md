# LIFTRIA Phase 7: production readiness

Claude's record of the production-readiness pass. **This file is Claude's.** Don't edit it on PR branches.

**Goal (owner, 2026-11-16):** make Liftria production ready for a first public release (Android first). Builders: Claude Code agents (Sonnet 5.5 and Opus 5.5), reviewed and merged by Claude. All of it landed in PR #127.

## Done (PR #127)

1. **Release and platform configuration** (Sonnet)
   - "Open with Liftria" for CSV files from the Files app works in a release build (the dev-client scheme no longer leaks into that intent filter).
   - Demo previews reachable by deep link are gated behind the dev flag.
   - `src/config/__tests__/releaseConfig.test.ts` pins the app id, SDK range, the exact permission list, `allowBackup=false` and the dev-route guard.
   - The signed build on `main` also produces the Play Store bundle (`liftria-play-store-bundle`, an `.aab`). **Not run yet: it needs the owner's keystore.**
   - `docs/store/RELEASE_CHECKLIST.md` has the owner's steps to ship.
2. **Reliability and data safety** (Opus)
   - A failed or hung database open shows a localized recovery screen with Try again; it never sends an existing user to onboarding. A database written by a newer app version is reported and left untouched.
   - Root and tab error boundaries.
   - Arabic-Indic digits work in every numeric field; `1e3` and `0x10` are rejected.
   - Tests for migration from every older schema, a failed migration, truncated or wrong-version backups and a restore that fails part way.
3. **Performance** (Sonnet), reasoned from code, not measured on a phone
   - The workout screen no longer re-renders every second or on every keystroke in another exercise.
   - Additive index migration (schema v11); lighter queries on Train home, Progress and photos; debounced search; history is a virtualised list.
4. **Accessibility and screen sizes** (Sonnet)
   - WCAG AA contrast for every token pair, with `src/design/__tests__/contrast.test.ts` (light accent is now `#B83B09`).
   - Header roles, a 640 dp content column on wide screens, scaling caps only on the set table and tab labels.
5. **Copy and unfinished features** (Sonnet)
   - Developer wording removed; unfinished blocks (meal reminders, wearable measurements, "not in this version") removed from production screens; "routine" and "workout" used consistently; 189 dead i18n keys removed.
6. **Security and privacy** (Sonnet)
   - Delete all also cancels notifications; the key check times out; imports are size-checked before reading; a guard test locks the list of network calls.
   - Privacy texts corrected (in the app and on the site); `docs/store/DATA_SAFETY.md` has the store form answers.
7. **Review** (Opus, read-only, on the merged diff): no P0 or P1. Its P2 and P3 findings were fixed in the same PR.

## Open

### Owner only
- Create the upload keystore and add the `LIFTRIA_*` GitHub secrets (`docs/store/RELEASE_CHECKLIST.md`, "Owner steps to ship"). Then run the workflow on `main` for the signed APK and the `.aab`.
- Google Play Console account, listing, Data safety form (`docs/store/DATA_SAFETY.md`), internal then closed testing.
- Apple Developer account for iPhone.
- Decisions: a monitored contact email for the privacy policy (it points to GitHub issues today); Play "data shared" answer for Hiku; whether to build meal reminders.

### Needs a real phone
- The whole redesign and this pass (nothing here was run on a device).
- TalkBack, large text (1.3x and 2x), keyboard on the long forms.
- Rest alert delivery while the phone is locked.
- Speed: the list in the performance agent's report (active workout typing, library fling, cold start, first Train open, Eat search, 250-workout history, 30+ progress photos).
- CSV "Open with" from the Files app; the recovery screen and error boundaries.

### Later (not blocking a first release)
- R8 minify and resource shrinking are off (bigger APK); turn on with a device test.
- Restore does not run `PRAGMA foreign_key_check` on the imported rows.
- Records list is not virtualised; progress photos are stored as base64 in the database.
- First launch inserts 876 exercises row by row.
