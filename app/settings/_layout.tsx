import { Stack } from 'expo-router';

/** Settings is a pushed root-level stack; it never renders the capsule. */
export default function SettingsStack() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
