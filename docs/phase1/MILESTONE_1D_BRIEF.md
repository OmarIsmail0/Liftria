# Milestone 1D Design Brief: Health, Progress, Settings and the final pass

**Author:** Claude (design decisions) · **Builder:** a Sonnet 5.5 agent implements this brief into the prototype and specs · **Review:** Claude, then the owner
**Prompt:** [PHASE_1_PROMPT.md](PHASE_1_PROMPT.md) §8 (1D) · **Style:** Aurora Rim + Pulse Orb (signed off)

The handoff to the build phase (`PHASE_1_HANDOFF.md`, `PHASE_1_REPORT.md`, `PHASE_2_PROMPT.md`) is written by Claude separately and is **not** part of this build.

---

## 1. Principles for 1D

1. **Health shows what Phase 0 actually saw** on the owner's S22 Ultra + Watch 4. The example data mirrors it:
   - **Steps:** 6,214 today, **all from the phone** (`com.android.healthconnect.phone`, device SM-S908E). No Samsung Health steps yet.
   - **Heart rate:** 72 bpm from **Samsung Health** (`com.sec.android.app.shealth`), **no device metadata**, so it shows "Samsung Health · device not recorded". Never "from your watch".
   - **Exercise sessions:** none yet → `pending` ("Record a workout on the watch to verify").
   - **Active energy / total energy:** no measured source. The Health Connect estimate (1,565 kcal, no origin) is **hidden by default** with "Show estimate" and an explanation, per DS-1.
   - **Sleep:** no data. **Weight and body fat:** not allowed (permission off) in the example.
   - **Sync started** 20 Oct (no history before it).
2. **Every chart names its source and has a defined empty state.** The source line is under the chart title ("From your workouts in Liftria" / "From Health Connect · Phone"). Empty = a sentence + one action, never an empty axis.
3. **Unsupported ≠ permission denied ≠ no data ≠ zero.** Use the existing chips (`off` "Not allowed", `off` "Not available", `off` "No data", `pending`, `stale`, `measured`, `phone`).
4. **Settings is honest about what's local.** Deleting data says what is and isn't deleted. Backup/export is **Future**: shown, disabled, with the warning.
5. **Final accessibility pass** fixes the outline contrast carried from 1A (§5).

## 2. Navigation

- **Progress tab** root = PR-1 (replaces the `tab-progress` placeholder). Health lives inside Progress (IA decision from 1A): PR-1's Activity section → HE-1.
- **Settings** opens from the Today avatar (replaces the `tab-settings` placeholder) as a pushed stack **without the capsule nav** (IA rule 5).
- **Log weight** (Quick add, currently disabled "Coming in Progress") becomes enabled → PR-6 sheet.
- Deep links (back returns to origin):
  - Today Activity card → HE-2 (steps).
  - Today "Unverified" HR chip row → HE-3.
  - EA-6 Targets → ST-2 Profile.
  - HK-1 "Add API key" → ST-4.
  - TR-8 notifications "Turn on" → ST-5.
  - HK-6 key link → ST-4.

## 3. Screens and states

### Progress (`domain.health` teal for health; each section keeps its own domain color)

