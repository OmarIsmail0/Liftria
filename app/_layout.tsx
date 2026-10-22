import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from '../src/design/ThemeProvider';

// Must run at module evaluation, before Expo Router mounts its first screen.
// A guarded promise prevents failure on unsupported test/dev hosts.
void SplashScreen.preventAutoHideAsync().catch(() => {});

function ReadyNavigator() {
  const { ready } = useTheme();
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ReadyNavigator />
    </ThemeProvider>
  );
}
