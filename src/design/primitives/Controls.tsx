import { useEffect, useState, type ReactNode } from 'react';
import {
  Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View, useWindowDimensions, type KeyboardTypeOptions,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeProvider';
import { useLanguage } from '../../i18n/LanguageProvider';
import { buttonColors, buttonHeight, provenancePresentation,
  type ButtonSize, type ButtonVariant, type ProvenanceKind } from './contracts';
import { Typography } from './Surfaces';
import { usePressScale, useSpringValue } from './Motion';

export function Button({ label, onPress, variant = 'primary', size = 'md', disabled = false, fullWidth = false, accessibilityLabel }: {
  label: string; onPress: () => void; variant?: ButtonVariant; size?: ButtonSize; disabled?: boolean;
  fullWidth?: boolean; accessibilityLabel?: string;
}) {
  const { theme } = useTheme();
  const colors = buttonColors(theme, variant);
  const press = usePressScale();
  const height = buttonHeight(theme, size);
  return <Animated.View style={[{ alignSelf: fullWidth ? 'stretch' : 'flex-start', flexShrink: 1,
    minWidth: theme.size.touch.min }, press.style]}>
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      onPressIn={press.onPressIn} onPressOut={press.onPressOut}
      hitSlop={size === 'sm' ? { top: 6, bottom: 6 } : undefined}
      style={({ pressed }) => ({
        minHeight: height, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: size === 'sm' ? theme.space[3] : theme.space[4],
        borderRadius: size === 'sm' ? theme.radius.sm : theme.radius.md,
        backgroundColor: colors.bg === 'transparent' && pressed ? theme.surface.pressed : colors.bg,
        opacity: disabled ? 0.45 : 1,
      })}>
      <Text allowFontScaling style={{
        color: colors.fg, textAlign: 'center', flexShrink: 1, fontWeight: '600',
        fontSize: size === 'sm' ? theme.type.secondary.size : theme.type.button.size,
        lineHeight: size === 'sm' ? theme.type.secondary.line : theme.type.button.line,
      }}>{label}</Text>
    </Pressable>
  </Animated.View>;
}

/** Radio-group segmented control: one accessible, selected option per group. */
export function SegmentedControl<T extends string>({ label, options, value, onChange }: {
  label: string; options: readonly { value: T; label: string }[];
  value: T | null; onChange: (next: T) => void;
}) {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  const { fontScale } = useWindowDimensions();
  const stack = fontScale >= 1.6 && options.length > 2;
  const index = options.findIndex(option => option.value === value);
  const position = useSpringValue(Math.max(0, index));
  const [width, setWidth] = useState(0);
  const inset = 2;
  const segment = width > 0 ? (width - inset * 2) / options.length : 0;
  const segmentWidth = useSharedValue(0);
  const direction = isRTL ? -1 : 1;
  const slide = useAnimatedStyle(() => ({
    transform: [{ translateX: direction * position.get() * segmentWidth.get() }],
  }), [direction]);
  const sliding = !stack && index >= 0 && segment > 0;
  return <View accessibilityRole="radiogroup" accessibilityLabel={label}
    onLayout={event => {
      const next = event.nativeEvent.layout.width;
      setWidth(next);
      segmentWidth.set(next > 0 ? (next - inset * 2) / options.length : 0);
    }}
    style={{
      flexDirection: stack ? 'column' : 'row', alignItems: 'stretch', padding: inset, minHeight: theme.size.touch.min,
      borderRadius: theme.radius.sm, backgroundColor: theme.color.bg.raised,
    }}>
    {!stack && index >= 0 && <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: inset, bottom: inset,
      start: inset, width: segment, borderRadius: 6, backgroundColor: theme.color.bg.surface }, slide]} />}
    {options.map(option => {
      const selected = option.value === value;
      return <Pressable key={option.value} accessibilityRole="radio"
        accessibilityLabel={option.label} accessibilityState={{ selected, checked: selected }}
        onPress={() => onChange(option.value)} hitSlop={{ top: inset, bottom: inset }}
        style={({ pressed }) => ({
          minWidth: theme.size.touch.min, minHeight: theme.size.touch.min - inset * 2,
          flex: 1, alignItems: 'center', justifyContent: 'center',
          paddingVertical: theme.space[2], paddingHorizontal: theme.space[2], borderRadius: 6,
          backgroundColor: !sliding && selected ? theme.color.bg.surface : 'transparent',
          opacity: pressed && !selected ? 0.7 : 1,
        })}>
        <Text allowFontScaling style={{
          color: theme.color.text.primary, fontSize: theme.type.secondary.size,
          lineHeight: theme.type.secondary.line, fontWeight: '600', textAlign: 'center',
        }}>{option.label}</Text>
      </Pressable>;
    })}
  </View>;
}

