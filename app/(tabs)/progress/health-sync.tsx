import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { appleHealthPhone } from '../../../src/features/health/deviceHealth';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ScrollView, View  } from 'react-native';
import { useTheme } from '../../../src/design/ThemeProvider';
import { Button, Card, Header, ListRow, Screen, Typography } from '../../../src/design/primitives';
import { backOrReplace } from '../../../src/navigation/back';
import { getSetting } from '../../../src/services/database';

const supported = ['Samsung Health','Fitbit','Garmin Connect','Pixel Watch (Fitbit)','Other'] as const;
function HealthSyncGuideAndroid() {
 const {t}=useLanguage();
  const { theme } = useTheme();
  const [app, setApp] = useState<string>('');
  useEffect(() => {
    let mounted = true;
    void getSetting('onboarding.flowDraft').then(value => {
      if (!mounted || !value.ok || !value.value) return;
      try {
        const raw: unknown = JSON.parse(value.value);
        if (raw && typeof raw === 'object' && 'selectedWatch' in raw) {
          const selected = (raw as { selectedWatch: unknown }).selectedWatch;
          if (typeof selected === 'string' && supported.includes(selected as typeof supported[number])) setApp(selected);
        }
      } catch { /* Unknown draft: the brand-neutral guide remains valid. */ }
    });
    return () => { mounted = false; };
  }, []);
  return <Screen embedded scroll={false}><ScrollView contentContainerStyle={{
    gap: theme.layout.cardGap, paddingVertical: theme.space[4] }}>
    <Header title={t('healthSync.title')} subtitle={app||t('healthSync.watchApp')}
      onBack={() => backOrReplace(router, '/(tabs)/progress/health')} />
    <Card title={t('healthSync.checklist')} rim="health">
      {[
        ['1',t('healthSync.step1',{app:app||t('healthSync.watchApp')}),t('healthSync.step1Detail')],
        ['2',t('healthSync.step2'),t('healthSync.step2Detail')],
        ['3',t('healthSync.step3'),t('healthSync.step3Detail',{app:app||t('healthSync.watchApp')})],
        ['4',t('healthSync.step4'),t('healthSync.step4Detail')],
        ['5',t('healthSync.step5'),t('healthSync.step5Detail')],
      ].map(([n,title,detail]) => <ListRow key={n} title={n+'. '+title} detail={detail} />)}
      <Typography tone="secondary" size="small">{t('healthSync.versions')}</Typography>
    </Card>
    <Card title={t('healthSync.historyTitle')}>
      <Typography>{t('healthSync.history')}</Typography>
      <Typography tone="secondary">{t('healthSync.noRecord')}</Typography>
    </Card>
    <View style={{ gap: theme.space[2] }}>
      <Button label={t('healthSync.permissions')} variant="secondary" fullWidth
        onPress={() => router.push('/(tabs)/progress/health-permissions')} />
      <Button label={t('healthSync.recheck')} fullWidth
        onPress={() => router.push('/(tabs)/progress/health-troubleshoot')} />
    </View>
  </ScrollView></Screen>;
}

function HealthSyncGuideIos() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  return <Screen embedded scroll={false}><ScrollView contentContainerStyle={{
    gap: theme.layout.cardGap, paddingVertical: theme.space[4] }}>
    <Header title={t('appleHealth.sync.title')} subtitle={t('appleHealth.sync.subtitle')}
      onBack={() => backOrReplace(router, '/(tabs)/progress/health')} />
    <Card title={t('appleHealth.overview.watchTitle')} rim="health">
      <Typography>{t('appleHealth.sync.body')}</Typography>
      <Typography tone="secondary">{t('appleHealth.changeAccess')}</Typography>
    </Card>
    <View style={{ gap: theme.space[2] }}>
      <Button label={t('appleHealth.sync.permissions')} variant="secondary" fullWidth
        onPress={() => router.push('/(tabs)/progress/health-permissions')} />
      <Button label={t('appleHealth.sync.recheck')} fullWidth
        onPress={() => router.push('/(tabs)/progress/health-troubleshoot')} />
    </View>
  </ScrollView></Screen>;
}

export default function HealthSyncGuide(){
 return appleHealthPhone() ? <HealthSyncGuideIos/> : <HealthSyncGuideAndroid/>;
}
