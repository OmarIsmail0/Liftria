import type { ViewStyle } from 'react-native';
import type { LiftriaTheme } from '../../design/tokens';

/**
 * Card chrome split across a virtualized list: top cap, a full-width body per
 * row or letter, and a bottom cap. One wrapping Card would hold every row and
 * turn virtualization off.
 */
export function resultCardEdges(theme: LiftriaTheme): { top: ViewStyle; body: ViewStyle; bottom: ViewStyle } {
  const aurora = theme.effectiveStyle === 'aurora';
  const edge: ViewStyle = {
    backgroundColor: theme.cardFill,
    borderColor: aurora ? theme.surface.hairline : theme.color.border.subtle,
    borderLeftWidth: theme.size.border.thin,
    borderRightWidth: theme.size.border.thin,
  };
  return {
    top: {
      ...edge,
      borderTopWidth: theme.size.border.thin,
      borderTopLeftRadius: theme.radius.lg,
      borderTopRightRadius: theme.radius.lg,
      paddingTop: theme.space[4],
      paddingHorizontal: theme.space[4],
      overflow: 'hidden',
    },
    body: {
      ...edge,
      paddingHorizontal: theme.space[4],
    },
    bottom: {
      ...edge,
      borderBottomWidth: theme.size.border.thin,
      borderBottomLeftRadius: theme.radius.lg,
      borderBottomRightRadius: theme.radius.lg,
      paddingBottom: theme.space[4],
    },
  };
}
