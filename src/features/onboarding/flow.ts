import { translate, type AppLanguage } from '../../i18n';
/** The first-run route set; no capsule on any ON screen. */
export const onboardingSteps = [
  'welcome', 'privacy', 'profile', 'goal', 'target', 'health', 'watch', 'hiku', 'done',
] as const;
export type OnboardingStep = typeof onboardingSteps[number];
export const firstOptionalStep: OnboardingStep = 'profile';

export function isOnboardingStep(value: unknown): value is OnboardingStep {
  return typeof value === 'string' && (onboardingSteps as readonly string[]).includes(value);
}
export function nextOnboardingStep(step: OnboardingStep): OnboardingStep {
  const next = onboardingSteps.indexOf(step) + 1;
  return onboardingSteps[Math.min(next, onboardingSteps.length - 1)]!;
}
export function previousOnboardingStep(step: OnboardingStep): OnboardingStep {
  const previous = onboardingSteps.indexOf(step) - 1;
  return onboardingSteps[Math.max(0, previous)]!;
}
export function optionalStep(step: OnboardingStep): boolean {
  return onboardingSteps.indexOf(step) >= onboardingSteps.indexOf(firstOptionalStep) && step !== 'done';
}

/** ON-3 Skip bypasses estimate; ON-4 Skip still visits ON-5's incomplete state. */
export function skipOnboardingStep(step: OnboardingStep): OnboardingStep {
  return step === 'profile' ? 'health' : nextOnboardingStep(step);
}

/** ON-9 is a completion screen, not one of the eight steps. */
export function onboardingStepCaption(step: OnboardingStep, language: AppLanguage = 'en'): string | null {
  return step === 'done' ? null : translate(language, 'onboarding.stepOf8', { number: onboardingSteps.indexOf(step) + 1 });
}
