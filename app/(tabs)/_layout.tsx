import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useTheme } from '../../src/design/ThemeProvider';
import { AmbientBackdrop } from '../../src/design/primitives/VisualEffects';
import { CapsuleNav, type CapsuleTab } from '../../src/design/primitives';

/** A single full-height backdrop covers scenes AND the space below the capsule. */
export default function TabsLayout() {
  const { theme } = useTheme();
  return <View style={{ flex: 1, backgroundColor: theme.background }}>
    {theme.effectiveStyle === 'aurora' && <AmbientBackdrop theme={theme} />}
    <Tabs initialRouteName="today" screenOptions={{
      headerShown: false,
      sceneStyle: { backgroundColor: 'transparent' },
    }} tabBar={({ state, navigation }) => {
      const active = state.routes[state.index]?.name as CapsuleTab | undefined;
      return <CapsuleNav active={active ?? 'today'} onSelect={tab => {
        const route = state.routes.find(item => item.name === tab);
        if (!route) return;
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!event.defaultPrevented) navigation.navigate(route.name);
      }} />;
    }}>
      <Tabs.Screen name="today" options={{ title: 'Today' }} />
      <Tabs.Screen name="train" options={{ title: 'Train' }} />
      <Tabs.Screen name="eat" options={{ title: 'Eat' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="hiku" options={{ title: 'Hiku' }} />
    </Tabs>
  </View>;
}
