import {AppleHealthComing} from '../../../src/features/health/AppleHealthComing';
import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { router } from 'expo-router';
import { Platform, RefreshControl, ScrollView  } from 'react-native';
import { useTheme } from '../../../src/design/ThemeProvider';
import { Button, Card, Chip, Header, ListRow, Screen, Typography } from '../../../src/design/primitives';
import { backOrReplace } from '../../../src/navigation/back';
import { overviewMetrics, useHealthSnapshot } from '../../../src/features/health/useHealthSnapshot';

function HealthTroubleshootAndroid() {
  const {t}=useLanguage();
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
    { name: t('healthTr.installed'), state: available ? t('healthTr.available') : t('healthTr.attention'),
      detail: available ? t('healthTr.connectAvailable') : t('healthTr.connectUnavailable'), good: available },
    { name: t('healthTr.heartPermission'), state: hrGranted ? t('healthTr.allowed') : t('healthTr.notAllowed'),
      detail: hrGranted ? t('healthTr.heartPresent') : t('healthTr.heartMissing'), good: hrGranted },
    { name: t('healthTr.samsung'), state: samsungRecords.length ? t('healthTr.recordsFound') : t('healthTr.unconfirmed'),
      detail: samsungRecords.length ? t('healthTr.samsungFound')
        : t('healthTr.samsungNone'), good: samsungRecords.length > 0 },
    { name: t('healthTr.watchSynced'), state: t('healthTr.cannotCheck'),
      detail: t('healthTr.checkWatch'), good: false },
    { name: t('healthTr.watchSteps'), state: samsungSteps ? t('healthTr.sourceUnverified') : t('healthTr.unconfirmed'),
      detail: samsungSteps ? t('healthTr.samsungSteps')
        : phoneSteps ? t('healthTr.phoneSteps')
          : t('healthTr.noWatchSteps'), good: false },
  ];
  return <Screen embedded scroll={false}><ScrollView
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh(true)} />}
    contentContainerStyle={{ gap: theme.layout.cardGap, paddingVertical: theme.space[4] }}>
    <Header title={t('healthTr.title')} subtitle={t('healthTr.subtitle')}
      onBack={() => backOrReplace(router, '/(tabs)/progress/health')} />
    <Card title={refreshing ? t('healthTr.checking') : t('healthTr.verify')} rim="health">
      {checks.map((item,i) => <ListRow key={i} title={`${i+1}. ${item.name}`}
        accessibilityLabel={`${item.name}. ${item.state}. ${item.detail}`}
        detail={item.detail}
        suffix={<Chip kind={item.good ? 'off' : 'pending'} label={item.state} />} />)}
      <Typography tone="secondary" size="small">{t('healthTr.unknown')}</Typography>
    </Card>
    <Card title={t('healthTr.missingTitle')}>
      <Typography>{t('healthTr.instructions')}</Typography>
      <Button label={t('healthTr.how')} variant="secondary"
        onPress={() => router.push('/(tabs)/progress/health-sync')} />
      <Button label={t('healthTr.permissions')} variant="ghost"
        onPress={() => router.push('/(tabs)/progress/health-permissions')} />
    </Card>
    <Button label={refreshing ? t('healthTr.checking') : t('healthTr.recheck')} disabled={refreshing}
      fullWidth onPress={() => void refresh(true)} />
  </ScrollView></Screen>;
}

export default function HealthTroubleshoot(){
 return Platform.OS==='android'?<HealthTroubleshootAndroid/>:
  <AppleHealthComing backTo='/(tabs)/progress/health'/>;
}
