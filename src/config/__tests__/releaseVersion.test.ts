import { releaseVersion } from '../releaseVersion';

test('Android release identifier starts above the Phase 0 test version', () => {
  expect(releaseVersion.name).toBe('0.1.0');
  expect(Number.isSafeInteger(releaseVersion.androidCode)).toBe(true);
  expect(releaseVersion.androidCode).toBeGreaterThan(1);
});
