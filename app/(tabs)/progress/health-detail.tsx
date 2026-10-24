import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useTheme } from '../../../src/design/ThemeProvider';
import { Button, Card, Chip, Header, ListRow, Screen, Typography } from '../../../src/design/primitives';
import { backOrReplace } from '../../../src/navigation/back';
import { healthConnect, readDailyEnergy } from '../../../src/services/health';
import { metricTypes, type HealthValue, type HealthRecord, type MetricType } from '../../../src/services/health/types';
import { overviewMetrics, useHealthSnapshot } from '../../../src/features/health/useHealthSnapshot';
import { emptyMetricState, sourceName, summarizeRecords, type HealthSummary } from '../../../src/features/health/presentation';

const label: Partial<Record<MetricType, string>> = {
  steps: 'Steps', 'heart-rate': 'Heart rate', 'exercise-session': 'Exercise sessions',
  'sleep-session': 'Sleep', weight: 'Weight', 'body-fat': 'Body fat',
  'active-calories': 'Active energy',
};
function metricOf(record: HealthValue): MetricType {
  return record.kind === 'session' ? 'exercise-session'
    : record.kind === 'sleep' ? 'sleep-session' : record.metric;
}
function recordTime(record: HealthValue): string {
  return record.kind === 'instant' || record.kind === 'rate' ? record.time :
    record.kind === 'aggregate' ? record.windowEnd : record.end;
}
function recordDescription(record: HealthValue): string {
  if (record.kind === 'interval') return `${record.value.toLocaleString()} ${record.unit}`;
  if (record.kind === 'series') return `${record.points.length} samples · bpm`;
  if (record.kind === 'instant' || record.kind === 'rate') return `${record.value} ${record.unit}`;
  if (record.kind === 'session') return `${Math.round(record.durationSec / 60)} minutes`;
  if (record.kind === 'sleep') return 'Sleep session';
  return `${record.value} ${record.unit}`;
}

