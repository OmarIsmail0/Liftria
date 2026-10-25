import { router } from 'expo-router';
import { useTheme } from '../../src/design/ThemeProvider';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { Card, Header, Screen, SegmentedControl, Typography } from '../../src/design/primitives';
import { backOrReplace } from '../../src/navigation/back';
import type { ThemeMode, VisualStyle } from '../../src/design/tokens';

/** ST-3 Appearance is available before the rest of Settings (Phase 2 step 8). */
export default function AppearanceSettings() {
  const { theme, preferences, setMode, setStyle } = useTheme();
  const { t } = useLanguage();
  const isForcedSolid = preferences.style !== theme.effectiveStyle;
  const modeOptions: readonly { value: ThemeMode; label: string }[] = [
    { value: 'system', label: t('common.system') },
    { value: 'dark', label: t('appearance.dark') },
    { value: 'light', label: t('appearance.light') },
  ];
  const styleOptions: readonly { value: VisualStyle; label: string }[] = [
    { value: 'aurora', label: t('appearance.aurora') },
    { value: 'solid', label: t('appearance.solid') },
  ];
  return <Screen>
    <Header title={t('appearance.title')} subtitle={t('appearance.subtitle')} onBack={() => backOrReplace(router, '/settings')} />
    <Card title={t('appearance.theme')}>
      <Typography tone="secondary" size="small">{t('appearance.themeDescription')}</Typography>
      <SegmentedControl label={t('appearance.theme')} options={modeOptions}
        value={preferences.mode} onChange={setMode} />
    </Card>
    <Card title={t('appearance.style')}>
      <Typography tone="secondary" size="small">{t('appearance.styleDescription')}</Typography>
      <SegmentedControl label={t('appearance.style')} options={styleOptions}
        value={preferences.style} onChange={setStyle} />
      <Typography tone="secondary" size="small">{t('appearance.solidAutomatic')}</Typography>
      {isForcedSolid && <Typography tone="secondary" size="small">{t('appearance.solidAccessibility')}</Typography>}
    </Card>
  </Screen>;
}
