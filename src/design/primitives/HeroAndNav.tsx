import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeProvider';
import { useLanguage } from '../../i18n/LanguageProvider';
import { OrbArtwork } from './VisualEffects';
import { TabIcon } from './TabIcon';
import { capsuleTabs, orbSummary, type CapsuleTab } from './contracts';

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

/** Standard labelled bar. A row mirrors in Arabic. The safe-area inset stays below the labels. */
export function TabBar({ active, onSelect }: {
  active: CapsuleTab; onSelect: (tab: CapsuleTab) => void;
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  return <View accessibilityRole="tablist" style={{
    flexDirection: 'row', alignItems: 'stretch',
    backgroundColor: theme.color.bg.surface,
    borderTopWidth: theme.size.border.thin, borderTopColor: theme.color.border.subtle,
    paddingTop: 6, paddingHorizontal: theme.space[1],
    paddingBottom: Math.max(insets.bottom, 10),
  }}>
    {capsuleTabs.map(tab => {
      const selected = tab.key === active;
      const label = t(`nav.${tab.key}`);
      const color = selected ? theme.color.accent : theme.color.text.tertiary;
      return <Pressable key={tab.key} onPress={() => onSelect(tab.key)}
        accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }}
        style={({ pressed }) => ({
          flex: 1, minHeight: theme.size.touch.min, alignItems: 'center', justifyContent: 'center',
          gap: 2, opacity: pressed ? 0.6 : 1,
        })}>
        <TabIcon name={tab.key} color={color} size={theme.space[6]} strokeWidth={theme.size.iconStroke} />
        <Text allowFontScaling numberOfLines={1} style={{
          color, fontSize: 12, lineHeight: 16, fontWeight: selected ? '700' : '500', textAlign: 'center',
        }}>{label}</Text>
      </Pressable>;
    })}
  </View>;
}
