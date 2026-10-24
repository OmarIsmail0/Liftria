import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useTheme } from '../../../src/design/ThemeProvider';
import { Button, Card, Header, ListRow, Screen, Typography } from '../../../src/design/primitives';
import { backOrReplace } from '../../../src/navigation/back';
import { getSetting } from '../../../src/services/database';

const supported = ['Samsung Health','Fitbit','Garmin Connect','Pixel Watch (Fitbit)','Other'] as const;
export default function HealthSyncGuide() {
  const { theme } = useTheme();
  const [app, setApp] = useState<string>('your watch app');
  useEffect(() => {
    let mounted = true;
    void getSetting('onboarding.flowDraft').then(value => {
      if (!mounted || !value.ok || !value.value) return;
      try {
        const raw: unknown = JSON.parse(value.value);
        if (raw && typeof raw === 'object' && 'selectedWatch' in raw) {
          const selected = (raw as { selectedWatch: unknown }).selectedWatch;
          if (typeof selected === 'string' && supported.includes(selected as typeof supported[number])) setApp(selected);
        }
      } catch { /* Unknown draft: the brand-neutral guide remains valid. */ }
    });
    return () => { mounted = false; };
  }, []);
  return <Screen embedded scroll={false}><ScrollView contentContainerStyle={{
    gap: theme.layout.cardGap, paddingVertical: theme.space[4] }}>
    <Header title="Watch sync guide" subtitle={app}
      onBack={() => backOrReplace(router, '/(tabs)/progress/health')} />
    <Card title="Five things to check" rim="health">
      {[
        ['1','Open '+app+' on your phone','Make sure your watch measurements have synced into that app.'],
        ['2','Open the app settings','Look for Connected apps, Health Connect or data sharing.'],
        ['3','Find Health Connect','Allow '+app+' to write the types your watch tracks.'],
        ['4','Allow Liftria to read','Use Liftria’s Health permissions screen to grant read access.'],
        ['5','Keep the watch in sync','New records may appear after syncing. History is not guaranteed.'],
      ].map(([n,title,detail]) => <ListRow key={n} title={n+'. '+title} detail={detail} />)}
      <Typography tone="secondary" size="small">Steps vary by brand and version. Samsung Health is the tested example; other app paths need verification.</Typography>
    </Card>
    <Card title="History starts when sharing starts">
      <Typography>Health Connect may not expose older watch data. Liftria cannot force another app to backfill it.</Typography>
      <Typography tone="secondary">No record does not mean no workout happened.</Typography>
    </Card>
    <View style={{ gap: theme.space[2] }}>
      <Button label="Open Liftria health permissions" variant="secondary" fullWidth
        onPress={() => router.push('/(tabs)/progress/health-permissions')} />
      <Button label="Check again" fullWidth
        onPress={() => router.push('/(tabs)/progress/health-troubleshoot')} />
    </View>
  </ScrollView></Screen>;
}
