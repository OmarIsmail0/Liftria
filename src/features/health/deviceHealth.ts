import { Platform } from 'react-native';
import { pluralForm, translate, type AppLanguage, type TranslationKey } from '../../i18n';

/** iPhone health screens talk to Apple Health. Android keeps Health Connect. */
export function appleHealthPhone(): boolean {
  return Platform.OS === 'ios';
}

/** Android still shows every cached adapter. An Android backup stays hidden on iPhone. */
export function healthAdapterVisible(adapter: string): boolean {
  if (appleHealthPhone()) return adapter === 'apple-health';
  return true;
}

/** Health Connect's install / Play Store path exists only on Android. */
export function offerProviderInstall(): boolean {
  return !appleHealthPhone();
}

/** HealthKit never reports whether a read was granted. */
export function readAccessIsReported(): boolean {
  return !appleHealthPhone();
}

/** Health Connect has a separate history-read grant. Apple Health does not. */
export function requestsHistoryRead(): boolean {
  return !appleHealthPhone();
}

/** Samsung, Fitbit, Garmin and Pixel Watch are Android sync choices. */
export function listsAndroidWatchApps(): boolean {
  return !appleHealthPhone();
}

/**
 * Android key, then the iPhone key. On Android the first key is the string the
 * screen already used, so the Health Connect copy does not change.
 */
const healthCopySlots = {
  'overview.readOnly': ['healthOverview.readOnly', 'appleHealth.overview.readOnly'],
  'overview.connected': ['healthOverview.connected', 'appleHealth.overview.connected'],
  'overview.connect': ['healthOverview.connect', 'appleHealth.overview.connect'],
  'overview.privacy': ['healthOverview.privacy', 'appleHealth.overview.privacy'],
  'overview.checking': ['healthOverview.checking', 'appleHealth.overview.checking'],
  'overview.loading': ['healthOverview.loading', 'appleHealth.overview.loading'],
  'overview.checkingStatus': ['healthOverview.checkingStatus', 'appleHealth.overview.checkingStatus'],
  'overview.available': ['healthOverview.available', 'appleHealth.overview.available'],
  'overview.unsupported': ['healthOverview.unsupported', 'appleHealth.overview.unsupported'],
  'overview.permissions': ['healthOverview.permissions', 'appleHealth.overview.permissions'],
  'overview.worksWithout': ['healthOverview.worksWithout', 'appleHealth.overview.worksWithout'],
  'overview.watchTitle': ['healthOverview.watchMissing', 'appleHealth.overview.watchTitle'],
  'overview.watchExplain': ['healthOverview.watchExplain', 'appleHealth.overview.watchExplain'],
  'overview.sync': ['healthOverview.sync', 'appleHealth.overview.sync'],
  'overview.syncDetail': ['healthOverview.syncDetail', 'appleHealth.overview.syncDetail'],
  'overview.troubleshoot': ['healthOverview.troubleshoot', 'appleHealth.overview.troubleshoot'],
  'overview.troubleshootDetail': ['healthOverview.troubleshootDetail', 'appleHealth.overview.troubleshootDetail'],
  'overview.footer': ['healthOverview.footer', 'appleHealth.overview.footer'],
  'perm.subtitle': ['healthPerm.subtitle', 'appleHealth.perm.subtitle'],
  'perm.loading': ['healthPerm.loading', 'appleHealth.perm.loading'],
  'perm.loadingDetails': ['healthPerm.loadingDetails', 'appleHealth.perm.loadingDetails'],
  'perm.status': ['healthPerm.status', 'appleHealth.perm.status'],
  'perm.readOnly': ['healthPerm.readOnly', 'appleHealth.perm.readOnly'],
  'perm.opening': ['healthPerm.opening', 'appleHealth.perm.opening'],
  'perm.request': ['healthPerm.openPermissions', 'appleHealth.perm.request'],
  'perm.without': ['healthPerm.without', 'appleHealth.perm.without'],
  'metric.checkingPermission': ['healthMetric.checkingPermission', 'appleHealth.metric.checkingPermission'],
  'metric.readOnly': ['healthMetric.readOnly', 'appleHealth.metric.readOnly'],
  'metric.checking': ['healthMetric.checking', 'appleHealth.metric.checking'],
  'metric.energyWarning': ['healthMetric.energyWarning', 'appleHealth.metric.energyWarning'],
  'metric.stepsNote': ['healthMetric.stepsNote', 'appleHealth.metric.stepsNote'],
  'metric.heartNote': ['healthMetric.heartNote', 'appleHealth.metric.heartNote'],
  'metric.sleepNote': ['healthMetric.sleepNote', 'appleHealth.metric.sleepNote'],
  'metric.sessionNote': ['healthMetric.sessionNote', 'appleHealth.metric.sessionNote'],
  'metric.energyNote': ['healthMetric.energyNote', 'appleHealth.metric.energyNote'],
  'metric.otherNote': ['healthMetric.otherNote', 'appleHealth.metric.otherNote'],
  'metric.weekError': ['healthMetric.weekError', 'appleHealth.metric.weekError'],
  'metric.weekReadError': ['healthMetric.weekReadError', 'appleHealth.metric.weekReadError'],
  'metric.sourceExplain': ['healthMetric.sourceExplain', 'appleHealth.metric.sourceExplain'],
  'metric.noRecords': ['healthMetric.noRecords', 'appleHealth.metric.noRecords'],
  'record.readOnly': ['healthRecord.readOnly', 'appleHealth.record.readOnly'],
  'record.loading': ['healthRecord.loading', 'appleHealth.record.loading'],
  'record.notFound': ['healthRecord.notFound', 'appleHealth.record.notFound'],
  'record.noWrite': ['healthRecord.noWrite', 'appleHealth.record.noWrite'],
  'record.originNote': ['healthRecord.originNote', 'appleHealth.record.originNote'],
  'today.permissions': ['today.healthPermissions', 'appleHealth.today.permissions'],
  'today.hidden': ['today.hiddenUntilPermission', 'appleHealth.today.hidden'],
  'today.connect': ['today.connectHealth', 'appleHealth.today.connect'],
  'today.readOnly': ['today.readOnly', 'appleHealth.today.readOnly'],
  'settings.title': ['settings.home.health', 'appleHealth.settings.title'],
  'settings.detail': ['settings.home.healthDetail', 'appleHealth.settings.detail'],
  'progress.description': ['progress.healthDescription', 'appleHealth.progress.description'],
  'trend.source': ['trend.weightSource', 'appleHealth.trend.source'],
  'trend.empty': ['trend.weightEmpty', 'appleHealth.trend.empty'],
  'trend.privacy': ['trend.healthPrivacy', 'appleHealth.trend.privacy'],
  'trend.localPrivacy': ['trend.localWeightPrivacy', 'appleHealth.trend.localPrivacy'],
  'trend.chip': ['trend.healthConnect', 'appleHealth.name'],
  'trend.sourceCounts': ['trend.sourceCounts', 'appleHealth.trend.sourceCounts'],
} as const satisfies Record<string, readonly [TranslationKey, TranslationKey]>;

