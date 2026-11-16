import type { RecoveryKind } from './RecoveryScreen';

/** The `variant` query of the developer recovery route; anything unknown shows the failed screen. */
export function recoveryKindFromParam(variant: string | undefined): RecoveryKind {
  if (variant === 'newer-version' || variant === 'newer') return 'newer';
  if (variant === 'crash') return 'crash';
  return 'failed';
}