/** Use radio rows when choices are described, rather than crowding a segmented control. */
export function OptionRows<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: readonly { value: T; label: string; description: string }[];
  value: T | null; onChange: (next: T) => void;
}) {
  const { theme } = useTheme();
  return <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ gap: theme.space[2] }}>
    <Typography bold>{label}</Typography>
    {options.map(option => {
      const checked = option.value === value;
      return <Pressable key={option.value} accessibilityRole="radio"
        accessibilityLabel={option.label + '. ' + option.description}
        accessibilityState={{ checked }} onPress={() => onChange(option.value)}
        style={({ pressed }) => ({
          minHeight: theme.size.touch.min, padding: theme.space[3],
          borderRadius: theme.radius.md, flexDirection: 'row', alignItems: 'center', gap: theme.space[3],
          backgroundColor: checked ? theme.color.tint.accent : theme.color.bg.raised,
          opacity: pressed ? 0.8 : 1,
        })}>
        <View importantForAccessibility="no" style={{
          width: theme.space[5], height: theme.space[5], borderRadius: theme.radius.pill,
          borderWidth: 2, borderColor: checked ? theme.color.accent : theme.color.text.secondary,
          alignItems: 'center', justifyContent: 'center',
        }}>
          {checked && <View style={{ width: theme.space[2], height: theme.space[2],
            borderRadius: theme.radius.pill, backgroundColor: theme.color.accent }} />}
        </View>
        <View style={{ flex: 1, gap: theme.space[1] }}>
          <Text allowFontScaling style={{ color: checked ? theme.color.accent : theme.color.text.primary,
            fontSize: theme.type.body.size, lineHeight: theme.type.body.line, fontWeight: '600' }}>{option.label}</Text>
          <Text allowFontScaling style={{ color: theme.color.text.secondary,
            fontSize: theme.type.secondary.size, lineHeight: theme.type.secondary.line }}>{option.description}</Text>
        </View>
      </Pressable>;
    })}
  </View>;
}

export function Chip({ kind, label, selected = false }: { kind: ProvenanceKind; label?: string; selected?: boolean }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const p = provenancePresentation(theme, kind);
  const text = label ?? t(`chips.${kind}`);
  const fg = selected ? theme.color.accent : p.fg;
  const bg = selected ? theme.color.tint.accent : p.bg;
  return <View accessible accessibilityRole="text" accessibilityLabel={text}
    style={{ alignSelf: 'flex-start', minHeight: theme.space[8],
      backgroundColor: bg, paddingHorizontal: theme.space[3],
      paddingVertical: theme.space[1], borderRadius: theme.radius.pill,
      flexDirection: 'row', alignItems: 'center', gap: theme.space[2] }}>
    <Text importantForAccessibility="no" style={{ color: fg, fontSize: theme.type.secondary.size }}>{p.glyph}</Text>
    <Text allowFontScaling style={{ color: fg, fontSize: theme.type.secondary.size,
      lineHeight: theme.type.secondary.line, fontWeight: '600' }}>{text}</Text>
  </View>;
}

