import { canRenderThemedNavigation, hydrateThemePreferences } from '../themePreferences';
import { resolveMode } from '../ThemeProvider';

test('cold-start waits for BOTH saved appearance and accessibility before first navigation frame', async () => {
  let finishMode!: (value: { ok: true; value: 'dark' }) => void;
  const modePromise = new Promise<{ ok: true; value: 'dark' }>(resolve => { finishMode = resolve; });
  let preferencesReady = false;
  const pending = hydrateThemePreferences(
    { mode: 'system', style: 'aurora' },
    { theme: () => modePromise, style: async () => ({ ok: true, value: 'solid' as const }) },
  ).then(value => { preferencesReady = true; return value; });
  expect(canRenderThemedNavigation(true, preferencesReady)).toBe(false);
  finishMode({ ok: true, value: 'dark' });
  const values = await pending;
  expect(values).toEqual({ mode: 'dark', style: 'solid' });
  expect(resolveMode(values.mode, 'light')).toBe('dark');
  expect(canRenderThemedNavigation(true, preferencesReady)).toBe(true);
  expect(canRenderThemedNavigation(false, preferencesReady)).toBe(false);
});

test('missing, corrupted or failing settings fall back without crashing', async () => {
  const initial = { mode: 'system' as const, style: 'aurora' as const };
  expect(await hydrateThemePreferences(initial, {
    theme: async () => ({ ok: false }),
    style: async () => ({ ok: false }),
  })).toEqual(initial);
  expect(await hydrateThemePreferences(initial, {
    theme: async () => { throw Error('SQLite unavailable'); },
    style: async () => ({ ok: true, value: 'solid' as const }),
  })).toEqual(initial);
});
