import { resolveMode, resolveEffectiveStyle } from '../ThemeProvider';
import { resolveStartupAccessibility, type AccessibilityChecks } from '../startupAccessibility';

const okChecks = (highTextContrast: boolean): AccessibilityChecks => ({
  highTextContrast: async () => highTextContrast,
  reduceTransparency: async () => false,
  reduceMotion: async () => false,
});

describe('TASK-1: dark fallback on unknown system scheme', () => {
  it.each([
    [null, 'dark'],
    ['light', 'light'],
    ['dark', 'dark'],
  ] as const)('system %s resolves to %s', (system, expected) => {
    expect(resolveMode('system', system)).toBe(expected);
  });

  it('explicit dark or light overrides system and unknown system values', () => {
    for (const system of [null, 'light', 'dark'] as const) {
      expect(resolveMode('dark', system)).toBe('dark');
      expect(resolveMode('light', system)).toBe('light');
    }
  });
});

describe('TASK-2: startup style is resolved before first navigation frame', () => {
  it('high contrast true means Solid', async () => {
    const settings = await resolveStartupAccessibility(okChecks(true));
    expect(settings.source).toBe('resolved');
    expect(resolveEffectiveStyle('aurora', settings.highTextContrast, settings.reduceTransparency)).toBe('solid');
  });

  it('high contrast false means Aurora', async () => {
    const settings = await resolveStartupAccessibility(okChecks(false));
    expect(settings.source).toBe('resolved');
    expect(resolveEffectiveStyle('aurora', settings.highTextContrast, settings.reduceTransparency)).toBe('aurora');
  });

  it('a rejected accessibility read fails closed to Solid', async () => {
    const settings = await resolveStartupAccessibility({
      ...okChecks(false),
      highTextContrast: async () => { throw new Error('Android accessibility service unavailable'); },
    });
    expect(settings.source).toBe('fallback');
    expect(settings.highTextContrast).toBe(true);
    expect(resolveEffectiveStyle('aurora', settings.highTextContrast, settings.reduceTransparency)).toBe('solid');
  });

  it('a synchronous failure also fails closed to Solid', async () => {
    const settings = await resolveStartupAccessibility({
      ...okChecks(false),
      highTextContrast: () => { throw new Error('Native module not initialized'); },
    });
    expect(settings.source).toBe('fallback');
    expect(settings.highTextContrast).toBe(true);
  });

  it('timeout at 1,500ms fails closed to Solid', async () => {
    jest.useFakeTimers();
    try {
      const pending = new Promise<boolean>(() => {});
      const result = resolveStartupAccessibility({
        highTextContrast: () => pending,
        reduceTransparency: async () => false,
        reduceMotion: async () => false,
      });
      await jest.advanceTimersByTimeAsync(1499);
      // Still waiting at 1,499ms; the fallback must not render prematurely.
      await jest.advanceTimersByTimeAsync(1);
      const settings = await result;
      expect(settings.source).toBe('fallback');
      expect(resolveEffectiveStyle('aurora', settings.highTextContrast, settings.reduceTransparency)).toBe('solid');
    } finally {
      jest.useRealTimers();
    }
  });
});
