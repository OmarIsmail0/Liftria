import type { MetricType, PermissionState } from '../../services/health/types';
import { translate, type AppLanguage, type TranslationKey } from '../../i18n';
import { metricTypes } from '../../services/health/types';

const names: Record<MetricType, TranslationKey> = {
  steps: 'onboarding.health.steps', 'heart-rate': 'onboarding.health.heart',
  'active-calories': 'onboarding.health.activeEnergy', 'total-calories': 'onboarding.health.totalEnergy',
  'basal-metabolic-rate': 'onboarding.health.bmr', 'exercise-session': 'onboarding.health.sessions',
  'sleep-session': 'onboarding.health.sleep', weight: 'onboarding.health.weight',
  'body-fat': 'onboarding.health.bodyFat', 'lean-body-mass': 'onboarding.health.leanMass',
};
const consequences: Record<MetricType, TranslationKey> = {
  steps: 'onboarding.health.stepsMissing', 'heart-rate': 'onboarding.health.heartMissing',
  'active-calories': 'onboarding.health.activeMissing', 'total-calories': 'onboarding.health.totalMissing',
  'basal-metabolic-rate': 'onboarding.health.bmrMissing', 'exercise-session': 'onboarding.health.sessionsMissing',
  'sleep-session': 'onboarding.health.sleepMissing', weight: 'onboarding.health.weightMissing',
  'body-fat': 'onboarding.health.fatMissing', 'lean-body-mass': 'onboarding.health.leanMissing',
};

export function missingHealthPermissions(
  permissions: Record<MetricType, PermissionState>, language: AppLanguage = 'en',
): string[] {
  return metricTypes.filter(metric => permissions[metric] !== 'granted').map(metric => {
    const status = permissions[metric] === 'denied' ? 'onboarding.health.notAllowed' : 'onboarding.health.unconfirmed';
    if (language === 'en') return `${translate(language, names[metric])} ${translate(language, status)}: ${translate(language, consequences[metric])}`;
    return translate(language, 'onboarding.health.missing', {
      name: translate(language, names[metric]), status: translate(language, status),
      consequence: translate(language, consequences[metric]),
    });
  });
}

export function availabilityMessage(
  availability: 'available' | 'not-installed' | 'needs-update' | 'unsupported', language: AppLanguage = 'en',
): string {
  switch (availability) {
    case 'not-installed': return translate(language, 'onboarding.health.notInstalled');
    case 'needs-update': return translate(language, 'onboarding.health.needsUpdate');
    case 'unsupported': return translate(language, 'onboarding.health.unsupported');
    default: return translate(language, 'onboarding.health.available');
  }
}

/** Unsupported hardware has nothing to install/update via Play Store. */
export function offerHealthConnectInstall(status: 'available' | 'not-installed' | 'needs-update' | 'unsupported' | null): boolean {
  return status === 'not-installed' || status === 'needs-update';
}

/** The Android provider-update-required status can also mean the provider app is absent. */
export function healthConnectInstallLabel(status: 'available' | 'not-installed' | 'needs-update' | 'unsupported' | null,
  language: AppLanguage = 'en'): string | null {
  return offerHealthConnectInstall(status) ? translate(language, 'onboarding.getHealthConnect') : null;
}
