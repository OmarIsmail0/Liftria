import { addTarget } from '../../../services/database/targets';
import { saveProfile } from '../../../services/database/profile';
import { draftProfileInput, draftTargetInput, persistProfile, persistTarget } from '../persistence';
import { emptyDraft } from '../draft';

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('../../../services/database/profile', () => ({
  ...jest.requireActual('../../../services/database/profile'),
  saveProfile: jest.fn(async () => ({ ok: true, value: {} })),
}));
jest.mock('../../../services/database/targets', () => ({
  ...jest.requireActual('../../../services/database/targets'),
  addTarget: jest.fn(async () => ({ ok: true, value: {} })),
}));
const base = {
  ...emptyDraft, name: ' Casey ', birthYear: String(new Date().getFullYear() - 30),
  heightCm: '180', weightKg: '77', sexForFormula: 'male' as const,
  activity: 'some' as const, goal: 'build' as const,
};

beforeEach(() => {
  jest.clearAllMocks();
});
test('ON-3 writes a nullable metric profile using the real validated repository contract', async () => {
  expect(draftProfileInput(emptyDraft)).toMatchObject({
    name: null, heightCm: null, weightKg: null, birthYear: null,
  });
  expect(await persistProfile(base)).toBe(true);
  expect(saveProfile).toHaveBeenCalledWith({
    name: 'Casey', birthYear: expect.any(Number), heightCm: 180, weightKg: 77,
    sexForFormula: 'male', activity: 'some', goal: 'build',
  });
  expect(await persistProfile({ ...base, heightCm: '50' })).toBe(false);
  expect(saveProfile).toHaveBeenCalledTimes(1);
});
test('ON-5 writes a real append-only estimate with its calculation factors', async () => {
  expect(draftTargetInput(emptyDraft, 'estimate')).toBeNull();
  expect(await persistTarget(base, 'estimate')).toBe(true);
  expect(addTarget).toHaveBeenCalledWith({
    kcal: 2650, proteinG: 155, fatG: 75, carbsG: 340, source: 'estimate',
    inputs: expect.objectContaining({ age: 30, activityFactor: 1.375, goalFactor: 1.1 }),
  });
});
test('manual calories below 1000 and negative macros never reach INSERT', async () => {
  expect(await persistTarget({ ...base, manualKcal: '999', manualProtein: '100',
    manualFat: '60', manualCarbs: '200' }, 'manual')).toBe(false);
  expect(await persistTarget({ ...base, manualKcal: '1900', manualProtein: '-1',
    manualFat: '60', manualCarbs: '200' }, 'manual')).toBe(false);
  expect(addTarget).not.toHaveBeenCalled();
  const manual = { ...base, manualKcal: '1900', manualProtein: '130',
    manualFat: '55', manualCarbs: '220' };
  expect(await persistTarget(manual, 'manual')).toBe(true);
  expect(addTarget).toHaveBeenCalledWith({
    kcal: 1900, proteinG: 130, fatG: 55, carbsG: 220, source: 'manual', inputs: null,
  });
});
