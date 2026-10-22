# Milestone 1E Design Brief (addendum): import from other apps + muscle recovery map

**Author:** Claude · **Builder:** a builder agent implements this into the prototype and specs · **Review:** Claude, then the owner
**Why:** owner request (2026-10-22), inspired by the open-source openGym tracker. Both features are **Phase 3 (gym)** and don't change Phase 2.

**Licensing rule:** openGym is AGPL-3.0 and its exercise media is licensed to openGym only. Liftria takes **ideas only**: no code, text, data or images from openGym. Write this into the handoff.

---

## 1. Import workout history from another app

**Goal:** someone switching from Hevy, Strong or FitNotes keeps their history, records and charts from day one. Fully offline: the user picks a file on the phone, and nothing is uploaded.

**Entry points:**
- ST-6 Data and storage → new row "Import workouts from another app".
- TR-1 first-time hero → secondary link "Switching from another app? Import your history".
- TR-11 History empty state → the same link.

| ID | Screen | States | Layout and content |
|---|---|---|---|
| **IM-1** | Choose source | `default` | Pushed screen, no capsule nav. "Where are you coming from?" A choice list: **Hevy**, **Strong**, **FitNotes**, **Another app (CSV)**. Each row has the app name and the export path in one line, e.g. "Hevy: Profile → Settings → Export & Import Data". A privacy line: "The file stays on this phone. Liftria reads it and saves your workouts locally." A note: "Importing history doesn't change your plans or templates." Continue → the Android file picker. |
| **IM-2** | Preview | `ok` · `unmatched` · `units` · `invalid` · `empty` | After reading the file, **before saving anything**. A summary card: "142 workouts · 3,910 sets · Mar 2023 – Oct 2026 · from Hevy". "38 days already have a workout in Liftria and will be skipped." A records preview: "Your bench record will become 92.5 kg × 3 (from Hevy, 12 Aug 2026)."<br>**unmatched**: "6 exercises aren't in Liftria's library" → a list, each with a suggested match ("Bench Press (Barbell)" → Bench press, *Suggested*) or "Keep as my own exercise". The user confirms or changes each one. Unmatched exercises **never block** the import, and nothing is dropped.<br>**units**: the file has no unit column → "Were these weights in kg or lb?" (kg / lb segmented; required).<br>**invalid**: "This doesn't look like a Hevy export" + what was expected + Choose another file.<br>**empty**: "No workouts found in this file." Dock: **Import 142 workouts** (primary) / Cancel. |
| **IM-3** | Importing | `progress` | "Importing… 61 of 142 workouts" with a bar. It can't be cancelled midway; it runs in one transaction, so it's all or nothing. A note: "This usually takes a few seconds." |
| **IM-4** | Done | `done` · `failed` | **done**: "142 workouts imported · 6 custom exercises created · records updated", + View history (→ TR-11) / Done. Imported sessions show a source line "Imported from Hevy" in TR-11/TR-12. An **Undo import** link stays available in ST-6 until the next import ("Removes the 142 workouts from this import"). **failed**: "Nothing was imported" + the reason (file unreadable, storage full) + Try again. |

**Rules for the specs:**
1. **Formats** are each app's own CSV export. The import guide lives in the spec, not in the app. Columns are matched ignoring case and punctuation, and the units are read from the column name (`weight_kg`, `weight (lbs)`) or a unit column.
2. **Exercise matching:** an exact name match against the library and aliases first, then the user's earlier mapping choices (remembered), then fuzzy suggestions (always shown as *Suggested*, never auto-applied). Unmatched names become custom exercises.
3. **No duplicates:** a day that already has a Liftria workout is skipped, so re-importing the same file adds nothing. Show the skipped count.
4. **Provenance:** imported sessions get `source = imported-file` and `importer = hevy|strong|fitnotes|csv` (the workout data contract §3), plus an import batch ID so the import can be undone.
5. **Records** are recalculated after the import, the same as after an edit.
6. **Warm-ups, per-side and per-dumbbell:** map them when the file has them (Hevy and Strong mark warm-up sets). Otherwise import as working sets and say so in IM-2 ("Warm-ups weren't marked in this file").
7. **Out of V1** (listed as Future in IM-1): Hevy API import (needs Hevy Pro and the network), Apple Health weight import, and exporting from Liftria.

