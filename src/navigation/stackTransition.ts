import { Platform, type ViewStyle } from 'react-native';

export type StackPushAnimation = 'default' | 'slide_from_right' | 'slide_from_left';

/**
 * Android's default native-stack fade leaves the previous screen visible through
 * a transparent card. A horizontal slide covers it. `slide_from_right` is the
 * leading-edge push; Arabic (RTL) mirrors it to `slide_from_left`.
 * iOS already slides and mirrors `default`, and `slide_from_right` there is
 * defined as that default, so iOS stays on `default`.
 */
export function stackPushAnimation(layoutRTL: boolean, os: string = Platform.OS): StackPushAnimation {
  if (os === 'ios') return 'default';
  return layoutRTL ? 'slide_from_left' : 'slide_from_right';
}

/** Opaque theme color so the screen underneath never shows through the slide. */
export function opaqueStackOptions(backgroundColor: string, layoutRTL: boolean, os: string = Platform.OS): {
  headerShown: false;
  animation: StackPushAnimation;
  contentStyle: ViewStyle;
} {
  return {
    headerShown: false,
    animation: stackPushAnimation(layoutRTL, os),
    contentStyle: { backgroundColor },
  };
}
