import { Platform } from 'react-native';
import { appleHealthPhone, healthCopy, listsAndroidWatchApps, requestsHistoryRead } from '../deviceHealth';

type Fs = { readFileSync: (file: string, encoding: 'utf8') => string };
const { readFileSync } = jest.requireActual('fs') as Fs;

const original = Platform.OS;
function setOs(os: string) {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: os });
}
afterAll(() => { Object.defineProperty(Platform, 'OS', { configurable: true, value: original }); });

const screens: { file: string; flag: string }[] = [
  { file: 'app/(tabs)/progress/health.tsx', flag: 'appleHealthPhone()' },
  { file: 'app/(tabs)/progress/health-permissions.tsx', flag: 'requestsHistoryRead()' },
  { file: 'app/(tabs)/progress/health-detail.tsx', flag: 'appleHealthPhone()' },
  { file: 'app/(tabs)/progress/health-record.tsx', flag: 'appleHealthPhone()' },
  { file: 'app/(tabs)/progress/health-sync.tsx', flag: 'appleHealthPhone()' },
  { file: 'app/(tabs)/progress/health-troubleshoot.tsx', flag: 'appleHealthPhone()' },
  { file: 'app/onboarding/[step].tsx', flag: 'listsAndroidWatchApps()' },
  { file: 'src/features/health/useHealthSnapshot.ts', flag: 'healthAdapterVisible(' },
  { file: 'src/features/progress/weightRepository.ts', flag: 'healthAdapterVisible(' },
];

test('each health screen branches on the iPhone flag and no longer shows the coming-soon card', () => {
  for (const screen of screens) {
    const source = readFileSync(screen.file, 'utf8');
    expect(source).toContain(screen.flag);
    expect(source).not.toContain('AppleHealthComing');
    expect(source).not.toContain('iosHealth.');
  }
});

test('mocked iPhone flag selects Apple Health for every screen branch', () => {
  setOs('ios');
  expect(appleHealthPhone()).toBe(true);
  expect(requestsHistoryRead()).toBe(false);
  expect(listsAndroidWatchApps()).toBe(false);
  expect(healthCopy('overview.readOnly')).toBe('appleHealth.overview.readOnly');
  expect(healthCopy('perm.request')).toBe('appleHealth.perm.request');
  expect(healthCopy('metric.stepsNote')).toBe('appleHealth.metric.stepsNote');
  expect(healthCopy('record.readOnly')).toBe('appleHealth.record.readOnly');
  expect(healthCopy('overview.sync')).toBe('appleHealth.overview.sync');
  setOs('android');
  expect(appleHealthPhone()).toBe(false);
  expect(requestsHistoryRead()).toBe(true);
  expect(listsAndroidWatchApps()).toBe(true);
  expect(healthCopy('overview.readOnly')).toBe('healthOverview.readOnly');
  expect(healthCopy('perm.request')).toBe('healthPerm.openPermissions');
  expect(healthCopy('overview.sync')).toBe('healthOverview.sync');
});
