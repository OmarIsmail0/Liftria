import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useTheme } from '../../src/design/ThemeProvider';
import { Card, Header, ListRow, Screen, Typography } from '../../src/design/primitives';
import { backOrReplace } from '../../src/navigation/back';
import { advanceVersionTap, initialVersionTapState } from '../../src/navigation/versionTap';
import releaseVersion from '../../src/config/releaseVersion.json';
import { localStorageCounts } from '../../src/services/database';
import { formatLocalDatabaseSize } from '../../src/features/settings/storage';

/** ST-1: grouped local Settings, with Phase 3/4 features explicitly labeled Future. */
export default function SettingsHome() {
  const { theme } = useTheme();
  const taps = useRef(initialVersionTapState);
  const [databaseSize, setDatabaseSize] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void localStorageCounts().then(result => {
      if(alive && result.ok) setDatabaseSize(formatLocalDatabaseSize(result.value.databaseBytes));
    });
    return () => { alive = false; };
  }, []);
  return <Screen>
    <Header title="Settings" onBack={() => backOrReplace(router, '/(tabs)/today')} />
    <Card title="Your plan">
      <ListRow title="Profile and goals" detail="Edit your profile and confirm any estimated target change"
        onPress={() => router.push('/settings/profile')} />
    </Card>
    <Card title="Personalization">
      <ListRow title="Units and appearance" detail="Weight, height, theme, visual style and dashboard controls"
        onPress={() => router.push('/settings/preferences')} />
      <ListRow title="Hiku and API key" detail="Test, replace or delete your private Anthropic key"
        onPress={() => router.push('/settings/hiku-key')} />
    </Card>
    <Card title="Notifications and data">
      <ListRow title="Notifications" detail="Rest timers and meal reminders · future availability"
        onPress={() => router.push('/settings/notifications')} />
      <ListRow title="Health Connect" detail="Read-only permissions and sources"
        onPress={() => router.push('/(tabs)/progress/health')} />
      <ListRow title="Data and storage" detail="Actual local counts, cache clearing and DELETE confirmation"
        onPress={() => router.push('/settings/data')} />
    </Card>
    <Card title="About and help">
      <ListRow title="Help, privacy and licenses" detail="Chips legend, app version, local-first privacy"
        onPress={() => router.push('/settings/about')} />
      <Typography tone="secondary">Liftria is local-first. No account or external database is required.</Typography>
      <Pressable accessibilityRole="button" accessibilityLabel="App version"
        onPress={() => {
          const next = advanceVersionTap(taps.current, Date.now());
          taps.current = next.state;
          if (next.unlocked) router.push('/dev');
        }}
        style={{ minHeight: theme.size.touch.min, justifyContent: 'center' }}>
        <Typography tone="secondary" size="small">Version {releaseVersion.name}</Typography>
      </Pressable>
    </Card>
    <View style={{ alignItems: 'center' }}>
      <Typography tone="secondary" size="small">Everything is on this phone · {databaseSize ?? 'Calculating storage…'}</Typography>
    </View>
  </Screen>;
}
