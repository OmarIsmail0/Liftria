import { Stack } from 'expo-router';

/** Onboarding is a focused full-screen stack. Never display the bottom capsule. */
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
