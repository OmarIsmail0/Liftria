import { screenshotRoute } from '../checkRoute';

const read = (value: unknown) => () => value;

test('a CI iPhone build opens the route the screenshot check wrote', () => {
  expect(screenshotRoute(read('/dev/demo-workout?auto=1'), 'ios', true)).toBe('/dev/demo-workout?auto=1');
});

test('store builds, Android and malformed values never redirect', () => {
  expect(screenshotRoute(read('/settings'), 'ios', false)).toBeNull();
  expect(screenshotRoute(read('/settings'), 'android', true)).toBeNull();
  expect(screenshotRoute(read(undefined), 'ios', true)).toBeNull();
  expect(screenshotRoute(read('settings'), 'ios', true)).toBeNull();
  expect(screenshotRoute(read('//evil.example'), 'ios', true)).toBeNull();
  expect(screenshotRoute(read(42), 'ios', true)).toBeNull();
});
