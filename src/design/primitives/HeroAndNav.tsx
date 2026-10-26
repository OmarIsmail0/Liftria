import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeProvider';
import { fontFamilyFor } from '../fonts';
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
  return <View style={{
    paddingHorizontal: theme.space[4], paddingTop: theme.space[2],
    paddingBottom: Math.max(insets.bottom, theme.space[4]),
    backgroundColor: 'transparent',
  }}>
    <View accessibilityRole="tablist" style={{
      flexDirection: 'row', alignItems: 'center',
      minHeight: theme.size.touch.nav, borderRadius: theme.radius.pill,
      padding: theme.space[1], borderWidth: theme.size.border.thin,
      borderColor: glass ? theme.glass.border : theme.color.border.strong,
      backgroundColor: glass ? theme.glass.card : theme.color.bg.glass,
    }}>
      {capsuleTabs.map(tab => {
        const selected = tab.key === active;
        const ink = selected ? theme.color.action.primary.fg : theme.color.text.secondary;
        return <Pressable key={tab.key} onPress={() => onSelect(tab.key)}
          accessibilityRole="tab" accessibilityLabel={t(`nav.${tab.key}`)}
          accessibilityState={{ selected }}
          style={{
            flex: 1, minWidth: theme.size.touch.min,
            minHeight: theme.size.touch.nav, alignItems: 'center', justifyContent: 'center',
            flexDirection: 'row', paddingHorizontal: theme.space[1],
            backgroundColor: selected ? theme.color.action.primary.bg : 'transparent',
            borderRadius: theme.radius.pill,
          }}>
          <TabIcon name={tab.key} color={ink}
            size={theme.space[6]} strokeWidth={theme.size.iconStroke} />
        </Pressable>;
      })}
    </View>
  </View>;
}
