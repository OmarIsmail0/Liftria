import { onboardingSteps, isOnboardingStep, nextOnboardingStep, optionalStep, previousOnboardingStep, skipOnboardingStep } from '../flow';

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

test('ON-3 Skip bypasses the estimate; ON-4 Skip opens ON-5 without inventing inputs', () => {
  expect(skipOnboardingStep('profile')).toBe('health');
  expect(skipOnboardingStep('goal')).toBe('target');
  expect(skipOnboardingStep('target')).toBe('health');
});
