import { Platform } from 'react-native';
import { ar } from '../../../i18n/ar';
import { en } from '../../../i18n/en';
import { translate } from '../../../i18n';
import {
  appleHealthPhone, formatAppleAmount, healthAdapterVisible, healthCopy, listsAndroidWatchApps,
  offerProviderInstall, onboardingDescriptionKey, onboardingTitleKey, readAccessIsReported,
  requestsHistoryRead, type HealthCopySlot,
} from '../deviceHealth';

const original = Platform.OS;
function setOs(os: string) {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: os });
}
afterAll(() => { Object.defineProperty(Platform, 'OS', { configurable: true, value: original }); });

const slots = [
  'overview.readOnly', 'overview.connected', 'overview.connect', 'overview.privacy',
  'overview.permissions', 'overview.worksWithout', 'overview.footer', 'overview.sync',
  'perm.subtitle', 'perm.request', 'perm.without', 'perm.readOnly',
  'metric.readOnly', 'metric.stepsNote', 'metric.weekError', 'metric.noRecords',
  'record.readOnly', 'record.notFound', 'record.noWrite',
  'today.permissions', 'today.connect', 'today.readOnly', 'today.hidden',
  'settings.title', 'settings.detail', 'progress.description',
  'trend.source', 'trend.empty', 'trend.privacy', 'trend.chip',
] as const satisfies readonly HealthCopySlot[];

describe('iPhone health flags', () => {
  test('Health overview uses Apple Health copy and hides the Play Store path', () => {
    setOs('ios');
    expect(appleHealthPhone()).toBe(true);
    expect(healthCopy('overview.readOnly')).toBe('appleHealth.overview.readOnly');
    expect(healthCopy('overview.connect')).toBe('appleHealth.overview.connect');
    expect(healthCopy('overview.permissions')).toBe('appleHealth.overview.permissions');
    expect(offerProviderInstall()).toBe(false);
    expect(readAccessIsReported()).toBe(false);
  });
  test('Health overview stays on Health Connect on Android', () => {
    setOs('android');
    expect(appleHealthPhone()).toBe(false);
    expect(healthCopy('overview.readOnly')).toBe('healthOverview.readOnly');
    expect(healthCopy('overview.connect')).toBe('healthOverview.connect');
    expect(healthCopy('overview.connected')).toBe('healthOverview.connected');
    expect(healthCopy('overview.permissions')).toBe('healthOverview.permissions');
    expect(healthCopy('overview.sync')).toBe('healthOverview.sync');
    expect(offerProviderInstall()).toBe(true);
    expect(readAccessIsReported()).toBe(true);
  });
  test('permissions request a read and do not ask Health Connect for history on iPhone', () => {
    setOs('ios');
    expect(healthCopy('perm.request')).toBe('appleHealth.perm.request');
    expect(healthCopy('perm.subtitle')).toBe('appleHealth.perm.subtitle');
    expect(requestsHistoryRead()).toBe(false);
    expect(readAccessIsReported()).toBe(false);
    expect(offerProviderInstall()).toBe(false);
  });
  test('permissions stay the Health Connect screen on Android', () => {
    setOs('android');
    expect(healthCopy('perm.request')).toBe('healthPerm.openPermissions');
    expect(healthCopy('perm.opening')).toBe('healthPerm.opening');
    expect(healthCopy('perm.without')).toBe('healthPerm.without');
    expect(requestsHistoryRead()).toBe(true);
    expect(readAccessIsReported()).toBe(true);
  });
  test('metric detail uses Apple Health notes on iPhone and the existing notes on Android', () => {
    setOs('ios');
    expect(healthCopy('metric.stepsNote')).toBe('appleHealth.metric.stepsNote');
    expect(healthCopy('metric.weekError')).toBe('appleHealth.metric.weekError');
    expect(healthCopy('metric.noRecords')).toBe('appleHealth.metric.noRecords');
    expect(healthCopy('metric.energyWarning')).toBe('appleHealth.metric.energyWarning');
    setOs('android');
    expect(healthCopy('metric.stepsNote')).toBe('healthMetric.stepsNote');
    expect(healthCopy('metric.weekError')).toBe('healthMetric.weekError');
    expect(healthCopy('metric.energyWarning')).toBe('healthMetric.energyWarning');
    expect(healthCopy('metric.sourceExplain')).toBe('healthMetric.sourceExplain');
  });
  test('record detail is Apple Health on iPhone and Health Connect on Android', () => {
    setOs('ios');
    expect(healthCopy('record.readOnly')).toBe('appleHealth.record.readOnly');
    expect(healthCopy('record.notFound')).toBe('appleHealth.record.notFound');
    expect(healthAdapterVisible('health-connect')).toBe(false);
    expect(healthAdapterVisible('samsung-health')).toBe(false);
    expect(healthAdapterVisible('apple-health')).toBe(true);
    setOs('android');
    expect(healthCopy('record.readOnly')).toBe('healthRecord.readOnly');
    expect(healthCopy('record.noWrite')).toBe('healthRecord.noWrite');
    expect(healthAdapterVisible('health-connect')).toBe(true);
    expect(healthAdapterVisible('samsung-health')).toBe(true);
    expect(healthAdapterVisible('apple-health')).toBe(true);
  });
  test('sync and troubleshoot do not list Android watch apps on iPhone', () => {
    setOs('ios');
    expect(listsAndroidWatchApps()).toBe(false);
    expect(healthCopy('overview.sync')).toBe('appleHealth.overview.sync');
    expect(healthCopy('overview.watchExplain')).toBe('appleHealth.overview.watchExplain');
    setOs('android');
    expect(listsAndroidWatchApps()).toBe(true);
    expect(healthCopy('overview.sync')).toBe('healthOverview.sync');
    expect(healthCopy('overview.watchTitle')).toBe('healthOverview.watchMissing');
  });
  test('onboarding health and watch steps change only on iPhone', () => {
    setOs('ios');
    expect(onboardingTitleKey('health')).toBe('appleHealth.onboarding.healthTitle');
    expect(onboardingDescriptionKey('health')).toBe('appleHealth.onboarding.healthDescription');
    expect(onboardingTitleKey('watch')).toBe('appleHealth.onboarding.watchTitle');
    expect(onboardingDescriptionKey('watch')).toBe('appleHealth.onboarding.watchDescription');
    expect(onboardingDescriptionKey('privacy')).toBe('appleHealth.onboarding.privacyIntro');
    expect(listsAndroidWatchApps()).toBe(false);
    setOs('android');
    expect(onboardingTitleKey('health')).toBe('onboarding.connectHealthConnect');
    expect(onboardingDescriptionKey('health')).toBe('onboarding.liftriaRequestsReadOnlyAccess');
    expect(onboardingTitleKey('watch')).toBe('onboarding.syncYourWatch');
    expect(onboardingDescriptionKey('watch')).toBe('onboarding.chooseTheAppThatSyncs');
    expect(onboardingDescriptionKey('privacy')).toBe('onboarding.liftriaKeepsYourProfileAnd');
    expect(onboardingTitleKey('profile')).toBeNull();
    expect(listsAndroidWatchApps()).toBe(true);
  });
  test('Today, Settings and weight labels stay Health Connect on Android', () => {
    setOs('android');
    for (const slot of ['today.permissions', 'today.connect', 'today.readOnly', 'settings.title',
      'progress.description', 'trend.chip', 'trend.source'] as const) {
      expect(healthCopy(slot).startsWith('appleHealth.')).toBe(false);
    }
    expect(healthCopy('settings.title')).toBe('settings.home.health');
    expect(healthCopy('trend.chip')).toBe('trend.healthConnect');
    setOs('ios');
    expect(healthCopy('settings.title')).toBe('appleHealth.settings.title');
    expect(healthCopy('today.connect')).toBe('appleHealth.today.connect');
    expect(healthCopy('trend.chip')).toBe('appleHealth.name');
    expect(translate('ar', healthCopy('trend.chip'))).toBe('صحة Apple');
  });
});

