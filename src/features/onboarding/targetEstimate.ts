/** ON-5 — Mifflin-St Jeor estimate, strictly a local calculation, not medical advice. */
export type FormulaSex = 'male' | 'female' | 'unspecified';
export type Activity = 'sitting' | 'some' | 'active';
export type Goal = 'lose' | 'maintain' | 'build';

export type FormulaProfile = {
  sexForFormula: FormulaSex | null;
  birthYear: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: Goal;
};

export type TargetEstimate = {
  kcal: number; proteinG: number; fatG: number; carbsG: number;
  source: 'estimate';
  inputs: FormulaProfile & { age: number; bmr: number; activityFactor: number; goalFactor: number };
  lessPrecise: boolean;
};

export const activityFactors: Record<Activity, number> = { sitting: 1.2, some: 1.375, active: 1.55 };
export const goalFactors: Record<Goal, number> = { lose: 0.85, maintain: 1, build: 1.1 };
const roundTo = (n: number, step: number) => Math.round(n / step) * step;

export function profileAge(birthYear: number, nowYear = new Date().getFullYear()): number {
  return nowYear - birthYear;
}

export function canEstimateTarget(
  p: Partial<{ [K in keyof FormulaProfile]: FormulaProfile[K] | null }>, nowYear = new Date().getFullYear(),
): p is FormulaProfile {
  const age = p.birthYear == null ? NaN : profileAge(p.birthYear, nowYear);
  return Number.isInteger(age) && age >= 16 && age <= 100 &&
    typeof p.heightCm === 'number' && Number.isFinite(p.heightCm) && p.heightCm >= 120 && p.heightCm <= 230 &&
    typeof p.weightKg === 'number' && Number.isFinite(p.weightKg) && p.weightKg >= 35 && p.weightKg <= 300 &&
    (p.sexForFormula == null || p.sexForFormula === 'male' || p.sexForFormula === 'female' || p.sexForFormula === 'unspecified') &&
    (p.activity === 'sitting' || p.activity === 'some' || p.activity === 'active') &&
    (p.goal === 'lose' || p.goal === 'maintain' || p.goal === 'build');
}

/** Explicitly non-punitive: the estimate may be below 1200 but must show a warning. */
export function estimateTarget(p: FormulaProfile, nowYear = new Date().getFullYear()): TargetEstimate {
  if (!canEstimateTarget(p, nowYear)) throw new Error('Incomplete or invalid profile for estimate');
  const age = profileAge(p.birthYear, nowYear);
  const sexConstant = p.sexForFormula === 'male' ? 5 : p.sexForFormula === 'female' ? -161 : -78;
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * age + sexConstant;
  const activityFactor = activityFactors[p.activity];
  const goalFactor = goalFactors[p.goal];
  const kcal = roundTo(bmr * activityFactor * goalFactor, 50);
  const proteinG = roundTo(p.weightKg * (p.goal === 'maintain' ? 1.6 : 2), 5);
  const fatG = roundTo((kcal * 0.25) / 9, 5);
  const carbsG = roundTo(Math.max(0, (kcal - proteinG * 4 - fatG * 9) / 4), 5);
  return {
    kcal, proteinG, fatG, carbsG, source: 'estimate',
    inputs: { ...p, age, bmr, activityFactor, goalFactor },
    lessPrecise: p.sexForFormula === null || p.sexForFormula === 'unspecified',
  };
}

export const FLOOR_WARNING = 'This is lower than Liftria recommends without guidance from a professional.';
export function targetSafety(requestedKcal: number, estimatedKcal: number | null) {
  const blocked = !Number.isFinite(requestedKcal) || requestedKcal < 1000;
  const warning = Number.isFinite(requestedKcal) &&
    (requestedKcal < 1200 || (estimatedKcal !== null && estimatedKcal > 0 && requestedKcal < estimatedKcal * 0.75));
  return { blocked, warning };
}
