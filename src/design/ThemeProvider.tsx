import {
  createContext, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import { AccessibilityInfo, Platform, useColorScheme, useWindowDimensions } from 'react-native';
import { createTheme, type LiftriaTheme, type ThemeMode, type VisualStyle } from './tokens';

export type ThemePreferences = { mode: ThemeMode; style: VisualStyle };

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
  highTextContrast: boolean;
  reduceTransparency: boolean;
  reduceMotion: boolean;
  fontScale: number;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type Props = {
  children: ReactNode;
  /** Hydration from Settings (Phase 2 step 8) will call setPreferences after SQLite loads. */
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
  // Default Solid until Android has actually resolved the user's contrast setting.
  const [highTextContrast, setHighTextContrast] = useState(Platform.OS === 'android');
  const [reduceTransparency, setReduceTransparency] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    const contrast = Platform.OS === 'android'
      ? AccessibilityInfo.isHighTextContrastEnabled()
      : Promise.resolve(false);
    void contrast.then(enabled => { if (mounted) setHighTextContrast(enabled); })
      .catch(() => { if (mounted) setHighTextContrast(false); });
    const contrastSubscription = Platform.OS === 'android'
      ? AccessibilityInfo.addEventListener('highTextContrastChanged', setHighTextContrast)
      : null;

    const transparency = Platform.OS === 'ios'
      ? AccessibilityInfo.isReduceTransparencyEnabled()
      : Promise.resolve(false);
    void transparency.then(enabled => { if (mounted) setReduceTransparency(enabled); })
      .catch(() => { if (mounted) setReduceTransparency(false); });
    const transparencySubscription = Platform.OS === 'ios'
      ? AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduceTransparency)
      : null;

    void AccessibilityInfo.isReduceMotionEnabled()
      .then(enabled => { if (mounted) setReduceMotion(enabled); })
      .catch(() => { if (mounted) setReduceMotion(false); });
    const motionSubscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);

    return () => {
      mounted = false;
      contrastSubscription?.remove();
      transparencySubscription?.remove();
      motionSubscription.remove();
    };
  }, []);

  const mode = preferences.mode === 'system'
    ? systemColorScheme === 'dark' ? 'dark' : 'light'
    : preferences.mode;
  const effectiveStyle = resolveEffectiveStyle(
    preferences.style, highTextContrast, reduceTransparency,
  );
  const theme = useMemo(() => createTheme(mode, effectiveStyle), [mode, effectiveStyle]);
  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    preferences,
    setMode: (next: ThemeMode) => setPreferences(current => ({ ...current, mode: next })),
    setStyle: (next: VisualStyle) => setPreferences(current => ({ ...current, style: next })),
    setPreferences,
    highTextContrast,
    reduceTransparency,
    reduceMotion,
    fontScale,
  }), [theme, preferences, highTextContrast, reduceTransparency, reduceMotion, fontScale]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
