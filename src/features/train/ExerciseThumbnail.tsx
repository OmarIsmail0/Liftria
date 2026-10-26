import { memo } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../design/ThemeProvider';
import type { Exercise } from '../../services/database/gymTypes';
import { BodyMap } from './BodyMap';

/** Stable miniature keyed by exercise ID and muscle selection (not workout-row rerenders). */
export const ExerciseThumbnail = memo(function ExerciseThumbnail({ exercise }: { exercise: Exercise }) {
  const { theme } = useTheme();
  return <View importantForAccessibility="no-hide-descendants"
    style={{ width:48,height:48,borderRadius:theme.radius.pill,
      alignItems:'center',justifyContent:'center',overflow:'hidden' }}>
    <BodyMap mini primary={exercise.primaryMuscles} secondary={exercise.secondaryMuscles} />
  </View>;
}, (previous, next) => previous.exercise.id === next.exercise.id &&
  previous.exercise.primaryMuscles.join('|') === next.exercise.primaryMuscles.join('|') &&
  previous.exercise.secondaryMuscles.join('|') === next.exercise.secondaryMuscles.join('|'));
