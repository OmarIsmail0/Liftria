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
  const clock = /^\d+:\d{2}$/.test(label) ? t('restOrb.caption') + ' ' + label : label;
  const fraction = phase.phase === 'running' ? phase.fraction : 0;
  return <Animated.View pointerEvents={visible ? 'auto' : 'none'} accessible={visible}
    accessibilityRole={visible ? 'timer' : undefined} accessibilityLabel={clock} style={[{
    position: 'absolute', start: 0, end: 0, bottom: 0,
    backgroundColor: theme.color.bg.surface,
    borderTopWidth: theme.size.border.thin, borderTopColor: theme.color.border.subtle,
    paddingHorizontal: theme.space[4], paddingTop: theme.space[3], paddingBottom: theme.space[3],
    gap: theme.space[2],
  }, motion]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[2] }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Typography size="title" numeric>{clock}</Typography>
      </View>
      <Button label={t('workout.minus15')} size="sm" variant="neutral" accessibilityLabel={t('active.restMinus15')}
        onPress={onMinus} />
      <Button label={t('workout.plus15')} size="sm" variant="neutral" accessibilityLabel={t('active.restPlus15')}
        onPress={onPlus} />
      <Button label={t('workout.skip')} size="sm" variant="tonal" accessibilityLabel={t('active.skipRest')}
        onPress={onSkip} />
    </View>
    <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.color.bg.raised, overflow: 'hidden' }}>
      <View style={{ height: 8, width: `${Math.round(fraction * 100)}%`, borderRadius: 4,
        backgroundColor: theme.color.accent }} />
    </View>
  </Animated.View>;
}
