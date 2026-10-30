import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { I18nManager, Pressable, View } from 'react-native';
import { useTheme } from '../../src/design/ThemeProvider';
import { useLanguage, systemLanguage } from '../../src/i18n/LanguageProvider';
import { resolveLanguage, type LanguagePreference } from '../../src/i18n';
import { Button, Card, Header, ListRow, Screen, SegmentedControl, Sheet, Typography } from '../../src/design/primitives';
import { backOrReplace } from '../../src/navigation/back';
import { devRoutesEnabled } from '../../src/navigation/devRoutes';
import { advanceVersionTap, initialVersionTapState } from '../../src/navigation/versionTap';
import releaseVersion from '../../src/config/releaseVersion.json';
import { localStorageCounts } from '../../src/services/database';
import { formatLocalDatabaseSize } from '../../src/features/settings/storage';
import { healthCopy } from '../../src/features/health/deviceHealth';

/** Local-first grouped settings, with appearance controls available immediately. */
export default function SettingsHome() {
  const { theme, preferences, setMode } = useTheme();
  const { t, language, preference, setLanguage } = useLanguage();
  const [reopen, setReopen] = useState(false);
  const [languageError, setLanguageError] = useState(false);
  const taps = useRef(initialVersionTapState);
  const [databaseSize, setDatabaseSize] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void localStorageCounts().then(result => {
      if(alive && result.ok) setDatabaseSize(formatLocalDatabaseSize(result.value.databaseBytes, language));
    });
    return () => { alive = false; };
  }, [language]);
  async function changeLanguage(next: LanguagePreference) {
    const ok = await setLanguage(next);
    setLanguageError(!ok);
    if (ok && (resolveLanguage(next, systemLanguage()) === 'ar') !== I18nManager.isRTL) setReopen(true);
  }
  return <Screen>
    <Header title={t('settings.home.title')} onBack={() => backOrReplace(router, '/(tabs)/today')} />
    <Card title={t('polish.appearance')}>
      <Typography tone="secondary" size="small">{t('appearance.theme')}</Typography>
      <SegmentedControl label={t('appearance.theme')} value={preferences.mode}
        options={[{ value: 'system', label: t('common.system') },
          { value: 'light', label: t('appearance.light') },
          { value: 'dark', label: t('appearance.dark') }] as const} onChange={setMode} />
      <Typography tone="secondary" size="small">{t('language.title')}</Typography>
      <SegmentedControl label={t('language.title')} value={preference}
        options={[{ value: 'system', label: t('common.system') },
          { value: 'ar', label: t('common.arabic') },
          { value: 'en', label: t('common.english') }] as const}
        onChange={v => void changeLanguage(v)} />
      {languageError && <Typography tone="secondary">{t('language.saveError')}</Typography>}
    </Card>
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
      <ListRow title={t(healthCopy('settings.title'))} detail={t(healthCopy('settings.detail'))}
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
          if (next.unlocked && devRoutesEnabled()) router.push('/dev');
        }}
        style={{ minHeight: theme.size.touch.min, justifyContent: 'center' }}>
        <Typography tone="secondary" size="small">{t('settings.home.version', { version: releaseVersion.name })}</Typography>
      </Pressable>
    </Card>
    <Sheet visible={reopen} title={t('language.restartTitle')}
      description={t('language.restartDescription')} onClose={() => setReopen(false)}>
      <Button label={t('common.ok')} fullWidth onPress={() => setReopen(false)} />
    </Sheet>
    <View style={{ alignItems: 'center' }}>
      <Typography tone="secondary" size="small">{t('settings.home.storage', { size: databaseSize ?? t('settings.home.calculating') })}</Typography>
    </View>
  </Screen>;
}
