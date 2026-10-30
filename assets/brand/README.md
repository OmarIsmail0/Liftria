# Liftria release identity

The mark is an original four-segment orbit around a **single-path L**. Its four design domains use the native theme token colors: Training (coral), Eating (gold), Health (teal), and Hiku (lilac).

- `icon-light.svg` and `icon-dark.svg` are the editable 1024×1024 vector sources. The **L is one SVG path** (`M 405 345 V 617 H 625`) with a 69px round-joined/round-capped stroke, not two independently drawn strokes.
- `icon-light.png` and `icon-dark.png` are 1024×1024 opaque indexed PNG icons, rasterized with **4×4 subpixel edge coverage** per pixel so the orbit and L edges are anti-aliased. No embedded corner radius; native launchers mask the square.
- `adaptive-foreground.svg` and `adaptive-foreground.png`: transparent foreground with the same mark at 78% scale, bounding the visual artwork inside ~59% of the full canvas, under Android’s central ~61% safe-zone guidance. It is separate from the larger splash mark.
- `adaptive-monochrome.svg` and `adaptive-monochrome.png`: optional themed-icon white silhouette, likewise within the safe zone. The launcher controls the actual themed color.
- `splash-light.png` and `splash-dark.png`: original transparent marks retained; native splash backgrounds are configured separately.

To inspect or re-raster the **icon** SVG sources, export at 4096×4096 from an SVG renderer, then shrink to 1024×1024 with a high-quality downsampling filter (or a renderer with equivalent multi-sampling). Adaptive layers must keep their transparent background and centralized scale.

**Release QA:** Inspect launcher masks including circle, squircle, and themed icons, native iPhone light/dark, and both native splash appearances. Expo Go and dev splash appearances do not prove native release behavior.