export default function HealthMetricDetail() {
  const { metric: param } = useLocalSearchParams<{ metric: string }>();
  const metric: MetricType = typeof param === 'string' && metricTypes.includes(param as MetricType)
    ? param as MetricType : 'steps';
  const { theme } = useTheme();
  const { snapshot, refresh, refreshing } = useHealthSnapshot(overviewMetrics);
  const [window, setWindow] = useState<'day' | 'week'>('day');
  const [week, setWeek] = useState<HealthSummary | null>(null);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [showEstimate, setShowEstimate] = useState(false);
  const [estimate, setEstimate] = useState<{ kcal: number; type: string } | null>(null);
  const base = snapshot.readings[metric];
  const result = window === 'week' && week !== null ? week : base;
  const records = useMemo(() => snapshot.records.filter((r): r is HealthRecord => r.kind !== 'aggregate' && metricOf(r) === metric)
    .sort((a,b) => recordTime(b).localeCompare(recordTime(a))).slice(0, 50), [snapshot.records, metric]);
  const selected = records.find(r => r.recordId === recordId) ?? null;

  useEffect(() => {
    if (window !== 'week' || snapshot.permissions[metric] !== 'granted') {
      setWeek(null);
      return;
    }
    let mounted = true;
    const until = new Date(), from = new Date(until);
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    void healthConnect.read(metric, { start: from, end: until }).then(value => {
      if (!mounted) return;
      setWeek(value.status === 'ok'
        ? summarizeRecords(metric, value.records, 'granted', true)
        : emptyMetricState(metric, value.status === 'permission-denied' ? 'denied' : 'unknown',
          value.status !== 'unavailable'));
    }).catch(() => { if (mounted) setWeek(null); });
    return () => { mounted = false; };
  }, [metric, window, snapshot.permissions]);

  useEffect(() => {
    if (metric !== 'active-calories') return;
    let mounted = true;
    void readDailyEnergy(1).then(rows => {
      if (!mounted) return;
      const hidden = rows.find(row => row.status === 'no-source' && row.metric === 'total-calories');
      setEstimate(hidden && hidden.status === 'no-source'
        ? { kcal: hidden.value.value, type: 'total energy' } : null);
    }).catch(() => { if (mounted) setEstimate(null); });
    return () => { mounted = false; };
  }, [metric]);

  const energy = metric === 'active-calories';
  const sourceRows = result?.sources ?? [];
  return <Screen embedded scroll={false}>
    <ScrollView contentContainerStyle={{ paddingVertical: theme.space[4], gap: theme.layout.cardGap }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh(true)}
        colors={[theme.color.domain.health]} tintColor={theme.color.domain.health} />}>
      <Header title={label[metric] ?? metric} subtitle="Read-only · source details"
        onBack={() => backOrReplace(router, '/(tabs)/progress/health')} />
      <Card rim="health" title="Measurement">
        <View style={{ flexDirection: 'row', gap: theme.space[2] }}>
          <Button label="Day" size="sm" variant={window === 'day' ? 'primary' : 'secondary'}
            onPress={() => setWindow('day')} />
          <Button label="Week" size="sm" variant={window === 'week' ? 'primary' : 'secondary'}
            onPress={() => setWindow('week')} />
        </View>
        {energy ? <>
          <Typography>{snapshot.energy
            ? `${Math.round(snapshot.energy.kcal)} kcal · ${sourceName(snapshot.energy.origin)}`
            : 'No measured source'}</Typography>
          <Typography tone="secondary">Unattributed Health Connect energy estimates are hidden and never used in Liftria totals.</Typography>
          {estimate && <Button label={showEstimate ? 'Hide estimate' : 'Show estimate'} variant="ghost"
            onPress={() => setShowEstimate(v => !v)} />}
          {showEstimate && estimate && <>
            <Chip kind="estimate" label="Health Connect estimate" />
            <Typography>{estimate.kcal.toLocaleString()} kcal · {estimate.type}</Typography>
            <Typography tone="secondary">No contributing app recorded. Not used anywhere in Liftria.</Typography>
          </>}
        </> : result?.state === 'value' ? <>
          {result.total !== null && <Typography size="metric-l">{result.total.toLocaleString()} {sourceRows[0]?.unit}</Typography>}
          {result.total === null && <Typography>Sources are separate; no merged total.</Typography>}
          {result.unverified && <Chip kind="pending" label="Unverified device" />}
          {result.note ? <Typography tone="secondary">{result.note}</Typography> : null}
        </> : <Typography tone="secondary">{result?.note ?? 'Checking Health Connect…'}</Typography>}
      </Card>
      <Card title="Sources" rim="health">
        {sourceRows.length ? sourceRows.map(source =>
          <ListRow key={source.origin} title={source.label}
            detail={`${source.origin} · ${source.stale ? 'Stale' : 'Fresh'}`}
            suffix={<Typography>{source.value.toLocaleString()} {source.unit}</Typography>} />)
          : <Typography tone="secondary">No source-backed records available.</Typography>}
        <Typography size="small" tone="secondary">The same app may record measurements from a phone or a watch. App identity alone is not device identity.</Typography>
      </Card>
      <Card title="Recent records">
        {records.length ? records.map(r =>
          <ListRow key={r.adapter + ':' + r.recordId} title={recordDescription(r)}
            detail={`${sourceName(r.dataOrigin ?? '')} · ${new Date(recordTime(r)).toLocaleString()}`}
            onPress={() => setRecordId(r.recordId)} />)
          : <Typography tone="secondary">No individual records available. Missing data is not zero.</Typography>}
      </Card>
      {selected && <Card title="Record details">
        <Typography bold>Value: {recordDescription(selected)}</Typography>
        <Typography>Recorded: {new Date(recordTime(selected)).toLocaleString()}</Typography>
        <Typography>Data origin: {selected.kind === 'aggregate' ? selected.dataOrigin ?? 'Not recorded' : selected.dataOrigin}</Typography>
        <Typography>Device: {selected.kind !== 'aggregate' && selected.device?.model
          ? `${selected.device.manufacturer ?? ''} ${selected.device.model}` : 'Not recorded by the source'}</Typography>
        <Typography>Source record ID: {selected.kind === 'aggregate' ? 'Aggregate window' : selected.recordId}</Typography>
        <Typography tone="secondary">A data origin identifies the app. It is not proof of which device took a reading.</Typography>
        <Button label="Close record detail" variant="ghost" onPress={() => setRecordId(null)} />
      </Card>}
    </ScrollView>
  </Screen>;
}
