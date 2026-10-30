import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { useState } from 'react';
import { router } from 'expo-router';
import { Linking, ScrollView  } from 'react-native';
import { appleHealthPhone, healthCopy, offerProviderInstall, readAccessIsReported, requestsHistoryRead } from '../../../src/features/health/deviceHealth';
import { useTheme } from '../../../src/design/ThemeProvider';
import { Banner, Button, Card, Chip, Header, ListRow, Screen, Typography } from '../../../src/design/primitives';
import { backOrReplace } from '../../../src/navigation/back';
import { healthConnect, requestHistoryReadPermission } from '../../../src/services/health';
import { metricTypes, type MetricType } from '../../../src/services/health/types';
import { overviewMetrics, useHealthSnapshot } from '../../../src/features/health/useHealthSnapshot';
import { canInstallHealthConnect } from '../../../src/features/health/presentation';

function HealthPermissionsAndroid() {
  const {t}=useLanguage();
  const names: Partial<Record<MetricType,string>> = {
    steps:t('healthPerm.steps'), 'heart-rate':t('healthPerm.heart'),
    'exercise-session':t('healthPerm.sessions'),'sleep-session':t('healthPerm.sleep'),
    weight:t('healthPerm.weight'),'body-fat':t('healthPerm.bodyFat'),
    'active-calories':t('healthPerm.energy'),
  };
  const consequences: Partial<Record<MetricType,string>> = {
    steps:t('healthPerm.hiddenSteps'),'heart-rate':t('healthPerm.hiddenHeart'),
    'exercise-session':t('healthPerm.hiddenSessions'),'sleep-session':t('healthPerm.hiddenSleep'),
    weight:t('healthPerm.hiddenWeight'),'body-fat':t('healthPerm.hiddenBodyFat'),
    'active-calories':t('healthPerm.hiddenEnergy'),
  };
  const availabilityText=(status:string|null):string => appleHealthPhone()
    ? (status==='available'?t('appleHealth.perm.available'):t('appleHealth.perm.unavailable'))
    : status==='available'?t('healthPerm.available')
    :status==='unavailable'?t('healthPerm.unavailable')
    :canInstallHealthConnect(status as Parameters<typeof canInstallHealthConnect>[0])?t('healthPerm.install')
    :t('healthPerm.other');

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
      if (!requestsHistoryRead()) {
        setMessage(t('appleHealth.perm.afterRequest'));
        await refresh(true);
        return;
      }
      const history = await requestHistoryReadPermission();
      const allowed = Object.values(updated).filter(v => v === 'granted').length;
      setMessage(t('healthPerm.success',{allowed,total:metricTypes.length,history:history==='granted'?t('healthPerm.historyGranted'):history==='denied'?t('healthPerm.historyDenied'):history==='unavailable'?t('healthPerm.historyUnavailable'):t('healthPerm.historyUnknown')}));
      await refresh(true);
    } catch { setMessage(appleHealthPhone()?t('appleHealth.perm.error'):t('healthPerm.error')); }
    finally { setWorking(false); }
  }

  if (!snapshot.loaded) return <Screen embedded>
    <Header title={t('healthPerm.loadingTitle')} subtitle={t(healthCopy('perm.loading'))} />
    <Typography tone="secondary">{t(healthCopy('perm.loadingDetails'))}</Typography>
  </Screen>;
  return <Screen embedded scroll={false}><ScrollView contentContainerStyle={{
    gap: theme.layout.cardGap, paddingVertical: theme.space[4] }}>
    <Header title={t('healthPerm.loadingTitle')} subtitle={t(healthCopy('perm.subtitle'))}
      onBack={() => backOrReplace(router, '/(tabs)/progress/health')} />
    <Card title={t(healthCopy('perm.status'))} rim="health">
      <Typography>{availabilityText(snapshot.availability)}</Typography>
      <Typography tone="secondary">{available
        ? (readAccessIsReported()
          ? t('healthPerm.allowedCount',{count,total:overviewMetrics.length})
          : t('appleHealth.overview.accessUnknown'))
        : t('healthPerm.hidden')}</Typography>
      {available && readAccessIsReported() && count === 0 && <Typography tone="secondary">{t('healthPerm.works')}</Typography>}
      <Typography tone="secondary">{t(healthCopy('perm.readOnly'))}</Typography>
      {!readAccessIsReported() && <Typography tone="secondary">{t('appleHealth.changeAccess')}</Typography>}
    </Card>
    <Card title={t('healthPerm.list')}>
      {overviewMetrics.map(type => {
        const state = snapshot.permissions[type] ?? 'unknown';
        const value = !readAccessIsReported()
          ? t('appleHealth.perm.unknown')
          : state === 'granted' ? t('healthPerm.allowed') : state === 'denied' ? t('healthPerm.denied') : t('healthPerm.unverified');
        return <ListRow key={type} title={names[type] ?? type}
          accessibilityLabel={t(readAccessIsReported()?'healthPerm.openHint':'appleHealth.perm.openHint',{name:names[type]??type,state:value})}
          detail={!readAccessIsReported()
            ? t('appleHealth.perm.managed')
            : state === 'granted' ? t('healthPerm.androidManaged') : consequences[type] ?? t('healthPerm.hiddenUntil')}
          suffix={<Chip kind="off" label={value} />}
          onPress={available ? () => void openPermissions() : undefined} />;
      })}
    </Card>
    {available ? <Button label={working ? t(healthCopy('perm.opening')) : t(healthCopy('perm.request'))}
      disabled={working || refreshing} fullWidth onPress={() => void openPermissions()} />
      : offerProviderInstall() && canInstallHealthConnect(snapshot.availability) ?
        <Button label={t('healthPerm.get')} fullWidth onPress={() =>
          void Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata')} />
        : <Typography tone="secondary">{t(healthCopy('perm.without'))}</Typography>}
    {message && <Banner title={t('healthPerm.permissionUpdate')} message={message} />}
  </ScrollView></Screen>;
}

export default function HealthPermissions(){
 return <HealthPermissionsAndroid/>;
}
