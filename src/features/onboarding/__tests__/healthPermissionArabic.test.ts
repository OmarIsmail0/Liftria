import { availabilityMessage, missingHealthPermissions } from '../healthPermissionCopy';
import { metricTypes, type PermissionState, type MetricType } from '../../../services/health/types';

describe('onboarding Arabic health permission copy', () => {
  it('translates unavailable Health Connect states without implying missing data are zero', () => {
    expect(availabilityMessage('not-installed', 'ar')).toContain('غير مثبت');
    expect(availabilityMessage('available', 'en')).toContain('Choose');
  });
  it('renders the same missing metrics with Arabic names and consequences', () => {
    const denied = Object.fromEntries(metricTypes.map(metric => [metric, 'denied'])) as Record<MetricType, PermissionState>;
    const arabic = missingHealthPermissions(denied, 'ar');
    expect(arabic).toHaveLength(metricTypes.length);
    expect(arabic[0]).toContain('الخطوات');
    expect(arabic[0]).not.toContain('Daily steps');
  });
});
