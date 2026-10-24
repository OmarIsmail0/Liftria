import releaseVersion from '../releaseVersion.json';

test('Android release identifier starts above the Phase 0 test version', () => {
  expect(releaseVersion.name).toBe('0.1.0');
  expect(Number.isSafeInteger(releaseVersion.androidCode)).toBe(true);
  expect(releaseVersion.androidCode).toBeGreaterThan(1);
});

import { resolveAndroidVersionCode } from '../androidVersion';

describe('Android versionCode override from trusted CI', () => {
  const base = releaseVersion.androidCode;
  test('valid integer strictly above the JSON fallback is used', () => {
    expect(resolveAndroidVersionCode('101', base)).toBe(101);
    expect(resolveAndroidVersionCode(String(Number.MAX_SAFE_INTEGER), base)).toBe(Number.MAX_SAFE_INTEGER);
  });
  test.each([
    undefined, '', '  ', 'nope', '-2', '1.5', 'Infinity', 'NaN', '9007199254740992',
    String(releaseVersion.androidCode), String(releaseVersion.androidCode - 1),
  ])('invalid, unsafe or non-increasing override %s falls back', value => {
    expect(resolveAndroidVersionCode(value, base)).toBe(base);
  });
  test('a larger JSON fallback takes precedence over a stale CI override', () => {
    expect(resolveAndroidVersionCode('100', 200)).toBe(200);
  });
});
