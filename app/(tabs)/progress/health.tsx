import { useState } from 'react';
import { Linking, RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../../src/design/ThemeProvider';
import { Banner, Button, Card, Chip, Header, ListRow, Screen, Typography } from '../../../src/design/primitives';
import { backOrReplace } from '../../../src/navigation/back';
import { healthConnect, requestHistoryReadPermission } from '../../../src/services/health';
import { metricTypes, type MetricType } from '../../../src/services/health/types';
import { overviewMetrics, useHealthSnapshot } from '../../../src/features/health/useHealthSnapshot';
import { ageLabel, phase2EnergyMessage } from '../../../src/features/health/presentation';

const names: Partial<Record<MetricType, string>> = {
  steps: 'Steps', 'heart-rate': 'Heart rate', 'exercise-session': 'Exercise sessions',
  'sleep-session': 'Sleep', weight: 'Weight', 'body-fat': 'Body fat',
  'active-calories': 'Active energy',
};

export default function HealthOverview() {
  const { theme } = useTheme();
  const { snapshot, refreshing, refresh } = useHealthSnapshot(overviewMetrics);
  const [granting, setGranting] = useState(false);
  const [permissionNote, setPermissionNote] = useState<string | null>(null);
  const available = snapshot.availability === 'available';
  const allowed = overviewMetrics.filter(m => snapshot.permissions[m] === 'granted').length;
  async function connect() {
    setGranting(true);
    try {
      const granted = await healthConnect.requestPermissions([...metricTypes]);
      const count = Object.values(granted).filter(p => p === 'granted').length;
      const history = await requestHistoryReadPermission();
      setPermissionNote(`${count} of ${metricTypes.length} types allowed. History: ${history}. All read-only.`);
      await refresh(true);
    } catch { setPermissionNote('Permissions could not be updated. Try Android Health Connect settings.'); }
    finally { setGranting(false); }
  }

  return <Screen embedded scroll={false}>
    <ScrollView contentContainerStyle={{ paddingVertical: theme.space[4], gap: theme.layout.cardGap }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh(true)}
        colors={[theme.color.domain.health]} tintColor={theme.color.domain.health} />}>
      <Header title="Health" subtitle="Health Connect · read-only"
        onBack={() => backOrReplace(router, '/(tabs)/progress')} />
      <Card rim="health" title={available ? 'Health Connect connected' : 'Connect Health Connect'}>
        <Typography tone="secondary">Liftria reads your health data with permission. It never writes or deletes any Health Connect records.</Typography>
        <Typography>{available
          ? `${allowed} of ${overviewMetrics.length} overview types allowed`
          : 'Health Connect is ' + snapshot.availability + '. Hidden does not mean zero.'}</Typography>
        <Button label={granting ? 'Opening permissions…' : available ? 'Review permissions' : 'Connect'}
          disabled={granting} onPress={() => void connect()} />
        {!available && <Button label="Update Health Connect" variant="secondary"
          onPress={() => void Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata')} />}
        {permissionNote && <Banner title="Permission result" message={permissionNote} />}
        {snapshot.readAt && <Typography tone="secondary" size="small">Last checked {new Date(snapshot.readAt).toLocaleTimeString()}</Typography>}
      </Card>
      <Card title="Measurements by source" rim="health">
        {overviewMetrics.map(metric => {
          const result = snapshot.readings[metric];
          if (metric === 'active-calories') {
            return <ListRow key={metric} title="Active energy"
              detail={phase2EnergyMessage(snapshot.permissions[metric] ?? 'unknown', available)}
              suffix={<Chip kind="off" label={phase2EnergyMessage(snapshot.permissions[metric] ?? 'unknown', available)} />}
              onPress={() => router.push({ pathname: '/(tabs)/progress/health-detail', params: { metric } })} />;
          }
          const first = result?.sources[0];
          const detail = result?.state === 'value'
            ? result.sources.length > 1 ? 'Separate sources · no combined total'
              : `${first?.label ?? 'Source unknown'}${first?.stale ? ` · Stale · ${ageLabel(first.latestAt)}` : ''}${result.unverified ? ' · Unverified device' : ''}`
            : result?.note ?? 'Checking permissions…';
          const amount = result?.state === 'value' && result.total !== null
            ? `${Math.round(result.total).toLocaleString()} ${first?.unit ?? ''}` : null;
          return <ListRow key={metric} title={names[metric] ?? metric} detail={detail}
            suffix={result?.state === 'value' ? <View style={{ gap: theme.space[1], alignItems: 'flex-end' }}>
              {amount && <Typography>{amount}</Typography>}
              {first && <Chip kind={metric === 'heart-rate' ? 'pending' : first.label === 'Phone' ? 'phone' : 'pending'}
                label={metric === 'heart-rate' ? 'Unverified device' : first.label} />}
              {first?.stale && <Chip kind="stale" label={ageLabel(first.latestAt)} />}
            </View> : <Chip kind={result?.state === 'not-allowed' ? 'off' : 'pending'}
              label={result?.state === 'no-data' ? 'No data' : result?.state === 'not-allowed' ? 'Not allowed' : result?.state === 'not-available' ? 'Unavailable' : result?.state === 'error' ? 'Read error' : 'Pending'} />}
            onPress={() => router.push({ pathname: '/(tabs)/progress/health-detail', params: { metric } })} />;
        })}
      </Card>
      <Card title="Where did my watch data go?">
        <Typography tone="secondary">Health Connect reports which app provided a record, not necessarily which device captured it.</Typography>
        <Typography tone="secondary">Check your watch app’s Health Connect sharing permissions. New readings may appear only after you connect.</Typography>
        <Typography tone="secondary" size="small">Samsung Health, Fitbit, Garmin and other apps are not assumed to be watch measurements until verified.</Typography>
      </Card>
      <View style={{ alignItems: 'center' }}>
        <Typography size="small" tone="secondary">Records remain on your phone. Pull down to refresh at any time.</Typography>
      </View>
    </ScrollView>
  </Screen>;
}
