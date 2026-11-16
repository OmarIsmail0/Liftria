import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { LiftriaTheme } from '../tokens';
import { ringGeometry } from './VisualGeometry';

/** A flat disc and, when there is a target, one accent arc. No glow and no gradient. */
export function OrbArtwork({ theme, size, progress }: {
  theme: LiftriaTheme; size: number; progress: number | null;
}) {
  const disc = Math.max(0, size - theme.space[8]);
  const center = size / 2;
  const arc = ringGeometry(size, theme.orbSize.ringStroke, progress ?? 0);
  return <View pointerEvents="none" importantForAccessibility="no-hide-descendants"
    style={{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: disc, height: disc, borderRadius: disc / 2, backgroundColor: theme.color.bg.raised }} />
    {progress !== null && <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      <Circle cx={center} cy={center} r={arc.radius} stroke={theme.color.border.subtle}
        strokeWidth={theme.orbSize.ringStroke} fill="none" />
      <Circle cx={center} cy={center} r={arc.radius} stroke={theme.color.accent}
        strokeWidth={theme.orbSize.ringStroke} fill="none" strokeLinecap="round"
        strokeDasharray={arc.circumference + ' ' + arc.circumference}
        strokeDashoffset={arc.offset} transform={'rotate(-90 ' + center + ' ' + center + ')'} />
    </Svg>}
  </View>;
}
