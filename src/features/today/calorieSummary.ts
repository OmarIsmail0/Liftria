import type { WeightPoint } from '../progress/trendMath';

export type CalorieTarget = {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  source: 'estimate' | 'manual';
};

export type CalorieInput = {
  logged: boolean;
  kcal: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  completeMacroItems: number;
  count: number;
  hidden: boolean;
  target: CalorieTarget | null;
};

export type MacroKey = 'protein' | 'carbs' | 'fat';

export type MacroColumn = {
  key: MacroKey;
  /** Rounded grams when that macro was logged. Null means it was not measured. */
  amount: number | null;
  /** Target grams. Null when there is no calorie target to compare with. */
  goal: number | null;
};

export type CalorieHero =
  | { kind: 'empty' }
  | { kind: 'hidden'; tone: 'hidden' | 'over' | 'on-track' }
  | { kind: 'remaining'; kcal: number }
  | { kind: 'over'; kcal: number }
  | { kind: 'eaten'; kcal: number };

export type CalorieView = {
  hero: CalorieHero;
  /** Fraction of the target that was eaten, only after something was logged. */
  progress: number | null;
  eaten: number | null;
  target: number | null;
  hasTarget: boolean;
  macros: MacroColumn[] | null;
  caloriesOnly: boolean;
  partial: { count: number; total: number } | null;
  estimate: boolean;
  manual: boolean;
  showSetTarget: boolean;
};

const roundMacro = (value: number | null): number | null =>
  value === null || !Number.isFinite(value) ? null : Math.round(value);

/** What the calories card may show. An unlogged day is never rendered as 0 kcal. */
export function calorieView(input: CalorieInput): CalorieView {
  const usable = input.target && input.target.kcal > 0 ? input.target : null;
  const hasTarget = input.target !== null;
  const base = {
    hasTarget,
    estimate: input.target?.source === 'estimate',
    manual: input.target?.source === 'manual',
    showSetTarget: input.target === null,
  };
  if (!input.logged) {
    return {
      ...base,
      hero: { kind: 'empty' },
      progress: null,
      eaten: null,
      target: input.hidden || !usable ? null : Math.round(usable.kcal),
      macros: null,
      caloriesOnly: false,
      partial: null,
    };
  }
  const eaten = Math.max(0, Math.round(input.kcal));
  if (input.hidden) {
    const over = usable !== null && eaten > usable.kcal;
    return {
      ...base,
      hero: { kind: 'hidden', tone: usable === null ? 'hidden' : over ? 'over' : 'on-track' },
      progress: null,
      eaten: null,
      target: null,
      macros: null,
      caloriesOnly: false,
      partial: null,
    };
  }
  const protein = roundMacro(input.protein);
  const carbs = roundMacro(input.carbs);
  const fat = roundMacro(input.fat);
  const anyMacro = protein !== null || carbs !== null || fat !== null;
  const goal = (grams: number): number | null => usable ? Math.round(grams) : null;
  const macros: MacroColumn[] | null = anyMacro ? [
    { key: 'protein', amount: protein, goal: goal(input.target?.proteinG ?? 0) },
    { key: 'carbs', amount: carbs, goal: goal(input.target?.carbsG ?? 0) },
    { key: 'fat', amount: fat, goal: goal(input.target?.fatG ?? 0) },
  ] : null;
  const partial = anyMacro && input.completeMacroItems < input.count
    ? { count: input.completeMacroItems, total: input.count }
    : null;
  const loggedBase = {
    ...base,
    eaten,
    macros,
    caloriesOnly: !anyMacro,
    partial,
  };
  if (!usable) {
    return { ...loggedBase, hero: { kind: 'eaten', kcal: eaten }, progress: null, target: null };
  }
  const target = Math.round(usable.kcal);
  if (eaten > target) {
    return { ...loggedBase, hero: { kind: 'over', kcal: eaten - target }, progress: 1, target };
  }
  return {
    ...loggedBase,
    hero: { kind: 'remaining', kcal: target - eaten },
    progress: eaten / target,
    target,
  };
}

export type HealthRowInput = {
  availability: string | null;
  permission: 'granted' | 'denied' | 'unknown' | undefined;
  state: 'value' | 'no-data' | 'not-allowed' | 'not-available' | 'error' | undefined;
  /** Android reports a grant. Apple Health does not, so a refused read stays hidden. */
  reportsPermission: boolean;
};

/** Steps and weight rows appear for a real reading or an allowed connection, never as a placeholder 0. */
export function showHealthRow(input: HealthRowInput): boolean {
  if (input.state === 'value') return true;
  if (input.availability !== 'available') return false;
  if (input.reportsPermission) return input.permission === 'granted';
  return input.state === 'no-data' || input.state === 'error';
}

/** Newest positive weigh-in. Zero and blank dates are not measurements. */
export function latestLoggedWeight(points: readonly WeightPoint[]): WeightPoint | null {
  const usable = points.filter(point =>
    Number.isFinite(point.kg) && point.kg > 0 && Number.isFinite(Date.parse(point.at)));
  usable.sort((a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id));
  return usable[0] ?? null;
}
