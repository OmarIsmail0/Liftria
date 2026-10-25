import { Tabs, usePathname } from 'expo-router';
import { View } from 'react-native';
import { useTheme } from '../../src/design/ThemeProvider';
import { AmbientBackdrop } from '../../src/design/primitives/VisualEffects';
import { CapsuleNav } from '../../src/design/primitives';
import { activeCapsuleTab } from '../../src/navigation/routes';
import WorkoutMiniBar from '../../src/features/train/WorkoutMiniBar';

/** A single full-height backdrop covers scenes AND the space below the capsule. */
export default function TabsLayout() {
  const { theme } = useTheme();
  const pathname = usePathname();
  return <View style={{ flex: 1, backgroundColor: theme.background }}>
    {theme.effectiveStyle === 'aurora' && <AmbientBackdrop theme={theme} />}
    <Tabs initialRouteName="today" screenOptions={{
      headerShown: false,
      sceneStyle: { backgroundColor: 'transparent' },
    }} tabBar={({ state, navigation }) => {
      const active = activeCapsuleTab(state.routes[state.index]?.name);
      if (pathname.includes('/train/active') || pathname.includes('/train/preview') ||
        pathname.includes('/train/summary')) return null;
      return <View><WorkoutMiniBar/><CapsuleNav active={active} onSelect={tab => {
        const route = state.routes.find(item => item.name === tab);
        if (!route) return;
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!event.defaultPrevented) navigation.navigate(route.name);
      }} /></View>;
    }}>
      <Tabs.Screen name="today" options={{ title: 'Today' }} />
      <Tabs.Screen name="train" options={{ title: 'Train' }} />
      <Tabs.Screen name="eat" options={{ title: 'Eat' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="hiku" options={{ title: 'Hiku' }} />
    </Tabs>
  </View>;
}