export function Stepper({ label, value, onChange, min = 0, max = 999, step = 1, unit = '' }: {
  label: string; value: number; onChange: (next: number) => void;
  min?: number; max?: number; step?: number; unit?: string;
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const minusDisabled = value - step < min;
  const plusDisabled = value + step > max;
  const stepButton = (sign: '−' | '+', disabled: boolean, name: string, apply: () => void) => (
    <Pressable accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ disabled }}
      disabled={disabled} onPress={apply}
      style={{ width: theme.size.touch.min, height: theme.size.touch.min, alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.45 : 1 }}>
      <View style={{ width: 36, height: 36, borderRadius: theme.radius.sm, backgroundColor: theme.color.bg.raised,
        alignItems: 'center', justifyContent: 'center' }}>
        <Text allowFontScaling style={{ color: theme.color.text.primary, fontSize: theme.type.title.size, fontWeight: '600' }}>{sign}</Text>
      </View>
    </Pressable>
  );
  return <View accessibilityLabel={label} style={{ gap: theme.space[2] }}>
    <Typography size="secondary" tone="secondary">{label}</Typography>
    <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' }}>
      {stepButton('−', minusDisabled, t('accessibility.decrease', { label }), () => onChange(Math.max(min, value - step)))}
      <View style={{ paddingHorizontal: theme.space[3], minWidth: theme.size.touch.min, alignItems: 'center' }}
        accessible accessibilityLabel={`${label}, ${value} ${unit}`}>
        <Text allowFontScaling style={{ fontSize: theme.type.title.size, lineHeight: theme.type.title.line,
          fontWeight: '600', color: theme.color.text.primary, fontVariant: ['tabular-nums'] }}>{value}</Text>
        {unit ? <Typography tone="secondary" size="caption">{unit}</Typography> : null}
      </View>
      {stepButton('+', plusDisabled, t('accessibility.increase', { label }), () => onChange(Math.min(max, value + step)))}
    </View>
  </View>;
}

export function Toggle({ label, detail, value, onChange }: {
  label: string; detail?: string; value: boolean; onChange: (next: boolean) => void;
}) {
  const { theme } = useTheme();
  const spoken = detail ? `${label}. ${detail}` : label;
  return <View style={{ minHeight: theme.size.touch.min, flexDirection: 'row', gap: theme.space[3],
    alignItems: 'center', justifyContent: 'space-between' }}>
    <View importantForAccessibility="no-hide-descendants" style={{ flex: 1, gap: theme.space[1] }}>
      <Typography bold>{label}</Typography>
      {detail ? <Typography size="secondary" tone="secondary">{detail}</Typography> : null}
    </View>
    <Switch accessibilityLabel={spoken} accessibilityRole="switch" value={value} onValueChange={onChange}
      hitSlop={{ top: 10, bottom: 10 }}
      trackColor={{ false: theme.color.bg.raised, true: theme.color.accent }}
      thumbColor={theme.color.bg.surface} ios_backgroundColor={theme.color.bg.raised} />
  </View>;
}

export function Field({ label, value, onChangeText, placeholder, secure = false, keyboardType, multiline = false, error }: {
  label: string; value: string; onChangeText: (next: string) => void; placeholder?: string; secure?: boolean;
  keyboardType?: KeyboardTypeOptions; multiline?: boolean; error?: string;
}) {
  const { theme } = useTheme();
  return <View style={{ gap: theme.space[2] }}>
    <Typography size="secondary" tone="secondary">{label}</Typography>
    <TextInput accessibilityLabel={label} accessibilityHint={error} value={value} onChangeText={onChangeText}
      placeholder={placeholder} placeholderTextColor={theme.color.text.tertiary} secureTextEntry={secure}
      keyboardType={keyboardType} multiline={multiline} autoCapitalize={secure ? 'none' : 'sentences'}
      selectionColor={theme.color.accent}
      style={{ minHeight: theme.size.touch.min, borderWidth: error ? theme.size.border.thin : 0,
        borderColor: error ? theme.color.status.danger : 'transparent',
        backgroundColor: theme.color.bg.raised, borderRadius: theme.radius.md,
        paddingHorizontal: theme.space[3], paddingVertical: theme.space[2],
        fontSize: theme.type.body.size, lineHeight: theme.type.body.line, color: theme.color.text.primary }} />
    {error ? <Text allowFontScaling style={{ color: theme.color.status.danger,
      fontSize: theme.type.secondary.size, lineHeight: theme.type.secondary.line }}>{error}</Text> : null}
  </View>;
}