describe('Apple Health amounts', () => {
  test('an empty amount is No data, never 0', () => {
    expect(formatAppleAmount('en', 0, 'steps')).toBe('No data');
    expect(formatAppleAmount('ar', 0, 'kcal')).toBe('لا توجد بيانات');
    expect(formatAppleAmount('en', 0, 'steps')).not.toContain('0');
  });
  test('counts use plural forms, Western digits, and a no-break space before the unit', () => {
    expect(formatAppleAmount('en', 1, 'steps')).toBe('1 step');
    expect(formatAppleAmount('en', 2, 'steps')).toBe('2 steps');
    expect(formatAppleAmount('ar', 1, 'steps')).toBe('خطوة واحدة');
    expect(formatAppleAmount('ar', 2, 'steps')).toBe('خطوتان');
    expect(formatAppleAmount('ar', 3, 'steps')).toBe('3 خطوات');
    expect(formatAppleAmount('ar', 11, 'steps')).toBe('11 خطوةً');
    expect(formatAppleAmount('ar', 1200, 'steps')).toMatch(/1.200|1200/);
    expect(formatAppleAmount('ar', 1200, 'steps')).not.toMatch(/[٠-٩]/);
    expect(formatAppleAmount('ar', 80.5, 'kcal')).toContain('\u00A0سعرة');
    expect(formatAppleAmount('ar', 72, 'bpm')).toContain('\u00A0نبضة/د');
    expect(formatAppleAmount('ar', 80.4, 'kg')).toContain('\u00A0كغ');
    expect(formatAppleAmount('ar', 80.4, 'kg')).not.toMatch(/\bkg\b/);
    expect(formatAppleAmount('ar', 18.5, '%')).toContain('\u00A0%');
    expect(formatAppleAmount('ar', 72, 'bpm')).not.toMatch(/bpm/);
    expect(formatAppleAmount('ar', 40, 'kcal')).not.toMatch(/kcal/);
  });
});

describe('iPhone copy does not say Health Connect', () => {
  test('every appleHealth string', () => {
    for (const slot of slots) {
      setOs('ios');
      const key = healthCopy(slot);
      expect(key.startsWith('appleHealth.') || key === 'appleHealth.name').toBe(true);
      expect(en[key].toLowerCase()).not.toContain('health connect');
      expect(ar[key]).not.toContain('هيلث كونيكت');
      expect(ar[key]).not.toContain('Health Connect');
    }
    for (const [key, value] of Object.entries(en)) {
      if (!key.startsWith('appleHealth.')) continue;
      expect(value.toLowerCase()).not.toContain('health connect');
      expect(ar[key as keyof typeof ar]).not.toContain('هيلث كونيكت');
    }
  });
});
