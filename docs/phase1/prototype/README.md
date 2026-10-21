# Liftria Phase 1 prototype

A clickable, self-contained HTML design prototype. It's a design artifact, not app code: nothing here is used by the React Native app.

| File | What it is |
|---|---|
| `src/liftria.html` | **The current prototype.** It grows each milestone: 1A (onboarding, Today, energy states) + 1B (the whole Train tab) |
| `src/liftria-1a.html` | Milestone 1A snapshot, as signed off |
| `src/liftria-directions.html`, `src/liftria-bento.html`, `src/liftria-concepts.html` | Style and Today concept boards used to choose Aurora Rim and Pulse Orb |
| `*.html` (this folder) | Standalone pages generated from `src/`; open them in any browser |
| `build.sh` | Regenerates the standalone pages: `./build.sh` |

**Use it:** open `liftria.html` in a browser. Pick a screen and its state on the left (or at the top on a phone), switch theme and style, and tap through: the Train tab, Today's training card and the in-progress mini bar all navigate. `#train` opens straight on Train.

**Fonts:** Archivo and Figtree load from Google Fonts when online and fall back to system fonts offline. The app will bundle both (SIL OFL).

All numbers are example data.
