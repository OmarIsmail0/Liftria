import { calorieView, latestLoggedWeight, showHealthRow, type CalorieInput } from '../calorieSummary';
import type { WeightPoint } from '../../progress/trendMath';

const target = {
  kcal: 2200, proteinG: 150, fatG: 70, carbsG: 250, source: 'estimate' as const,
};

function input(overrides: Partial<CalorieInput> = {}): CalorieInput {
  return {
    logged: false, kcal: 0, protein: null, carbs: null, fat: null,
    completeMacroItems: 0, count: 0, hidden: false, target: null, ...overrides,
  };
}

test('an unlogged day is empty text, not 0 kcal left or 0 eaten', () => {
  const empty = calorieView(input({ kcal: 0, target }));
  expect(empty.hero).toEqual({ kind: 'empty' });
  expect(empty.progress).toBeNull();
  expect(empty.eaten).toBeNull();
  expect(empty.macros).toBeNull();
  expect(empty.showSetTarget).toBe(false);
  expect(empty.target).toBe(2200);

  const noTarget = calorieView(input());
  expect(noTarget.hero).toEqual({ kind: 'empty' });
  expect(noTarget.showSetTarget).toBe(true);
  expect(noTarget.target).toBeNull();
  expect(noTarget.eaten).toBeNull();
});

test('logged food with no target shows eaten, and a target shows left or over', () => {
  expect(calorieView(input({
    logged: true, kcal: 1536, count: 2, protein: 92, carbs: 180, fat: 48, completeMacroItems: 2,
  })).hero).toEqual({ kind: 'eaten', kcal: 1536 });

  const under = calorieView(input({
    logged: true, kcal: 1536, count: 2, protein: 92.4, carbs: 180, fat: 48, completeMacroItems: 2, target,
  }));
  expect(under.hero).toEqual({ kind: 'remaining', kcal: 664 });
  expect(under.progress).toBeCloseTo(1536 / 2200);
  expect(under.eaten).toBe(1536);
  expect(under.target).toBe(2200);
  expect(under.macros).toEqual([
    { key: 'protein', amount: 92, goal: 150 },
    { key: 'carbs', amount: 180, goal: 250 },
    { key: 'fat', amount: 48, goal: 70 },
  ]);
  expect(under.estimate).toBe(true);

  const over = calorieView(input({ logged: true, kcal: 2400, count: 1, target }));
  expect(over.hero).toEqual({ kind: 'over', kcal: 200 });
  expect(over.progress).toBe(1);
  expect(over.caloriesOnly).toBe(true);
  expect(over.macros).toBeNull();
});

test('hidden numbers and missing macros are not drawn as zero', () => {
  const hidden = calorieView(input({ logged: true, kcal: 2400, target, hidden: true }));
  expect(hidden.hero).toEqual({ kind: 'hidden', tone: 'over' });
  expect(hidden.eaten).toBeNull();
  expect(hidden.progress).toBeNull();
  expect(hidden.macros).toBeNull();

  const partial = calorieView(input({
    logged: true, kcal: 400, count: 2, protein: 20, carbs: null, fat: null,
    completeMacroItems: 0, target: { ...target, source: 'manual' },
  }));
  expect(partial.macros).toEqual([
    { key: 'protein', amount: 20, goal: 150 },
    { key: 'carbs', amount: null, goal: 250 },
    { key: 'fat', amount: null, goal: 70 },
  ]);
  expect(partial.partial).toEqual({ count: 0, total: 2 });
  expect(partial.manual).toBe(true);
  expect(partial.estimate).toBe(false);
});

test('a health row needs a reading or a connection', () => {
  expect(showHealthRow({
    availability: 'unavailable', permission: undefined, state: undefined, reportsPermission: true,
  })).toBe(false);
  expect(showHealthRow({
    availability: 'available', permission: 'granted', state: 'no-data', reportsPermission: true,
  })).toBe(true);
  expect(showHealthRow({
    availability: 'available', permission: 'denied', state: 'not-allowed', reportsPermission: true,
  })).toBe(false);
  expect(showHealthRow({
    availability: 'available', permission: 'unknown', state: 'no-data', reportsPermission: false,
  })).toBe(true);
  expect(showHealthRow({
    availability: 'available', permission: 'unknown', state: 'not-allowed', reportsPermission: false,
  })).toBe(false);
  expect(showHealthRow({
    availability: null, permission: undefined, state: 'value', reportsPermission: true,
  })).toBe(true);
});

test('the latest weigh-in ignores zeros and undated rows', () => {
  const row = (id: string, at: string, kg: number): WeightPoint => ({ id, at, kg, source: 'liftria' });
  expect(latestLoggedWeight([])).toBeNull();
  expect(latestLoggedWeight([row('a', '2026-11-01T00:00:00.000Z', 0), row('b', 'not-a-date', 80)])).toBeNull();
  expect(latestLoggedWeight([
    row('old', '2026-11-01T00:00:00.000Z', 80),
    row('new', '2026-11-16T00:00:00.000Z', 79.2),
    { id: 'health', at: '2026-11-10T00:00:00.000Z', kg: 81, source: 'health-connect' },
  ])?.id).toBe('new');
});
