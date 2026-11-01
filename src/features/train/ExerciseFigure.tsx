import { View } from 'react-native';
import { useTheme } from '../../design/ThemeProvider';
import type { Exercise } from '../../services/database/gymTypes';
import { ExerciseThumbnail } from './ExerciseThumbnail';

/** One picture slot for every exercise. Task 34 swaps the thumbnail for a drawn figure. */
export const EXERCISE_FIGURE_SIZE = 52;

export function ExerciseFigure({ exercise, size = EXERCISE_FIGURE_SIZE }: {
  exercise: Exercise; size?: number;
}) {
  const { theme } = useTheme();
  const scale = size / 48;
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={{
      width: size, height: size, borderRadius: theme.radius.md, overflow: 'hidden',
      alignItems: 'center', justifyContent: 'center', backgroundColor: theme.color.bg.raised,
      borderWidth: theme.size.border.thin, borderColor: theme.surface.hairline,
    }}>
    <View style={{ transform: [{ scale }] }}>
      <ExerciseThumbnail exercise={exercise} />
    </View>
  </View>;
}
