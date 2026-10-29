import { devRoutesEnabled } from '../devRoutes';

test('development builds always have the developer screens', () => {
  expect(devRoutesEnabled(undefined, true)).toBe(true);
  expect(devRoutesEnabled('0', true)).toBe(true);
});

test('a release build has them only when the bundle flag is exactly 1', () => {
  expect(devRoutesEnabled('1', false)).toBe(true);
  expect(devRoutesEnabled(undefined, false)).toBe(false);
  expect(devRoutesEnabled('0', false)).toBe(false);
  expect(devRoutesEnabled('true', false)).toBe(false);
  expect(devRoutesEnabled('', false)).toBe(false);
});
