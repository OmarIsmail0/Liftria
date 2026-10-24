import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Card, Chip, Header, ListRow, Screen, Typography } from '../../../src/design/primitives';
import { listCachedHealth } from '../../../src/services/database';
import { healthConnect } from '../../../src/services/health';
import { metricTypes, type HealthRecord, type MetricType, type PermissionState } from '../../../src/services/health/types';
import { sourceName } from '../../../src/features/health/presentation';

function recordAt(value: HealthRecord): string {
  return value.kind === 'instant' || value.kind === 'rate' ? value.time : value.end;
}
function measuredValue(value: HealthRecord): string {
  if (value.kind === 'interval') return `${value.value.toLocaleString()} ${value.unit}`;
  if (value.kind === 'series') return `${value.points.length} heart-rate samples`;
  if (value.kind === 'instant' || value.kind === 'rate') return `${value.value} ${value.unit}`;
  if (value.kind === 'session') return `${Math.round(value.durationSec/60)} min of exercise`;
  return 'Sleep session';
}
export default function HealthRecordDetail() {
  const query = useLocalSearchParams<{ metric: string; recordId: string; origin: string; adapter: string; readAt?: string }>();
  const metric = metricTypes.includes(query.metric as MetricType) ? query.metric as MetricType : 'steps';
  const [record,setRecord] = useState<HealthRecord|null>(null);
  const [loading,setLoading] = useState(true);
  const [permission,setPermission] = useState<PermissionState>('unknown');
  useEffect(() => {
    let mounted = true;
    void Promise.all([listCachedHealth(500),healthConnect.getAvailability()]).then(async ([cached,available]) => {
      const permitted = available === 'available' ?
        (await healthConnect.getPermissionStatus([metric]))[metric] : 'unknown';
      if (!mounted) return;
      setPermission(permitted);
      if (permitted === 'granted' && cached.ok) {
        setRecord(cached.value.find((r): r is HealthRecord =>
          r.kind !== 'aggregate' && r.recordId === query.recordId &&
          r.dataOrigin === query.origin && r.adapter === query.adapter) ?? null);
      }
    }).catch(() => { /* Stay private when permission cannot be checked. */ })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [metric,query.recordId,query.origin,query.adapter]);

  return <Screen embedded>
    <Header title="Record detail" subtitle="Health Connect · read only"
      onBack={() => { if (router.canGoBack()) router.back(); else router.replace({ pathname: '/(tabs)/progress/health-detail', params: { metric } }); }} />
    {loading ? <Typography tone="secondary">Checking permission and local cache…</Typography> :
      permission !== 'granted' ? <Card title="Not allowed">
        <Typography>This record is hidden until the Health Connect permission is allowed again.</Typography>
      </Card> : !record ? <Card title="Record not available">
        <Typography>No cached record matches this source and ID. Pull to refresh in Health.</Typography>
      </Card> : <>
        <Card rim="health" title="Recorded measurement">
          <Chip kind={record.kind === 'interval' && record.metric === 'steps' &&
            sourceName(record.dataOrigin) === 'Phone' ? 'phone' : 'pending'}
            label={sourceName(record.dataOrigin)} />
          <Chip kind="pending" label="Device not verified" />
          <ListRow title="Value" detail={measuredValue(record)} />
          <ListRow title="Time" detail={new Date(recordAt(record)).toLocaleString()} />
          <ListRow title="Data origin" detail={`${sourceName(record.dataOrigin)} · ${record.dataOrigin}`} />
          <ListRow title="Device" detail={record.device?.model
            ? `${record.device.manufacturer ?? ''} ${record.device.model}`
            : 'Not recorded by the source'} />
          <ListRow title="Recorded and read" detail={`Recorded ${new Date(recordAt(record)).toLocaleTimeString()} · ${query.readAt ?
            'Last checked by Liftria ' + new Date(query.readAt).toLocaleTimeString() :
            'Liftria read time not recorded'}`} />
          <ListRow title="Permission" detail="Allowed · Health Connect read only" />
        </Card>
        <Card title="About these fields">
          <Typography tone="secondary">Data origin names the app that supplied the record. Device identifies the hardware only when the source recorded it. The same app may collect from a phone or watch.</Typography>
          <Typography tone="secondary">Liftria does not write, edit or delete this Health Connect record.</Typography>
        </Card>
      </>}
  </Screen>;
}