| ID | Screen | States | Layout and content |
|---|---|---|---|
| **PR-1** | Progress home | `rich` · `first` · `partial` | Header "Progress" + range chips (4 W · 3 M · 1 Y; 4 W selected). Four summary cards, each rimmed in its domain and each with its own source line:<br>**Strength** (coral): "Volume 4 weeks: 41,200 kg (+6%)", top est. 1RM bench 96 kg.<br>**Nutrition** (honey): "avg 2,210 kcal · 18 of 28 days logged", protein avg 128 g.<br>**Body** (teal): weight 78.4 kg, 7-day trend −0.3 kg.<br>**Activity** (teal): steps avg 7,480/day (Phone) → "Health details" link (HE-1).<br>**first**: each card has its empty sentence + action ("Finish a workout to see strength trends" / "Log meals on 3 days…" / "Log your weight" / "Connect Health Connect"). **partial**: strength and nutrition rich; body empty; activity phone-only with "No watch data yet". |
| **PR-2** | Strength | `rich` · `empty` | Weekly volume bar chart (coral), 8 weeks. Top lifts list with est. 1RM sparkline + Estimate chip → TR-6. Records this period (count) → TR-13. Source line "From your workouts in Liftria". |
| **PR-3** | Nutrition trends | `rich` · `empty` | Daily kcal vs target line (4 weeks, logged days only; unlogged days are gaps, not zeros). Protein: days ≥ target. Average macros split. Source "From your food diary". Same rules as EA-7 at a longer range. |
| **PR-4** | Body | `rich` · `empty` · `hidden` · `hcweight` | Weight line with a 7-day moving average (the raw points faint, the trend line solid), the range minimum and maximum, the last entry "78.4 kg · today · You". A "Log weight" button. Body fat row `pending` ("Needs a scale that writes to Health Connect"). **hidden** (hide-numbers on): the line without the axis numbers, "Trend: steady". **hcweight**: the same with points labeled by source (You / Samsung Health) and a source legend. Source line "Logged in Liftria" (+ "Health Connect" when present). Gentle copy: no "lose", "gain" or judgment words, just "trend". |
| **PR-5** | Activity | `rich` · `phoneonly` · `hcoff` | Steps chart per day (teal), **stacked by source**: Phone (solid) / Samsung Health (striped). The example has phone only. HR resting trend: `pending`. Exercise sessions: `pending`. "Health details" → HE-1. **hcoff**: the TD-5 pattern, values hidden, not zero, + Turn on. |
| **PR-6** | Log weight (sheet) | `default` · `invalid` | Sheet: a kg stepper (0.1 steps) + keypad, date (today), a note. "Saved in Liftria. Not written to Health Connect" (read-only app). **invalid**: 400 kg → "Is that right?" |

### Health (inside Progress)

| ID | Screen | States | Layout and content |
|---|---|---|---|
| **HE-1** | Health overview | `rich` · `notconnected` · `hcoff` · `unavailable` | A connection card: "Health Connect · connected · reads only", "Data from 20 Oct (when you connected)", permissions "4 of 7 allowed" → HE-4. Then one row per type (icon, value or state, source chip, freshness): **Steps** 6,214 `phone` "12 min ago" · **Heart rate** 72 bpm `measured` "Samsung Health" + `pending` "Device not recorded" · **Exercise sessions** `pending` "None recorded yet" · **Active energy** `off` "No measured source" · **Sleep** `off` "No data" · **Weight** `off` lock "Not allowed" · **Body fat** `off` lock "Not allowed". A "Watch data missing?" link → HE-6. **notconnected**: an explanation + Connect (→ HE-4 flow). **hcoff**: Health Connect off/disabled → Turn on. **unavailable**: Health Connect not installed or too old → "Get Health Connect" (Play Store) + "Liftria works without it". |
| **HE-2** | Metric detail | `steps` · `heart` · `energy` · `sleep` · `exercise` | A header with the metric + a range (Day · Week). A chart with its source line. "Sources" breakdown: each data origin with its value and last update ("Phone · 6,214 · 12 min ago", "Samsung Health · no steps yet"). An explanation box specific to the metric. Recent records list (time, value, origin) → HE-3. **steps**: an hourly bar chart. **heart**: samples dots (72, 68, 75…) with "Samsung Health didn't record which device". **energy**: the DS-1 pattern: "No measured source", a collapsed "Health Connect estimate (hidden)" row with "Show estimate" that reveals 1,565 kcal with an `estimate` chip and "Not used anywhere in Liftria". **sleep**: an empty state + "Sleep needs Samsung Health sleep tracking". **exercise**: `pending` + "Record a workout on your watch, then check here". |
| **HE-3** | Record / source detail | `default` | One record as a definition list: value + unit · start–end time · data origin (app name + package) · device (model or "Not recorded by the source") · recorded at vs. read by Liftria at · permission. A footnote explaining each field in plain words. |
| **HE-4** | Connection and permissions | `partial` · `all` · `denied` · `system` | The status card + a list of the 7 types with an Allowed / Not allowed switch-look (read-only display; tapping opens Health Connect). "Open Health Connect" (primary). A read-only statement: "Liftria reads. It never writes or deletes your health data." **system**: a mock of the Android Health Connect permission screen (a neutral system style, labeled "Android screen, for reference"). **denied**: all off + explanation + Open Health Connect. |
| **HE-5** | Samsung Health sync guide | `default` | Numbered steps with small original illustrations (simple phone-screen blocks): Open Samsung Health → ⋮ → Settings → Health Connect → allow all types → keep the watch synced. A note: "Data starts from the day you connect. Older history doesn't come over." A "Check again" button. |
| **HE-6** | Troubleshoot missing watch data | `checking` · `found` · `issue` | Flow 8. A live checklist, each row with a status icon + one line: ① Health Connect installed ✓ ② Liftria allowed to read heart rate ✓ ③ Samsung Health writes to Health Connect: "last record 2 h ago" ✓ ④ Watch synced to Samsung Health: "can't be checked from here; open Samsung Health" (info) ⑤ Steps from the watch: ✕ "none yet, only phone steps". **issue**: the failing row expanded with a fix ("Turn on Steps in Samsung Health → Health Connect") + HE-5 link. **found**: all good, "Watch data is arriving". **checking**: progress rows. |

