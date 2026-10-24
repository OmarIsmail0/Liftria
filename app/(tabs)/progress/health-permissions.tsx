import { useState } from 'react';
import { router } from 'expo-router';
import { Linking, ScrollView, View } from 'react-native';
import { useTheme } from '../../../src/design/ThemeProvider';
import { Banner, Button, Card, Chip, Header, ListRow, Screen, Typography } from '../../../src/design/primitives';
import { backOrReplace } from '../../../src/navigation/back';
import { healthConnect, requestHistoryReadPermission } from '../../../src/services/health';
import { metricTypes, type MetricType } from '../../../src/services/health/types';
import { overviewMetrics, useHealthSnapshot } from '../../../src/features/health/useHealthSnapshot';
import { healthAvailabilityText, canInstallHealthConnect } from '../../../src/features/health/presentation';

const names: Partial<Record<MetricType,string>> = {
  steps:'Steps', 'heart-rate':'Heart rate', 'exercise-session':'Exercise sessions',
  'sleep-session':'Sleep', weight:'Weight', 'body-fat':'Body fat', 'active-calories':'Active energy',
};
const consequences: Partial<Record<MetricType,string>> = {
  steps:'Daily step totals stay hidden',
  'heart-rate':'Heart rate will not appear',
  'exercise-session':'Exercise sessions will not appear',
  'sleep-session':'Sleep tracking will not appear',
  weight:'Weight readings will not appear',
  'body-fat':'Body fat readings will not appear',
  'active-calories':'No measured energy is available yet in Phase 2',
};

export default function HealthPermissions() {
  const { theme } = useTheme();
  const { snapshot, refresh, refreshing } = useHealthSnapshot(overviewMetrics);
  const [working,setWorking] = useState(false);
  const [message,setMessage] = useState<string|null>(null);
  const available = snapshot.availability === 'available';
  const count = overviewMetrics.filter(type => snapshot.permissions[type] === 'granted').length;
  async function openPermissions() {
    if (!available || working) return;
    setWorking(true);
    try {
      const updated = await healthConnect.requestPermissions([...metricTypes]);
      const history = await requestHistoryReadPermission();
      const allowed = Object.values(updated).filter(v => v === 'granted').length;
      setMessage(`${allowed} of ${metricTypes.length} read types allowed. History: ${history}.`);
      await refresh(true);
    } catch { setMessage('Could not open the Android permission screen. Try Health Connect settings.'); }
    finally { setWorking(false); }
  }

  return <Screen embedded scroll={false}><ScrollView contentContainerStyle={{
    gap: theme.layout.cardGap, paddingVertical: theme.space[4] }}>
    <Header title="Health permissions" subtitle="Android permissions · read only"
      onBack={() => backOrReplace(router, '/(tabs)/progress/health')} />
    <Card title="Health Connect status" rim="health">
      <Typography>{healthAvailabilityText(snapshot.availability)}</Typography>
      <Typography tone="secondary">{available
        ? `${count} of ${overviewMetrics.length} displayed types allowed`
        : 'Your health readings are hidden, not zero.'}</Typography>
      {available && count === 0 && <Typography tone="secondary">Everything else in Liftria still works.</Typography>}
      <Typography tone="secondary">Liftria only reads. It never writes or deletes health data.</Typography>
    </Card>
    <Card title="Read permissions">
      {overviewMetrics.map(type => {
        const state = snapshot.permissions[type] ?? 'unknown';
        const value = state === 'granted' ? 'Allowed' : state === 'denied' ? 'Not allowed' : 'Not confirmed';
        return <ListRow key={type} title={names[type] ?? type}
          accessibilityLabel={`${names[type] ?? type}. ${value}. Opens Android permissions.`}
          detail={state === 'granted' ? 'Read only · managed by Android' : consequences[type] ?? 'Hidden until you allow it'}
          suffix={<Chip kind={state === 'granted' ? 'phone' : 'off'} label={value} />}
          onPress={available ? () => void openPermissions() : undefined} />;
      })}
    </Card>
    {available ? <Button label={working ? 'Opening…' : 'Open Health Connect permissions'}
      disabled={working || refreshing} fullWidth onPress={() => void openPermissions()} />
      : canInstallHealthConnect(snapshot.availability) ?
        <Button label="Get Health Connect" fullWidth onPress={() =>
          void Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata')} />
        : <Typography tone="secondary">Liftria works without Health Connect.</Typography>}
    {message && <Banner title="Permission update" message={message} />}
  </ScrollView></Screen>;
}
