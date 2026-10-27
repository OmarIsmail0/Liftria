import { useEffect, useState, type ReactNode } from 'react';
import {
  Modal, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions, type KeyboardTypeOptions,
} from 'react-native';
import Animated, { Easing, interpolateColor, useAnimatedStyle, useSharedValue, withTiming,
  type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeProvider';
import { fontFamilyFor } from '../fonts';
import { useLanguage } from '../../i18n/LanguageProvider';
import { TrainGradient } from './VisualEffects';
import { buttonColors, buttonHeight, provenancePresentation, type ButtonSize, type ButtonVariant,
  type ProvenanceKind } from './contracts';
import { Typography } from './Surfaces';
import { usePressScale, useSpringValue } from './Motion';

export function Button({ label, onPress, variant = 'primary', size = 'md', disabled = false, fullWidth = false, accessibilityLabel }: {
  label: string; onPress: () => void; variant?: ButtonVariant; size?: ButtonSize; disabled?: boolean;
  fullWidth?: boolean; accessibilityLabel?: string;
}) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const colors = buttonColors(theme, variant);
  const gradient = variant === 'train' && theme.effectiveStyle === 'aurora';
  const [box, setBox] = useState({ width: 0, height: 0 });
  const press = usePressScale();
  // The outer view owns placement and the press scale; the Pressable owns the visible pill.
  return <Animated.View style={[{ alignSelf: fullWidth ? 'stretch' : 'flex-start', flexShrink: 1,
    minWidth: theme.size.touch.min }, press.style]}>
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      onPressIn={press.onPressIn} onPressOut={press.onPressOut}
      onLayout={gradient ? e => setBox({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height }) : undefined}
      style={({ pressed }) => ({
        minHeight: buttonHeight(theme, size),
        alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: size === 'sm' ? theme.space[3] : theme.space[5],
        paddingVertical: theme.space[2], borderRadius: theme.radius.pill,
        borderWidth: variant === 'ghost' || gradient
          ? 0 : theme.size.border.thin, borderColor: colors.border,
        backgroundColor: variant === 'ghost' && pressed ? theme.surface.pressed : colors.bg,
        overflow: 'hidden', opacity: disabled ? 0.45 : pressed ? 0.9 : 1,
      })}>
      {gradient && <TrainGradient theme={theme} width={box.width} height={box.height} />}
      <Text allowFontScaling style={{ color: colors.fg, fontSize: size === 'sm' ? theme.type.small.size : theme.type.button.size,
        fontFamily: fontFamilyFor('Figtree', '700', language === 'ar'), textAlign: 'center', flexShrink: 1 }}>{label}</Text>
    </Pressable>
  </Animated.View>;
}

/** Provenance chips are informative, never independent tap targets. */

/** Radio-group segmented control: one accessible, selected option per group. */
export function SegmentedControl<T extends string>({ label, options, value, onChange }: {
  label: string; options: readonly { value: T; label: string }[];
  value: T | null; onChange: (next: T) => void;
}) {
  const { theme } = useTheme();
  const { fontScale } = useWindowDimensions();
  const stack = fontScale >= 1.6 && options.length > 2;
  const solid = theme.effectiveStyle === 'solid';
  const index = options.findIndex(option => option.value === value);
  const position = useSpringValue(Math.max(0, index));
  const [width, setWidth] = useState(0);
  const inset = theme.space[1];
  const segment = width > 0 ? (width - inset * 2) / options.length : 0;
  // A spacer grows before the thumb inside a logical row, so the slide mirrors in Arabic.
  const spacer = useAnimatedStyle(() => ({ width: position.get() * segment }));
  const sliding = !stack && index >= 0 && segment > 0;
  return <View accessibilityRole="radiogroup" accessibilityLabel={label}
    onLayout={event => setWidth(event.nativeEvent.layout.width)}
    style={{
      flexDirection: stack ? 'column' : 'row', alignItems: 'stretch', padding: inset,
      borderRadius: stack ? theme.radius.md : theme.radius.pill,
      backgroundColor: solid ? theme.color.bg.raised : theme.surface.control,
      // Solid (high contrast) keeps the 3:1 control outline; Aurora uses a filled track.
      borderWidth: solid ? theme.size.border.thin : 0, borderColor: theme.controlOutline,
    }}>
    {sliding && <View pointerEvents="none" style={{ position: 'absolute', top: inset, bottom: inset,
      start: inset, end: inset, flexDirection: 'row' }}>
      <Animated.View style={spacer} />
      <View style={{ width: segment, borderRadius: theme.radius.pill,
        backgroundColor: theme.color.action.primary.bg, boxShadow: theme.elevation.thumb }} />
    </View>}
    {options.map((option, at) => {
      const selected = option.value === value;
      return <Pressable key={option.value} accessibilityRole="radio"
        accessibilityLabel={option.label} accessibilityState={{ selected, checked: selected }}
        onPress={() => onChange(option.value)} hitSlop={{ top: inset, bottom: inset }}
        style={({ pressed }) => ({
          minWidth: theme.size.touch.min, minHeight: theme.size.touch.min - inset * 2,
          flex: 1, alignItems: 'center', justifyContent: 'center',
          paddingVertical: theme.space[2], paddingHorizontal: theme.space[2],
          borderRadius: stack ? theme.radius.sm : theme.radius.pill,
          backgroundColor: !sliding && selected ? theme.color.action.primary.bg : 'transparent',
          opacity: pressed && !selected ? 0.7 : 1,
        })}>
        <SegmentLabel label={option.label} at={at} position={position} sliding={sliding} selected={selected} />
      </Pressable>;
    })}
  </View>;
}

