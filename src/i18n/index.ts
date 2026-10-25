import { en, type TranslationKey } from './en';
import { ar } from './ar';

export type AppLanguage = 'en' | 'ar';
export type LanguagePreference = 'system' | AppLanguage;
export type TranslationParams = Record<string, string | number>;
export const languages = { en, ar } as const;

/** Never infer the persisted choice from the RTL flag (layout may await restart). */
export function resolveLanguage(preference: LanguagePreference, deviceLanguage: AppLanguage): AppLanguage {
  return preference === 'system' ? deviceLanguage : preference;
}

export function formatNumber(language: AppLanguage, number: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
    ...options, numberingSystem: 'latn',
  }).format(number);
}

export function translate(language: AppLanguage, key: TranslationKey, params?: TranslationParams): string {
  const template: string = languages[language][key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params?.[name];
    return value === undefined ? match : typeof value === 'number' ? formatNumber(language, value) : value;
  });
}

/** Intl.PluralRules handles Arabic zero/one/two/few/many/other (not an English -s suffix). */
export function translateWorkoutCount(language: AppLanguage, count: number): string {
  const form = new Intl.PluralRules(language === 'ar' ? 'ar-EG' : 'en-US').select(count);
  return translate(language, (`count.workouts.${form}`) as TranslationKey, { count });
}
export type { TranslationKey } from './en';
