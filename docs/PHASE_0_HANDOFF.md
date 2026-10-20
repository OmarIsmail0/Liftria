# Liftria Phase 0: ready-to-test APK handoff

**Status:** CI checks and both Android debug/release APK compilation succeeded. Full acceptance still needs the owner's S22 Ultra + Galaxy Watch 4. This is the Phase 0 diagnostics PoC, **not** the production UI.

## Select the APK

Open [GitHub Actions](https://github.com/OmarIsmail0/Liftria/actions/workflows/phase0.yml). Choose the **newest fully green run on main whose commit matches the source you intend to test**. Download its artifact named `liftria-phase0-s22-arm64-apks`, unzip, and locate `app-release.apk`. The run #9 [known-green build](https://github.com/OmarIsmail0/Liftria/actions/runs/39326177878) belongs only to commit `c1de298`; later commits need newly generated APKs. Artifacts expire after seven days. The release APK is **test signed**, not a distributable Play Store release.

**Install on your phone:** Copy the release APK to your Galaxy S22 Ultra and open it via Files, allowing only the necessary installation permission for that files app. Do not disable Play Protect broadly; report any installer error. Alternatively install from PC with `adb install -r app-release.apk`.

## Suggested fast test order

1. **Startup:** Open Liftria Diagnostics with Metro and USB disconnected. Record Android version, Samsung Health version, and any launch crash.
2. **Database:** Init → Add test data → Read (nonzero) → Clear test data → Read (workouts/sets/meals all 0). Add again and force-stop/relaunch: data must persist. Write setting → force-stop/relaunch → Read setting.
3. **API key:** Save your dedicated spend-limited Anthropic key → Check key (only masked) → force-stop/relaunch → Check key → Delete key → force-stop/relaunch → Check key (missing). Do not upload/share the key or your meal photo.
4. **Offline:** On release APK, switch on airplane mode and ensure Wi-Fi is off. Cold-start with Metro stopped and USB unplugged; verify SQLite, saved setting and Read health cache. Run Test offline API failure; expect `offline`.
5. **Claude:** Restore network; Test A using included example, then Pick photo → Test B for a benign actual meal. Confirm estimate label, tokens, errors and Cancel handling. Use Clear photo after testing.
6. **Galaxy Watch 4:** Sync Samsung Health; enable Samsung Health → Settings → Health Connect → App permissions. In Liftria, Check availability → Grant read-only → Permissions → History grant (separate) → Read 7 days → Daily energy / 7 days. Compare **same dates and sources** with Samsung Health; exercise-only energy must never be labeled daily TDEE.

## Send back results

In the app, scroll to **Report → Export report** and share the text (e.g. paste it into the chat or save it to Files). It contains the latest result of every section, the Health Connect metric table, daily energy windows and a timestamped test log that survives restarts. It never includes the API key, photos or raw health samples; review it before sending. Use **Clear test log** before a fresh test pass.

Use [DEVICE_TESTS.md](DEVICE_TESTS.md) for the full acceptance checklist; it requests device evidence, appropriate health origin/time-range comparisons, and airplane-mode tests. Report the **tested commit and workflow run ID, Android OS/build, exact failing button/action and visible message**, plus redacted screenshots or logcat if needed. No API keys, authentication secrets, or private images.

Final verdicts: **Core offline foundation, Claude AI, Workout wearable, Daily calories**. They remain **PENDING_DEVICE_TEST / PENDING_OWNER_TEST** until those checks actually run. If Health Connect is missing Samsung data, consider Samsung's SDK only after confirmed gaps; it is intentionally not bundled.

**Roadmap gate:** Phase 1 design may proceed; Phase 2 implementation requires device-confirmed Core = GO. Full Phase 0 acceptance cannot be honestly declared solely from a green CI run.
