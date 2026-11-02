import { View } from 'react-native';
import { useTheme } from '../../design/ThemeProvider';
import type { Exercise } from '../../services/database/gymTypes';
import { ExerciseThumbnail } from './ExerciseThumbnail';
import { PoseFigure } from './PoseFigure';
import { cachedBuiltPose } from './poseTable';

/** One picture slot for every exercise. A pose replaces the thumbnail when one exists. */
export const EXERCISE_FIGURE_SIZE = 52;
/** Whole figure on the exercise screen. The height follows the pose viewBox. */
export const EXERCISE_FIGURE_DETAIL_WIDTH = 220;

export function viewBoxSize(viewBox: string, width: number): { width: number; height: number } {
  const parts = viewBox.split(/[\s,]+/).map(Number);
  const boxWidth = parts[2];
  const boxHeight = parts[3];
  if (!boxWidth || !boxHeight || boxWidth <= 0 || boxHeight <= 0) return { width, height: width };
  return { width, height: Math.max(1, Math.round(width * boxHeight / boxWidth)) };
}

export function ExerciseFigure({ exercise, size, crop = 'thumb' }: {
  exercise: Exercise;
  size?: number;
  /** thumb is the square list crop. full is the whole figure, and renders nothing when unmapped. */
  crop?: 'thumb' | 'full';
}) {
  const { theme } = useTheme();
  const pose = cachedBuiltPose(exercise);
  if (!pose) {
    if (crop === 'full') return null;
    const frame = size ?? EXERCISE_FIGURE_SIZE;
    const scale = frame / 48;
    return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{
        width: frame, height: frame, borderRadius: theme.radius.md, overflow: 'hidden',
        alignItems: 'center', justifyContent: 'center', backgroundColor: theme.color.bg.raised,
        borderWidth: theme.size.border.thin, borderColor: theme.surface.hairline,
      }}>
      <View style={{ transform: [{ scale }] }}>
        <ExerciseThumbnail exercise={exercise} />
      </View>
    </View>;
  }
  const viewBox = crop === 'full' ? pose.viewBox : pose.thumbViewBox;
  const frame = viewBoxSize(viewBox, size ?? (crop === 'full' ? EXERCISE_FIGURE_DETAIL_WIDTH : EXERCISE_FIGURE_SIZE));
  const border = theme.size.border.thin;
  const themeKey = theme.mode + ':' + theme.effectiveStyle;
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={{
      width: frame.width, height: frame.height, alignSelf: crop === 'full' ? 'center' : undefined,
      borderRadius: crop === 'full' ? theme.radius.lg : theme.radius.md, overflow: 'hidden',
      backgroundColor: theme.color.bg.raised,
      borderWidth: border, borderColor: theme.surface.hairline,
    }}>
    <PoseFigure pose={pose} viewBox={viewBox} themeKey={themeKey}
      width={Math.max(1, frame.width - border * 2)} height={Math.max(1, frame.height - border * 2)} />
  </View>;
}
