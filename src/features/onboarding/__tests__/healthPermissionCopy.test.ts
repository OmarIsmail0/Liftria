import { availabilityMessage, missingHealthPermissions, offerHealthConnectInstall } from '../healthPermissionCopy';
import { metricTypes, type MetricType, type PermissionState } from '../../../services/health/types';

test('ON-6 partial permissions name each missing metric and impact, not just a count', () => {
  const all = Object.fromEntries(metricTypes.map(m => [m, 'granted'])) as Record<MetricType, PermissionState>;
  all['heart-rate'] = 'denied';
  all['sleep-session'] = 'unknown';
  expect(missingHealthPermissions(all)).toEqual([
    'Heart rate not allowed: Workout heart rate will not show.',
    'Sleep permission not confirmed: Sleep will not appear.',
  ]);
});
test('ON-6 maps provider states to human copy without leaking enums', () => {
  for (const status of ['not-installed','needs-update','unsupported'] as const) {
    const msg = availabilityMessage(status);
    expect(msg).not.toContain(status);
    expect(msg.length).toBeGreaterThan(40);
  }
});

test('Health Connect install link is absent on unsupported devices', () => {
  expect(offerHealthConnectInstall(null)).toBe(false);
  expect(offerHealthConnectInstall('available')).toBe(false);
  expect(offerHealthConnectInstall('unsupported')).toBe(false);
  expect(offerHealthConnectInstall('not-installed')).toBe(true);
  expect(offerHealthConnectInstall('needs-update')).toBe(true);
});
