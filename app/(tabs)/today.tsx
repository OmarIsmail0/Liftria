import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useTheme } from '../../src/design/ThemeProvider';
import { Card, Header, Orb, Screen, Typography } from '../../src/design/primitives';

/** Navigation-shell first-day preview; data-backed Today is Phase 2 step 6. */
export default function TodayTab() {
  const { theme } = useTheme();
  const date = new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  return <Screen embedded>
    <Header title="Welcome to Liftria" subtitle={date} right={
      <Pressable onPress={() => router.push('/settings')}
        accessibilityRole="button" accessibilityLabel="Open Settings"
        style={{ minWidth: theme.size.touch.min, minHeight: theme.size.touch.min,
          borderRadius: theme.radius.pill, borderWidth: theme.size.border.thin,
          borderColor: theme.controlOutline, alignItems: 'center', justifyContent: 'center' }}>
        <Typography size="head">L</Typography>
      </Pressable>
    } />
    <Orb eaten={0} target={null} active={false} />
    <View style={{ alignItems: 'center', paddingHorizontal: theme.space[4] }}>
      <Typography tone="secondary">Your first meal lights it up.</Typography>
      <Typography tone="secondary" size="small">No target set yet</Typography>
    </View>
    <Card title="Getting started">
      <Typography tone="secondary">Your profile, targets, and Health Connect setup arrive during onboarding in this phase.</Typography>
    </Card>
    <Card title="Activity today" rim="health">
      <Typography tone="secondary">Health Connect data is not loaded in this navigation preview.</Typography>
    </Card>
  </Screen>;
}
