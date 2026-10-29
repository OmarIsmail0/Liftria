import { useEffect } from 'react';
import { Easing, useSharedValue, useAnimatedStyle, withSpring, withTiming,
  type EntryAnimationsValues, type LayoutAnimation } from 'react-native-reanimated';
import { useTheme } from '../ThemeProvider';

/** Press feedback for a tappable surface: scales down while held, springs back on release.
 * Reduced motion keeps the press handlers but never moves anything. */
export function usePressScale() {
  const { theme, reduceMotion } = useTheme();
  const scale = useSharedValue(1);
  const spring = theme.motion.spring;
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return {
    style,
    onPressIn: () => { if (!reduceMotion) scale.set(withSpring(theme.motion.press.scale, spring)); },
    onPressOut: () => { scale.set(reduceMotion ? 1 : withSpring(1, spring)); },
  };
}

/** Animates a number (an index or a 0/1 state) toward its target on the UI thread. */
export function useSpringValue(target: number) {
  const { theme, reduceMotion } = useTheme();
  const value = useSharedValue(target);
  useEffect(() => {
    value.set(reduceMotion ? target : withSpring(target, theme.motion.spring));
  }, [reduceMotion, target, theme.motion.spring, value]);
  return value;
}

/** Cards rise a few dp and fade in once when they first appear. */
export function useEnterAnimation(): ((values: EntryAnimationsValues) => LayoutAnimation) | undefined {
  const { theme, reduceMotion } = useTheme();
  if (reduceMotion) return undefined;
  const { duration, offset } = theme.motion.enter;
  return () => {
    'worklet';
    const easing = Easing.out(Easing.cubic);
    return {
      initialValues: { opacity: 0, transform: [{ translateY: offset }] },
      animations: {
        opacity: withTiming(1, { duration, easing }),
        transform: [{ translateY: withTiming(0, { duration, easing }) }],
      },
    };
  };
}
