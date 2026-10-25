import {
  createContext, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import { AccessibilityInfo, Platform, useColorScheme, useWindowDimensions } from 'react-native';
import { createTheme, type LiftriaTheme, type ThemeMode, type VisualStyle } from './tokens';
import { resolveStartupAccessibility } from './startupAccessibility';
import { getTypedSetting, setTypedSetting } from '../services/database/settings';
import { hydrateThemePreferences, canRenderThemedNavigation } from './themePreferences';

export type ThemePreferences = { mode: ThemeMode; style: VisualStyle };

/** System theme may be unknown at startup. Default to Liftria's dark graphite. */
export function resolveMode(
  preference: ThemeMode, systemScheme: 'light' | 'dark' | 'unspecified' | null | undefined,
): 'light' | 'dark' {
  if (preference !== 'system') return preference;
  return systemScheme === 'light' ? 'light' : 'dark';
}

export function resolveEffectiveStyle(
  requested: VisualStyle, highTextContrast: boolean, reduceTransparency: boolean,
): VisualStyle {
  return highTextContrast || reduceTransparency ? 'solid' : requested;
}

type ThemeContextValue = {
  theme: LiftriaTheme;
  preferences: ThemePreferences;
  setMode: (mode: ThemeMode) => void;
  setStyle: (style: VisualStyle) => void;
  setPreferences: (preferences: ThemePreferences) => void;
  /** Reset in-memory theme after deleting the DB. Must not re-create app_settings. */
  resetLocalPreferences: () => void;
  highTextContrast: boolean;
  reduceTransparency: boolean;
  reduceMotion: boolean;
  fontScale: number;
  /** Never render the app navigator until initial accessibility is known or safely timed out. */
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type Props = {
  children: ReactNode;
  /** The typed local settings repository hydrates these before the navigation shell appears. */
  initialMode?: ThemeMode;
  initialStyle?: VisualStyle;
};

export function ThemeProvider({
  children, initialMode = 'system', initialStyle = 'aurora',
}: Props) {
  const systemColorScheme = useColorScheme();
  const { fontScale } = useWindowDimensions();
  const [preferences, setPreferences] = useState<ThemePreferences>({
    mode: initialMode, style: initialStyle,
  });
  // Always start conservatively. This internal frame remains behind the native splash.
  const [highTextContrast, setHighTextContrast] = useState(true);
  const [reduceTransparency, setReduceTransparency] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(true);
  const [accessibilityReady, setAccessibilityReady] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    // Missing/corrupt values fall back to defaults; an unavailable DB does not
    // block the app. The native splash stays up while initial values load.
    void hydrateThemePreferences({ mode: initialMode, style: initialStyle }, {
      theme: () => getTypedSetting('theme'),
      style: () => getTypedSetting('style'),
    }).then(saved => {
      if (mounted) setPreferences(saved);
    }).finally(() => {
      if (mounted) setSettingsReady(true);
    });
    return () => { mounted = false; };
  }, [initialMode, initialStyle]);

  const ready = canRenderThemedNavigation(accessibilityReady, settingsReady);

  useEffect(() => {
    let mounted = true;
    void resolveStartupAccessibility({
      highTextContrast: () => Platform.OS === 'android'
        ? AccessibilityInfo.isHighTextContrastEnabled()
        : Promise.resolve(false),
      reduceTransparency: () => Platform.OS === 'ios'
        ? AccessibilityInfo.isReduceTransparencyEnabled()
        : Promise.resolve(false),
      reduceMotion: () => AccessibilityInfo.isReduceMotionEnabled(),
    }).then(values => {
      if (!mounted) return;
      setHighTextContrast(values.highTextContrast);
      setReduceTransparency(values.reduceTransparency);
      setReduceMotion(values.reduceMotion);
      setAccessibilityReady(true);
    });

    // Subscriptions continue updating theme after the first frame. If a device
    // setting changes while the app is open, the latest OS value wins.
    const contrastSubscription = Platform.OS === 'android'
      ? AccessibilityInfo.addEventListener('highTextContrastChanged', setHighTextContrast)
      : null;
    const transparencySubscription = Platform.OS === 'ios'
      ? AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduceTransparency)
      : null;
    const motionSubscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);

    return () => {
      mounted = false;
      contrastSubscription?.remove();
      transparencySubscription?.remove();
      motionSubscription.remove();
    };
  }, []);

  const mode = resolveMode(preferences.mode, systemColorScheme);
  const effectiveStyle = resolveEffectiveStyle(
    preferences.style, highTextContrast, reduceTransparency,
  );
  const theme = useMemo(() => createTheme(mode, effectiveStyle), [mode, effectiveStyle]);
  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    preferences,
    setMode: (next: ThemeMode) => {
      setPreferences(current => ({ ...current, mode: next }));
      void setTypedSetting('theme', next);
    },
    setStyle: (next: VisualStyle) => {
      setPreferences(current => ({ ...current, style: next }));
      void setTypedSetting('style', next);
    },
    setPreferences: (next: ThemePreferences) => {
      setPreferences(next);
      void setTypedSetting('theme', next.mode);
      void setTypedSetting('style', next.style);
    },
    resetLocalPreferences: () => setPreferences({ mode: 'system', style: 'aurora' }),
    highTextContrast,
    reduceTransparency,
    reduceMotion,
    fontScale,
    ready,
  }), [theme, preferences, highTextContrast, reduceTransparency, reduceMotion, fontScale, ready]);

  return <ThemeContext.Provider value={value}>{ready ? children : null}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
