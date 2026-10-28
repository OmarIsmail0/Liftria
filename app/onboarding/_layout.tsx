import { Stack } from 'expo-router';
import {Platform} from 'react-native';

/** Onboarding is a focused full-screen stack. Never display the bottom capsule. */
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false,...(Platform.OS==='ios'?{gestureEnabled:true}:{}), }} />;
}