## 2. Muscle recovery map

**Goal:** see at a glance which muscles you've trained, which were trained recently, and which you've neglected, using the **existing 17-region body map**.

**Honesty:** this is an **estimate from logged sets only**. It doesn't know your sleep, soreness, nutrition or heart rate. Copy says "trained recently" and "ready", never "fatigued", "damaged" or "not recovered". It always carries the `estimate` chip with a one-line explanation.

| ID | Screen | States | Layout and content |
|---|---|---|---|
| **TR-14** | Muscle map | `recent` · `volume` · `untrained` · `empty` · `large` | Reached from the TR-1 card (below) and from PR-2 Strength. Header "Muscles" + a 3-way segmented control: **Recent · Volume · Untrained**. A full front/back body map (the TR-5 component). A legend under it. Then a list of the 17 muscles sorted by the current mode, each row: muscle name, a value in words + number, last trained date. Tap a muscle → TR-5 filtered to that muscle's exercises.<br>**recent** (default): regions shaded by sets in the last 72 h, decaying. Legend: "Trained in the last 24 h", "24–72 h ago", "Ready (more than 72 h)". Rows: "Chest · 8 sets · trained yesterday".<br>**volume**: shaded by working sets in the last 7 days. Legend in sets ("0 · 1–5 · 6–11 · 12+"). Rows: "Back · 14 sets this week".<br>**untrained**: highlights muscles with no direct sets in 10+ days. Rows: "Calves · last trained 19 days ago" + "Find exercises". Muscles never trained say "Not trained yet".<br>**empty**: "Log a few workouts and your muscle map fills in." + Start a workout.<br>**large**: 200% text. |
| **TR-1 card** | Train home addition | — | A compact deck/card under This week: a mini front+back map in `recent` mode + one line ("Legs ready · Chest trained yesterday") → TR-14. Hidden on first-time. |

**How it's calculated** (write into the specs; Phase 3 implements and unit-tests it):
- A set's **credit**: 1.0 to each primary muscle and 0.5 to each secondary, from the exercise's free-exercise-db muscles (the 17-category map). Warm-ups count 0.
- **Recent:** a muscle's score = Σ credit × decay, with decay = 1.0 at 0–24 h, 0.5 at 24–48 h, 0.25 at 48–72 h, and 0 after that. Bands: ≥ 4 = "trained in the last 24 h" style, 1–4 = "24–72 h", < 1 = "ready". The thresholds are **tunable constants**, documented as a starting point, not physiology.
- **Volume:** the sum of credit over the last 7 rolling days. Bands as in the legend.
- **Untrained:** no primary-muscle credit in 10 days.
- **Imported sessions count** like any others. Cardio and sessions with no muscles count 0.

**Visual:**
- Shading uses the **train domain color in 3 steps of fill** (solid, 55%, 25%), plus a **pattern on the middle step** (dots) so the bands aren't color-only.
- "Ready" uses the neutral region fill, not green: readiness is the default, not a reward.
- The legend always shows the three swatches with words.
- Contrast of the region outlines against the background ≥ 3:1 (use `color.border.control` in glass).
- No red anywhere.

## 3. Deliverables

- **Prototype:**
  - IM-1…IM-4 and TR-14 with every state above.
  - The TR-1 card.
  - The ST-6 row, the TR-1 first-time link and the TR-11 empty link.
  - An "Imported from Hevy" line in TR-11 and TR-12 for one example session.
  - Wire the flows.
- **Specs:**
  - SCREEN_INVENTORY (status Future · Phase 3)
  - SCREEN_SPECIFICATIONS (rules §1 and the calculation §2)
  - USER_FLOWS: **flow 11, import history**, with each branch
  - INTERACTION_AND_STATES
  - DESIGN_SYSTEM (recovery shading tokens/pattern, the mapping row)
  - ACCESSIBILITY (contrast, the text alternative for the map: "Recently trained: chest, triceps. Ready: legs, back…", 200%)
  - INFORMATION_ARCHITECTURE
- **Handoff:** add both features to PHASE_1_HANDOFF.md's Phase 3 table with acceptance criteria, plus the **AGPL ideas-only** rule.
- **Review:** `MILESTONE_1E_REVIEW.md`, same format and quality bar as 1C/1D: all checks clean in dark and light, every button ≥ 48dp, contrast measured.
