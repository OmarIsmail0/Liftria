import Svg, { Path } from 'react-native-svg';
import type { CapsuleTab } from './contracts';

/** The five original 24dp outline glyphs from docs/phase1/prototype/liftria.html (ICON). */
const paths: Record<CapsuleTab, readonly string[]> = {
  today: ['M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z'],
  train: ['M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11'],
  eat: ['M3.5 11h17a8.5 8.5 0 0 1-17 0z', 'M9 7.5c0-1.5 1.5-1.5 1.5-3M13.5 7.5c0-1.5 1.5-1.5 1.5-3'],
  progress: ['M4 19h16', 'M6 15l4-4 3 3 5-6'],
  hiku: ['M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z',
    'M18.5 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z'],
};

export function TabIcon({ name, color, size, strokeWidth }: {
  name: CapsuleTab; color: string; size: number; strokeWidth: number;
}) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
    pointerEvents="none" importantForAccessibility="no-hide-descendants">
    {paths[name].map((d, index) => <Path key={index} d={d} />)}
  </Svg>;
}

// A gear with the same outline treatment as the five capsule icons.
export function SettingsIcon({ color, size, strokeWidth }: {
  color: string; size: number; strokeWidth: number;
}) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth={strokeWidth}
    strokeLinecap="round" strokeLinejoin="round"
    pointerEvents="none" importantForAccessibility="no-hide-descendants">
    <Path d="M9.6 2.8h4.8l.5 2.2c.6.2 1.2.5 1.7 1l2.1-.7 2.4 4.1-1.7 1.6a9 9 0 0 1 0 2l1.7 1.6-2.4 4.1-2.1-.7c-.5.4-1.1.8-1.7 1l-.5 2.2H9.6l-.5-2.2c-.6-.2-1.2-.5-1.7-1l-2.1.7-2.4-4.1 1.7-1.6a9 9 0 0 1 0-2L2.9 9.4l2.4-4.1 2.1.7c.5-.4 1.1-.8 1.7-1z" />
    <Path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
  </Svg>;
}

// Back/forward chevron; `left` is the on-screen direction (see chevronPointsLeft).
export function ChevronIcon({ left, color, size, strokeWidth }: {
  left: boolean; color: string; size: number; strokeWidth: number;
}) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth={strokeWidth}
    strokeLinecap="round" strokeLinejoin="round"
    pointerEvents="none" importantForAccessibility="no-hide-descendants">
    <Path d={left ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
  </Svg>;
}
