import { Redirect, Stack } from 'expo-router';
import { devRoutesEnabled } from '../../src/navigation/devRoutes';

/** Developer screens: a release build without the flag sends every dev link home. */
export default function DevLayout() {
  if (!devRoutesEnabled()) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
