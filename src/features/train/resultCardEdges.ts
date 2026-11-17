import type { ViewStyle } from 'react-native';
import type { LiftriaTheme } from '../../design/tokens';

/**
 * Card chrome split across a virtualized list: top cap, a full-width body per
 * row or letter, and a bottom cap. One wrapping Card would hold every row and
 * turn virtualization off.
 */
export function resultCardEdges(theme: LiftriaTheme): { top: ViewStyle; body: ViewStyle; bottom: ViewStyle } {
  const fill: ViewStyle = { backgroundColor: theme.cardFill };
  return {
    top: {
      ...fill,
      borderTopStartRadius: theme.radius.md,
      borderTopEndRadius: theme.radius.md,
      paddingTop: theme.space[4],
      paddingHorizontal: theme.space[4],
      overflow: 'hidden',
    },
    body: {
      ...fill,
      paddingHorizontal: theme.space[4],
    },
    bottom: {
      ...fill,
      borderBottomStartRadius: theme.radius.md,
      borderBottomEndRadius: theme.radius.md,
      paddingBottom: theme.space[4],
    },
  };
}

/**
 * One row of a card that is split across a virtualized list (the same surface as `ListGroup`).
 * The first row rounds the top corners and the last rounds the bottom ones.
 */
export function listGroupRowStyle(theme: LiftriaTheme, index: number, count: number): ViewStyle {
  const radius = theme.radius.md;
  return {
    backgroundColor: theme.color.bg.surface,
    borderTopStartRadius: index === 0 ? radius : 0,
    borderTopEndRadius: index === 0 ? radius : 0,
    borderBottomStartRadius: index === count - 1 ? radius : 0,
    borderBottomEndRadius: index === count - 1 ? radius : 0,
    overflow: 'hidden',
  };
}
