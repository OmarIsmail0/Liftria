import { View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import type { Pose } from './progressPhotos';

const PALETTE: Record<Pose, { bg: string; ink: string; paper: string }> = {
  front: { bg: '#c4b6a6', ink: '#6d5c4d', paper: '#efe7dc' },
  side: { bg: '#b7c4be', ink: '#3f5c53', paper: '#e7f0ec' },
  back: { bg: '#c3b7c4', ink: '#5c4d60', paper: '#f3eaf3' },
};

/** A drawn stand-in for screenshots. Not a photograph and not a picture of a person. */
export function ProgressPhotoMark({ pose, variant, blurred, label, height }: {
  pose: Pose;
  variant: 'a' | 'b';
  blurred: boolean;
  label: string;
  height: number;
}) {
  const colors = PALETTE[pose];
  const shift = variant === 'a' ? 48 : 128;
  return <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ width: '100%', height }}>
    <Svg viewBox="0 0 200 280" width="100%" height="100%">
      <Rect x="0" y="0" width="200" height="280" fill={colors.bg} />
      <Rect x="28" y="36" width="144" height="208" rx="18" fill={colors.paper} />
      <Rect x={shift} y="78" width="24" height="120" rx="8" fill={colors.ink} />
      <Circle cx={variant === 'a' ? 70 : 132} cy="64" r="16" fill={colors.ink} />
      <Rect x="36" y="214" width="128" height="10" rx="5" fill={colors.ink} opacity={0.45} />
      {blurred && <Rect x="0" y="0" width="200" height="280" fill="#1c1917" opacity={0.84} />}
    </Svg>
  </View>;
}
