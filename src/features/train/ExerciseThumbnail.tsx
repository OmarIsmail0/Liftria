import { memo } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../design/ThemeProvider';
import type { Exercise } from '../../services/database/gymTypes';
import { thumbnailPaint, tintHex, type ThumbnailPaint } from './exerciseRows';

function Mark({ color, width, height, radius }: {
  color: string; width: number; height: number; radius: number;
}) {
  return <View style={{ width, height, borderRadius: radius, backgroundColor: color }} />;
}

/** A few filled marks, not the full body SVG. Identical muscle patterns share one paint. */
const ThumbnailShape = memo(function ThumbnailShape({ paint, tint }: { paint: ThumbnailPaint; tint: string }) {
  return <View importantForAccessibility="no-hide-descendants"
    style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', backgroundColor: tint }}>
    <View style={{ alignItems: 'center', gap: 1 }}>
      <Mark color={paint.head} width={8} height={8} radius={4} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1 }}>
        <Mark color={paint.arm} width={5} height={12} radius={2} />
        <View style={{ alignItems: 'center', gap: 1 }}>
          <Mark color={paint.shoulder} width={14} height={4} radius={2} />
          <Mark color={paint.torso} width={14} height={8} radius={3} />
        </View>
        <Mark color={paint.arm} width={5} height={12} radius={2} />
      </View>
      <Mark color={paint.hip} width={12} height={4} radius={2} />
      <View style={{ flexDirection: 'row', gap: 2 }}>
        <Mark color={paint.leg} width={5} height={6} radius={2} />
        <Mark color={paint.leg} width={5} height={6} radius={2} />
      </View>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        <Mark color={paint.calf} width={4} height={4} radius={2} />
        <Mark color={paint.calf} width={4} height={4} radius={2} />
      </View>
    </View>
  </View>;
}, (previous, next) => previous.paint === next.paint && previous.tint === next.tint);

export function ExerciseThumbnail({ exercise }: { exercise: Exercise }) {
  const { theme } = useTheme();
  const paint = thumbnailPaint(exercise.primaryMuscles, exercise.secondaryMuscles, {
    primary: theme.color.domain.train,
    secondary: tintHex(theme.color.domain.train, 0.55),
    idle: theme.color.track,
  });
  return <ThumbnailShape paint={paint} tint={theme.color.tint.train} />;
}
