import { en, type TranslationKey } from './en';
import { ar } from './ar';

export type AppLanguage = 'en' | 'ar';

/** Keep numeric values and units in their own LTR isolate inside RTL sentences. */
export function bidiIsolate(language: AppLanguage, value: string): string {
  return language === 'ar' ? '\u2068' + value + '\u2069' : value;
}
export type LanguagePreference = 'system' | AppLanguage;
export type TranslationParams = Record<string, string | number>;
export const languages = { en, ar } as const;

/** Never infer the persisted choice from the RTL flag (layout may await restart). */
export function resolveLanguage(preference: LanguagePreference, deviceLanguage: AppLanguage): AppLanguage {
  return preference === 'system' ? deviceLanguage : preference;
}

/**
 * Western digits everywhere (owner rule). Hermes on iOS ignores `numberingSystem` and the
 * `-u-nu-latn` locale extension, so map Arabic-Indic digits and separators back explicitly.
 */
export function latinDigits(value: string): string {
  return value
    .replace(/[\u0660-\u0669]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, digit => String(digit.charCodeAt(0) - 0x06F0))
    .replace(/\u066C/g, ',').replace(/\u066B/g, '.');
}

export function formatNumber(language: AppLanguage, number: number, options?: Intl.NumberFormatOptions): string {
  return latinDigits(new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
    ...options, numberingSystem: 'latn',
  }).format(number));
}

/** Dates in the app language with Western digits on every platform. */
export function formatDate(language: AppLanguage, date: Date, options?: Intl.DateTimeFormatOptions): string {
  return latinDigits(new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', {
    ...options, numberingSystem: 'latn',
  }).format(date));
}

export function translate(language: AppLanguage, key: TranslationKey, params?: TranslationParams): string {
  const template: string = languages[language][key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params?.[name];
    return value === undefined ? match : typeof value === 'number' ? formatNumber(language, value) : value;
  });
}

export type PluralForm = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/**
 * CLDR plural category for whole counts. Hand-written because Hermes on Android has no
 * Intl.PluralRules (`new Intl.PluralRules` crashed History on the release APK).
 * Arabic: 0 zero, 1 one, 2 two, n%100 3-10 few, n%100 11-99 many, else other.
 */
export function pluralForm(language: AppLanguage, count: number): PluralForm {
  const n = Math.abs(Math.trunc(count));
  if (language === 'en') return n === 1 ? 'one' : 'other';
  const r = n % 100;
  if (n === 0) return 'zero';
  if (n === 1) return 'one';
  if (n === 2) return 'two';
  if (r >= 3 && r <= 10) return 'few';
  if (r >= 11) return 'many';
  return 'other';
}

export function translateWorkoutCount(language: AppLanguage, count: number): string {
  return translate(language, (`count.workouts.${pluralForm(language, count)}`) as TranslationKey, { count });
}
export type { TranslationKey } from './en';
