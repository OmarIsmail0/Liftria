# Interaction and States

**Milestone:** 1A (cross-cutting states + Today), 1B (Train). Screen-specific states for 1C–1D are added in those milestones.

## State vocabulary

| State | Visual treatment | Copy pattern | Must offer |
|---|---|---|---|
| Loading | Skeleton blocks in the card's shape (no spinners for under 300 ms) | — | Content appears in place, without layout jump |
| Empty | Short sentence + one primary action | "0 kcal eaten. Your first meal lights it up." | The next action |
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
| 6. No calorie target | ON-3 skipped → Today (TD-7) | Orb shows eaten only, no ring; "Set a target" link; macros without targets; no remaining calories shown |
| 7. No daily energy source | TD-1 Activity "Energy burned" row; DS-1 sheet | "No measured source yet"; the HC estimate is not shown as data |
| 8. First-time user | TD-2 | Getting-started checklist, empty states with actions, week strip hidden |

## Today interactions

| Element | Tap | Long-press | Notes |
|---|---|---|---|
| Pulse Orb | Opens Eat diary for today | — | Orb, target line and macros are one tap target |
| Deck | Swipe sideways; cards snap | — | Vertical scroll is never captured by the deck. Dots show position |
| Log a meal | Opens Add food (Eat) with back to Today | — | — |
| Photo (Hiku) | Opens the Android photo picker, then Hiku review (1C) | — | Hidden offline or without a key |
| Start workout | Opens the planned workout preview (1B) | — | One more tap starts it, to avoid accidental starts |
| Activity row | Opens Progress → Health → that metric's source detail (1D) | — | Chips are informative, not separate targets |
| Sources | Lists every data origin with last-updated time | — | |
| Profile button | Opens Settings | — | |
| Today tab (capsule nav) | Scrolls Today to top | Opens Quick add sheet | |
| Pull down | Re-reads Health Connect | — | Feedback "Updated just now" or an error |

## Train (1B)

### States per screen

| Screen | Loading | Empty | Error | Other states |
|---|---|---|---|---|
| TR-1 Train home | Skeleton hero (local read, usually < 100 ms) | First time: Start empty / Build a template + starter templates | DB read fails: "Couldn't load your workouts. Restart Liftria; your data is still on the phone." + Retry | Workout in progress (Resume / Discard) |
| TR-3 Template editor | — | New: "Add your first exercise" | Save fails: inline error, form kept | Invalid: Save disabled + hint |
| TR-4 Library | — (bundled pack) | No results: "Create '<query>'" | Pack missing or corrupt: list of custom exercises + "Exercise pack couldn't load" | Filtered by group |
| TR-6 Exercise detail | — | Never logged: explanation in place of stats and chart | — | 1 session: single value instead of a chart |
| TR-8 Active workout | — | Empty workout: "Add an exercise" as the first card | Set save fails: row stays unticked, "Couldn't save this set. Try again." (rare: disk full) | Rest, notification ask, notifications denied, discard confirmation, in progress after an app kill |
| TR-9 Notification | — | — | Permission denied: no notification; in-app alert only | Running, over |
| TR-10 Summary | — | — | Save fails: workout stays in progress, retry | Records / no records; dropped empty sets |
| TR-11 History | Skeleton rows | "No workouts yet" + Start a workout | As TR-1 | After delete + Undo |
| TR-12 Session | — | — | Save fails: edits kept, retry | View, edit, delete confirmation |

### Special cases in Train

| Case | Behavior |
|---|---|
| No internet | Nothing changes. Train never uses the network. |
| No watch / watch unverified | Nothing in Train depends on it. TR-10 shows heart rate and calories as `pending` with the reason. No calorie burn is estimated from sets. |
| Health Connect off | No effect on Train. |
| First-time user | TR-1 first-time hero, starter templates, empty history, "never logged" exercise detail. |
| Notifications denied | Rest timer works in-app (sheet, top-bar countdown, vibration while open); banner offers "Turn on". |
| App killed or phone restarted mid-workout | Every logged set is already saved. Next launch shows the in-progress hero. The rest timer isn't restored; it was a transient state. |

### Train interactions

| Element | Tap | Long-press | Notes |
|---|---|---|---|
| Log set (64dp) | Saves the set, ticks it, starts rest | — | Light haptic. TalkBack announces "Set 3 logged, 72.5 kilograms, 8 reps. Rest 2 minutes." |
| Stepper − / + | One step | Repeats every 150 ms after 400 ms | Value announced (`aria-live`) |
| Stepper number | Opens the numeric keypad | — | Decimal keypad for kg |
| Set tick | Logs the row as shown, or asks to undo if ticked | — | — |
| Exercise rail chip | Switches exercise | Reorder mode | Done exercises keep a tick |
| Rest sheet | −15 s / +15 s / Skip | — | Swipe down hides; timer keeps running in the top bar |
| Minimize (chevron) | Leaves TR-8, shows mini bar | — | System back does the same; it never discards |
| Finish | Opens summary | — | — |
| Mini bar | Resume | — | Shown above the capsule nav on every tab |
| Body map region | Selects that muscle group | — | The group chips are the accessible equivalent |
| History row | Opens session | — | — |
| Snackbar Undo | Restores the deleted workout | — | 8 s, longer than the 4 s default, because deletes matter |

## Feedback timing

- Local writes (meal, set): optimistic and instant. A failure shows an inline error, the entry stays in the form, and the user can retry.
- Health Connect reads: show cached values immediately with their age, then update in place.
- Hiku requests: show progress after 300 ms; Cancel is always visible; timeout 45 s, with a "Still working…" message after 10 s.
