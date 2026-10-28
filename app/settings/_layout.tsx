import { Stack } from 'expo-router';
import {Platform} from 'react-native';

/** Settings is a pushed root-level stack; it never renders the capsule. */
export default function SettingsStack() {
  return <Stack screenOptions={{ headerShown: false,...(Platform.OS==='ios'?{gestureEnabled:true}:{}), }} />;
}
