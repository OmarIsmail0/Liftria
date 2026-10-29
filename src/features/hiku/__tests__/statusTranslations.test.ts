import { en } from '../../../i18n/en';
import { ar } from '../../../i18n/ar';

describe('Hiku request status translations', () => {
  // All status values that can be written by src/features/hiku/client.ts finish()
  // or returned in HikuResponse/HikuFailure
  const allStatuses = [
    'started',
    'review-ready',
    'saved',
    'cancelled',
    'cancelled-may-be-billed',
    'offline',
    'key-missing',
    'key-invalid',
    'unauthorized',
    'model-unavailable',
    'rate-limited',
    'server-error',
    'timeout',
    'network-error',
    'database-error',
    'invalid',
    'refusal',
    'truncated',
  ] as const;

  test('all request status values have English translations', () => {
    const missing: string[] = [];
    for (const status of allStatuses) {
      const key = `hikuK.requestStatus.${status}`;
      if (!(key in en)) {
        missing.push(status);
      }
    }
    if (missing.length > 0) {
      throw new Error(
        `Missing English translations for status values: ${missing.join(', ')}`
      );
    }
  });

  test('all request status values have Arabic translations', () => {
    const missing: string[] = [];
    for (const status of allStatuses) {
      const key = `hikuK.requestStatus.${status}`;
      if (!(key in ar)) {
        missing.push(status);
      }
    }
    if (missing.length > 0) {
      throw new Error(
        `Missing Arabic translations for status values: ${missing.join(', ')}`
      );
    }
  });
});
