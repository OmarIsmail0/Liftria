import { ar } from '../../../i18n/ar';
import { en } from '../../../i18n/en';
import {
  ageLabel, healthAvailabilityText, heartRateTodayStatus, historyPermissionMessage, sourceName,
  NOTE_NO_DATA, NOTE_NOT_ALLOWED, NOTE_NOT_AVAILABLE, NOTE_NO_MEASURED_SOURCE, NOTE_PERMISSION_UNCONFIRMED,
  NOTE_SEPARATE_SOURCES, NOTE_UNVERIFIED_DEVICE, SOURCE_PHONE, SOURCE_UNKNOWN,
} from '../presentation';

const latinWords = (text: string): string[] =>
  text.replace(/\{\w+\}/g, ' ').match(/[A-Za-z]+/g)?.filter(word => word !== 'kg' && word !== 'lb') ?? [];

test('the status codes the Health screens compare against keep their exact values', () => {
  expect([SOURCE_PHONE, SOURCE_UNKNOWN, NOTE_NO_DATA, NOTE_NOT_ALLOWED, NOTE_NOT_AVAILABLE,
    NOTE_PERMISSION_UNCONFIRMED, NOTE_NO_MEASURED_SOURCE, NOTE_UNVERIFIED_DEVICE, NOTE_SEPARATE_SOURCES])
    .toEqual(['Phone', 'Unknown source', 'No data', 'Not allowed', 'Not available',
      'Permission not confirmed', 'No measured source',
      'Unverified device. The data origin does not prove this came from a watch.',
      'Separate sources; no combined total.']);
  expect(sourceName('com.android.healthconnect.phone')).toBe('Phone');
  expect(sourceName('  ')).toBe('Unknown source');
});

test('every status code has a translation the screens already use', () => {
  expect(en['healthOverview.noData']).toBe(NOTE_NO_DATA);
  expect(en['healthOverview.notAllowed']).toBe(NOTE_NOT_ALLOWED);
  expect(en['healthOverview.notAvailable']).toBe(NOTE_NOT_AVAILABLE);
  expect(en['healthOverview.unknownPermission']).toBe(NOTE_PERMISSION_UNCONFIRMED);
  expect(en['healthOverview.noMeasure']).toBe(NOTE_NO_MEASURED_SOURCE);
  expect(en['healthOverview.noteUnverified']).toBe(NOTE_UNVERIFIED_DEVICE);
  expect(en['healthOverview.noteSeparate']).toBe(NOTE_SEPARATE_SOURCES);
  expect(en['healthOverview.unknownSource']).toBe(SOURCE_UNKNOWN);
  expect(en['chips.phone']).toBe(SOURCE_PHONE);
});

describe('presentation text comes out in Arabic when asked', () => {
  const end = '2026-10-24T12:30:00.000Z';
  const now = Date.parse('2026-10-24T13:00:00.000Z');
  test('ages', () => {
    const texts = [ageLabel(end, now, 'ar'), ageLabel(end, now + 7 * 3600000, 'ar'),
      ageLabel(end, now + 2 * 86400000, 'ar'), ageLabel('not a date', now, 'ar')];
    for (const text of texts) expect(latinWords(text)).toEqual([]);
    expect(texts[0]).toContain('30');
    expect(ageLabel(end, now, 'en')).toBe('30 min ago');
    expect(ageLabel(end, now)).toBe('30 min ago');
  });
  test('Health Connect availability and older-record access', () => {
    for (const status of [null, 'available', 'not-installed', 'needs-update', 'unsupported'] as const) {
      expect(latinWords(healthAvailabilityText(status, 'ar'))).toEqual([]);
    }
    for (const status of ['granted', 'denied', 'unverified', 'unavailable'] as const) {
      expect(latinWords(historyPermissionMessage(status, 'ar'))).toEqual([]);
      expect(historyPermissionMessage(status, 'ar')).not.toBe(historyPermissionMessage(status, 'en'));
    }
  });
  test('heart-rate freshness uses Arabic words and Western digits', () => {
    const now = new Date(2026, 9, 25, 12, 0);
    const yesterday = heartRateTodayStatus(new Date(2026, 9, 24, 22, 40).toISOString(), now, 'ar');
    expect(yesterday.stale).toBe(true);
    expect(yesterday.age).toContain('أمس');
    expect(yesterday.age).toMatch(/22|10/);
    expect(yesterday.age).not.toMatch(/[٠-٩]/);
    expect(latinWords(yesterday.age.replace(/\u2068|\u2069/g, ''))).toEqual([]);
    expect(heartRateTodayStatus('nope', now, 'ar').age).toBe(ar['healthOverview.timeUnknown']);
  });
});
