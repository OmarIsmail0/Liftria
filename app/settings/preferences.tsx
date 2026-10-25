import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Button, Card, Header, ListRow, Screen, SegmentedControl, Toggle, Typography } from '../../src/design/primitives';
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
    }).catch(() => { if (mounted) setError('Unable to read saved settings. Defaults are displayed.'); })
      .finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, []);

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
      setError('Could not save this setting on your phone. Try again.');
    }
  }

  return <Screen>
    <Header title="Units and appearance" subtitle="Local preferences"
      onBack={() => backOrReplace(router, '/settings')} />
    <Card title="Units">
      <Typography tone="secondary" size="small">Units change how measurements are shown. Your stored values remain metric.</Typography>
      <SegmentedControl label="Weight" options={[{ value:'kg', label:'kg' }, { value:'lb', label:'lb' }]}
        value={values.weight} onChange={v => void change('weight', v)} />
      <SegmentedControl label="Height" options={[{ value:'cm', label:'cm' }, { value:'ftin', label:'ft / in' }]}
        value={values.height} onChange={v => void change('height', v)} />
      <Toggle label="Small plates" detail="1.25 kg increments for your workout weight stepper."
        value={values.smallPlates} onChange={v => void change('smallPlates', v)} />
      <Typography tone="secondary">Energy: kcal</Typography>
      <Typography tone="secondary" size="small">kJ is planned for a future release.</Typography>
    </Card>
    <Card title="Appearance">
      <ListRow title="Theme and visual style" detail="System / Dark / Light · Aurora Rim / Solid"
        onPress={() => router.push('/settings/appearance')} />
    </Card>
    <Card title="Display and feedback">
      <Toggle label="Hide numbers on dashboards" detail="Summaries use words instead of counts; Settings and targets remain readable."
        value={values.hideNumbers} onChange={v => void change('hideNumbers', v)} />
      <Toggle label="Keep the screen on during workouts" detail="Only during an active workout."
        value={values.keepScreenOn} onChange={v => void change('keepScreenOn', v)} />
      <Toggle label="Haptics" detail="Vibration feedback where supported."
        value={values.haptics} onChange={v => void change('haptics', v)} />
    </Card>
    {!ready && <Typography tone="secondary">Loading saved preferences…</Typography>}
    {error && <View accessibilityRole="alert" style={{ paddingVertical: theme.space[2] }}>
      <Typography tone="secondary">ⓘ {error}</Typography>
    </View>}
    <Button label="Back to Settings" variant="ghost" onPress={() => backOrReplace(router, '/settings')} />
  </Screen>;
}
