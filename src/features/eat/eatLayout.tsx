import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SegmentedControl } from '../../design/primitives';
import { ChevronIcon } from '../../design/primitives/TabIcon';
import { useTheme } from '../../design/ThemeProvider';
import { useLanguage } from '../../i18n/LanguageProvider';
import { chevronPointsLeft } from '../../i18n/layout';
import { MEALS, type MealKey } from './foodCatalog';

/** Outline plus, same 24 dp stroke treatment as the tab icons. */
export function PlusIcon({ color, size, strokeWidth }: { color: string; size: number; strokeWidth: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
    pointerEvents="none" importantForAccessibility="no-hide-descendants">
    <Path d="M12 5v14M5 12h14" />
  </Svg>;
}

export function DaySwitcher({ label, onPrevious, onNext, nextDisabled }: {
  label: string; onPrevious: () => void; onNext: () => void; nextDisabled: boolean;
}) {
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const button = (name: string, disabled: boolean, onPress: () => void, forward: boolean) => (
    <Pressable accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ disabled }}
      disabled={disabled} onPress={onPress}
      style={{ width: theme.size.touch.min, height: theme.size.touch.min, alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.45 : 1 }}>
      <ChevronIcon left={chevronPointsLeft(forward ? 'forward' : 'back', isRTL)}
        color={disabled ? theme.color.text.tertiary : theme.color.text.primary}
        size={theme.space[6]} strokeWidth={theme.size.iconStroke} />
    </Pressable>
  );
  return <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: theme.size.touch.min,
    marginHorizontal: -theme.space[2] }}>
    {button(t('eatI.previous'), false, onPrevious, false)}
    <Text allowFontScaling style={{
      flex: 1, textAlign: 'center', color: theme.color.text.primary,
      fontSize: theme.type.body.size, lineHeight: theme.type.body.line, fontWeight: '600',
    }}>{label}</Text>
    {button(t('eatI.next'), nextDisabled, onNext, true)}
  </View>;
}

/** Section title with an end value. The shared section header's end slot is an action, so kcal stays here. */
export function MealHeading({ title, value }: { title: string; value?: string }) {
  const { theme } = useTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: theme.space[8], paddingHorizontal: theme.space[1], gap: theme.space[3] }}>
    <Text allowFontScaling style={{ flexShrink: 1, color: theme.color.text.secondary,
      fontSize: theme.type.secondary.size, lineHeight: theme.type.secondary.line, fontWeight: '600' }}>{title}</Text>
    {value ? <Text allowFontScaling style={{ color: theme.color.text.secondary, fontVariant: ['tabular-nums'],
      fontSize: theme.type.secondary.size, lineHeight: theme.type.secondary.line, fontWeight: '600' }}>{value}</Text> : null}
  </View>;
}

export function AccentRow({ label, onPress }: { label: string; onPress: () => void }) {
  const { theme } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => ({
      minHeight: 52, justifyContent: 'center', paddingHorizontal: theme.space[4],
      backgroundColor: pressed ? theme.surface.pressed : 'transparent',
    })}>
    <Text allowFontScaling style={{ color: theme.color.accent, fontSize: theme.type.body.size,
      lineHeight: theme.type.body.line, fontWeight: '600' }}>{label}</Text>
  </Pressable>;
}

/** Pressable chips. The shared Chip is a label, not a control. */
export function ChoiceChips({ label, options, value, onChange }: {
  label: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (next: string) => void;
}) {
  const { theme } = useTheme();
  return <View accessibilityRole="radiogroup" accessibilityLabel={label}
    style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
    {options.map(option => {
      const selected = option.value === value;
      return <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.label}
        accessibilityState={{ selected, checked: selected }} onPress={() => onChange(option.value)}
        style={({ pressed }) => ({
          minHeight: theme.size.touch.min, paddingHorizontal: theme.space[3], alignItems: 'center', justifyContent: 'center',
          borderRadius: theme.radius.pill, opacity: pressed ? 0.8 : 1,
          backgroundColor: selected ? theme.color.tint.accent : theme.color.bg.raised,
        })}>
        <Text allowFontScaling style={{
          color: selected ? theme.color.accent : theme.color.text.primary, fontWeight: '600',
          fontSize: theme.type.secondary.size, lineHeight: theme.type.secondary.line,
        }}>{option.label}</Text>
      </Pressable>;
    })}
  </View>;
}

export function MealPicker({ value, onChange }: { value: MealKey; onChange: (meal: MealKey) => void }) {
  const { t } = useLanguage();
  return <SegmentedControl label={t('eatI.meal')} value={value} onChange={onChange}
    options={MEALS.map(meal => ({ value: meal, label: t(`eatI.${meal}`) }))} />;
}
