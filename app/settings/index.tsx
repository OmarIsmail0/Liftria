import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useTheme } from '../../src/design/ThemeProvider';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { Card, Header, ListRow, Screen, Typography } from '../../src/design/primitives';
import { backOrReplace } from '../../src/navigation/back';
import { advanceVersionTap, initialVersionTapState } from '../../src/navigation/versionTap';
import releaseVersion from '../../src/config/releaseVersion.json';
import { localStorageCounts } from '../../src/services/database';
import { formatLocalDatabaseSize } from '../../src/features/settings/storage';

/** ST-1: grouped local Settings, with Phase 3/4 features explicitly labeled Future. */
export default function SettingsHome() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const taps = useRef(initialVersionTapState);
  const [databaseSize, setDatabaseSize] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void localStorageCounts().then(result => {
      if(alive && result.ok) setDatabaseSize(formatLocalDatabaseSize(result.value.databaseBytes));
    });
    return () => { alive = false; };
  }, []);
  return <Screen>
    <Header title={t('settings.home.title')} onBack={() => backOrReplace(router, '/(tabs)/today')} />
    <Card title={t('settings.home.plan')}>
      <ListRow title={t('settings.home.profile')} detail={t('settings.home.profileDetail')}
        onPress={() => router.push('/settings/profile')} />
    </Card>
    <Card title={t('settings.home.personalization')}>
      <ListRow title={t('settings.home.units')} detail={t('settings.home.unitsDetail')}
        onPress={() => router.push('/settings/preferences')} />
      <ListRow title={t('settings.home.hiku')} detail={t('settings.home.hikuDetail')}
        onPress={() => router.push('/settings/hiku-key')} />
    </Card>
    <Card title={t('settings.home.notificationsData')}>
      <ListRow title={t('settings.home.notifications')} detail={t('settings.home.notificationsDetail')}
        onPress={() => router.push('/settings/notifications')} />
      <ListRow title={t('settings.home.health')} detail={t('settings.home.healthDetail')}
        onPress={() => router.push('/(tabs)/progress/health')} />
      <ListRow title={t('settings.home.data')} detail={t('settings.home.dataDetail')}
        onPress={() => router.push('/settings/data')} />
    </Card>
    <Card title={t('settings.home.help')}>
      <ListRow title={t('settings.home.helpRow')} detail={t('settings.home.helpDetail')}
        onPress={() => router.push('/settings/about')} />
      <Typography tone="secondary">{t('settings.home.privacy')}</Typography>
      <Pressable accessibilityRole="button" accessibilityLabel={t('settings.home.appVersion')}
        onPress={() => {
          const next = advanceVersionTap(taps.current, Date.now());
          taps.current = next.state;
          if (next.unlocked) router.push('/dev');
        }}
        style={{ minHeight: theme.size.touch.min, justifyContent: 'center' }}>
        <Typography tone="secondary" size="small">{t('settings.home.version', { version: releaseVersion.name })}</Typography>
      </Pressable>
    </Card>
    <View style={{ alignItems: 'center' }}>
      <Typography tone="secondary" size="small">{t('settings.home.storage', { size: databaseSize ?? t('settings.home.calculating') })}</Typography>
    </View>
  </Screen>;
}
