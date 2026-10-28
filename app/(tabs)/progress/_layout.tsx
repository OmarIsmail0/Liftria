import { Stack } from 'expo-router';

/** Progress subpages retain the Progress capsule tab. */
export default function ProgressStack() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />;
}
