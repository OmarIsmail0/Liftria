# Interaction and States

**Milestone:** 1A (cross-cutting states + Today). Screen-specific states for 1B–1D are added to this file in those milestones.

## State vocabulary

| State | Visual treatment | Copy pattern | Must offer |
|---|---|---|---|
| Loading | Skeleton blocks in the card's shape (no spinners for under 300 ms) | — | Content appears in place, without layout jump |
| Empty | Short sentence + one primary action | "Nothing logged today. Your first meal fills the ring." | The next action |
| Populated | Normal | — | — |
| Offline | Banner, top of content; affected features show the `off` chip | "Offline. … Hiku needs internet." | What still works |
| Error | Inline in the affected card, not a modal | What happened + what to do | Retry and/or alternative |
| Permission denied | `off` chip with lock, "Not allowed" | "You didn't allow heart rate in Health Connect." | Open permissions |
| Unsupported | `off` chip "Not available" | "This phone's Health Connect doesn't support sleep stages." | Learn more |
| Partial data | Show what exists, list what's missing | "Steps from phone only. No watch data yet." | Check setup |
| Stale | `stale` chip with age, value dimmed | "Nothing new for 2 days." | Sync hint |
| Success | Snackbar (4 s) or inline tick | "Meal saved" + Undo where reversible | Undo |
| Confirmation | Bottom sheet for destructive or costly actions | "Delete this workout? This can't be undone." | Cancel (default) + destructive button |

## The eight required special cases (1A treatment)

| Case | Where it shows in 1A | Behavior |
|---|---|---|
| 1. No Anthropic API key | ON-8 skippable; TD-4 Hiku card | Explains Hiku, one "Add API key" action, everything else unaffected |
| 2. No internet | TD-3 | Banner, Hiku disabled with reason, no network waits anywhere |
| 3. Claude request failure | Spec in USER_FLOWS flow 6; full UI in 1C | Exact cause (401/403/429/5xx/refusal/cut off/offline) + retry or fix; input preserved |
| 4. Watch data missing or unverified | TD-2 "No watch data yet"; TD-1 HR `pending` chip | Never implies watch data exists; links to setup and troubleshooting (1D) |
| 5. Health Connect disabled | TD-5 | Activity values hidden (not zero), "Turn on" / "Not now" |
| 6. No calorie target | ON-3 skipped → Today | Ring shows eaten only; "Set target" action; no remaining calories shown |
| 7. No daily energy source | TD-1 Activity "Energy burned" row; DS-1 sheet | "No measured source yet"; the HC estimate is not shown as data |
| 8. First-time user | TD-2 | Getting-started checklist, empty states with actions, week strip hidden |

## Today interactions

| Element | Tap | Long-press | Notes |
|---|---|---|---|
| Nutrition card | Opens Eat diary for today | — | Ring and macros are one tap target for the card |
| Log a meal | Opens Add food (Eat) with back to Today | — | — |
| Photo (Hiku) | Opens the Android photo picker, then Hiku review (1C) | — | Hidden offline or without a key |
| Start workout | Opens the planned workout preview (1B) | — | One more tap starts it, to avoid accidental starts |
| Activity row | Opens Progress → Health → that metric's source detail (1D) | — | Chips are informative, not separate targets |
| Sources | Lists every data origin with last-updated time | — | |
| Profile button | Opens Settings | — | |
| Today tab (bottom nav) | Scrolls Today to top | Opens Quick add sheet | |
| Pull down | Re-reads Health Connect | — | Feedback "Updated just now" or an error |

## Feedback timing

- Local writes (meal, set): optimistic and instant. A failure shows an inline error, the entry stays in the form, and the user can retry.
- Health Connect reads: show cached values immediately with their age, then update in place.
- Hiku requests: show progress after 300 ms; Cancel is always visible; timeout 45 s, with a "Still working…" message after 10 s.
