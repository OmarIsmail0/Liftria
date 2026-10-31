import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { weightUnitLabel } from '../../src/i18n';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { Button, Card, Header, Screen, SegmentedControl, Stepper, Toggle, Typography } from '../../src/design/primitives';
import { useTheme } from '../../src/design/ThemeProvider';
import { backOrReplace } from '../../src/navigation/back';
import { getTypedSetting, setTypedSetting } from '../../src/services/database/settings';
import type { WeightUnit, HeightUnit } from '../../src/features/settings/units';

type Prefs = {
  weight: WeightUnit; height: HeightUnit; hideNumbers: boolean;
  keepScreenOn: boolean; haptics: boolean; smallPlates: boolean;
  barKg:number;barLb:number;effort:'off'|'rpe'|'rir';glassMl:number;
};
const defaults: Prefs = { weight: 'kg', height: 'cm', hideNumbers: false,
  keepScreenOn: true, haptics: true, smallPlates: false,barKg:20,barLb:45,effort:'off',glassMl:250 };

export default function UnitsAndPreferences() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const [values, setValues] = useState<Prefs>(defaults);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    void Promise.all([
      getTypedSetting('units.weight'), getTypedSetting('units.height'),
      getTypedSetting('hideNumbers'), getTypedSetting('keepScreenOn'),
      getTypedSetting('haptics'), getTypedSetting('units.smallPlates'),
      getTypedSetting('train.barKg'),getTypedSetting('train.barLb'),getTypedSetting('train.effortField'),
      getTypedSetting('water.glassMl'),
    ]).then(([weight, height, hide, screen, haptics, plates, barKg, barLb, effort,glassMl]) => {
      if (!mounted) return;
      setValues({
        weight: weight.ok ? weight.value : 'kg', height: height.ok ? height.value : 'cm',
        hideNumbers: hide.ok ? hide.value : false,
        keepScreenOn: screen.ok ? screen.value : true,
        barKg:barKg.ok?barKg.value:20,barLb:barLb.ok?barLb.value:45,
        effort:effort.ok?effort.value:'off',glassMl:glassMl.ok?glassMl.value:250,
        haptics: haptics.ok ? haptics.value : true,
        smallPlates: plates.ok ? plates.value : false,
      });
    }).catch(() => { if (mounted) setError(t('preferences.readError')); })
      .finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, [t]);

  async function change<K extends keyof Prefs>(name: K, value: Prefs[K]) {
    const old = values[name];
    setValues(previous => ({ ...previous, [name]: value }));
    setError(null);
    const saved = name === 'glassMl' ? await setTypedSetting('water.glassMl',value as number) :
      name === 'barKg' ? await setTypedSetting('train.barKg', value as number) :
      name === 'barLb' ? await setTypedSetting('train.barLb', value as number) :
      name === 'effort' ? await setTypedSetting('train.effortField',value as Prefs['effort']) :
      name === 'weight' ? await setTypedSetting('units.weight', value as WeightUnit) :
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
    <Card title={t('preferences.units')}>
      <Typography tone="secondary" size="small">{t('preferences.unitsDescription')}</Typography>
      <SegmentedControl label={t('preferences.weight')} options={[
        { value:'kg', label:weightUnitLabel(language,'kg') }, { value:'lb', label:weightUnitLabel(language,'lb') }]}
        value={values.weight} onChange={v => void change('weight', v)} />
      <SegmentedControl label={t('preferences.height')} options={[{ value:'cm', label:t('units.cm') }, { value:'ftin', label:t('units.ftIn') }]}
        value={values.height} onChange={v => void change('height', v)} />
      <Stepper label={t('gymParity.barWeight',{unit:weightUnitLabel(language,values.weight)})}
        value={values.weight==='kg'?values.barKg:values.barLb}
        unit={weightUnitLabel(language,values.weight)} step={values.weight==='kg'?2.5:5} min={2.5} max={values.weight==='kg'?100:220}
        onChange={v=>void change(values.weight==='kg'?'barKg':'barLb',v)}/>
      <Toggle label={t('preferences.smallPlates')} detail={t('preferences.smallPlatesDetail')}
        value={values.smallPlates} onChange={v => void change('smallPlates', v)} />
      <Typography tone="secondary">{t('preferences.energy')}</Typography>
      <Typography tone="secondary" size="small">{t('preferences.kjFuture')}</Typography>
    </Card>
    <Card title={t('water.settings')}>
      <Stepper label={t('water.glassSize')} value={values.glassMl} unit={t('units.ml')}
       step={50} min={50} max={1000} onChange={v=>void change('glassMl',v)}/>
    </Card>
    <Card title={t('gymParity.trainingSettings')}>
      <Typography tone="secondary" size="small">{t('gymParity.effortHint')}</Typography>
      <SegmentedControl label={t('gymParity.effortChoice')} value={values.effort}
        onChange={v=>void change('effort',v)}
        options={[{value:'off',label:t('gymParity.off')},
         {value:'rpe',label:t('effort.rpeShort')},{value:'rir',label:t('effort.rirShort')}]}/>
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
  </Screen>;
}
