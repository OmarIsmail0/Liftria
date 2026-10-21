# User Flows

**Milestone 1A** covers flows 1, 6 (setup part) and 7. Flows 2–5 and 8–10 are added in 1B–1D.

| # | Flow | Milestone |
|---|---|---|
| 1 | First launch → onboarding → Today | **1A** |
| 2 | Create workout → start → log sets → finish | 1B |
| 3 | Add meal manually → edit → save | 1C |
| 4 | Meal photo → Hiku → review → save | 1C |
| 5 | Connect Health Connect → permissions → inspect sources | 1D (entry in 1A, ON-6) |
| 6 | Set up API key → first AI request | **1A** (setup), 1C (request) |
| 7 | Open with no internet → continue offline | **1A** |
| 8 | Investigate missing watch data | 1D |
| 9 | Review progress | 1D |
| 10 | Edit or delete data | 1B–1D |

---

## Flow 1: First launch → onboarding → Today

```mermaid
flowchart TD
  A[ON-1 Welcome] --> B[ON-2 Privacy]
  B --> C{ON-3 Profile}
  C -- Continue --> D{ON-4 Goal}
  C -- Skip --> F
  D -- Continue/Skip --> E[ON-5 Estimated target]
  E -- Use / Set my own --> F{ON-6 Health Connect}
  F -- Continue --> P[[Android permission screen]]
  P -- all/some/none --> G{ON-7 Watch}
  F -- Not now --> H
  G -- Done/Skip --> H{ON-8 Hiku key}
  H -- Save / Skip --> I[ON-9 Done]
  I --> J[Today: first-day state]
```

| Step | User action | System feedback | Validation and errors | Cancel / recovery |
|---|---|---|---|---|
| ON-1 | Get started | Next screen | — | Back exits the app (nothing saved yet) |
| ON-2 | I understand | Saves "privacy acknowledged" | — | Back to ON-1 |
| ON-3 | Enters data | Inline unit hints | Range errors under each field; Continue disabled until valid or Skip | Back keeps entered values |
| ON-5 | Accepts or edits target | Target saved locally | Safety-floor warning; < 1,000 kcal blocked | "Set my own numbers" → editor sheet; Cancel returns |
| ON-6 | Opens Android permissions | Summary of granted types on return | HC unavailable → update prompt | "Not now" → Today shows "Connect" later |
| ON-8 | Pastes key | Masked; "Saved" | Malformed-key error; offline save allowed | Skip; set later in Settings |
| ON-9 | Open Today | Lands on Today (first day) | — | — |

**Interrupted onboarding:** reopening the app resumes at the last unfinished step. After the Privacy screen, the user can tap "Finish later": Today opens with the remaining steps listed in Getting started.

---

## Flow 6 (setup): Add an Anthropic key

Entry points: ON-8, the Today Hiku card "Add API key", Settings → Hiku, and the Hiku tab's no-key state (1C).

1. The user pastes a key → format check.
2. Save → secure storage → chip changes to "Key saved".
3. Optional "Test key" (online only), with these results:
   - ✓ "Hiku is ready"
   - **401:** "This key is invalid or revoked." Replace it.
   - **403:** "This key isn't allowed to use this model."
   - **429:** "Anthropic is rate limiting this key. Try again in a minute."
   - **Offline:** "Saved. We'll test it when you're online."
4. Delete key (Settings) → confirmation sheet: "Hiku will stop working until you add a key." → removed from secure storage.

The key never appears again after saving: only "Key saved · ending ••a1b2".

---

## Flow 7: Open with no internet

1. App launches → reads local data immediately (no network wait) → Today renders. **Proven on the S22:** offline cold start, local DB and offline Claude failure all PASS (Phase 0, device test 2).
2. Offline banner appears at the top of Today: "Offline. Logging, workouts and your history work as usual. Hiku needs internet."
3. **Hiku entry points:**
   - The Today Hiku card turns into the offline state, and the Photo button is hidden.
   - The Hiku tab shows an offline state with "Log manually instead" (1C).
4. Health Connect still works offline: it's on-device, so steps and HR update normally.
5. Connectivity returns → the banner disappears within 5 s → Hiku re-enables. **No automatic AI requests are sent on reconnect.**
6. If the user starts a Hiku request just as the connection drops, it fails as "You're offline. Nothing was saved." Their text or photo stays in the composer to retry.