/** The label ink follows the thumb, so text never sits white-on-track mid-slide. */
function SegmentLabel({ label, at, position, sliding, selected }: {
  label: string; at: number; position: SharedValue<number>; sliding: boolean; selected: boolean;
}) {
  const { theme } = useTheme();
  const on = theme.color.action.primary.fg, off = theme.color.text.primary;
  const ink = useAnimatedStyle(() => {
    if (!sliding) return { color: selected ? on : off };
    const covered = Math.max(0, 1 - Math.abs(position.get() - at));
    return { color: interpolateColor(covered, [0, 1], [off, on]) };
  });
  return <Animated.Text allowFontScaling style={[{
    fontFamily: fontFamilyFor('Figtree', selected ? '700' : '600'),
    fontSize: theme.type.small.size, textAlign: 'center',
  }, ink]}>{label}</Animated.Text>;
}

/** Use radio rows when choices are described, rather than crowding a segmented pill. */
export function OptionRows<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: readonly { value: T; label: string; description: string }[];
  value: T | null; onChange: (next: T) => void;
}) {
  const { theme } = useTheme();
  const { language } = useLanguage();
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
          borderWidth: theme.size.border.thin,
          borderColor: checked ? theme.color.domain.train : theme.controlOutline,
          backgroundColor: checked ? theme.color.tint.train : theme.color.bg.raised,
          opacity: pressed ? 0.8 : 1,
        })}>
        <View importantForAccessibility="no" style={{
          width: theme.space[5], height: theme.space[5], borderRadius: theme.radius.pill,
          borderWidth: 2, borderColor: checked ? theme.color.domain.train : theme.color.text.secondary,
          alignItems: 'center', justifyContent: 'center',
        }}>
          {checked && <View style={{ width: theme.space[2], height: theme.space[2],
            borderRadius: theme.radius.pill, backgroundColor: theme.color.domain.train }} />}
        </View>
        <View style={{ flex: 1, gap: theme.space[1] }}>
          <Text allowFontScaling style={{ color: theme.color.text.primary,
            fontSize: theme.type.body.size,
            fontFamily: fontFamilyFor('Figtree', '600', language === 'ar') }}>{option.label}</Text>
          <Text allowFontScaling style={{ color: theme.color.text.secondary,
            fontSize: theme.type.small.size,
            fontFamily: fontFamilyFor('Figtree', '400', language === 'ar') }}>{option.description}</Text>
        </View>
      </Pressable>;
    })}
  </View>;
}

