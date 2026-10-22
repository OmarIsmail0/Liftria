# Interaction and States

**Milestone:** 1A (cross-cutting states + Today), 1B (Train), 1C (Eat and Hiku). Screen-specific states for 1D are added in that milestone.

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
| 3. Claude request failure | Spec in USER_FLOWS flow 6; full UI in HK-5 (1C, below) | Exact cause (401/403/429/5xx/refusal/cut off/offline) + retry or fix; input preserved |
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
| Log a meal | Opens Add food (EA-2) with back to Today, meal preset by time of day | Opens Quick add (QA-1) | The long-press has no visible hint; the Today tab long-press is the same action |
| Photo (Hiku) | Opens Before sending (HK-2) with the photo picked or taken | — | Hidden offline or without a key |
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
| App killed or phone restarted mid-workout | Every logged set is already saved. Next launch shows the in-progress hero. The rest timer resumes from its stored deadline if that's still in the future; otherwise it shows "Rest over". |
| Accidental Log set | Undo on the rest sheet, or the logged row's tick. Suggested values are styled differently and are never logged automatically. |

### Train interactions

| Element | Tap | Long-press | Notes |
|---|---|---|---|
| Log set (64dp) | Saves the set, ticks it, starts rest | — | Light haptic. TalkBack announces "Set 3 logged, 72.5 kilograms, 8 reps. Rest 2 minutes." |
| Stepper − / + | One step | Repeats every 150 ms after 400 ms | Value announced (`aria-live`) |
| Stepper number | Opens the numeric keypad | — | Decimal keypad for kg |
| Set tick | Current row: logs it as shown. Logged row: asks to undo | — | Future rows have no tick |
| Logged set's numbers | Loads them into the steppers to correct (Save / Cancel) | — | — |
| Undo (rest sheet) | Removes the set just logged | — | Shown for the whole rest |
| Exercise rail chip | Switches exercise | Reorder mode | Done exercises keep a tick |
| Rest sheet | −15 s / +15 s / Skip | — | Swipe down hides; timer keeps running in the top bar |
| Minimize (chevron) | Leaves TR-8, shows mini bar | — | System back does the same; it never discards |
| Finish | Opens summary | — | — |
| Mini bar | Resume | — | Shown above the capsule nav on every tab |
| Body map region | Selects that muscle group | — | The group chips are the accessible equivalent |
| History row | Opens session | — | — |
| Snackbar Undo | Restores the deleted workout | — | 8 s, longer than the 4 s default, because deletes matter |

## Eat (1C)

### States per screen

| Screen | Loading | Empty | Error | Other states |
|---|---|---|---|---|
| EA-1 Eat home | Skeleton orb and cards (local read, usually < 100 ms) | First day: empty glass orb, "0 kcal eaten", four meals "Not logged yet" | DB read fails: "Couldn't load your diary. Restart Liftria; your data is still on the phone." + Retry | Over target ("180 kcal over", honey), no target, numbers hidden, success with Undo (add, delete, Hiku save) |
| EA-2 Add food | — (bundled pack, local) | No recents yet: "Foods you add show up here." + Create a food | Pack missing or corrupt: "The food pack couldn't load" with My foods, Quick add calories and Create a food still working | Search results, no results, offline (Hiku disabled), after one-tap add with Undo |
| EA-3 Portion picker | — | — | Save fails: the amount stays, "Couldn't save. Try again." | Text size 200% |
| EA-4 Meal detail | — | Last item removed: the meal reads "Not logged yet" | Save fails: edits kept, retry | View, editing an item, delete confirmation |
| EA-5 Create a food | — | Empty form, Save disabled with a hint | Save fails: form kept | Calories and macros differ (hint, Save anyway), quick add |
| EA-6 Targets | — | No target set: the estimate is offered, never invented | Save fails: edits kept | Estimate, your own target, below 1,200 floor, deficit over 25% |
| EA-7 History | Skeleton chart | "Log a few days to see trends." | As EA-1 | Days with nothing logged are dashed outlines |
| QA-1 Quick add | — | — | — | Offline and no key disable the Hiku rows with a reason; Log weight is always disabled until 1D |

### Special cases in Eat

| Case | Behavior |
|---|---|
| No internet | Everything in Eat works: the pack, recents and the diary are local. Only the Hiku buttons are disabled, with "Needs internet". |
| No Anthropic key | Hiku rows are disabled with "Add your API key first". Eat is otherwise unchanged. |
| No calorie target | The orb shows "kcal eaten" with no ring, macros in grams only, and a "Set a target" link. Nothing is compared to an invented target. |
| Over target | Honey, "180 kcal over", no red, no judgment. The week's average is shown beside the target line. |
| Nothing logged | "Not logged yet", never 0 kcal. A day with nothing logged is left out of averages. |
| First-time user | EA-1 first-day state with four empty meals; EA-7 explains that trends need a few logged days. |
| Hide numbers on | Words instead of numbers on Today, Eat home and History. EA-6 still shows numbers. |
| Below the safety floor | The sheet explains why, suggests 1,200 (or the 25% deficit value) and never blocks above 1,000 kcal. Below 1,000 can't be saved. |
| Training day | A read-only chip. It never changes calories or the target. |

### Eat interactions

