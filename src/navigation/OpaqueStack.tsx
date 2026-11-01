import { useMemo, type ReactNode } from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../design/ThemeProvider';
import { useLanguage } from '../i18n/LanguageProvider';
import { opaqueStackOptions } from './stackTransition';

/** One stack setup for every pushed screen: opaque card, horizontal slide. */
export function OpaqueStack({ children }: { children?: ReactNode }) {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  const screenOptions = useMemo(
    () => opaqueStackOptions(theme.background, isRTL),
    [theme.background, isRTL],
  );
  return <Stack screenOptions={screenOptions}>{children}</Stack>;
}
