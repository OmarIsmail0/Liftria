# Liftria Phase 1 prototype

A clickable, self-contained HTML design prototype. It's a design artifact, not app code: nothing here is used by the React Native app.

| File | What it is |
|---|---|
| `src/liftria.html` | **The current prototype.** It grows each milestone: 1A (onboarding, Today, energy states) + 1B (the whole Train tab) + 1C (the Eat tab, the Hiku tab and the shared Quick add sheet) + 1D (Progress, Health inside Progress, Settings and the accessibility outline fix) |
| `src/liftria-1a.html` | Milestone 1A snapshot, as signed off |
| `src/liftria-directions.html`, `src/liftria-bento.html`, `src/liftria-concepts.html` | Style and Today concept boards used to choose Aurora Rim and Pulse Orb |
| `*.html` (this folder) | Standalone pages generated from `src/`; open them in any browser |
| `build.sh` | Regenerates the standalone pages: `./build.sh` |

**Use it:** open `liftria.html` in a browser. Pick a screen and its state on the left (or at the top on a phone), switch theme and style, and tap through: the Train tab, Today's training card and the in-progress mini bar all navigate. `#train`, `#eat`, `#hiku` and `#progress` open straight on a tab; `#health` and `#settings` open those screens.

**Fonts:** Archivo and Figtree load from Google Fonts when online and fall back to system fonts offline. The app will bundle both (SIL OFL).

All numbers are example data.

**1C, tapping through** (Aurora Rim, dark or light):
- **Flow 3:** Today → "Log a meal" → tap a food (or its "+") → Add to Dinner → Eat home → tap a meal item → edit.
- **Flow 4:** Today → "Photo" → Send to Hiku → (the prototype moves on by itself after 3 s) → tap Olive oil, change it → Done → Save to Dinner. Eat and Today both show the new total.
- **Quick add:** Eat's "+", or long-press (or right-click) Today's "Log a meal" or the Today tab.
- **Failures and every other state** are reached from the State menu (for example Hiku → HK-5 Errors). The rate-limit state counts down for real.
- Today, Eat and Hiku all read one example diary, so a saved meal changes the number everywhere. Prototype limits: the portion picker's − and + buttons and most secondary buttons are visual only, and adding food after a Hiku save starts again from the example day.
- Today's macro numbers now come from the shared diary (100 / 155 / 46 g), not the 1A placeholders (96 / 152 / 41), because every meal is built from the food table in the 1C brief.

**1D, tapping through** (Aurora Rim, dark or light):
- **Flow 5:** State menu → Health overview → "Not connected" → Connect → the Android permission screen (reference) → Allow → tap Steps → tap a record.
- **Flow 8:** Health overview → "Watch data missing?" → the checks run for about two seconds → "One thing to fix" → Show me how → Check again → "All good" (an example, not verified on a device).
- **Flow 9:** Progress tab → each card → Strength, Nutrition, Body, Activity. "Health details" opens the Health overview; Back returns to where you came from.
- **Flow 10 (all data):** Body → tap an entry → Delete entry (Undo). Settings (the Today avatar) → Data and storage → Clear health cache, or Delete all data → type DELETE → Delete everything (restarts into onboarding).
- **Flow 6 (keys):** Settings → Hiku and API key → Test key (a "Key works" result appears after about two seconds) → Replace key → Delete key.
- **Deep links** (Back returns to the origin): Today's steps → Steps detail; Today's heart-rate row → record; Eat → Targets → "Edit profile"; Hiku "Add API key" and the usage "API key" row → Settings; a denied rest-timer notification "Turn on" → Notifications; Quick add "Log weight" → the weight sheet over the screen you were on.
- **Settings** is a pushed stack: no capsule nav. Theme and Style in Units and appearance really change the prototype.
- **Prototype limits:** the 3 M and 1 Y chips, Week for every type except Steps, the unit switches, Hide numbers (Settings does not change Today or Eat; use their "numbers hidden" states), the typed weight keypad, the date picker and "Open Android settings" don't act. The weight sheet saves nothing; "Undo" on its snackbar only returns to the populated state.
- **State menu extras** that exist to tap a flow through (not in the brief): Progress Body "after saving" and "after deleting"; Weight sheet "editing"; Health overview "stale"; Steps "week"; Steps record; Hiku "test result" and "replacing"; Notifications "meal reminders on"; Data "after clearing the cache".
