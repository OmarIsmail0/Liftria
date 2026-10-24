import { Redirect } from 'expo-router';

/** Phase 2 shell: diagnostics have moved to the hidden developer stack. */
export default function Index() {
  return <Redirect href="/(tabs)/today" />;
}
