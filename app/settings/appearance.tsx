import { router } from 'expo-router';
import { useTheme } from '../../src/design/ThemeProvider';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { Card, Header, Screen, SegmentedControl, Typography } from '../../src/design/primitives';
import { backOrReplace } from '../../src/navigation/back';
import type { ThemeMode } from '../../src/design/tokens';

/** Theme only. A stored visual-style value is still read, and it is no longer a choice. */
export default function AppearanceSettings() {
  const { preferences, setMode } = useTheme();
  const { t } = useLanguage();
  const modeOptions: readonly { value: ThemeMode; label: string }[] = [
    { value: 'system', label: t('common.system') },
    { value: 'dark', label: t('appearance.dark') },
    { value: 'light', label: t('appearance.light') },
  ];
  return <Screen>
    <Header title={t('appearance.title')} subtitle={t('appearance.subtitle')} onBack={() => backOrReplace(router, '/settings')} />
    <Card title={t('appearance.theme')}>
      <Typography tone="secondary" size="secondary">{t('appearance.themeDescription')}</Typography>
      <SegmentedControl label={t('appearance.theme')} options={modeOptions}
        value={preferences.mode} onChange={setMode} />
    </Card>
  </Screen>;
}
