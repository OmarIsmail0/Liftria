import { OpaqueStack } from '../../src/navigation/OpaqueStack';

/** Settings is a pushed root-level stack; it never renders the capsule. */
export default function SettingsStack() {
  return <OpaqueStack />;
}
