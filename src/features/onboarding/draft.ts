import { getSetting, setSetting } from '../../services/database';
import { onboardingSteps, type OnboardingStep } from './flow';
import { getTypedSetting, setTypedSetting } from '../../services/database/settings';
import type { Activity, FormulaSex, Goal } from './targetEstimate';

/** Non-secret form draft. Validated profile and targets go to v2 repositories. */
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
const DEFERRED_KEY = 'onboarding.deferred';

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

/** Progress and completion use the Step 4 typed app_settings repository. */
export async function readSavedStep(): Promise<OnboardingStep> {
  const result = await getTypedSetting('onboarding.step');
  if (!result.ok) return 'welcome';
  return onboardingSteps[result.value] ?? 'welcome';
}
export async function writeStep(step: OnboardingStep): Promise<boolean> {
  return (await setTypedSetting('onboarding.step', onboardingSteps.indexOf(step))).ok;
}
export async function markOnboardingComplete(): Promise<boolean> {
  return (await setTypedSetting('onboarding.completedAt', new Date().toISOString())).ok;
}
export async function markOnboardingDeferred(): Promise<boolean> {
  return (await setSetting(DEFERRED_KEY, JSON.stringify(true))).ok;
}

/** A fresh or unfinished install routes to the saved step; a deferred setup may use Today. */
export async function onboardingDestination(): Promise<
  '/(tabs)/today' | { pathname: '/onboarding/[step]'; params: { step: OnboardingStep } }
> {
  const [completed, deferred] = await Promise.all([
    getTypedSetting('onboarding.completedAt'), getSetting(DEFERRED_KEY),
  ]);
  if (completed.ok && completed.value !== null ||
      deferred.ok && deferred.value === 'true') return '/(tabs)/today';
  return { pathname: '/onboarding/[step]', params: { step: await readSavedStep() } };
}
