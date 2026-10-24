import { router } from 'expo-router';
import { View } from 'react-native';
import { Button, Card, Header, Screen, Typography } from '../../../src/design/primitives';
import { useTheme } from '../../../src/design/ThemeProvider';

/** PR D entry point. PR E replaces the future workout-home section with TR-1. */
export default function TrainHome() {
  const { theme } = useTheme();
  return <Screen embedded>
    <Header title="Train" subtitle="Your offline workout library" right={
      <Button label="Search" variant="secondary" onPress={()=>router.push('/(tabs)/train/library')}/>} />
    <Card rim="train" title="Exercise library">
      <Typography tone="secondary">Explore 876 bundled exercises, muscles and instructions. Add your own exercises, all stored on your phone.</Typography>
      <View style={{gap:theme.space[2]}}>
        <Button label="Browse exercises" variant="train" fullWidth onPress={()=>router.push('/(tabs)/train/library')}/>
        <Button label="Browse muscles" variant="secondary" fullWidth onPress={()=>router.push('/(tabs)/train/muscles')}/>
        <Button label="Create custom exercise" variant="secondary" fullWidth onPress={()=>router.push('/(tabs)/train/create')}/>
      </View>
    </Card>
    <Card title="Workouts">
      <Typography tone="secondary">Plans, active workouts and workout history are being added in the next build stage. No workout data is shown or invented yet.</Typography>
    </Card>
    <Typography tone="tertiary" size="small">Exercise library works entirely offline. No watch connection is required.</Typography>
  </Screen>;
}