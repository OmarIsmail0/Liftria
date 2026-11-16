import { Tabs, router, usePathname, type ErrorBoundaryProps } from 'expo-router';
import { View } from 'react-native';
import { useTheme } from '../../src/design/ThemeProvider';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { TabBar } from '../../src/design/primitives';
import { activeCapsuleTab } from '../../src/navigation/routes';
import WorkoutMiniBar from '../../src/features/train/WorkoutMiniBar';
import { RecoveryScreen } from '../../src/features/startup/RecoveryScreen';

/** A crashed screen inside the tabs shows a localized recovery screen with Try again.
 * Saved data lives in SQLite, so an in-progress workout resumes from the mini bar. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <RecoveryScreen kind="crash" onRetry={retry} onHome={() => {
    void retry().then(() => router.replace('/(tabs)/today'));
  }} />;
}

/** Scenes sit above the tab bar. The bar hides on the full-screen workout and Hiku flows. */
export default function TabsLayout() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const pathname = usePathname();
  return <View style={{ flex: 1, backgroundColor: theme.background }}>
    <Tabs initialRouteName="today" screenOptions={{
      headerShown: false,
      sceneStyle: { backgroundColor: 'transparent' },
    }} tabBar={({ state, navigation }) => {
      const active = activeCapsuleTab(state.routes[state.index]?.name);
      if (pathname.includes('/train/active') || pathname.includes('/train/preview') ||
        pathname.includes('/train/summary') || pathname.includes('/hiku/describe') ||
        pathname.includes('/hiku/review') || pathname.includes('/hiku/photo')) return null;
      return <View><WorkoutMiniBar/><TabBar active={active} onSelect={tab => {
        const route = state.routes.find(item => item.name === tab);
        if (!route) return;
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!event.defaultPrevented) navigation.navigate(route.name);
      }} /></View>;
    }}>
      <Tabs.Screen name="today" options={{ title: t('nav.today') }} />
      <Tabs.Screen name="train" options={{ title: t('nav.train') }} />
      <Tabs.Screen name="eat" options={{ title: t('nav.eat') }} />
      <Tabs.Screen name="progress" options={{ title: t('nav.progress') }} />
      <Tabs.Screen name="hiku" options={{ title: t('nav.hiku') }} />
    </Tabs>
  </View>;
}
