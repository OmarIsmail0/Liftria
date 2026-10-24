import { canEstimateTarget, estimateTarget, profileAge, targetSafety } from '../targetEstimate';

const birthYear = new Date().getFullYear() - 30;
const sample = {
  birthYear, heightCm: 180, weightKg: 77,
  sexForFormula: 'male', activity: 'some', goal: 'build',
} as const;

test('ON-5 Mifflin × activity × goal: documented 2,650 kcal sample', () => {
  expect(profileAge(birthYear)).toBe(30);
  expect(canEstimateTarget(sample)).toBe(true);
  expect(estimateTarget(sample)).toMatchObject({
    kcal: 2650, proteinG: 155, fatG: 75, carbsG: 340,
    inputs: { age: 30, bmr: 1750, activityFactor: 1.375, goalFactor: 1.1 },
    source: 'estimate', lessPrecise: false,
  });
});
test('unspecified sex uses average constant −78 and is labeled less precise', () => {
  const result = estimateTarget({ ...sample, sexForFormula: 'unspecified', goal: 'maintain' });
  expect(result.inputs.bmr).toBe(1667);
  expect(result.lessPrecise).toBe(true);
  expect(result.proteinG).toBe(125);
});
test('profile validation is metric, skippable and checks ON-3 boundaries', () => {
  expect(canEstimateTarget({})).toBe(false);
  expect(canEstimateTarget({ ...sample, heightCm: 119.9 })).toBe(false);
  expect(canEstimateTarget({ ...sample, heightCm: 230 })).toBe(true);
  expect(canEstimateTarget({ ...sample, weightKg: 34.9 })).toBe(false);
  expect(canEstimateTarget({ ...sample, weightKg: 300 })).toBe(true);
  expect(canEstimateTarget({ ...sample, birthYear: new Date().getFullYear() - 15 })).toBe(false);
});
test('floor is a warning below 1200 or a deficit above 25%; under 1000 is blocked', () => {
  expect(targetSafety(999, 1800)).toEqual({ blocked: true, warning: true });
  expect(targetSafety(1100, 2650)).toEqual({ blocked: false, warning: true });
  expect(targetSafety(1950, 2650)).toEqual({ blocked: false, warning: true });
  expect(targetSafety(2000, 2650)).toEqual({ blocked: false, warning: false });
  expect(targetSafety(1200, null)).toEqual({ blocked: false, warning: false });
});
