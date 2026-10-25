import { canEstimateTarget, estimateTarget, targetSafety, type FormulaProfile, type TargetEstimate } from '../onboarding/targetEstimate';
import type { ProfileInput } from '../../services/database/profile';
import type { Target } from '../../services/database/targets';

export type PendingProfileTarget = {
  input: ProfileInput;
  previous: Target;
  estimate: TargetEstimate;
};

/** Manual targets are never silently overwritten by a profile change. */
export function proposedTargetUpdate(
  input: ProfileInput,
  current: Target | null,
  nowYear = new Date().getFullYear(),
): PendingProfileTarget | null {
  if (!current || current.source !== 'estimate' || !canEstimateTarget(input,nowYear)) return null;
  const estimate = estimateTarget(input as FormulaProfile,nowYear);
  return current.kcal === estimate.kcal && current.proteinG === estimate.proteinG &&
    current.fatG === estimate.fatG && current.carbsG === estimate.carbsG
    ? null : { input,previous:current,estimate };
}

export function parseOptionalNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

/** All estimate math in Settings uses edited fields, never onboarding's old draft. */
export function estimateEditedProfile(input: ProfileInput, nowYear = new Date().getFullYear()): TargetEstimate | null {
  return canEstimateTarget(input, nowYear) ? estimateTarget(input, nowYear) : null;
}
export function checkSettingsTarget(
  kcal: number, input: ProfileInput, nowYear = new Date().getFullYear(),
): { blocked: boolean; warning: boolean; reason: string | null } {
  const estimate = canEstimateTarget(input, nowYear)
    ? estimateTarget({ ...input, goal:'maintain' }, nowYear) : null;
  const safety = targetSafety(kcal,estimate?.kcal ?? null);
  return { ...safety, reason: safety.blocked ? 'A calorie target below 1,000 kcal cannot be saved.' : null };
}