### Settings (neutral rims; a pushed stack, no capsule nav)

| ID | Screen | States | Layout and content |
|---|---|---|---|
| **ST-1** | Settings home | `default` | Grouped rows: Profile and goals · Units and appearance · Hiku and API key · Notifications · Health Connect (→ HE-4) · Data and storage · About and help. A storage line at the bottom: "Everything is on this phone · 6.8 MB". |
| **ST-2** | Profile and goals | `default` · `changed` | Name, sex (for the formula, with "Used only to estimate your target"), birth year, height, weight (latest from PR-4), activity, goal. **changed**: after editing the weight → an inline "Your estimated target changes from 2,650 to 2,610 kcal" + Update target / Keep current. |
| **ST-3** | Units and appearance | `default` | Weight kg/lb · Height cm/ft-in · Energy kcal (kJ = Future) · Theme System/Dark/Light · Style Aurora Rim/Solid ("Solid turns on by itself with high-contrast text or Reduce transparency") · Hide numbers on dashboards · Keep the screen on during workouts · Haptics. |
| **ST-4** | Hiku and API key | `ready` · `nokey` · `test` · `delete` | The key card: "Saved on this phone (Android Keystore) · sk-ant-…a1b2". Test key → `test` state (a pending row "Testing…" then a result: "Key works" with `pending` "first device test"). Replace key. Delete key → `delete` sheet ("Hiku stops working until you add a key. Your food diary isn't affected."). AI privacy defaults: Today's totals (off), Training day (off), Keep photos (off). Usage → HK-6. Model line: "Uses Anthropic's Claude Haiku model". **nokey**: an explanation + Add key field (like ON-8). |
| **ST-5** | Notifications | `allowed` · `denied` | Rest timer alerts (status + `pending` "lock-screen alert being tested"), Meal reminders (off by default; times per meal when on). **denied**: a banner "Android notifications are off for Liftria" + Open Android settings. |
| **ST-6** | Data and storage | `default` · `deleteall` · `typed` | Counts: workouts 14 · meals 212 · custom foods 6 · health records cached 1,240 · storage 6.8 MB. Actions: Clear health cache ("Re-read from Health Connect next time"), **Export / backup** (disabled, `pending` "Future version") with the warning "If you lose or reset this phone, your Liftria data is gone. Backup is planned." **Delete all data** (danger). **deleteall**: a sheet listing what's deleted (workouts, meals, foods, weights, settings, API key, cached health) and **what isn't** (data in Health Connect and Samsung Health; Anthropic's own request logs for your key), then "Type DELETE to confirm" with the field empty and the button disabled. **typed**: "DELETE" typed, button enabled. |
| **ST-7** | About and help | `default` | Version 0.1.0 (Phase 0 build) · Help topics: What the chips mean (the legend from the prototype panel), Troubleshoot watch data (→ HE-6), How Hiku works · Licenses: free-exercise-db (Unlicense), USDA FoodData Central (public domain), Archivo and Figtree (SIL OFL) · Privacy summary (feature-scoped, as in 1C). |

## 4. Visual decisions

- **Charts** reuse `.chart` (1B): Strength coral, Nutrition honey, Body and Activity teal. A source line in `t-small` under every chart title. Gridlines `border.subtle`; labels `text.tertiary` (≥ 4.5:1 measured in 1C).
- **Stacked steps:** phone = solid teal; Samsung Health = teal **with diagonal stripes** (pattern), so the source isn't color-only. A legend with both.
- **Weight:** raw points as small hollow dots, the 7-day average as a solid 2.5px line. Never a red or green trend color.
- **The definition list** (HE-3): label `t-label`, value `t-body` strong, a monospace `.kbd` style for package names.
- **The system permission mock** (HE-4 `system`) uses neutral greys and Roboto-like system type, clearly not Liftria's style, with the caption "Android screen, for reference" (like TR-9).
- **The danger zone** (ST-6): a card with a `status.danger` outline (1.5px) and a danger text button; the confirm sheet's destructive button uses `btn-danger` and is disabled until the text matches.

## 5. Final accessibility pass (required)

- **Outline contrast (carried from 1A):** in the glass style, control outlines (`.btn-secondary`, `.iconbtn`, `.fchip` off, `.search`, `.stepper`, `.field input`, `.choice button`, `.tick-btn`, `.addrow`, toggles) measure below 3:1 over the brightest glows.
  - Introduce `color.border.control` for glass, dark and light, chosen so the outline is **≥ 3:1 against the worst-case card fill over the brightest glow**. Apply it to those controls in the glass style only (Solid already passes at 3.33/3.54).
  - Measure and record before/after.
- **200% renders** for the Settings rows (ST-1), HE-1 rows and PR-4 (add `large` states) using the existing `.screen.fs200` emulation; fix what breaks.
- **Screen-reader labels:** every chart has a text alternative naming the source; every switch-look in HE-4 says "Allowed" / "Not allowed" and that tapping opens Health Connect.

## 6. Behavior rules for the specs

- **Freshness:**
  - steps and HR are stale after 6 h, energy after 24 h, weight after 14 days (DESIGN_SYSTEM §6)
  - HE rows show the `stale` chip with the age
- **Health Connect reading:** on app open (at most every 15 min) and on pull-to-refresh, paginated; cached values show immediately with their age.
- **Source priority for display** (no merging): for each type, list every origin separately. A single "total" is shown **only** for steps, and only when there is one origin (avoids double counting phone + watch until a dedup rule is verified in Phase 2/3).
- **Weight entries are local.** HC weight is read and shown with its source but never edited from Liftria.
- **Profile changes** never silently change a manual target. An estimated target shows the proposed change and asks.
- **Delete all data** removes the SQLite database, SecureStore key and cached files, then restarts into onboarding. It can't be undone and has no Undo.
- **Clear health cache** deletes only cached HC rows; the next read re-imports them.
- **Hide numbers** applies to Today, Eat, History, PR-1 and PR-4 (not to Settings or Targets).

## 7. Flows to document (USER_FLOWS.md)

- **Flow 5:** Connect Health Connect → permissions → inspect data and sources (HE-1 notconnected → HE-4 system → HE-1 → HE-2 → HE-3).
- **Flow 8:** Investigate missing watch data (HE-1 → HE-6 issue → HE-5 → HE-6 found).
- **Flow 9:** Review progress (PR-1 → PR-2/PR-3/PR-4/PR-5, including empty states).
- **Flow 10 (all data):** edit or delete a weight entry (PR-4), clear the health cache, delete all data with typed confirmation.
- **Flow 6 (key management):** replace, test and delete the API key (ST-4).

## 8. Quality bar

The same as 1B/1C:
- an automated render of every new screen × state, dark and light
- `errors []`, no overflow, no button under 48dp (including `.link`)
- contrast measured for new pairs and for the outline fix
- 200% renders as in §5
- `MILESTONE_1D_REVIEW.md` with a screen checklist, cross-checks and the Phase 2–4 technical concerns:
  - Health Connect pagination at volume
  - the dedup rule for phone vs watch steps
  - background reads (none in V1)
  - the Delete-all implementation order (DB, key, files, restart)
  - the HC permission rationale screen required by Android
  - the Play Store Health Connect declaration (not needed for a sideloaded personal app; record it)

## 9. Also update

- `SCREEN_INVENTORY.md`: replace the "Stubs" section (PR-*, HE-*, ST-* now designed).
- `INFORMATION_ARCHITECTURE.md`: the Progress, Health and Settings hierarchy with IDs.
- `MILESTONE_1A_REVIEW.md`: mark open issue 1 (ON-5 safety floor) as **resolved in 1C (EA-6 floor sheet)** and open issue 4 (hide-numbers Settings UI) as **resolved in 1D (ST-3)**. Leave the rest.
- `prototype/README.md`: covers 1A–1D.
