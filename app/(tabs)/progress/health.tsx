import { Linking, RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../../src/design/ThemeProvider';
import { Button, Card, Chip, Header, ListRow, Screen, Typography } from '../../../src/design/primitives';
import { backOrReplace } from '../../../src/navigation/back';
import { type MetricType } from '../../../src/services/health/types';
import { overviewMetrics, useHealthSnapshot } from '../../../src/features/health/useHealthSnapshot';
import { ageLabel, canInstallHealthConnect, earliestCachedRecordAt,
  healthAvailabilityText, phase2EnergyMessage } from '../../../src/features/health/presentation';

const names: Partial<Record<MetricType,string>> = {
  steps: 'Steps', 'heart-rate': 'Heart rate', 'exercise-session': 'Exercise sessions',
  'sleep-session': 'Sleep', weight: 'Weight', 'body-fat': 'Body fat',
  'active-calories': 'Active energy',
};

export default function HealthOverview() {
  const { theme } = useTheme();
  const { snapshot, refreshing, refresh } = useHealthSnapshot(overviewMetrics);
  const available = snapshot.availability === 'available';
  const allowed = overviewMetrics.filter(m => snapshot.permissions[m] === 'granted').length;
  const firstSeen = earliestCachedRecordAt(snapshot.records);
  return <Screen embedded scroll={false}>
    <ScrollView contentContainerStyle={{ paddingVertical: theme.space[4], gap: theme.layout.cardGap }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh(true)}
        colors={[theme.color.domain.health]} tintColor={theme.color.domain.health} />}>
      <Header title="Health" subtitle="Health Connect · read-only"
        onBack={() => backOrReplace(router, '/(tabs)/progress')} />
      <Card rim="health" title={available ? 'Health Connect · connected · reads only' : 'Connect Health Connect'}>
        <Typography tone="secondary">Liftria reads your health data with permission. It never writes, changes or deletes records in Health Connect.</Typography>
        <Typography>{healthAvailabilityText(snapshot.availability)}</Typography>
        <Typography>{available
          ? `Permissions · ${allowed} of ${overviewMetrics.length} displayed types allowed`
          : 'Values hidden, not zero.'}</Typography>
        <Typography tone="secondary" size="small">{firstSeen
          ? `Data available from ${new Date(firstSeen).toLocaleDateString()} · earliest cached record, not a confirmed connection date`
          : 'No cached health records yet · connection date not known'}</Typography>
        <Button label={available ? 'Review permissions' : 'Health Connect permissions'} variant="secondary"
          onPress={() => router.push('/(tabs)/progress/health-permissions')} />
        {!available && canInstallHealthConnect(snapshot.availability) &&
          <Button label="Get Health Connect" onPress={() =>
            void Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata')} />}
        {!available && <Typography tone="secondary">Liftria works without Health Connect.</Typography>}
        {snapshot.readAt && <Typography tone="secondary" size="small">Last checked {new Date(snapshot.readAt).toLocaleTimeString()}</Typography>}
      </Card>
      <Card title="Measurements by source" rim="health">
        {overviewMetrics.map(metric => {
          const result = snapshot.readings[metric];
          if (metric === 'active-calories') {
            const state = phase2EnergyMessage(snapshot.permissions[metric] ?? 'unknown', available);
            return <ListRow key={metric} title="Active energy" detail={state}
              suffix={<Chip kind="off" label={state} />}
              onPress={() => router.push({ pathname: '/(tabs)/progress/health-detail', params: { metric } })} />;
          }
          const first = result?.sources[0];
          const state = result?.state;
          const detail = state === 'value'
            ? result.sources.length > 1 ? 'Separate app sources · no combined total'
              : `${first?.label ?? 'Unknown source'} · ${first ? ageLabel(first.latestAt) : 'time unknown'}${result.unverified ? ' · Device not recorded or verified' : ''}`
            : result?.note ?? 'Checking Health Connect…';
          const amount = state === 'value' && result.total !== null
            ? `${Math.round(result.total).toLocaleString()} ${first?.unit ?? ''}` : null;
          return <ListRow key={metric} title={names[metric] ?? metric} detail={detail}
            suffix={state === 'value' ? <View style={{ alignItems:'flex-end',gap:theme.space[1] }}>
              {amount && <Typography>{amount}</Typography>}
              {first && <Chip kind={metric === 'heart-rate' ? 'pending' : first.label === 'Phone' ? 'phone' : 'pending'}
                label={metric === 'heart-rate' ? 'Unverified device' : first.label} />}
              {first?.stale && <Chip kind="stale" label={ageLabel(first.latestAt)} />}
            </View> : <Chip kind={state === 'not-allowed' ? 'off' : 'pending'}
              label={state === 'no-data' ? 'No data' : state === 'not-allowed' ? 'Not allowed' :
                state === 'not-available' ? 'Unavailable' : state === 'error' ? 'Read error' : 'Pending'} />}
            onPress={() => router.push({ pathname: '/(tabs)/progress/health-detail', params: { metric } })} />;
        })}
      </Card>
      <Card title="Watch data missing?">
        <Typography tone="secondary">Health Connect reports which app supplied each record. That alone does not prove a watch captured it.</Typography>
        <ListRow title="Samsung Health sync guide" detail="Five steps · works as a brand-neutral watch guide"
          onPress={() => router.push('/(tabs)/progress/health-sync')} />
        <ListRow title="Troubleshoot sync" detail="Check permissions, source records and what cannot be verified"
          onPress={() => router.push('/(tabs)/progress/health-troubleshoot')} />
      </Card>
      <View style={{ alignItems: 'center' }}>
        <Typography size="small" tone="secondary">Health Connect stays read-only. Pull down to recheck permissions and records.</Typography>
      </View>
    </ScrollView>
  </Screen>;
}
