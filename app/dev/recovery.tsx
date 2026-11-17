import { useLocalSearchParams } from 'expo-router';
import { RecoveryScreen } from '../../src/features/startup/RecoveryScreen';
import { recoveryKindFromParam } from '../../src/features/startup/recoveryParam';

/** Developer screenshot route: the startup recovery screen, `?variant=failed|newer-version|crash`. */
export default function DevRecovery() {
  const { variant } = useLocalSearchParams<{ variant?: string | string[] }>();
  return <RecoveryScreen kind={recoveryKindFromParam(Array.isArray(variant) ? variant[0] : variant)} onRetry={() => undefined} />;
}
