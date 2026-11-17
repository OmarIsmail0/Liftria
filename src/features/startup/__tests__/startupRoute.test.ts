import { resolveStartup } from '../startupRoute';
import { withTimeout } from '../withTimeout';
import { en } from '../../../i18n/en';
import { ar } from '../../../i18n/ar';

jest.mock('../../../services/database', () => ({ checkDatabaseAtStartup: jest.fn() }));
jest.mock('../../onboarding/draft', () => ({ onboardingDestination: jest.fn() }));

const { readFileSync } = jest.requireActual('fs') as { readFileSync: (file: string, encoding: 'utf8') => string };
const today = '/(tabs)/today' as const;

test('a healthy database routes to the saved destination', async () => {
  expect(await resolveStartup({ check: async () => ({ ok: true }), destination: async () => today }))
    .toEqual({ kind: 'route', href: today });
});

test('a database from a newer app or one that fails to open is a recovery screen, not onboarding', async () => {
  const destination = jest.fn(async () => today);
  expect(await resolveStartup({ check: async () => ({ ok: false, reason: 'newer' }), destination }))
    .toEqual({ kind: 'problem', problem: 'newer' });
  expect(await resolveStartup({ check: async () => ({ ok: false, reason: 'failed' }), destination }))
    .toEqual({ kind: 'problem', problem: 'failed' });
  expect(destination).not.toHaveBeenCalled();
  expect(await resolveStartup({ check: async () => ({ ok: true }),
    destination: async () => { throw new Error('settings unreadable'); } }))
    .toEqual({ kind: 'problem', problem: 'failed' });
});

test('a database open that never answers becomes the recovery screen after the deadline', async () => {
  jest.useFakeTimers();
  try {
    const pending = resolveStartup({ check: () => new Promise(() => {}), destination: async () => today }, 1000);
    jest.advanceTimersByTime(1000);
    await expect(pending).resolves.toEqual({ kind: 'problem', problem: 'failed' });
  } finally { jest.useRealTimers(); }
});

test('withTimeout keeps a value that arrives in time and clears its timer', async () => {
  jest.useFakeTimers();
  try {
    await expect(withTimeout(Promise.resolve('saved'), 1000, 'fallback')).resolves.toBe('saved');
    expect(jest.getTimerCount()).toBe(0);
  } finally { jest.useRealTimers(); }
});

test('the root and tab layouts export an error boundary with the recovery screen', () => {
  for (const file of ['app/_layout.tsx', 'app/(tabs)/_layout.tsx']) {
    const source = readFileSync(file, 'utf8');
    expect(source).toMatch(/export function ErrorBoundary\(/);
    expect(source).toMatch(/<RecoveryScreen kind="crash"/);
  }
});

test('every recovery message has real Arabic copy', () => {
  const keys = Object.keys(en).filter(key => key.startsWith('appRecovery.'));
  expect(keys.length).toBeGreaterThanOrEqual(7);
  for (const key of keys) {
    const arabic = (ar as Record<string, string>)[key];
    expect(arabic).toMatch(/[؀-ۿ]/);
    expect(arabic).not.toBe((en as Record<string, string>)[key]);
  }
});
