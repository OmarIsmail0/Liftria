import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { bundledFonts } from '../src/design/fonts';
import { ThemeProvider, useTheme } from '../src/design/ThemeProvider';

// Start both readiness checks behind the native splash. Never flash a system font.
void SplashScreen.preventAutoHideAsync().catch(() => {});

function ReadyNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { ready } = useTheme();
  useEffect(() => {
    if (ready && fontsLoaded) void SplashScreen.hideAsync().catch(() => {});
  }, [ready, fontsLoaded]);
  if (!ready || !fontsLoaded) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(bundledFonts);
  // Don't silently render Roboto on a broken font bundle.
  if (fontError) throw fontError;
  return <ThemeProvider><ReadyNavigator fontsLoaded={fontsLoaded} /></ThemeProvider>;
}