export type HealthCopySlot = keyof typeof healthCopySlots;

export function healthCopy(slot: HealthCopySlot): TranslationKey {
  const pair = healthCopySlots[slot];
  return appleHealthPhone() ? pair[1] : pair[0];
}

const onboardingTitles = {
  health: ['onboarding.connectHealthConnect', 'appleHealth.onboarding.healthTitle'],
  watch: ['onboarding.syncYourWatch', 'appleHealth.onboarding.watchTitle'],
} as const satisfies Record<string, readonly [TranslationKey, TranslationKey]>;

const onboardingDescriptions = {
  health: ['onboarding.liftriaRequestsReadOnlyAccess', 'appleHealth.onboarding.healthDescription'],
  watch: ['onboarding.chooseTheAppThatSyncs', 'appleHealth.onboarding.watchDescription'],
  privacy: ['onboarding.liftriaKeepsYourProfileAnd', 'appleHealth.onboarding.privacyIntro'],
} as const satisfies Record<string, readonly [TranslationKey, TranslationKey]>;

export function onboardingTitleKey(step: string): TranslationKey | null {
  const pair = onboardingTitles[step as keyof typeof onboardingTitles];
  if (!pair) return null;
  return appleHealthPhone() ? pair[1] : pair[0];
}

export function onboardingDescriptionKey(step: string): TranslationKey | null {
  const pair = onboardingDescriptions[step as keyof typeof onboardingDescriptions];
  if (!pair) return null;
  return appleHealthPhone() ? pair[1] : pair[0];
}

/** A positive Apple Health total. Zero and a missing amount stay "No data", never 0. */
export function formatAppleAmount(language: AppLanguage, value: number, unit: string): string {
  if (!(value > 0)) return translate(language, 'healthOverview.noData');
  const rounded = Math.round(value);
  const counted = unit === 'steps' || unit === 'count' || unit === 'minutes' ||
    unit === 'sessions' || unit === 'bpm';
  if (counted && rounded <= 0) return translate(language, 'healthOverview.noData');
  if (unit === 'steps' || unit === 'count') {
    return translate(language, `appleHealth.count.steps.${pluralForm(language, rounded)}` as TranslationKey, { count: rounded });
  }
  if (unit === 'minutes') {
    return translate(language, `appleHealth.count.minutes.${pluralForm(language, rounded)}` as TranslationKey, { count: rounded });
  }
  if (unit === 'sessions') {
    return translate(language, `appleHealth.count.sessions.${pluralForm(language, rounded)}` as TranslationKey, { count: rounded });
  }
  if (unit === 'kcal') return translate(language, 'appleHealth.unit.kcal', { count: value });
  if (unit === 'bpm') return translate(language, 'appleHealth.unit.bpm', { count: rounded });
  if (unit === 'kg') return translate(language, 'appleHealth.unit.kg', { count: value });
  if (unit === '%') return translate(language, 'appleHealth.unit.percent', { count: value });
  return translate(language, 'healthOverview.noData');
}
