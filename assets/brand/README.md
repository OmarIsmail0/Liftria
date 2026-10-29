# Liftria release identity

The mark is an original four-beat orbit around an **L**. Its quadrants represent Liftria's four design domains: **Training** (coral), **Eating** (gold), **Health** (teal), and **Hiku** (lilac). Colors come from `src/design/tokens.ts`.

- `icon-light.png` and `icon-dark.png`: opaque 1024×1024 RGB app icons (iOS appearance-aware, Android legacy default). No embedded corner radius: the OS masks the square.
- `splash-light.png` and `splash-dark.png`: 1024×1024 transparent marks; the `expo-splash-screen` plugin adds the matching background colors, so startup follows the system's appearance.
- Android adaptive icon uses the light transparent mark over the light background, not the opaque iOS asset.
- All are indexed PNGs and built without remote graphics or external fonts. Keep artwork, native appearance mappings, and asset validation tests in sync.

**Release QA:** Check Android launcher (standard/adaptive), iPhone light/dark icons, iOS and Android splash screens (including dark system appearance) in signed/testflight builds. Expo Go and development splash rendering do not confirm native release appearance.
