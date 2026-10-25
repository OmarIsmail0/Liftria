import { displayHeight, displayWeight, toMetricHeight, toMetricWeight } from '../units';

test('units are a display choice: stored metric values never mutate', () => {
  const weightKg = 78.4, heightCm = 180;
  expect(displayWeight(weightKg, 'kg')).toBe('78.4 kg');
  expect(displayWeight(weightKg, 'lb')).toBe('172.8 lb');
  expect(displayHeight(heightCm, 'cm')).toBe('180 cm');
  expect(displayHeight(heightCm, 'ftin')).toBe('5′ 11″');
  expect(toMetricWeight(172.8, 'lb')).toBeCloseTo(weightKg, 1);
  expect(toMetricHeight(5, 11, 'ftin')).toBeCloseTo(heightCm, 0);
});
test('nonfinite values are not shown as genuine measurements', () => {
  expect(displayWeight(NaN, 'kg')).toBe('—');
  expect(displayHeight(Infinity, 'ftin')).toBe('—');
});
