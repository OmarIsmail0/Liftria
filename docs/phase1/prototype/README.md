# Liftria Phase 1 prototype

A clickable, self-contained HTML design prototype. It's a design artifact, not app code: nothing here is used by the React Native app.

| File | What it is |
|---|---|
| `src/liftria.html` | **The current prototype.** It grows each milestone: 1A (onboarding, Today, energy states) + 1B (the whole Train tab) + 1C (the Eat tab, the Hiku tab and the shared Quick add sheet) |
| `src/liftria-1a.html` | Milestone 1A snapshot, as signed off |
| `src/liftria-directions.html`, `src/liftria-bento.html`, `src/liftria-concepts.html` | Style and Today concept boards used to choose Aurora Rim and Pulse Orb |
| `*.html` (this folder) | Standalone pages generated from `src/`; open them in any browser |
| `build.sh` | Regenerates the standalone pages: `./build.sh` |

**Use it:** open `liftria.html` in a browser. Pick a screen and its state on the left (or at the top on a phone), switch theme and style, and tap through: the Train tab, Today's training card and the in-progress mini bar all navigate. `#train`, `#eat` and `#hiku` open straight on a tab.

**Fonts:** Archivo and Figtree load from Google Fonts when online and fall back to system fonts offline. The app will bundle both (SIL OFL).

All numbers are example data.

**1C, tapping through** (Aurora Rim, dark or light):
- **Flow 3:** Today → "Log a meal" → tap a food (or its "+") → Add to Dinner → Eat home → tap a meal item → edit.
- **Flow 4:** Today → "Photo" → Send to Hiku → (the prototype moves on by itself after 3 s) → tap Olive oil, change it → Done → Save to Dinner. Eat and Today both show the new total.
- **Quick add:** Eat's "+", or long-press (or right-click) Today's "Log a meal" or the Today tab.
- **Failures and every other state** are reached from the State menu (for example Hiku → HK-5 Errors). The rate-limit state counts down for real.
- Today, Eat and Hiku all read one example diary, so a saved meal changes the number everywhere. Prototype limits: the portion picker's − and + buttons and most secondary buttons are visual only, and adding food after a Hiku save starts again from the example day.
- Today's macro numbers now come from the shared diary (100 / 155 / 46 g), not the 1A placeholders (96 / 152 / 41), because every meal is built from the food table in the 1C brief.
