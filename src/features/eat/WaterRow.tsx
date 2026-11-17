import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ListGroup, Typography } from '../../design/primitives';
import { useTheme } from '../../design/ThemeProvider';
import { translateWaterTotal } from '../../i18n';
import { useLanguage } from '../../i18n/LanguageProvider';
import { getTypedSetting } from '../../services/database/settings';
import { localDay } from './foodCatalog';
import { adjustWater, readWater, type WaterLog } from './waterRepository';

/** One water row with a minus and plus. A missing log stays "not logged", not zero glasses. */
export function WaterRow({ day = localDay(new Date()), demoGlasses }: { day?: string; demoGlasses?: number }) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const [log, setLog] = useState<WaterLog | null>(null);
  const [glassMl, setGlassMl] = useState(250);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useFocusEffect(useCallback(() => {
    let live = true;
    void Promise.all([readWater(day), getTypedSetting('water.glassMl')]).then(([water, ml]) => {
      if (!live) return;
      if (water.ok) setLog(water.value); else setError(true);
      if (ml.ok) setGlassMl(ml.value); else setError(true);
    });
    return () => { live = false; };
  }, [day]));
  async function change(delta: -1 | 1) {
    if (busy || demoGlasses !== undefined) return;
    setBusy(true); setError(false);
    const next = await adjustWater(day, delta, glassMl);
    if (next.ok) setLog(next.value); else setError(true);
    setBusy(false);
  }
  const amount = demoGlasses !== undefined
    ? translateWaterTotal(language, demoGlasses, demoGlasses * glassMl)
    : log === null ? t('water.unlogged')
    : translateWaterTotal(language, log.glasses, log.glasses * log.glassMl);
  const removeDisabled = demoGlasses !== undefined || busy || log === null || log.glasses === 0;
  const addDisabled = demoGlasses !== undefined || busy || log?.glasses === 200;
  const step = (sign: '−' | '+', name: string, disabled: boolean, delta: -1 | 1) => (
    <Pressable accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ disabled }}
      disabled={disabled} onPress={() => void change(delta)}
      style={{ width: theme.size.touch.min, height: theme.size.touch.min, alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.45 : 1 }}>
      <View style={{ width: 36, height: 36, borderRadius: theme.radius.sm, backgroundColor: theme.color.bg.raised,
        alignItems: 'center', justifyContent: 'center' }}>
        <Text allowFontScaling style={{ color: theme.color.text.primary, fontSize: theme.type.title.size, fontWeight: '600' }}>{sign}</Text>
      </View>
    </Pressable>
  );
  return <View style={{ gap: theme.space[2] }}>
    <ListGroup>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[3], minHeight: 52,
        paddingStart: theme.space[4], paddingEnd: theme.space[2], paddingVertical: theme.space[2] }}>
        <View style={{ flex: 1, gap: theme.space[1] }}>
          <Typography bold>{t('water.title')}</Typography>
          <Typography tone="secondary" size="secondary">{amount}</Typography>
          <Typography tone="secondary" size="caption">{t('water.size', { ml: glassMl })}</Typography>
          {demoGlasses !== undefined &&
            <Typography tone="secondary" size="caption">{t('water.demoNote')}</Typography>}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {step('−', t('water.remove'), removeDisabled, -1)}
          {step('+', t('water.add'), addDisabled, 1)}
        </View>
      </View>
    </ListGroup>
    {error && <Typography tone="secondary">{t('water.error')}</Typography>}
  </View>;
}
