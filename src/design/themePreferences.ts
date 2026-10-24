import type { ThemeMode, VisualStyle } from './tokens';

export type StartupThemePreferences = { mode: ThemeMode; style: VisualStyle };
export type StartupReadResult<T> = { ok: true; value: T } | { ok: false };
export type ThemeSettingReader = {
  (key: 'theme'): Promise<StartupReadResult<ThemeMode>>;
  (key: 'style'): Promise<StartupReadResult<VisualStyle>>;
};

/**
 * Wait for both saved settings before the first navigation frame.
 * Individual read failures keep the configured fallback; no light/dark flash.
 */
export async function hydrateThemePreferences(
  initial: StartupThemePreferences,
  read: {
    theme: () => Promise<StartupReadResult<ThemeMode>>;
    style: () => Promise<StartupReadResult<VisualStyle>>;
  },
): Promise<StartupThemePreferences> {
  try {
    const [mode, style] = await Promise.all([read.theme(), read.style()]);
    return {
      mode: mode.ok ? mode.value : initial.mode,
      style: style.ok ? style.value : initial.style,
    };
  } catch {
    return initial;
  }
}

/** Called by ThemeProvider and tested separately for cold-start sequencing. */
export function canRenderThemedNavigation(accessibilityReady: boolean, preferencesReady: boolean): boolean {
  return accessibilityReady && preferencesReady;
}
