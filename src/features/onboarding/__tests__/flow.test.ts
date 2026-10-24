import { onboardingSteps, isOnboardingStep, nextOnboardingStep, optionalStep, previousOnboardingStep } from '../flow';

test('all nine ON IDs appear in the correct first-launch order', () => {
  expect(onboardingSteps).toEqual(['welcome', 'privacy', 'profile', 'goal', 'target', 'health', 'watch', 'hiku', 'done']);
  expect(isOnboardingStep('privacy')).toBe(true);
  expect(isOnboardingStep('skip-consent')).toBe(false);
  expect(nextOnboardingStep('privacy')).toBe('profile');
  expect(nextOnboardingStep('done')).toBe('done');
  expect(previousOnboardingStep('welcome')).toBe('welcome');
  expect(previousOnboardingStep('target')).toBe('goal');
});
test('privacy acknowledgement is mandatory; all later integration steps can be skipped', () => {
  expect(optionalStep('welcome')).toBe(false);
  expect(optionalStep('privacy')).toBe(false);
  expect(optionalStep('profile')).toBe(true);
  expect(optionalStep('hiku')).toBe(true);
  expect(optionalStep('done')).toBe(false);
});
