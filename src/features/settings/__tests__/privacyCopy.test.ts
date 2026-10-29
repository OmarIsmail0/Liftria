import { translate, type TranslationKey } from '../../../i18n';

const keys: TranslationKey[] = [
  'p4.privacy.0',
  'p4.privacy.1',
  'p4.privacy.2',
  'p4.privacy.3',
  'p4.privacy.4',
  'p4.privacy.5',
  'p4.privacy.6',
  'p4.privacy.7',
  'p4.privacy.8',
  'p4.privacy.9',
  'p4.privacy.10',
  'p4.privacy.11',
  'p4.privacy.12',
  'p4.privacy.13',
  'p4.privacy.14',
];

test('privacy route copy exists in both English and Arabic', () => {
  for (const key of keys) {
    expect(translate('en', key).trim().length).toBeGreaterThan(0);
    expect(translate('ar', key).trim().length).toBeGreaterThan(0);
  }
});

test('privacy copy keeps the implementation-critical claims', () => {
  expect(translate('en', 'p4.privacy.3')).toContain('SQLite');
  expect(translate('en', 'p4.privacy.6')).toContain('SecureStore');
  expect(translate('en', 'p4.privacy.8')).toContain('1024');
  expect(translate('en', 'p4.privacy.8')).toContain('EXIF');
  expect(translate('en', 'p4.privacy.12')).toContain('read only');
  expect(translate('en', 'p4.privacy.14')).toContain('Delete all');
});
