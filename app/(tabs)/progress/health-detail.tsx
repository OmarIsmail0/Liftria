import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useTheme } from '../../../src/design/ThemeProvider';
import { Button, Card, Chip, Header, ListRow, Screen, Typography } from '../../../src/design/primitives';
import { backOrReplace } from '../../../src/navigation/back';
import { healthConnect, readDailyEnergy } from '../../../src/services/health';
import { metricTypes, type HealthValue, type HealthRecord, type MetricType } from '../../../src/services/health/types';
import { overviewMetrics, useHealthSnapshot } from '../../../src/features/health/useHealthSnapshot';
import { StepsChart, HeartRateChart } from '../../../src/features/health/HealthCharts';
import { ageLabel, dailyStepsBySource, emptyMetricState, heartRateSamples,
  hourlyStepsBySource, phase2EnergyMessage, recordsInWindow, sourceName, summarizeRecords,
  type HealthSummary } from '../../../src/features/health/presentation';

const label: Partial<Record<MetricType,string>> = {
  steps: 'Steps', 'heart-rate': 'Heart rate', 'exercise-session': 'Exercise sessions',
  'sleep-session': 'Sleep', weight: 'Weight', 'body-fat': 'Body fat',
  'active-calories': 'Active energy',
};
function metricOf(r: HealthValue): MetricType {
  return r.kind === 'session' ? 'exercise-session' : r.kind === 'sleep' ? 'sleep-session' : r.metric;
}
function recordTime(r: HealthValue): string {
  return r.kind === 'instant' || r.kind === 'rate' ? r.time :
    r.kind === 'aggregate' ? r.windowEnd : r.end;
}
function recordDescription(r: HealthValue): string {
  if (r.kind === 'interval') return `${r.value.toLocaleString()} ${r.unit}`;
  if (r.kind === 'series') return `${r.points.length} heart-rate samples · bpm`;
  if (r.kind === 'instant' || r.kind === 'rate') return `${r.value} ${r.unit}`;
  if (r.kind === 'session') return `${Math.round(r.durationSec / 60)} minutes`;
  return 'Sleep session';
}

