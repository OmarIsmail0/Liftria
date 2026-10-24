import { router } from 'expo-router';
import { View } from 'react-native';
import { useTheme } from '../../src/design/ThemeProvider';
import { Button, Card, Header, Screen, Typography } from '../../src/design/primitives';
import { backOrReplace } from '../../src/navigation/back';
import type { ThemeMode, VisualStyle } from '../../src/design/tokens';

/** ST-3 Appearance is available before the rest of Settings (Phase 2 step 8). */
export default function AppearanceSettings() {
  const { theme, preferences, setMode, setStyle } = useTheme();
  const isForcedSolid = preferences.style !== theme.effectiveStyle;
  const modeOptions: readonly { value: ThemeMode; label: string }[] = [
    { value: 'system', label: 'System' },
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
  ];
  const styleOptions: readonly { value: VisualStyle; label: string }[] = [
    { value: 'aurora', label: 'Aurora Rim' },
    { value: 'solid', label: 'Solid' },
  ];
  return <Screen>
    <Header title="Appearance" subtitle="Theme and visual style" onBack={() => backOrReplace(router, '/settings')} />
    <Card title="Theme">
      <Typography tone="secondary" size="small">Choose how Liftria looks. Changes apply immediately.</Typography>
      <View accessible={false} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
        {modeOptions.map(option => <Button key={option.value}
          label={option.label} accessibilityLabel={`Theme ${option.label}, ${preferences.mode === option.value ? 'selected' : 'not selected'}`}
          variant={preferences.mode === option.value ? 'primary' : 'secondary'}
          onPress={() => setMode(option.value)} />)}
      </View>
      <Typography tone="secondary" size="small">Selected: {modeOptions.find(item => item.value === preferences.mode)?.label}</Typography>
    </Card>
    <Card title="Style">
      <Typography tone="secondary" size="small">Pick between luminous Aurora Rim and a simpler Solid layout.</Typography>
      <View accessible={false} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
        {styleOptions.map(option => <Button key={option.value}
          label={option.label} accessibilityLabel={`Style ${option.label}, ${preferences.style === option.value ? 'selected' : 'not selected'}`}
          variant={preferences.style === option.value ? 'primary' : 'secondary'}
          onPress={() => setStyle(option.value)} />)}
      </View>
      <Typography tone="secondary" size="small">Solid turns on by itself with high-contrast text or Reduce transparency.</Typography>
      {isForcedSolid && <Typography tone="secondary" size="small">Solid is active because of your accessibility settings.</Typography>}
    </Card>
  </Screen>;
}
