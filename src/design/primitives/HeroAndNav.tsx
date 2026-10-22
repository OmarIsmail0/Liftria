import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeProvider';
import { capsuleTabs, orbSummary, type CapsuleTab } from './contracts';

export function Orb({ eaten, target, hidden = false, active = true, onPress }: {
  eaten: number; target: number | null; hidden?: boolean; active?: boolean; onPress?: () => void;
}) {
  const { theme, reduceMotion } = useTheme();
  const [scale] = useState(() => new Animated.Value(1));
  const summary = useMemo(() => orbSummary(eaten, target, hidden), [eaten, target, hidden]);
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
  const center = size / 2;
  const radius = center - theme.orbSize.ringStroke;
  const segments = theme.size.touch.min;
  const filled = Math.round(segments * (summary.progress ?? 0));
  // Native fallback: segmented ring without requiring a new SVG dependency/lockfile.
  // The native SVG gradient and continuous arc are a visual-fidelity follow-up for Claude.
  const ticks = Array.from({ length: segments }, (_, index) => {
    const theta = (index / segments) * Math.PI * 2 - Math.PI / 2;
    return <View key={index} importantForAccessibility="no"
      style={{ position: 'absolute', width: theme.space[1], height: theme.orbSize.ringStroke,
        borderRadius: theme.radius.pill, backgroundColor: index < filled ? theme.color.domain.eat : theme.color.track,
        start: center + radius * Math.cos(theta) - theme.space[1] / 2,
        top: center + radius * Math.sin(theta) - theme.orbSize.ringStroke / 2,
        transform: [{ rotate: `${(index / segments) * 360}deg` }] }} />;
  });
  return <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : 'text'}
    accessibilityLabel={summary.accessibilityLabel}
    style={{ alignSelf: 'center', minHeight: size, minWidth: size,
      justifyContent: 'center', alignItems: 'center' }}>
    <Animated.View importantForAccessibility="no-hide-descendants"
      style={{ height: size, width: size, alignItems: 'center', justifyContent: 'center',
        transform: [{ scale }] }}>
      {summary.progress !== null && ticks}
      <View style={{ width: size - theme.space[10], height: size - theme.space[10],
        borderRadius: theme.radius.pill, backgroundColor: theme.orb[3],
        alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: size - theme.space[10] - theme.space[5],
          height: size - theme.space[10] - theme.space[5], borderRadius: theme.radius.pill,
          backgroundColor: theme.orb[2], alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: size - theme.space[10] - theme.space[10],
            height: size - theme.space[10] - theme.space[10], borderRadius: theme.radius.pill,
            backgroundColor: theme.orb[1], justifyContent: 'center', alignItems: 'center',
            padding: theme.space[2] }}>
            <Text adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={2} allowFontScaling
              style={{ color: theme.orb.ink, fontSize: hidden ? theme.type.head.size : theme.type.metric.l.size,
                lineHeight: hidden ? theme.type.head.line : theme.type.metric.l.line,
                fontWeight: '800', textAlign: 'center',
                fontVariant: ['tabular-nums'] }}>{summary.label}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  </Pressable>;
}

/** Navigation surface only; Expo Router integration and blur occur in Step 3. */
export function CapsuleNav({ active, onSelect }: {
  active: CapsuleTab; onSelect: (tab: CapsuleTab) => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return <View accessibilityRole="tablist" style={{
    paddingHorizontal: theme.layout.gutter, paddingBottom: Math.max(insets.bottom, theme.space[4]),
    paddingTop: theme.space[2], backgroundColor: 'transparent',
  }}>
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
      minHeight: theme.size.touch.nav, borderRadius: theme.radius.pill,
      padding: theme.space[1], borderWidth: 1, borderColor: theme.controlOutline,
      backgroundColor: theme.effectiveStyle === 'aurora' ? theme.glass.card : theme.color.bg.glass,
    }}>
      {capsuleTabs.map(tab => {
        const selected = tab.key === active;
        return <Pressable key={tab.key} onPress={() => onSelect(tab.key)}
          accessibilityRole="tab" accessibilityLabel={tab.label}
          accessibilityState={{ selected }}
          style={{ flex: selected ? 1.8 : 1, minWidth: theme.size.touch.min,
            minHeight: theme.size.touch.nav, alignItems: 'center', justifyContent: 'center',
            flexDirection: 'row', gap: theme.space[1], paddingHorizontal: theme.space[1],
            backgroundColor: selected ? theme.color.action.primary.bg : 'transparent',
            borderRadius: theme.radius.pill }}>
          <Text importantForAccessibility="no" style={{ fontSize: theme.type.head.size,
            color: selected ? theme.color.action.primary.fg : theme.color.text.primary }}>{tab.glyph}</Text>
          {selected && <Text allowFontScaling style={{ color: theme.color.action.primary.fg,
            fontSize: theme.type.small.size, fontWeight: '700', flexShrink: 1 }}>{tab.label}</Text>}
        </Pressable>;
      })}
    </View>
  </View>;
}
