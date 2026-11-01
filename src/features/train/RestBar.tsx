import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Button, Typography } from '../../design/primitives';
import { useTheme } from '../../design/ThemeProvider';
import { useLanguage } from '../../i18n/LanguageProvider';
import type { RestBarPhase } from './restBar';

/** Slim rest bar. The label and fill come from the stored deadline, same as the notification. */
export function RestBar({ phase, onMinus, onPlus, onSkip }: {
  phase: RestBarPhase;
  onMinus: () => void;
  onPlus: () => void;
  onSkip: () => void;
}) {
  const { theme, reduceMotion } = useTheme();
  const { t } = useLanguage();
  const visible = phase.phase !== 'hidden';
  const shown = useSharedValue(visible ? 1 : 0);
  useEffect(() => {
    shown.set(reduceMotion || !visible ? (visible ? 1 : 0) : withTiming(visible ? 1 : 0, {
      duration: theme.motion.enter.duration,
    }));
  }, [reduceMotion, shown, theme.motion.enter.duration, visible]);
  const motion = useAnimatedStyle(() => ({
    opacity: shown.get(),
    transform: [{ translateY: (1 - shown.get()) * 40 }],
  }));
  const label = phase.phase === 'hidden' ? '' : phase.label;
  const fraction = phase.phase === 'running' ? phase.fraction : phase.phase === 'over' ? 0 : 0;
  return <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={[{
    position: 'absolute', start: theme.space[3], end: theme.space[3], bottom: theme.space[2],
    borderRadius: theme.radius.lg, backgroundColor: theme.color.bg.raised,
    borderWidth: theme.size.border.thin, borderColor: theme.surface.hairline,
    paddingHorizontal: theme.space[3], paddingTop: theme.space[2], paddingBottom: theme.space[3],
    gap: theme.space[2], boxShadow: theme.elevation.card,
  }, motion]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.space[2] }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.space[2], flexShrink: 1 }}>
        <Typography tone="secondary">{t('active.restTimer')}</Typography>
        <Typography size="metric-m">{label}</Typography>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[1] }}>
        <Button label={t('workout.minus15')} size="sm" variant="secondary" accessibilityLabel={t('active.restMinus15')}
          onPress={onMinus} />
        <Button label={t('workout.plus15')} size="sm" variant="secondary" accessibilityLabel={t('active.restPlus15')}
          onPress={onPlus} />
        <Button label={t('workout.skip')} size="sm" variant="train" accessibilityLabel={t('active.skipRest')}
          onPress={onSkip} />
      </View>
    </View>
    <View style={{ height: 5, borderRadius: theme.radius.pill, backgroundColor: theme.surface.control, overflow: 'hidden' }}>
      <View style={{ height: '100%', width: `${Math.round(fraction * 100)}%`, backgroundColor: theme.color.domain.train }} />
    </View>
  </Animated.View>;
}
