import { getSetting, setSetting } from '../../services/database';
import { isOnboardingStep, type OnboardingStep } from './flow';
import type { Activity, FormulaSex, Goal } from './targetEstimate';

/** In-progress local draft. Final profile/target writes attach to PR #9's v2 repositories. */
export type OnboardingDraft = {
  name: string; birthYear: string; heightCm: string; weightKg: string;
  sexForFormula: FormulaSex;
  activity: Activity; goal: Goal;
  selectedWatch: string;
  manualKcal: string; manualProtein: string; manualFat: string; manualCarbs: string;
};
export const emptyDraft: OnboardingDraft = {
  name: '', birthYear: '', heightCm: '', weightKg: '',
  sexForFormula: 'unspecified', activity: 'some', goal: 'maintain',
  selectedWatch: 'No watch',
  manualKcal: '', manualProtein: '', manualFat: '', manualCarbs: '',
};
const DRAFT_KEY = 'onboarding.flowDraft';
const STEP_KEY = 'onboarding.step';
const COMPLETE_KEY = 'onboarding.completedAt';

export async function readDraft(): Promise<OnboardingDraft> {
  const result = await getSetting(DRAFT_KEY);
  if (!result.ok || !result.value) return { ...emptyDraft };
  try {
    const parsed: unknown = JSON.parse(result.value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...emptyDraft };
    const value = parsed as Record<string, unknown>;
    const fields = { ...emptyDraft };
    for (const key of Object.keys(fields) as (keyof OnboardingDraft)[]) {
      if (typeof value[key] === 'string') {
        // Only known fields are serialized. Secrets must never enter this table.
        (fields as Record<string, string>)[key] = value[key];
      }
    }
    return fields;
  } catch { return { ...emptyDraft }; }
}
export async function writeDraft(draft: OnboardingDraft): Promise<boolean> {
  return (await setSetting(DRAFT_KEY, JSON.stringify(draft))).ok;
}

export async function readSavedStep(): Promise<OnboardingStep> {
  const completed = await getSetting(COMPLETE_KEY);
  if (completed.ok && completed.value) return 'done';
  const saved = await getSetting(STEP_KEY);
  if (!saved.ok || saved.value === null) return 'welcome';
  try {
    const v: unknown = JSON.parse(saved.value);
    return isOnboardingStep(v) ? v : 'welcome';
  } catch { return 'welcome'; }
}
export async function writeStep(step: OnboardingStep): Promise<boolean> {
  return (await setSetting(STEP_KEY, JSON.stringify(step))).ok;
}
export async function markOnboardingComplete(): Promise<boolean> {
  return (await setSetting(COMPLETE_KEY, JSON.stringify(new Date().toISOString()))).ok;
}
