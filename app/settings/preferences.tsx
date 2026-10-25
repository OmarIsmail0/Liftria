import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { I18nManager, View } from 'react-native';
import { useLanguage, systemLanguage } from '../../src/i18n/LanguageProvider';
import { resolveLanguage, type LanguagePreference } from '../../src/i18n';
import { Button, Card, Header, ListRow, Screen, SegmentedControl, Sheet, Toggle, Typography } from '../../src/design/primitives';
import { useTheme } from '../../src/design/ThemeProvider';
import { backOrReplace } from '../../src/navigation/back';
import { getTypedSetting, setTypedSetting } from '../../src/services/database/settings';
import type { WeightUnit, HeightUnit } from '../../src/features/settings/units';

type Prefs = {
  weight: WeightUnit; height: HeightUnit; hideNumbers: boolean;
  keepScreenOn: boolean; haptics: boolean; smallPlates: boolean;
};
const defaults: Prefs = { weight: 'kg', height: 'cm', hideNumbers: false,
  keepScreenOn: true, haptics: true, smallPlates: false };

export default function UnitsAndAppearance() {
  const { theme } = useTheme();
  const { t, preference, setLanguage } = useLanguage();
  const [reopen, setReopen] = useState(false);
  const [values, setValues] = useState<Prefs>(defaults);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    void Promise.all([
      getTypedSetting('units.weight'), getTypedSetting('units.height'),
      getTypedSetting('hideNumbers'), getTypedSetting('keepScreenOn'),
      getTypedSetting('haptics'), getTypedSetting('units.smallPlates'),
    ]).then(([weight, height, hide, screen, haptics, plates]) => {
      if (!mounted) return;
      setValues({
        weight: weight.ok ? weight.value : 'kg', height: height.ok ? height.value : 'cm',
        hideNumbers: hide.ok ? hide.value : false,
        keepScreenOn: screen.ok ? screen.value : true,
        haptics: haptics.ok ? haptics.value : true,
        smallPlates: plates.ok ? plates.value : false,
      });
    }).catch(() => { if (mounted) setError(t('preferences.readError')); })
      .finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, [t]);

  async function changeLanguage(next: LanguagePreference) {
    const saved = await setLanguage(next);
    if (!saved) { setError(t('language.saveError')); return; }
    setError(null);
    if ((resolveLanguage(next, systemLanguage()) === 'ar') !== I18nManager.isRTL) setReopen(true);
  }

  async function change<K extends keyof Prefs>(name: K, value: Prefs[K]) {
    const old = values[name];
    setValues(previous => ({ ...previous, [name]: value }));
    setError(null);
    const saved = name === 'weight' ? await setTypedSetting('units.weight', value as WeightUnit) :
      name === 'height' ? await setTypedSetting('units.height', value as HeightUnit) :
        name === 'hideNumbers' ? await setTypedSetting('hideNumbers', value as boolean) :
          name === 'keepScreenOn' ? await setTypedSetting('keepScreenOn', value as boolean) :
            name === 'smallPlates' ? await setTypedSetting('units.smallPlates', value as boolean) :
             await setTypedSetting('haptics', value as boolean);
    if (!saved.ok) {
      setValues(previous => ({ ...previous, [name]: old }));
      setError(t('preferences.saveError'));
    }
  }

  return <Screen>
    <Header title={t('preferences.title')} subtitle={t('preferences.subtitle')}
      onBack={() => backOrReplace(router, '/settings')} />
    <Card title={t('language.title')}>
      <Typography tone="secondary" size="small">{t('language.description')}</Typography>
      <SegmentedControl label={t('language.title')} value={preference}
        options={[{ value: 'system', label: t('common.system') },
          { value: 'ar', label: t('common.arabic') },
          { value: 'en', label: t('common.english') }] as const}
        onChange={v => void changeLanguage(v)} />
    </Card>
    <Card title={t('preferences.units')}>
      <Typography tone="secondary" size="small">{t('preferences.unitsDescription')}</Typography>
      <SegmentedControl label={t('preferences.weight')} options={[{ value:'kg', label:'kg' }, { value:'lb', label:'lb' }]}
        value={values.weight} onChange={v => void change('weight', v)} />
      <SegmentedControl label={t('preferences.height')} options={[{ value:'cm', label:'cm' }, { value:'ftin', label:'ft / in' }]}
        value={values.height} onChange={v => void change('height', v)} />
      <Toggle label={t('preferences.smallPlates')} detail={t('preferences.smallPlatesDetail')}
        value={values.smallPlates} onChange={v => void change('smallPlates', v)} />
      <Typography tone="secondary">{t('preferences.energy')}</Typography>
      <Typography tone="secondary" size="small">{t('preferences.kjFuture')}</Typography>
    </Card>
    <Card title={t('preferences.appearance')}>
      <ListRow title={t('preferences.themeRow')} detail={t('preferences.themeDetail')}
        onPress={() => router.push('/settings/appearance')} />
    </Card>
    <Card title={t('preferences.display')}>
      <Toggle label={t('preferences.hide')} detail={t('preferences.hideDetail')}
        value={values.hideNumbers} onChange={v => void change('hideNumbers', v)} />
      <Toggle label={t('preferences.keepOn')} detail={t('preferences.keepOnDetail')}
        value={values.keepScreenOn} onChange={v => void change('keepScreenOn', v)} />
      <Toggle label={t('preferences.haptics')} detail={t('preferences.hapticsDetail')}
        value={values.haptics} onChange={v => void change('haptics', v)} />
    </Card>
    {!ready && <Typography tone="secondary">{t('preferences.loading')}</Typography>}
    {error && <View accessibilityRole="alert" style={{ paddingVertical: theme.space[2] }}>
      <Typography tone="secondary">ⓘ {error}</Typography>
    </View>}
    <Button label={t('preferences.back')} variant="ghost" onPress={() => backOrReplace(router, '/settings')} />
    <Sheet visible={reopen} title={t('language.restartTitle')}
      description={t('language.restartDescription')} onClose={() => setReopen(false)}>
      <Button label={t('common.ok')} fullWidth onPress={() => setReopen(false)} />
    </Sheet>
  </Screen>;
}
