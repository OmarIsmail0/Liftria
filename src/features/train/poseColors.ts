import type { LiftriaTheme } from '../../design/tokens';
import type { PoseRole } from './exercisePoses';
import { tintHex } from './exerciseRows';

export interface RolePaint {
  fill: string;
  /** 'none' when the shape is a solid fill or a stroke of its own (limbs, equipment). */
  stroke: string;
  strokeWidth: number;
}

/**
 * BodyMap fills a muscle with the train colour, a 55% train tint, or `color.track`,
 * and draws the body outline in `color.border.control` (its per-muscle stroke width is 0).
 * The figure uses that outline colour at a hairline so a posed body still reads.
 * Equipment is a lighter and a darker neutral: the same border tokens, swapped so the
 * darker gear stays darker in both modes.
 */
export function poseRoleColors(theme: Pick<LiftriaTheme, 'mode' | 'color'>): Record<PoseRole, RolePaint> {
  const train = theme.color.domain.train;
  const outline = theme.color.border.control;
  const lightGear = theme.mode === 'dark' ? theme.color.border.control : theme.color.border.subtle;
  const darkGear = theme.mode === 'dark' ? theme.color.border.strong : theme.color.border.control;
  return {
    m: { fill: theme.color.track, stroke: outline, strokeWidth: 1.25 },
    p: { fill: train, stroke: outline, strokeWidth: 1.25 },
    s: { fill: tintHex(train, 0.55), stroke: outline, strokeWidth: 1.25 },
    skin: { fill: theme.color.track, stroke: 'none', strokeWidth: 0 },
    eq: { fill: lightGear, stroke: 'none', strokeWidth: 0 },
    eqd: { fill: darkGear, stroke: 'none', strokeWidth: 0 },
  };
}
