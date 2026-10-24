import type { MetricType, PermissionState } from '../../services/health/types';
import { metricTypes } from '../../services/health/types';

const consequences: Record<MetricType, string> = {
  steps: 'Daily steps will not appear.',
  'heart-rate': 'Workout heart rate will not show.',
  'active-calories': 'Active energy will remain unavailable.',
  'total-calories': 'Total energy remains hidden without a measured source.',
  'basal-metabolic-rate': 'Resting metabolic rate will not appear.',
  'exercise-session': 'Exercise sessions will not appear.',
  'sleep-session': 'Sleep will not appear.',
  weight: 'Weight trends will not appear.',
  'body-fat': 'Body fat trends will not appear.',
  'lean-body-mass': 'Lean body mass will not appear.',
};

const names: Record<MetricType, string> = {
  steps: 'Steps', 'heart-rate': 'Heart rate', 'active-calories': 'Active energy',
  'total-calories': 'Total energy', 'basal-metabolic-rate': 'Basal metabolic rate',
  'exercise-session': 'Exercise sessions', 'sleep-session': 'Sleep',
  weight: 'Weight', 'body-fat': 'Body fat', 'lean-body-mass': 'Lean body mass',
};

export function missingHealthPermissions(permissions: Record<MetricType, PermissionState>): string[] {
  return metricTypes.filter(t => permissions[t] !== 'granted').map(metric => {
    const status = permissions[metric] === 'denied' ? 'not allowed' : 'permission not confirmed';
    return `${names[metric]} ${status}: ${consequences[metric]}`;
  });
}

export function availabilityMessage(
  availability: 'available' | 'not-installed' | 'needs-update' | 'unsupported',
): string {
  switch (availability) {
    case 'not-installed': return 'Health Connect is not installed. Get it from Play Store, or continue without syncing. Liftria works without it.';
    case 'needs-update': return 'Health Connect may not be installed or may need an update. Get it from Play Store, or continue without syncing. Liftria works without it.';
    case 'unsupported': return 'Health Connect is not supported on this device. Liftria still works locally.';
    default: return 'Health Connect is available. Choose which records Liftria may read.';
  }
}

/** Unsupported hardware has nothing to install/update via Play Store. */
export function offerHealthConnectInstall(status: 'available' | 'not-installed' | 'needs-update' | 'unsupported' | null): boolean {
  return status === 'not-installed' || status === 'needs-update';
}

/** The Android provider-update-required status can also mean the provider app is absent. */
export function healthConnectInstallLabel(status: 'available' | 'not-installed' | 'needs-update' | 'unsupported' | null): string | null {
  return offerHealthConnectInstall(status) ? 'Get Health Connect' : null;
}
