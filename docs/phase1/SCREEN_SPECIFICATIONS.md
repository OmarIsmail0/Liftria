# Screen Specifications

**Milestone:** 1A · Screen IDs match [SCREEN_INVENTORY.md](SCREEN_INVENTORY.md). The prototype shows each screen; this file covers what the prototype can't: rules, validation, edge cases and data sources.

---

## Onboarding (ON-1 … ON-9)

**Shared rules**
- Full-screen focus flow: no bottom navigation. A step indicator shows "Step n of 8". Back is at top-left; Skip is at top-right on optional steps.
- The primary action is pinned to the bottom (thumb zone) and never scrolls off-screen. Content scrolls above it.
- Progress is saved after each step. If the app is killed mid-onboarding, it resumes at the same step.
- Everything entered can be changed later in Settings. Onboarding never blocks the app on an optional integration.

### ON-3 Profile, validation

| Field | Rule | Error copy |
|---|---|---|
| Age | 16–100 | "Enter an age between 16 and 100." |
| Height | 120–230 cm (4'0"–7'6") | "That height looks off. Check the unit." |
| Weight | 35–300 kg (77–660 lb) | "That weight looks off. Check the unit." |
| Sex for formula | Male / Female / Prefer not to say | With "Prefer not to say", the formula averages the two constants and the target shows "Estimate, less precise". |
| Name | optional, ≤ 30 chars | — |

Skipping ON-3 skips ON-5's calculation. Today then shows "No target yet · Set target" (state: no calorie target).

### ON-5 Estimated target, calculation and guardrails

- `BMR = 10·kg + 6.25·cm − 5·age + s`, where s = +5 (male), −161 (female), −78 (average).
- Activity factor: Mostly sitting 1.2 · On my feet some 1.375 · Active job or daily training 1.55.
- Goal adjustment: Lose −15% · Maintain 0 · Build +10%.
- Macros: protein 2.0 g/kg (lose and build) or 1.6 g/kg (maintain); fat 25% of kcal; carbs take the remainder. Values are rounded to 50 kcal and 5 g.
- **Safety floor:**
  - If the result is under 1,200 kcal, or "Set my own numbers" asks for more than a 25% deficit from the estimate, show an inline warning: "This is lower than Liftria recommends without guidance from a professional." The user may proceed, but Today will never praise going lower.
  - A target below 1,000 kcal can't be saved.
- The result is always labeled **Estimate**, with a one-line explanation of the inputs. Watch data never changes it until Daily calories = READY (Phase 0 verdict).

### ON-6 Health Connect
- The CTA opens the Android Health Connect permission screen for the 10 read types plus history (a separate request).
- **Return states:**
  - all granted: continue
  - some granted: continue, listing what's affected ("Heart rate not allowed: workout heart rate won't show")
  - none granted: continue, Today shows TD-5
  - Health Connect missing or outdated: "Update Health Connect" with a Play Store link, plus "Not now"
- Liftria **never** requests write permissions.

### ON-7 Galaxy Watch guidance
- Informational only; Liftria can't change Samsung Health settings.
- **"Sync starts today":** Samsung Health shares only new data after the connection, so the first watch readings appear within minutes and history does not appear.
- Done goes to ON-8. The full troubleshooting flow is in 1D.

### ON-8 Hiku API key
- A masked password field with a paste button. Format check: `sk-ant-` plus at least 12 characters. A malformed key shows "That doesn't look like an Anthropic API key".
- **Saving** stores the key in Android secure storage (Keystore-backed). It never goes in the database, logs or exported reports.
- **Online:** after saving, an optional "Test key" sends a tiny request and shows ✓ or the exact error (invalid, revoked, rate limit). Offline: "Saved. We'll check it next time you're online."
- Cost note: "You pay Anthropic directly. Set a spending limit in the Anthropic Console."

---

## Today (TD-1 … TD-6)

**Layout (top to bottom, priority order):** header (date, greeting, profile button) → banners (offline, stale) → Getting started (first day only) → Nutrition → Training → Activity → Hiku → This week.

| Card | Data source | Empty state | Rules |
|---|---|---|---|
| Header | Device clock, profile name | "Good morning/afternoon/evening"; "Welcome to Liftria" on first day | The profile button opens Settings. |
| Nutrition | Local diary (Phase 4), target (local estimate or manual) | Ring at 0, "Nothing logged today" | Target chip always "Estimated target" or "Your target". Over target: "+180 kcal over", neutral color. No target: ring shows eaten only, plus "Set target". Hide-numbers setting replaces values with progress words. |
| Training | Templates and plan (Phase 3) | "Start empty workout" + Templates | Shows the planned or last workout. An unfinished workout shows "Resume" instead. |
| Activity | Health Connect | Not connected: "Connect Health Connect"; HC off: TD-5 banner | Steps: one row per origin (phone / Samsung Health); the watch source isn't assumed. HR: latest value + source chip + pending chip until verified. Energy: one figure only if measured; otherwise the "No measured source" text. The HC estimate is never shown here. |
| Hiku | Key presence, connectivity | No key: TD-4; offline: TD-3 | The suggestion is context-free in V1 (e.g. "Dinner still open" uses only local diary state, no AI call). |
| This week | Local diary + workout history | Hidden on first day | Dot = any meal logged; train tint = workout. Accessible summary sentence. |

**Refresh:** pull to refresh re-reads Health Connect and shows "Updated just now". Health Connect is also read on app foreground at most every 15 minutes. Local data always reflects the latest change instantly.

**Quick add** (from "Log a meal" or a long-press on the Today tab): a bottom sheet with Log meal · Photo meal (Hiku) · Start workout · Log weight. Designed fully in 1C/1B.
