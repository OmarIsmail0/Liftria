import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useTheme } from '../../src/design/ThemeProvider';
import { Card, Header, ListRow, Screen, Typography } from '../../src/design/primitives';

const planned = [
  { heading: 'Profile and goals', detail: 'Profile and calorie targets' },
  { heading: 'Units and appearance', detail: 'Theme, style and units' },
  { heading: 'Hiku and API key', detail: 'Private key management' },
  { heading: 'Notifications', detail: 'Workout and meal reminders' },
  { heading: 'Health Connect', detail: 'Permissions and data sources' },
  { heading: 'Data and storage', detail: 'Local data and privacy' },
] as const;

/** ST-1 shell only: editable settings and persistence arrive in Step 8. */
export default function SettingsHome() {
  const { theme } = useTheme();
  const [taps, setTaps] = useState(0);
  return <Screen>
    <Header title="Settings" onBack={() => router.back()} />
    <Card>
      {planned.map(item => <ListRow key={item.heading} title={item.heading}
        detail={item.detail + ' · Coming in Phase 2 step 8'} />)}
    </Card>
    <Card title="About and help">
      <Typography tone="secondary">Liftria is local-first. Detailed settings arrive later in Phase 2.</Typography>
      <Pressable accessibilityRole="button" accessibilityLabel="App version"
        onPress={() => {
          if (taps === 6) { setTaps(0); router.push('/dev'); }
          else setTaps(current => current + 1);
        }}
        style={{ minHeight: theme.size.touch.min, justifyContent: 'center' }}>
        <Typography tone="secondary" size="small">Version 0.0.1</Typography>
      </Pressable>
    </Card>
    <View style={{ alignItems: 'center' }}>
      <Typography tone="secondary" size="small">Your data stays on this phone.</Typography>
    </View>
  </Screen>;
}
