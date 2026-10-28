import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import Reanimated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeProvider';
import { fontFamilyFor } from '../fonts';
import { useLanguage } from '../../i18n/LanguageProvider';
import { OrbArtwork } from './VisualEffects';
import { TabIcon } from './TabIcon';
import { capsuleTabs, orbSummary, type CapsuleTab } from './contracts';
import { usePressScale, useSpringValue } from './Motion';

export function Orb({ eaten, target, hidden = false, active = true, onPress }: {
  eaten: number; target: number | null; hidden?: boolean; active?: boolean; onPress?: () => void;
}) {
  const { theme, reduceMotion } = useTheme();
  const { language } = useLanguage();
  const [scale] = useState(() => new Animated.Value(1));
  const summary = useMemo(() => orbSummary(eaten, target, hidden, language), [eaten, target, hidden, language]);
  useEffect(() => {
    scale.stopAnimation();
    if (!active || reduceMotion) { scale.setValue(1); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(scale, { toValue: theme.motion.breathe.scale, duration: theme.motion.breathe.duration / 2,
        easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: theme.motion.breathe.duration / 2,
        easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    animation.start();
    return () => { animation.stop(); scale.setValue(1); };
  }, [active, reduceMotion, scale, theme.motion.breathe.duration, theme.motion.breathe.scale]);

  const size = theme.orbSize.today;
  const parts = !hidden ? /^([+]?[\d,]+)\s+(kcal .+)$/.exec(summary.label) : null;
  const ink = (summary.progress === null || theme.effectiveStyle === 'solid') ? theme.color.text.primary : theme.orb.ink;
  return <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : 'text'}
    accessibilityLabel={summary.accessibilityLabel}
    style={{ alignSelf: 'center', minHeight: size, minWidth: size,
      justifyContent: 'center', alignItems: 'center' }}>
    <Animated.View importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center',
        transform: [{ scale }] }}>
      <OrbArtwork theme={theme} size={size} progress={summary.progress} />
      <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.space[3] }}>
        {parts ? <>
          <Text allowFontScaling adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1}
            style={{ color: ink, fontFamily: fontFamilyFor(theme.type.metric.xl.face, theme.type.metric.xl.weight),
              fontSize: theme.type.metric.xl.size, lineHeight: theme.type.metric.xl.line,
              fontVariant: ['tabular-nums'], textAlign: 'center' }}>{parts[1]}</Text>
          <Text allowFontScaling numberOfLines={1} style={{
            color: ink, fontFamily: fontFamilyFor(theme.type.label.face, theme.type.label.weight),
            fontSize: theme.type.label.size, lineHeight: theme.type.label.line,
            letterSpacing: theme.type.label.letterSpacingEm * theme.type.label.size,
            textAlign: 'center' }}>{(parts[2] ?? '').toUpperCase()}</Text>
        </> : <Text allowFontScaling adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={2}
          style={{ color: ink, fontFamily: fontFamilyFor(theme.type.head.face, theme.type.head.weight, language === 'ar'),
            fontSize: theme.type.head.size, lineHeight: theme.type.head.line,
            textAlign: 'center' }}>{summary.label}</Text>}
      </View>
    </Animated.View>
  </Pressable>;
}

/** One capsule shared by the five route roots; safe-area inset stays below its touch targets. */
export function CapsuleNav({ active, onSelect }: {
  active: CapsuleTab; onSelect: (tab: CapsuleTab) => void;
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const glass = theme.effectiveStyle === 'aurora';
  const index = Math.max(0, capsuleTabs.findIndex(tab => tab.key === active));
  const position = useSpringValue(index);
  const [width, setWidth] = useState(0);
  const inset = theme.space[1];
  const segment = width > 0 ? (width - inset * 2) / capsuleTabs.length : 0;
  // Logical row + growing spacer: the pill slides the right way in Arabic too.
  // Values measured or derived after render are listed as dependencies, so the worklet
  // is rebuilt when they change (layout arrives after the first frame).
  const spacer = useAnimatedStyle(() => ({ width: position.get() * segment }), [segment]);
  return <View style={{
    paddingHorizontal: theme.space[4], paddingTop: theme.space[2],
    paddingBottom: Math.max(insets.bottom, theme.space[4]),
    backgroundColor: 'transparent',
  }}>
    <View accessibilityRole="tablist" onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{
      flexDirection: 'row', alignItems: 'center',
      minHeight: theme.size.touch.nav, borderRadius: theme.radius.pill,
      padding: inset, borderWidth: theme.size.border.thin,
      borderColor: glass ? theme.surface.hairline : theme.color.border.strong,
      backgroundColor: glass ? theme.glass.card : theme.color.bg.glass,
      boxShadow: glass ? theme.elevation.card : undefined,
    }}>
      {segment > 0 && <View pointerEvents="none" style={{ position: 'absolute', top: inset, bottom: inset,
        start: inset, end: inset, flexDirection: 'row' }}>
        <Reanimated.View style={spacer} />
        <View style={{ width: segment, borderRadius: theme.radius.pill, backgroundColor: theme.color.action.primary.bg }} />
      </View>}
      {capsuleTabs.map((tab, at) => <CapsuleTabButton key={tab.key} tab={tab.key} selected={tab.key === active}
        at={at} position={position} sliding={segment > 0}
        label={t(`nav.${tab.key}`)} onPress={() => onSelect(tab.key)} />)}
    </View>
  </View>;
}

function CapsuleTabButton({ tab, selected, at, position, sliding, label, onPress }: {
  tab: CapsuleTab; selected: boolean; at: number; position: SharedValue<number>; sliding: boolean;
  label: string; onPress: () => void;
}) {
  const { theme } = useTheme();
  const press = usePressScale();
  // Two inks cross-fade as the pill passes under the icon, so it never flashes white on the bar.
  const lit = useAnimatedStyle(() => ({
    opacity: sliding ? Math.max(0, 1 - Math.abs(position.get() - at)) : selected ? 1 : 0,
  }), [sliding, selected, at]);
  const unlit = useAnimatedStyle(() => ({
    opacity: sliding ? Math.min(1, Math.abs(position.get() - at)) : selected ? 0 : 1,
  }), [sliding, selected, at]);
  const icon = (color: string) => <TabIcon name={tab} color={color} size={theme.space[6]} strokeWidth={theme.size.iconStroke} />;
  return <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}
    accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }}
    style={{ flex: 1, minWidth: theme.size.touch.min, minHeight: theme.size.touch.nav,
      alignItems: 'center', justifyContent: 'center' }}>
    <Reanimated.View style={press.style}>
      <Reanimated.View style={unlit}>{icon(theme.color.text.secondary)}</Reanimated.View>
      <Reanimated.View style={[{ position: 'absolute', top: 0, start: 0 }, lit]}>{icon(theme.color.action.primary.fg)}</Reanimated.View>
    </Reanimated.View>
  </Pressable>;
}
