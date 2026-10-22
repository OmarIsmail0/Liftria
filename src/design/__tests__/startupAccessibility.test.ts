import { resolveMode, resolveEffectiveStyle } from '../ThemeProvider';
import { resolveStartupAccessibility } from '../startupAccessibility';

describe('TASK-1: system appearance', () => {
  test.each([
    [null, 'dark'],
    ['unspecified', 'dark'],
    ['light', 'light'],
    ['dark', 'dark'],
  ] as const)('system theme %s resolves to %s', (system, expected) => {
    expect(resolveMode('system', system)).toBe(expected);
  });

  test.each(['light', 'dark'] as const)('explicit %s overrides the device setting', chosen => {
    for (const system of [null, 'unspecified', 'light', 'dark'] as const) {
      expect(resolveMode(chosen, system)).toBe(chosen);
    }
  });
});

describe('TASK-2: initial appearance is resolved before the app is shown', () => {
  afterEach(() => jest.useRealTimers());

  const checks = (highTextContrast: () => Promise<boolean>) => ({
    highTextContrast,
    reduceTransparency: async () => false,
    reduceMotion: async () => false,
  });

  test('high contrast enabled starts in Solid', async () => {
    const result = await resolveStartupAccessibility(checks(async () => true), 1500);
    expect(result).toMatchObject({ highTextContrast: true, source: 'resolved' });
    expect(resolveEffectiveStyle('aurora', result.highTextContrast, result.reduceTransparency)).toBe('solid');
  });

  test('high contrast disabled starts directly in Aurora', async () => {
    const result = await resolveStartupAccessibility(checks(async () => false), 1500);
    expect(result).toMatchObject({ highTextContrast: false, source: 'resolved' });
    expect(resolveEffectiveStyle('aurora', result.highTextContrast, result.reduceTransparency)).toBe('aurora');
  });

  test('accessibility read rejection fails closed to Solid', async () => {
    const result = await resolveStartupAccessibility(
      checks(async () => { throw new Error('Accessibility service unavailable'); }), 1500,
    );
    expect(result).toMatchObject({ highTextContrast: true, source: 'fallback' });
    expect(resolveEffectiveStyle('aurora', result.highTextContrast, result.reduceTransparency)).toBe('solid');
  });

  test('a hanging check times out at 1.5 seconds and fails closed to Solid', async () => {
    jest.useFakeTimers();
    const pending = new Promise<boolean>(() => {});
    const outcome = resolveStartupAccessibility(checks(() => pending), 1500);
    await jest.advanceTimersByTimeAsync(1500);
    const result = await outcome;
    expect(result).toMatchObject({ highTextContrast: true, source: 'fallback' });
    expect(resolveEffectiveStyle('aurora', result.highTextContrast, result.reduceTransparency)).toBe('solid');
    expect(jest.getTimerCount()).toBe(0);
  });
});
