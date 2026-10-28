import { Stack } from 'expo-router';
import {Platform} from 'react-native';

/** Progress subpages retain the Progress capsule tab. */
export default function ProgressStack() {
  return <Stack screenOptions={{ headerShown: false,...(Platform.OS==='ios'?{gestureEnabled:true}:{}), contentStyle: { backgroundColor: 'transparent' } }} />;
}
