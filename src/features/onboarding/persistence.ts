import { addTarget, getCurrentTarget, targetSchema, type TargetInput } from '../../services/database/targets';
import { saveProfile, profileSchema, type ProfileInput } from '../../services/database/profile';
import type { OnboardingDraft } from './draft';
import { canEstimateTarget, estimateTarget, targetSafety } from './targetEstimate';

function optionalNumber(raw: string): number | null {
  return raw.trim() === '' ? null : Number(raw);
}

export function draftProfileInput(draft: OnboardingDraft): ProfileInput {
  return {
    name: draft.name.trim() || null,
    sexForFormula: draft.sexForFormula,
    birthYear: optionalNumber(draft.birthYear),
    heightCm: optionalNumber(draft.heightCm),
    weightKg: optionalNumber(draft.weightKg),
    activity: draft.activity,
    goal: draft.goal,
  };
}

export async function persistProfile(draft: OnboardingDraft): Promise<boolean> {
  const parsed = profileSchema.safeParse(draftProfileInput(draft));
  if (!parsed.success) return false;
  return (await saveProfile(parsed.data)).ok;
}

export function draftTargetInput(draft: OnboardingDraft, source: 'estimate' | 'manual'): TargetInput | null {
  if (source === 'estimate') {
    const formula = {
      sexForFormula: draft.sexForFormula,
      birthYear: Number(draft.birthYear), heightCm: Number(draft.heightCm),
      weightKg: Number(draft.weightKg), activity: draft.activity, goal: draft.goal,
    };
    if (!draft.birthYear.trim() || !draft.heightCm.trim() || !draft.weightKg.trim() ||
        !canEstimateTarget(formula)) return null;
    const value = estimateTarget(formula);
    if (targetSafety(value.kcal, null).blocked) return null;
    return {
      kcal: value.kcal, proteinG: value.proteinG, fatG: value.fatG, carbsG: value.carbsG,
      source: 'estimate', inputs: { ...value.inputs },
    };
  }
  const raw = [draft.manualKcal, draft.manualProtein, draft.manualFat, draft.manualCarbs];
  if (raw.some(v => !v.trim())) return null;
  const [kcal, proteinG, fatG, carbsG] = raw.map(Number);
  if ([kcal, proteinG, fatG, carbsG].some(v => v === undefined || !Number.isFinite(v) || v < 0) ||
      kcal === undefined || targetSafety(kcal, null).blocked) return null;
  return { kcal, proteinG: proteinG!, fatG: fatG!, carbsG: carbsG!, source: 'manual', inputs: null };
}

export async function persistTarget(draft: OnboardingDraft, source: 'estimate' | 'manual'): Promise<boolean> {
  const input = draftTargetInput(draft, source);
  const validated = targetSchema.safeParse(input);
  if (!validated.success) return false;
  const existing = await getCurrentTarget();
  if (!existing.ok) return false;
  const current = existing.value, next = validated.data;
  // Reopening ON-5 or tapping Continue again must not append an identical snapshot.
  if (current && current.source === next.source && current.kcal === next.kcal &&
      current.proteinG === next.proteinG && current.fatG === next.fatG &&
      current.carbsG === next.carbsG && JSON.stringify(current.inputs) === JSON.stringify(next.inputs)) {
    return true;
  }
  return (await addTarget(next)).ok;
}
