import { findLocaleProblems } from './localeScanner';
import { readRepoFile } from './sourceFiles';

const locale = (value: unknown) => JSON.stringify(value);
const good = locale({ ios: { CFBundleDisplayName: 'Liftria', NSCameraUsageDescription: 'Camera.' } });
const goodAr = locale({ ios: { CFBundleDisplayName: 'ليفتريا', NSCameraUsageDescription: 'الكاميرا.' } });

describe('locale scanner on planted files', () => {
  it('accepts two files that keep every key under "ios" and agree on the keys', () => {
    expect(findLocaleProblems({ en: good, ar: goodAr })).toEqual([]);
  });

  it('flags a key that sits at the top level, which Android lint reports as ExtraTranslation', () => {
    const bad = locale({ CFBundleDisplayName: 'Liftria', ios: { NSCameraUsageDescription: 'Camera.' } });
    expect(findLocaleProblems({ en: bad })).toEqual(['en: top-level key "CFBundleDisplayName" must sit under "ios"']);
  });

  it('flags a file whose keys are all at the top level and has no "ios" object', () => {
    const problems = findLocaleProblems({ ar: locale({ CFBundleDisplayName: 'ليفتريا' }) });
    expect(problems).toContain('ar: top-level key "CFBundleDisplayName" must sit under "ios"');
    expect(problems).toContain('ar: missing the "ios" object');
  });

  it('flags an "android" group or any other top-level group', () => {
    expect(findLocaleProblems({ en: locale({ ios: {}, android: { app_name: 'Liftria' } }) }))
      .toContain('en: top-level key "android" must sit under "ios"');
  });

  it('flags an "ios" that is not an object', () => {
    expect(findLocaleProblems({ en: locale({ ios: 'Liftria' }) })).toContain('en: "ios" must be an object of strings');
    expect(findLocaleProblems({ en: locale({ ios: ['a'] }) })).toContain('en: "ios" must be an object of strings');
  });

  it('flags a key present in one file and missing from the other, in both directions', () => {
    const arMissing = locale({ ios: { CFBundleDisplayName: 'ليفتريا' } });
    expect(findLocaleProblems({ en: good, ar: arMissing }))
      .toEqual(['ar: missing key "ios.NSCameraUsageDescription" that en has']);
    expect(findLocaleProblems({ en: arMissing, ar: good }))
      .toEqual(['ar: has key "ios.NSCameraUsageDescription" that en does not have']);
  });

  it('flags a renamed key', () => {
    const renamed = locale({ ios: { CFBundleDisplayName: 'ليفتريا', NSCameraUsage: 'الكاميرا.' } });
    expect(findLocaleProblems({ en: good, ar: renamed })).toHaveLength(2);
  });

  it('flags values that are empty or not strings', () => {
    expect(findLocaleProblems({ en: locale({ ios: { A: '  ' } }) })).toEqual(['en: ios.A is empty']);
    expect(findLocaleProblems({ en: locale({ ios: { A: 1 } }) })).toEqual(['en: ios.A must be a string']);
    expect(findLocaleProblems({ en: locale({ ios: { A: { B: 'x' } } }) })).toEqual(['en: ios.A must be a string']);
  });

  it('flags files that are not JSON objects', () => {
    expect(findLocaleProblems({ en: '{ "ios": ' })[0]).toMatch(/^en: not valid JSON/);
    expect(findLocaleProblems({ en: '[]' })).toEqual(['en: must be a JSON object']);
    expect(findLocaleProblems({ en: 'null' })).toEqual(['en: must be a JSON object']);
  });
});

describe('locales/*.json', () => {
  it('keeps every key under "ios" and keeps English and Arabic in step', () => {
    expect(findLocaleProblems({
      'locales/en.json': readRepoFile('locales/en.json'),
      'locales/ar.json': readRepoFile('locales/ar.json'),
    })).toEqual([]);
  });
});
