import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { bundledFonts } from '../src/design/fonts';
import { ThemeProvider, useTheme } from '../src/design/ThemeProvider';

// Font loading and initial accessibility resolution both occur behind the native splash.
void SplashScreen.preventAutoHideAsync().catch(() => {});

function ReadyNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { ready, theme } = useTheme();
  useEffect(() => {
    if (ready && fontsLoaded) void SplashScreen.hideAsync().catch(() => {});
  }, [ready, fontsLoaded]);
  if (!ready || !fontsLoaded) return null;
  return <>
    <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
      translucent backgroundColor="transparent" />
    <Stack screenOptions={{ headerShown: false,
      contentStyle: { backgroundColor: theme.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="dev" />
    </Stack>
  </>;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(bundledFonts);
  if (fontError) throw fontError;
  return <ThemeProvider><ReadyNavigator fontsLoaded={fontsLoaded} /></ThemeProvider>;
}