export function Chip({ kind, label }: { kind: ProvenanceKind; label?: string }) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const p = provenancePresentation(theme, kind);
  const text = label ?? t(`chips.${kind}`);
  return <View accessible accessibilityRole="text" accessibilityLabel={text}
    style={{ alignSelf: 'flex-start', minHeight: theme.space[6],
      backgroundColor: p.bg, borderColor: p.fg, borderWidth: p.dashed ? theme.size.border.thin : 0,
      borderStyle: p.dashed ? 'dashed' : 'solid', paddingHorizontal: theme.space[3],
      paddingVertical: theme.space[1], borderRadius: theme.radius.pill,
      flexDirection: 'row', alignItems: 'center', gap: theme.space[2] }}>
    <Text importantForAccessibility="no" style={{ color: p.fg, fontSize: theme.type.small.size, fontFamily: fontFamilyFor('Figtree','400') }}>{p.glyph}</Text>
    <Text allowFontScaling style={{ color: p.fg, fontSize: theme.type.small.size, fontFamily: fontFamilyFor('Figtree', '600', language === 'ar') }}>{text}</Text>
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
  const buttonStyle = { minHeight: theme.size.touch.min, minWidth: theme.size.touch.primary,
    justifyContent: 'center' as const, alignItems: 'center' as const };
  return <View accessibilityLabel={label} style={{ gap: theme.space[2] }}>
    <Typography size="small" tone="secondary">{label}</Typography>
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: theme.size.touch.workout,
      backgroundColor: theme.color.bg.raised, borderColor: theme.controlOutline,
      borderWidth: theme.size.border.thin, borderRadius: theme.radius.md, alignSelf: 'flex-start' }}>
      <Pressable style={[buttonStyle, { opacity: minusDisabled ? 0.5 : 1 }]}
        accessibilityRole="button" accessibilityLabel={t('accessibility.decrease', { label })} accessibilityState={{ disabled: minusDisabled }}
        disabled={minusDisabled} onPress={() => onChange(Math.max(min, value - step))}>
        <Typography>−</Typography>
      </Pressable>
      <View style={{ paddingHorizontal: theme.space[3], minWidth: theme.size.touch.workout, alignItems: 'center' }}
        accessible accessibilityLabel={`${label}, ${value} ${unit}`}>
        <Text allowFontScaling style={{ fontSize: theme.type.metric.m.size, fontFamily: fontFamilyFor('Archivo', '800'),
          color: theme.color.text.primary, fontVariant: ['tabular-nums'] }}>{value}</Text>
        {unit ? <Typography tone="secondary" size="small">{unit}</Typography> : null}
      </View>
      <Pressable style={[buttonStyle, { opacity: plusDisabled ? 0.5 : 1 }]}
        accessibilityRole="button" accessibilityLabel={t('accessibility.increase', { label })} accessibilityState={{ disabled: plusDisabled }}
        disabled={plusDisabled} onPress={() => onChange(Math.min(max, value + step))}>
        <Typography>+</Typography>
      </Pressable>
    </View>
  </View>;
}

export function Toggle({ label, detail, value, onChange }: {
  label: string; detail?: string; value: boolean; onChange: (next: boolean) => void;
}) {
  const { theme } = useTheme();
  const progress = useSpringValue(value ? 1 : 0);
  const thumb = theme.space[5], pad = theme.space[1], travel = theme.size.touch.min - pad * 2 - thumb;
  const offTrack = theme.color.bg.raised, onTrack = theme.color.domain.hiku;
  const offEdge = theme.controlOutline, offThumb = theme.color.text.tertiary, onThumb = theme.color.text.inverse;
  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.get(), [0, 1], [offTrack, onTrack]),
    borderColor: interpolateColor(progress.get(), [0, 1], [offEdge, onTrack]),
  }));
  const spacer = useAnimatedStyle(() => ({ width: Math.max(0, progress.get()) * travel }));
  const knob = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.get(), [0, 1], [offThumb, onThumb]),
  }));
  return <Pressable accessibilityRole="switch" accessibilityLabel={detail ? `${label}. ${detail}` : label}
    accessibilityState={{ checked: value }} onPress={() => onChange(!value)}
    style={{ minHeight: theme.size.touch.min, flexDirection: 'row', gap: theme.space[3],
      alignItems: 'center', justifyContent: 'space-between' }}>
    <View style={{ flex: 1, gap: theme.space[1] }}><Typography bold>{label}</Typography>
      {detail && <Typography size="small" tone="secondary">{detail}</Typography>}
    </View>
    <Animated.View importantForAccessibility="no-hide-descendants"
      style={[{ width: theme.size.touch.min, height: theme.space[8], paddingHorizontal: pad - theme.size.border.thin,
        borderRadius: theme.radius.pill, flexDirection: 'row', alignItems: 'center',
        borderWidth: theme.size.border.thin }, track]}>
      <Animated.View style={spacer} />
      <Animated.View style={[{ width: thumb, height: thumb, borderRadius: theme.radius.pill,
        boxShadow: theme.elevation.thumb }, knob]} />
    </Animated.View>
  </Pressable>;
}

