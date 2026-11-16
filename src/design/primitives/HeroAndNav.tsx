import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import Reanimated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeProvider';
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
  const metric = summary.metric;
  const ink = theme.color.text.primary;
  return <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : 'text'}
    accessibilityLabel={summary.accessibilityLabel}
    style={{ alignSelf: 'center', minHeight: size, minWidth: size,
      justifyContent: 'center', alignItems: 'center' }}>
    <Animated.View importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center',
        transform: [{ scale }] }}>
      <OrbArtwork theme={theme} size={size} progress={summary.progress} />
      <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.space[3] }}>
        {metric ? <>
          <Text allowFontScaling adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1}
            style={{ color: ink, fontSize: theme.type.metric.xl.size, lineHeight: theme.type.metric.xl.line,
              fontWeight: theme.type.metric.xl.weight, fontVariant: ['tabular-nums'], textAlign: 'center' }}>{metric.value}</Text>
          <Text allowFontScaling numberOfLines={1} style={{
            color: theme.color.text.secondary, fontSize: theme.type.secondary.size, lineHeight: theme.type.secondary.line,
            textAlign: 'center' }}>{metric.caption}</Text>
        </> : <Text allowFontScaling adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={2}
          style={{ color: ink, fontSize: theme.type.title.size, lineHeight: theme.type.title.line,
            fontWeight: theme.type.title.weight, textAlign: 'center' }}>{summary.label}</Text>}
      </View>
    </Animated.View>
  </Pressable>;
}

/** Flat stand-in for the capsule. A later task replaces it with a labelled tab bar. */
export function CapsuleNav({ active, onSelect }: {
  active: CapsuleTab; onSelect: (tab: CapsuleTab) => void;
}) {
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const index = Math.max(0, capsuleTabs.findIndex(tab => tab.key === active));
  const position = useSpringValue(index);
  const [width, setWidth] = useState(0);
  const inset = theme.space[1];
  const border = theme.size.border.thin;
  const segment = width > 0 ? (width - border * 2 - inset * 2) / capsuleTabs.length : 0;
  const segmentWidth = useSharedValue(0);
  const direction = isRTL ? -1 : 1;
  const slide = useAnimatedStyle(() => ({
    transform: [{ translateX: direction * position.get() * segmentWidth.get() }],
  }), [direction]);
  return <View style={{
    paddingHorizontal: theme.space[4], paddingTop: theme.space[2],
    paddingBottom: Math.max(insets.bottom, theme.space[4]),
    backgroundColor: 'transparent',
  }}>
    <View accessibilityRole="tablist" onLayout={event => {
      const next = event.nativeEvent.layout.width;
      setWidth(next);
      segmentWidth.set(next > 0 ? (next - border * 2 - inset * 2) / capsuleTabs.length : 0);
    }} style={{
      flexDirection: 'row', alignItems: 'center',
      minHeight: theme.size.touch.nav, borderRadius: theme.radius.md,
      padding: inset, borderWidth: border, borderColor: theme.color.border.subtle,
      backgroundColor: theme.color.bg.surface,
    }}>
      <Reanimated.View pointerEvents="none" style={[{ position: 'absolute', top: inset, bottom: inset,
        start: inset, width: segment, borderRadius: theme.radius.sm,
        backgroundColor: theme.color.accent }, slide]} />
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
      <Reanimated.View style={unlit}>{icon(theme.color.text.tertiary)}</Reanimated.View>
      <Reanimated.View style={[{ position: 'absolute', top: 0, start: 0 }, lit]}>{icon(theme.color.on.accent)}</Reanimated.View>
    </Reanimated.View>
  </Pressable>;
}
