import { getSetting, setSetting } from '../../../services/database';
import { getTypedSetting, setTypedSetting } from '../../../services/database/settings';
import { readSavedStep, writeStep, markOnboardingComplete, markOnboardingDeferred, onboardingDestination } from '../draft';

jest.mock('../../../services/database', () => ({
  getSetting: jest.fn(async () => ({ ok: true, value: null })),
  setSetting: jest.fn(async () => ({ ok: true, value: undefined })),
}));
jest.mock('../../../services/database/settings', () => ({
  getTypedSetting: jest.fn(async key => ({ ok: true, value: key === 'onboarding.step' ? 0 : null })),
  setTypedSetting: jest.fn(async () => ({ ok: true, value: undefined })),
}));

beforeEach(() => { jest.clearAllMocks(); });

test('fresh install enters welcome, progress writes typed numeric step and resumes', async () => {
  expect(await onboardingDestination()).toEqual({ pathname: '/onboarding/[step]', params: { step: 'welcome' } });
  expect(await writeStep('health')).toBe(true);
  expect(setTypedSetting).toHaveBeenCalledWith('onboarding.step', 5);
  jest.mocked(getTypedSetting).mockImplementation(async (key: any) =>
    ({ ok: true, value: key === 'onboarding.step' ? 5 : null }) as any);
  expect(await readSavedStep()).toBe('health');
  expect(await onboardingDestination()).toEqual({ pathname: '/onboarding/[step]', params: { step: 'health' } });
});

test('finish and finish later permit Today, but a corrupt progress value cannot bypass privacy', async () => {
  jest.mocked(getTypedSetting).mockImplementation(async (key: any) =>
    ({ ok: true, value: key === 'onboarding.step' ? -500 : null }) as any);
  expect(await readSavedStep()).toBe('welcome');
  expect(await markOnboardingDeferred()).toBe(true);
  expect(setSetting).toHaveBeenCalledWith('onboarding.deferred', 'true');
  jest.mocked(getSetting).mockResolvedValue({ ok: true, value: 'true' });
  expect(await onboardingDestination()).toBe('/(tabs)/today');
  jest.mocked(getSetting).mockResolvedValue({ ok: true, value: null });
  jest.mocked(getTypedSetting).mockImplementation(async (key: any) =>
    ({ ok: true, value: key === 'onboarding.completedAt' ? '2026-10-24T19:00:00Z' : 2 }) as any);
  expect(await onboardingDestination()).toBe('/(tabs)/today');
  expect(await markOnboardingComplete()).toBe(true);
  expect(setTypedSetting).toHaveBeenCalledWith('onboarding.completedAt', expect.any(String));
});