/** The parent controls visibility/duration (4s normally, 8s when Undo is offered). */
export function Snackbar({ message, onUndo, onDismiss }: {
  message: string; onUndo?: () => void; onDismiss?: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  return <View accessibilityRole="alert" style={{
    backgroundColor: theme.color.bg.raised, borderRadius: theme.radius.md,
    minHeight: theme.size.touch.min, paddingStart: theme.space[4], paddingEnd: theme.space[2],
    flexDirection: 'row', alignItems: 'center', gap: theme.space[2] }}>
    <Text allowFontScaling style={{ flex: 1, color: theme.color.text.primary,
      fontSize: theme.type.body.size, lineHeight: theme.type.body.line }}>{message}</Text>
    {onUndo && <Pressable accessibilityRole="button" accessibilityLabel={t('common.undo')} onPress={onUndo}
      style={{ minWidth: theme.size.touch.min, minHeight: theme.size.touch.min, alignItems: 'center', justifyContent: 'center' }}>
      <Text allowFontScaling style={{ color: theme.color.accent, fontWeight: '600', fontSize: theme.type.body.size }}>{t('common.undo')}</Text>
    </Pressable>}
    {onDismiss && <Pressable accessibilityRole="button" accessibilityLabel={t('common.dismiss')} onPress={onDismiss}
      style={{ minWidth: theme.size.touch.min, minHeight: theme.size.touch.min, alignItems: 'center', justifyContent: 'center' }}>
      <Text allowFontScaling style={{ color: theme.color.text.secondary, fontWeight: '600', fontSize: theme.type.title.size }}>×</Text>
    </Pressable>}
  </View>;
}

/** Native Modal provides a focus-contained Android dialog; Cancel always exists. */
export function Sheet({ visible, title, description, children, onClose, destructive = false }: {
  visible: boolean; title: string; description?: string; children?: ReactNode; onClose: () => void; destructive?: boolean;
}) {
  const { theme, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { height } = useWindowDimensions();
  void destructive;
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  const progress = useSharedValue(0);
  useEffect(() => {
    const { duration } = theme.motion.base;
    if (visible) {
      progress.set(reduceMotion ? 1 : withTiming(1, { duration: duration + 80, easing: Easing.out(Easing.cubic) }));
      return;
    }
    progress.set(reduceMotion ? 0 : withTiming(0, { duration, easing: Easing.in(Easing.cubic) }));
    const timer = setTimeout(() => setMounted(false), reduceMotion ? 0 : duration);
    return () => clearTimeout(timer);
  }, [progress, reduceMotion, theme.motion.base, visible]);
  const backdrop = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.get()) * height }] }), [height]);
  return <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose}
    statusBarTranslucent accessibilityViewIsModal>
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0,
        backgroundColor: theme.sheet.scrim }, backdrop]}>
        <Pressable accessible={false} accessibilityRole="button" accessibilityLabel={t('common.close')}
          style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      <Animated.View accessibilityViewIsModal style={[{
        borderTopStartRadius: theme.radius.lg, borderTopEndRadius: theme.radius.lg,
        width: '100%', maxWidth: theme.layout.maxContentWidth, alignSelf: 'center',
        paddingBottom: Math.max(insets.bottom, theme.space[4]),
        paddingHorizontal: theme.layout.gutter, paddingTop: theme.space[3],
        backgroundColor: theme.sheetFill, maxHeight: theme.layout.sheetMaxHeight, gap: theme.space[4],
        boxShadow: theme.elevation.card,
      }, panel]}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: theme.space[8], height: theme.space[1], borderRadius: theme.radius.pill,
            backgroundColor: theme.color.border.subtle }} />
        </View>
        <Typography size="title" header>{title}</Typography>
        {description ? <Typography tone="secondary">{description}</Typography> : null}
        <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={Platform.OS==='ios'}
          contentContainerStyle={{ gap: theme.space[3] }}>{children}</ScrollView>
        <Button label={t('common.cancel')} fullWidth onPress={onClose} />
      </Animated.View>
    </View>
  </Modal>;
}