export default function HealthMetricDetail() {
  const { metric: param } = useLocalSearchParams<{ metric: string }>();
  const metric: MetricType = typeof param === 'string' && metricTypes.includes(param as MetricType)
    ? param as MetricType : 'steps';
  const { theme } = useTheme();
  const { snapshot, refresh, refreshing } = useHealthSnapshot(overviewMetrics);
  const [window, setWindow] = useState<'day' | 'week'>('day');
  const [week, setWeek] = useState<HealthSummary | null>(null);
  const [weekRecords, setWeekRecords] = useState<HealthValue[]>([]);
  const [weekRefresh, setWeekRefresh] = useState(0);
  const [showEstimate, setShowEstimate] = useState(false);
  const [estimate, setEstimate] = useState<{ kcal: number; type: string } | null>(null);
  const permission = snapshot.permissions[metric];
  const permitted = permission === 'granted';
  const available = snapshot.availability === 'available';
  const base = snapshot.readings[metric];
  const today = new Date(), start = new Date(today);
  start.setHours(0,0,0,0);
  const weekStart = new Date(start); weekStart.setDate(weekStart.getDate() - 6);
  const rangeStart = window === 'day' ? start : weekStart;
  const dayScoped = summarizeRecords(metric,
    recordsInWindow(metric, snapshot.records, start, today),
    snapshot.permissions[metric] ?? 'unknown', available);
  const dayResult = base?.state === 'error'
    ? { ...dayScoped, state: 'error' as const, note: base.note } : dayScoped;
  const result = window === 'week' ? (!available || !permitted
    ? emptyMetricState(metric, snapshot.permissions[metric] ?? 'unknown', available) : week) : dayResult;
  // Week never falls back to day readings or a previous metric's results.
  const sourceRecords = window === 'day' ? snapshot.records : weekRecords;
  const rangeStartMs = rangeStart.getTime();
  const records: HealthRecord[] = !permitted || !available || (window === 'week' && week === null)
    ? [] : sourceRecords.filter((r): r is HealthRecord => r.kind !== 'aggregate' &&
      metricOf(r) === metric && Date.parse(recordTime(r)) >= rangeStartMs &&
      Date.parse(recordTime(r)) <= today.getTime())
      .sort((a,b) => recordTime(b).localeCompare(recordTime(a))).slice(0,50);
  useEffect(() => {
    if (window !== 'week' || !available || !permitted) return;
    let mounted = true;
    const until = new Date(), from = new Date(until);
    from.setDate(from.getDate() - 6); from.setHours(0,0,0,0);
    void healthConnect.read(metric, { start: from, end: until }).then(value => {
      if (!mounted) return;
      if (value.status === 'ok') {
        setWeekRecords(value.records);
        setWeek(summarizeRecords(metric, recordsInWindow(metric, value.records, from, until), 'granted', true));
      } else {
        setWeekRecords([]);
        setWeek(value.status === 'error'
          ? { ...emptyMetricState(metric, 'granted', true), state: 'error',
            note: 'Could not load this week from Health Connect.' }
          : emptyMetricState(metric, value.status === 'permission-denied' ? 'denied' : 'unknown',
            value.status !== 'unavailable'));
      }
    }).catch(() => { if (mounted) setWeek({ ...emptyMetricState(metric,'granted',true),
      state:'error', note:'Could not read this week.' }); });
    return () => { mounted = false; };
  }, [metric, window, available, permitted, permission, weekRefresh]);

  useEffect(() => {
    if (metric !== 'active-calories' || !available ||
        snapshot.permissions['active-calories'] !== 'granted') return;
    let mounted = true;
    void readDailyEnergy(1).then(rows => {
      if (!mounted) return;
      const hidden = rows.find(row => row.status === 'no-source' && row.metric === 'total-calories');
      setEstimate(hidden && hidden.status === 'no-source'
        ? { kcal: hidden.value.value, type: 'total energy' } : null);
    }).catch(() => { if (mounted) setEstimate(null); });
    return () => { mounted = false; };
  }, [metric,available,snapshot.permissions]);

  const energy = metric === 'active-calories';
  const sourceRows = result?.sources ?? [];
  const stepSeries = metric === 'steps' && permitted && available
    ? window === 'day' ? hourlyStepsBySource(sourceRecords, start, today)
      : dailyStepsBySource(sourceRecords, weekStart, today) : [];
  const hrSamples = metric === 'heart-rate' && permitted && available
    ? heartRateSamples(sourceRecords, rangeStart, today) : [];

  if (!snapshot.loaded) return <Screen embedded>
    <Header title={label[metric] ?? metric} subtitle="Loading health data…" />
    <Typography tone="secondary">Checking Health Connect permission…</Typography>
  </Screen>;
  return <Screen embedded scroll={false}><ScrollView contentContainerStyle={{
    paddingVertical: theme.space[4], gap: theme.layout.cardGap }}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
      setWeek(null); setWeekRecords([]); setWeekRefresh(v => v+1); void refresh(true);
    }} colors={[theme.color.domain.health]} tintColor={theme.color.domain.health} />}>
    <Header title={label[metric] ?? metric} subtitle="Read-only · source details"
      onBack={() => backOrReplace(router, '/(tabs)/progress')} />
    <Card rim="health" title="Measurement">
      <View style={{ flexDirection: 'row', gap: theme.space[2] }}>
        <Button label="Day" size="sm" variant={window === 'day' ? 'primary' : 'secondary'}
          onPress={() => { setWeek(null); setWindow('day'); }} />
        <Button label="Week" size="sm" variant={window === 'week' ? 'primary' : 'secondary'}
          onPress={() => { setWeek(null); setWeekRecords([]); setWeekRefresh(v => v+1); setWindow('week'); }} />
      </View>
      {energy ? <>
        <Typography>{phase2EnergyMessage(snapshot.permissions[metric] ?? 'unknown', available)}</Typography>
        <Typography tone="secondary">Health Connect total energy can include estimates or resting energy. Liftria has no verified measured energy for Phase 2.</Typography>
        {permitted && estimate && <Button label={showEstimate ? 'Hide estimate' : 'Show estimate'} variant="ghost"
          onPress={() => setShowEstimate(v => !v)} />}
        {permitted && showEstimate && estimate && <>
          <Chip kind="estimate" label="Health Connect estimate" />
          <Typography>{estimate.kcal.toLocaleString()} kcal · {estimate.type}</Typography>
          <Typography tone="secondary">No measured contributing source. Not used anywhere in Liftria.</Typography>
        </>}
      </> : window === 'week' && week === null && available && permitted ? <Typography tone="secondary">Loading weekly readings…</Typography>
        : result?.state === 'value' ? <>
          {metric === 'steps' && result.total !== null &&
            <Typography size="metric-l">{result.total.toLocaleString()} steps</Typography>}
          {metric !== 'steps' && result.total !== null &&
            <Typography size="metric-l">{result.total.toLocaleString()} {sourceRows[0]?.unit}</Typography>}
          {result.total === null && <Typography>Sources are separate · no combined total.</Typography>}
          {result.unverified && <Chip kind="pending" label="Unverified device" />}
          {result.note ? <Typography tone="secondary">{result.note}</Typography> : null}
        </> : <Typography tone="secondary">{result?.note ?? 'Checking Health Connect…'}</Typography>}
      {result?.state === 'value' && metric === 'steps' &&
        <StepsChart series={stepSeries} period={window} />}
      {result?.state === 'value' && metric === 'heart-rate' &&
        <HeartRateChart samples={hrSamples} />}
      {permitted && result?.state === 'value' && <Typography tone="secondary" size="small">
        Each app source stays separate. Values come from records, not invented samples.
      </Typography>}
    </Card>
    <Card title="Sources" rim="health">
      {sourceRows.length && permitted ? sourceRows.map(source =>
        <ListRow key={source.origin} title={source.label}
          detail={`${source.origin} · ${source.stale ? 'Stale ' + ageLabel(source.latestAt) : 'Latest ' + ageLabel(source.latestAt)}`}
          suffix={<Typography>{source.value.toLocaleString()} {source.unit}</Typography>} />)
        : <Typography tone="secondary">No source-backed records available.</Typography>}
      <Typography size="small" tone="secondary">App origin is not proof of which device took a measurement.</Typography>
    </Card>
    <Card title="What this means">
      <Typography tone="secondary">{metric === 'steps'
        ? 'Steps are counted separately for each source. A phone and watch may record the same walk, so Liftria does not add their totals.'
        : metric === 'heart-rate'
          ? 'Samples are individual heart-rate readings, not a verified resting rate. Samsung Health may omit device details.'
          : metric === 'sleep-session'
            ? 'Sleep needs tracking in the connected watch app and permission to share it.'
            : metric === 'exercise-session'
              ? 'Record an exercise session in your watch app and allow it to share with Health Connect.'
              : energy ? 'Health Connect energy estimates are hidden unless you ask to view them.'
                : 'Readings are grouped by provider. A missing reading is not zero.'}</Typography>
    </Card>
    <Card title="Recent records">
      {records.length ? records.map(r =>
        <ListRow key={r.adapter + ':' + r.dataOrigin + ':' + r.recordId}
          title={recordDescription(r)}
          detail={`${sourceName(r.dataOrigin)} · ${new Date(recordTime(r)).toLocaleString()}`}
          onPress={() => router.push({ pathname: '/(tabs)/progress/health-record',
            params: { metric, recordId: r.recordId, origin: r.dataOrigin,
              adapter: r.adapter, readAt: snapshot.readAt ?? '' } })} />)
        : <Typography tone="secondary">No individual records available for this range and permission.</Typography>}
    </Card>
  </ScrollView></Screen>;
}
