import { pluralForm, translate, type AppLanguage, type TranslationKey } from '../../i18n';

/** Zero is "Select exercises". A count uses the language's plural, including Arabic. */
export function addExerciseButtonLabel(language: AppLanguage, count: number): string {
  if (count <= 0) return translate(language, 'pick.addCount.zero');
  return translate(language, (`pick.addCount.${pluralForm(language, count)}`) as TranslationKey, { count });
}
