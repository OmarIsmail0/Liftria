# Liftria Phase 1 prototype

A clickable, self-contained HTML design prototype. It's a design artifact, not app code: nothing here is used by the React Native app.

| File | What it is |
|---|---|
| `src/liftria-1a.html` | Source fragment for milestone 1A (onboarding, Today states, energy states) |
| `liftria-1a.html` | Standalone page generated from the source; open it in any browser |
| `build.sh` | Regenerates the standalone pages: `./build.sh` |

**Use it:** open `liftria-1a.html` in a browser. Pick a screen and a Today state on the left (or at the top on a phone), switch theme, and tap through the onboarding buttons.

**Fonts:** Archivo and Figtree load from Google Fonts when online and fall back to system fonts offline. The app will bundle both (SIL OFL).

All numbers are example data.