export function Field({ label, value, onChangeText, placeholder, secure = false, keyboardType, multiline = false, error }: {
  label: string; value: string; onChangeText: (next: string) => void; placeholder?: string; secure?: boolean;
  keyboardType?: KeyboardTypeOptions; multiline?: boolean; error?: string;
}) {
  const { theme } = useTheme();
  return <View style={{ gap: theme.space[2] }}>
    <Typography bold>{label}</Typography>
    <TextInput accessibilityLabel={label} accessibilityHint={error} value={value} onChangeText={onChangeText}
      placeholder={placeholder} placeholderTextColor={theme.color.text.tertiary} secureTextEntry={secure}
      keyboardType={keyboardType} multiline={multiline} autoCapitalize={secure ? 'none' : 'sentences'}
      selectionColor={theme.color.domain.hiku}
      style={{ minHeight: theme.size.touch.min, borderWidth: theme.size.border.thin, borderColor: error ? theme.color.border.strong : theme.controlOutline,
        backgroundColor: theme.color.bg.raised, borderRadius: theme.radius.md,
        paddingHorizontal: theme.space[3], paddingVertical: theme.space[2],
        fontSize: theme.type.body.size, fontFamily: fontFamilyFor('Figtree', '400'), color: theme.color.text.primary }} />
    {error && <Typography tone="secondary" size="small">{error}</Typography>}
  </View>;
}

/** The parent controls visibility/duration (4s normally, 8s when Undo is offered). */
export function Snackbar({ message, onUndo, onDismiss }: {
  message: string; onUndo?: () => void; onDismiss?: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  return <View accessibilityRole="alert" style={{
    backgroundColor: theme.color.action.primary.bg, borderRadius: theme.radius.pill,
    minHeight: theme.size.touch.min, paddingStart: theme.space[4], paddingEnd: theme.space[2],
    flexDirection: 'row', alignItems: 'center', gap: theme.space[2] }}>
    <Text allowFontScaling style={{ flex: 1, color: theme.color.action.primary.fg,
      fontSize: theme.type.body.size, fontFamily: fontFamilyFor('Figtree', '400') }}>{message}</Text>
    {onUndo && <Pressable accessibilityRole="button" accessibilityLabel={t('common.undo')} onPress={onUndo}
      style={{ minWidth: theme.size.touch.min, minHeight: theme.size.touch.min, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: theme.color.action.primary.fg, fontFamily: fontFamilyFor('Figtree', '700') }}>{t('common.undo')}</Text>
    </Pressable>}
    {onDismiss && <Pressable accessibilityRole="button" accessibilityLabel={t('common.dismiss')} onPress={onDismiss}
      style={{ minWidth: theme.size.touch.min, minHeight: theme.size.touch.min, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: theme.color.action.primary.fg, fontFamily: fontFamilyFor('Figtree', '700') }}>×</Text>
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
  // Stay mounted through the closing slide; a hidden sheet unmounts once it is off screen.
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
  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.get()) * height }] }));
  return <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose}
    statusBarTranslucent accessibilityViewIsModal>
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0,
        backgroundColor: theme.sheet.scrim }, backdrop]}>
        <Pressable accessible={false} accessibilityRole="button" accessibilityLabel={t('common.close')}
          style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      <Animated.View accessibilityViewIsModal style={[{
        borderTopLeftRadius: theme.radius.lg, borderTopRightRadius: theme.radius.lg,
        paddingBottom: Math.max(insets.bottom, theme.space[4]),
        paddingHorizontal: theme.layout.gutter, paddingTop: theme.space[3],
        borderWidth: theme.size.border.thin, borderBottomWidth: 0,
        borderColor: destructive ? theme.color.status.danger : theme.surface.hairline,
        backgroundColor: theme.sheetFill, maxHeight: theme.layout.sheetMaxHeight, gap: theme.space[4],
        boxShadow: theme.elevation.card,
      }, panel]}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: theme.space[10], height: theme.space[1], borderRadius: theme.radius.pill,
            backgroundColor: theme.color.border.strong }} />
        </View>
        <Typography size="title">{title}</Typography>
        {description && <Typography tone="secondary">{description}</Typography>}
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: theme.space[3] }}>{children}</ScrollView>
        <Button label={t('common.cancel')} fullWidth onPress={onClose} />
      </Animated.View>
    </View>
  </Modal>;
}
