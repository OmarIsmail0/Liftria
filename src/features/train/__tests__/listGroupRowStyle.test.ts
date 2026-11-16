import { createTheme } from '../../../design/tokens';
import { listGroupRowStyle } from '../resultCardEdges';

const theme = createTheme('light', 'solid');

test('a card split across a virtualized list rounds only its first and last row', () => {
  const first = listGroupRowStyle(theme, 0, 3);
  const middle = listGroupRowStyle(theme, 1, 3);
  const last = listGroupRowStyle(theme, 2, 3);
  expect(first.borderTopStartRadius).toBe(theme.radius.md);
  expect(first.borderTopEndRadius).toBe(theme.radius.md);
  expect(first.borderBottomStartRadius).toBe(0);
  expect(middle.borderTopStartRadius).toBe(0);
  expect(middle.borderBottomEndRadius).toBe(0);
  expect(last.borderBottomStartRadius).toBe(theme.radius.md);
  expect(last.borderBottomEndRadius).toBe(theme.radius.md);
  expect(last.borderTopStartRadius).toBe(0);
  expect(first.backgroundColor).toBe(theme.color.bg.surface);
});

test('a one-row card rounds all four corners with logical (start and end) radii', () => {
  const only = listGroupRowStyle(theme, 0, 1);
  expect([only.borderTopStartRadius, only.borderTopEndRadius, only.borderBottomStartRadius, only.borderBottomEndRadius])
    .toEqual([theme.radius.md, theme.radius.md, theme.radius.md, theme.radius.md]);
  expect(only).not.toHaveProperty('borderTopLeftRadius');
});
