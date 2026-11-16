import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../../design/ThemeProvider';
import { Typography } from '../../design/primitives';
import { useLanguage } from '../../i18n/LanguageProvider';

/**
 * Minus and plus for the water row. The shared Stepper is a labelled field with the
 * value between the buttons, which this row already shows as its detail line.
 */
function StepButton({ sign, label, disabled, onPress }: {
  sign: '−' | '+'; label: string; disabled: boolean; onPress: () => void;
}) {
  const { theme } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}
    disabled={disabled} onPress={onPress}
    style={{ width: theme.size.touch.min, height: theme.size.touch.min, alignItems: 'center', justifyContent: 'center',
      opacity: disabled ? 0.45 : 1 }}>
    <View style={{ width: 36, height: 36, borderRadius: theme.radius.sm, backgroundColor: theme.color.bg.raised,
      alignItems: 'center', justifyContent: 'center' }}>
      <Text allowFontScaling style={{ color: theme.color.text.primary, fontSize: theme.type.title.size, fontWeight: '600' }}>{sign}</Text>
    </View>
  </Pressable>;
}

export function WaterRow({ divider, ready, glasses, millilitres, glassMl, error, busy, onChange }: {
  divider: boolean;
  ready: boolean;
  /** Null means no water entry. Zero is an explicit logged zero. */
  glasses: number | null;
  millilitres: number | null;
  glassMl: number;
  error: boolean;
  busy: boolean;
  onChange: (delta: -1 | 1) => void;
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const detail = !ready ? t('today.loading')
    : error && glasses === null ? t('water.error')
    : glasses === null ? t('water.unlogged')
    : t('water.total', { glasses, ml: millilitres ?? glasses * glassMl });
  const removeDisabled = !ready || busy || glasses === null || glasses === 0;
  const addDisabled = !ready || busy || glasses === 200;
  return <View style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: theme.space[3],
    paddingVertical: theme.space[2], paddingHorizontal: theme.space[4],
    borderBottomWidth: divider ? 1 : 0, borderColor: theme.color.border.subtle }}>
    <View style={{ flex: 1, minWidth: 0, gap: theme.space[1] }}>
      <Typography bold>{t('water.title')}</Typography>
      <Typography tone="secondary" size="secondary">{detail}</Typography>
      {ready && !(error && glasses === null)
        ? <Typography tone="secondary" size="caption">{t('water.size', { ml: glassMl })}</Typography> : null}
      {error && glasses !== null
        ? <Typography tone="secondary" size="secondary">{t('water.error')}</Typography> : null}
    </View>
    <View style={{ flexDirection: 'row' }}>
      <StepButton sign="−" label={t('water.remove')} disabled={removeDisabled} onPress={() => onChange(-1)} />
      <StepButton sign="+" label={t('water.add')} disabled={addDisabled} onPress={() => onChange(1)} />
    </View>
  </View>;
}
