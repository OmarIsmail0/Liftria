import { router } from 'expo-router';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useTheme } from '../../../src/design/ThemeProvider';
import { Button, Card, Chip, Header, ListRow, Screen, Typography } from '../../../src/design/primitives';
import { backOrReplace } from '../../../src/navigation/back';
import { overviewMetrics, useHealthSnapshot } from '../../../src/features/health/useHealthSnapshot';
import { healthAvailabilityText } from '../../../src/features/health/presentation';

export default function HealthTroubleshoot() {
  const { theme } = useTheme();
  const { snapshot, refresh, refreshing } = useHealthSnapshot(overviewMetrics);
  const available = snapshot.availability === 'available';
  const hrGranted = snapshot.permissions['heart-rate'] === 'granted';
  const samsungRecords = snapshot.records.filter(r => r.kind !== 'aggregate' &&
    r.dataOrigin === 'com.sec.android.app.shealth');
  const samsungSteps = snapshot.records.some(r => r.kind === 'interval' && r.metric === 'steps' &&
    r.dataOrigin === 'com.sec.android.app.shealth');
  const phoneSteps = snapshot.readings.steps?.sources.some(r => r.label === 'Phone') ?? false;
  const checks = [
    { name: 'Health Connect installed', state: available ? 'Available' : 'Needs attention',
      detail: healthAvailabilityText(snapshot.availability), good: available },
    { name: 'Liftria can read heart rate', state: hrGranted ? 'Allowed' : 'Not allowed',
      detail: hrGranted ? 'Read-only permission is present' : 'Open Android permissions to allow heart rate', good: hrGranted },
    { name: 'Samsung Health sends records', state: samsungRecords.length ? 'Records found' : 'Not confirmed',
      detail: samsungRecords.length ? 'Samsung Health records are present; device is unverified'
        : 'No Samsung Health records found in the current cache', good: samsungRecords.length > 0 },
    { name: 'Watch synced to Samsung Health', state: "Can't be checked from here",
      detail: 'Check your watch app directly; Liftria has no reliable device sync status', good: false },
    { name: 'Steps from watch', state: samsungSteps ? 'Source found; device unverified' : 'Not confirmed',
      detail: samsungSteps ? 'Samsung Health has steps but did not verify a watch'
        : phoneSteps ? 'Phone steps found; no verified watch steps'
          : 'No verified watch steps found', good: false },
  ];
  return <Screen embedded scroll={false}><ScrollView
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh(true)} />}
    contentContainerStyle={{ gap: theme.layout.cardGap, paddingVertical: theme.space[4] }}>
    <Header title="Troubleshoot sync" subtitle="Only verifiable checks get a tick"
      onBack={() => backOrReplace(router, '/(tabs)/progress/health')} />
    <Card title={refreshing ? 'Checking…' : 'What Liftria can verify'} rim="health">
      {checks.map((item,i) => <ListRow key={i} title={`${i+1}. ${item.name}`}
        accessibilityLabel={`${item.name}. ${item.state}. ${item.detail}`}
        detail={item.detail}
        suffix={<Chip kind={item.good ? 'phone' : 'pending'} label={item.state} />} />)}
      <Typography tone="secondary" size="small">Unknown means we cannot verify it, not that your watch has failed.</Typography>
    </Card>
    <Card title="Something missing?">
      <Typography>Open your watch app and check which record types it sends to Health Connect. Only measurements shared by a source will appear.</Typography>
      <Button label="Show me how" variant="secondary"
        onPress={() => router.push('/(tabs)/progress/health-sync')} />
      <Button label="Open permissions" variant="ghost"
        onPress={() => router.push('/(tabs)/progress/health-permissions')} />
    </Card>
    <Button label={refreshing ? 'Checking…' : 'Check again'} disabled={refreshing}
      fullWidth onPress={() => void refresh(true)} />
  </ScrollView></Screen>;
}
