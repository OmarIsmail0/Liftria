# Health Connect + Watch 4 feasibility

## Architecture

Source: Galaxy Watch 4 → Samsung Health → (if sharing enabled) Health Connect → `react-native-health-connect` → typed normalized records → local SQLite. No direct Bluetooth Watch 4 protocol, health records upload, or cloud syncing by Liftria.

Health Connect is the primary supported Android health integration; compatible Expo plugin v4 handles the Android 13 permission-rationale intent and Android 14+ `VIEW_PERMISSION_USAGE` activity-alias. Read-only manifest entries are explicitly declared in `app.config.ts`; check generated manifest and test dialog on S22 Ultra. **This repository cannot verify any real device grant.**

Reads limited to last seven days; historic read beyond 30 days requires a separate `READ_HEALTH_DATA_HISTORY` request. Upstream issue [#276](https://github.com/matinzd/react-native-health-connect/issues/276) raises concern about inaccurate history permission results. Do not treat `unverified` as granted or denied.

## Validation matrix — no physical-device data yet

| Metric | API mapped | Grant | Records count | Units | Time range | dataOrigin | Device metadata | Samsung Health comparison |
|---|---|---|---|---|---|---|---|---|
| Steps | Yes: Steps | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | count | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST |
| Heart rate | Yes: HeartRate | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | bpm | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST |
| Active energy | Yes: ActiveCaloriesBurned | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | kcal | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST |
| Total energy | Yes: TotalCaloriesBurned | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | kcal | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST |
| BMR | Yes: BasalMetabolicRate | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | W / kcal/day | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST |
| Exercise sessions | Yes: ExerciseSession | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | sec | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST |
| Sleep stages | Yes: SleepSession | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | interval | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST |
| Weight | Yes: Weight | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | kg | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST |
| Body fat | Yes: BodyFat | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | % | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST |
| Lean body mass | Yes: LeanBodyMass | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | kg | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST |
| Exercise-specific calories | No separate workout-energy record assumed | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | kcal | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST |
| Daily active calories | Only interval records until compared | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | kcal/day | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST |
| Daily total energy | Only interval records until compared | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | kcal/day | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST |
| Basal/resting energy | BMR rate is not energy | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | kcal/day if *explicitly integrated* | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST | PENDING_DEVICE_TEST |

Each metric must be assessed on **four different axes**: (1) API support, (2) permission granted, (3) data present, (4) Samsung Health comparison verified. Only axis (1) has documentation-based support; none of the others is a device PASS.

## Timestamp and provenance policy

Keep original ISO time values and zone offset fields where supplied. Record `adapter, recordId, dataOrigin, device, lastModified`. A source `com.sec.android.app.shealth` may represent phone or watch; it alone does not certify Watch 4 origin. Dedup source records by adapter+record ID, aggregates by adapter+operation+window, never by guessed IDs. Separate rate from energy intervals, series, sessions, instant values, aggregates. Detect missing source IDs and omit unknown records rather than fabricating IDs.

## Calorie double-counting risk

- **ActiveCaloriesBurned:** documented active energy over a specific time interval.
- **TotalCaloriesBurned:** documented total burned energy for *its own covered interval*; not necessarily a full day. It may already include active energy and underlying resting expenditure depending on origin/aggregation. **Relationship for the user's Samsung samples: unknown — needs device data.**
- **BasalMetabolicRate:** an instantaneous metabolic *power/rate* at a point in time, not kilocalories expended over an interval. Never sum BMR values with kcal, and never multiply by a day unless making an explicit model with units, time span and provenance.
- **Exercise sessions:** duration/type records; any separate exercise-specific energy in Samsung Health may already overlap active or total interval measurements. **Whether exercise energy is duplicated in the actual S22 dataset: unknown — needs device data.**
- Samsung Health sometimes may write exercise interval energy into Health Connect as `TotalCaloriesBurned` over the workout. Never label an exercise-only interval as daily TDEE.
- **Future dashboard rule:** choose a single authoritative, verified daily total for the day; never add overlapping total/active/workout values. If no reliable daily total, use an explicit, validated baseline + nonoverlapping activity or show “daily expenditure unavailable,” never silently add exercise twice. NO calorie engine in Phase 0.
- ±5% is an *investigate discrepancy* threshold after matching units/time windows, NOT verification.

## Conditional Samsung Health Data SDK research (not integrated)

Trigger a native Kotlin Expo adapter **only after actual HC device evidence** shows missing (priority order): (1) Watch 4 HR, (2) usable **daily** active or total energy, (3) workout sessions/sleep stages.

Current Samsung Health Data SDK docs confirm `DataType.ActivitySummaryType.TOTAL_ACTIVE_CALORIES_BURNED` and `TOTAL_CALORIES_BURNED` aggregation operations, both in kilocalories; time filter uses local-day windows and data-source filter. Compare overlapping, interval coverage and day boundaries with both HC and the Samsung Health app.

References:
- [Samsung ActivitySummaryType](https://developer.samsung.com/health/data/api-reference/-shd/com.samsung.android.sdk.health.data.request/-data-type/-activity-summary-type/index.html)
- [Active calorie aggregate](https://developer.samsung.com/health/data/api-reference/-shd/com.samsung.android.sdk.health.data.request/-data-type/-activity-summary-type/-companion/-t-o-t-a-l_-a-c-t-i-v-e_-c-a-l-o-r-i-e-s_-b-u-r-n-e-d.html)
- [Total calorie aggregate](https://developer.samsung.com/health/data/api-reference/-shd/com.samsung.android.sdk.health.data.request/-data-type/-activity-summary-type/-companion/-t-o-t-a-l_-c-a-l-o-r-i-e-s_-b-u-r-n-e-d.html)
- [Samsung Health developer mode / partner signature](https://developer.samsung.com/health/data/guide/developer-mode.html)

The SDK requires Samsung's official distribution/licensing and developer mode or partner registration (app signature/package matching). Do **not** commit proprietary `.aar` binaries; keep locally sourced binaries outside Git and follow license restrictions. Partner approval may be required for production scale. The deprecated Samsung Health SDK for Android must not be used.

**Open questions: unknown — needs device data.** No Samsung fallback is built in Phase 0 without a proven HC gap.

## 2026-10-19 remediation notes (ISSUE-7, 9, 11–13)

The read adapter now follows `pageToken` until exhausted and **fails closed** on repeated tokens or >100 pages, instead of treating incomplete reads as full totals. A new "Daily energy / 7 days" control reads Health Connect's `aggregateRecord` separately for active energy, total energy, and `BasalMetabolicRate.BASAL_CALORIES_TOTAL`. This operation integrates basal-rate records into energy; it is a distinct, documented aggregate, **not a sum of stored BMR power values**. The records are stored separately with operation, start/end of each local day, and all reported source origins.

**Coverage warning:** these aggregates can represent only the Health Connect data actually supplied by Samsung Health, which may include workouts but exclude all-day activity. A query for an entire calendar day does not guarantee that the *input data* covers the full day. The owner must compare Samsung Health → Settings → Health Connect → App permissions and then validate daily Samsung totals on-device. If the gap is observed, evaluate the Samsung Health Data SDK using its verified `TOTAL_ACTIVE_CALORIES_BURNED` and `TOTAL_CALORIES_BURNED` ActivitySummaryType operations. Do not add active to total or basal before establishing overlap.

Samsung Health Data SDK documented prerequisites: Samsung Health 6.30.2+, Android 10+ physical device, developer mode (about 10 taps on version) for local testing; published partner app approval tied to package ID and signing cert SHA-256. These are prerequisites, **not evidence that the SDK was installed or run**.
