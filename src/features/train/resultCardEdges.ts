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