| Element | Tap | Long-press | Notes |
|---|---|---|---|
| Header "+" | Opens Quick add (QA-1) | — | 48dp |
| Date switcher | Earlier-day arrow opens the week view; the next-day arrow is disabled on today | — | The centre label is not a control |
| Meal "Add" | Opens EA-2 with that meal selected | — | 48dp |
| Meal item | Opens EA-4 | — | — |
| Food row | Opens EA-3 | — | — |
| Food row "+" (48dp) | Adds the last-used portion to the selected meal | — | Undo snackbar, 4 s |
| Meal selector chip | Cycles to the next meal (a sheet in the app) | — | Announces the new meal |
| Unit control | Changes the unit and converts the shown amount | — | Stored in grams |
| Amount stepper | − / + one step; the number opens a keypad | Repeats | Value announced |
| Add to \<meal\> | Saves the item and returns to EA-1 | — | Undo snackbar |
| Meal detail item | Expands it for editing | — | Done or Back |
| Delete meal | Opens the confirmation sheet | — | Keep is primary; Undo 8 s after deleting |
| Hide-numbers switch | Toggles numbers on Today, Eat home and History | — | Takes effect immediately |
| Keep (below the floor) | Disabled until the professional-guidance tick is on | — | Use 1,200 is always available |
| Chart day or list row | Opens that day in EA-1 | — | The list is the accessible equivalent of the bars |
| Quick add row | Starts that action | — | Disabled rows say why |

## Hiku (1C)

### States per screen

| Screen | Loading | Empty | Error | Other states |
|---|---|---|---|---|
| HK-1 Hiku home | — | First time: "How Hiku works" in place of Recent | Usage can't be read: the usage line is hidden, not zero | Ready, no key, offline |
| HK-2 Before sending | Photo preparing (resize): spinner on the thumbnail after 300 ms | — | Photo can't be read: "Couldn't open that photo. Choose another." | Photo, description; context switches on or off |
| HK-3 Analyzing | The state itself | — | Any failure goes to HK-5 | Working, still working (after 10 s) |
| HK-4 Result review | — | Hiku returned no items: refusal card (HK-5), not an empty result | Save fails: the estimate stays on screen, "Couldn't save. Try again." | Result, editing, after editing, text 200%, discard confirmation |
| HK-5 Errors | — | — | The state itself | Seven cases below |
| HK-6 Usage | — | No requests yet: "No requests yet this month." | — | — |

### Claude failure cases (HK-5)

Every case keeps the input ("Your photo is still here" or "Your description is still here"), saves nothing, and shows **no partial result as complete**.

| Case | Cause | Title and copy | Actions |
|---|---|---|---|
| Offline | No connection | "No internet. Hiku needs a connection to estimate this meal." | Retry, Log manually |
| Key rejected | HTTP 401 / 403 | "Your API key was rejected. Anthropic did not accept the key saved on this phone. It may be mistyped, expired or removed." | Check key (Settings), Log manually |
| Rate limit | HTTP 429 | "Too many requests right now. Try again in about 30 s." with a countdown; Retry unlocks at 0 | Retry (after the countdown), Log manually |
| Server | HTTP 5xx | "Anthropic had a problem. The service returned an error on its side. Your key and your input are fine." | Retry, Log manually |
| Refusal | The model declined or found no food | "Hiku couldn't estimate this. It works best with a clear photo of food." | Describe instead, Log manually |
| Cut off | The response ended early or didn't match the schema | "The answer was cut off. So nothing was filled in. A half answer is never shown as a result." | Retry, Log manually |
| Timeout | No answer after 45 s | "Hiku took too long. There was no answer after 45 s." | Retry, Log manually |

### Special cases in Hiku

| Case | Behavior |
|---|---|
| No Anthropic key | HK-1 explains Hiku with Add API key and Log a meal manually. The Hiku rows elsewhere are disabled with a reason. |
| No internet | HK-1 offline state, disabled buttons, Log manually. No request is queued, and none is sent on reconnect. |
| Cancel during a request | Aborts it, returns to HK-2 with the input intact. The request may still be billed, and HK-6 says so. |
| Edited then discarded | A sheet asks first. Unedited results discard without asking. |
| Context switches | Off for every request unless the defaults are changed in HK-6. |
| Chat | A `pending` marker: "Coming later". Not a working feature. |

### Hiku interactions

| Element | Tap | Long-press | Notes |
|---|---|---|---|
| Photo / Describe | Opens HK-2 | — | Disabled offline, with "Needs internet" |
| Context switch | Toggles one context source for this request | — | Shows exactly what it adds; announces "on" or "off" |
| Send to Hiku | Starts the request | — | Only action that sends anything |
| Cancel | Aborts the request | — | Always visible |
| Result row | Expands it for editing | — | Grams stepper, Remove, Done |
| Save to Dinner | Saves the items to the diary | — | Undo snackbar on EA-1 |
| Discard | Leaves; asks only if edited | — | Keep editing is primary |
| Retry | Sends the same input again | — | Rate limit: locked until the countdown ends |
| Usage | Opens HK-6 | — | — |

## Feedback timing

- Local writes (meal, set): optimistic and instant. A failure shows an inline error, the entry stays in the form, and the user can retry.
- Health Connect reads: show cached values immediately with their age, then update in place.
- Hiku requests: show progress after 300 ms; Cancel is always visible; timeout 45 s, with a "Still working…" message after 10 s.
