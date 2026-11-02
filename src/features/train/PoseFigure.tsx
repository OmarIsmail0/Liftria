import { memo, type ReactNode } from 'react';
import { G, Path, Line, Circle, Rect, Svg } from 'react-native-svg';
import { useTheme } from '../../design/ThemeProvider';
import type { BuiltPose, PosePrimitive } from './exercisePoses';
import { poseRoleColors, type RolePaint } from './poseColors';
import { rotateList } from './poseTransform';

export interface PoseFigureProps {
  pose: BuiltPose;
  viewBox: string;
  width: number;
  height: number;
  /** Theme identity so a memoised row can skip the SVG when only the checkmark changes. */
  themeKey: string;
}

/**
 * react-native-svg's parser accepts a rotate list on Path, but a list that fails to
 * render would leave the arms unmoved. Each rotate is its own group, which is the
 * SVG nesting order (the first rotate is the outer one).
 */
function transformed(transform: string | undefined, child: ReactNode): ReactNode {
  if (!transform) return child;
  const steps = rotateList(transform);
  if (!steps) return <G transform={transform}>{child}</G>;
  let node = child;
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const step = steps[index];
    if (step) node = <G transform={step}>{node}</G>;
  }
  return node;
}

function PoseShape({ primitive, paint }: { primitive: PosePrimitive; paint: RolePaint }) {
  if (primitive.kind === 'path') {
    const path = <Path d={primitive.d} fill={paint.fill} stroke={paint.stroke}
      strokeWidth={paint.strokeWidth} strokeLinejoin="round"
      vectorEffect={paint.strokeWidth > 0 ? 'nonScalingStroke' : 'none'} />;
    return transformed(primitive.transform, path);
  }
  if (primitive.kind === 'line') {
    return <Line x1={primitive.x1} y1={primitive.y1} x2={primitive.x2} y2={primitive.y2}
      stroke={paint.fill} strokeWidth={primitive.width} strokeLinecap="round" />;
  }
  if (primitive.kind === 'circle') {
    return <Circle cx={primitive.cx} cy={primitive.cy} r={primitive.r} fill={paint.fill} />;
  }
  return <Rect x={primitive.x} y={primitive.y} width={primitive.width} height={primitive.height}
    rx={primitive.rx} fill={paint.fill} />;
}

function sameFigure(previous: PoseFigureProps, next: PoseFigureProps): boolean {
  return previous.pose === next.pose
    && previous.viewBox === next.viewBox
    && previous.width === next.width
    && previous.height === next.height
    && previous.themeKey === next.themeKey;
}

/** Draws one built pose. Colours come from the theme; the geometry does not. */
export const PoseFigure = memo(function PoseFigure({ pose, viewBox, width, height }: PoseFigureProps) {
  const { theme } = useTheme();
  const colors = poseRoleColors(theme);
  return <Svg width={width} height={height} viewBox={viewBox} accessible={false}>
    {pose.primitives.map((primitive, index) =>
      <PoseShape key={index} primitive={primitive} paint={colors[primitive.role]} />)}
  </Svg>;
}, sameFigure);
