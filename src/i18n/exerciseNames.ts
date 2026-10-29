import type { AppLanguage } from './index';
import { EXERCISE_NAMES_AR } from './exerciseNamesAr';

/**
 * The name to show for an exercise. Bundled pack exercises have an Arabic name; custom and
 * imported exercises always show the name the person typed. Never store the result: the
 * English pack name stays the stored name (database, backup, CSV import matching).
 */
export function exerciseName(language: AppLanguage, exerciseId: string | null | undefined, storedName: string): string {
  if (language !== 'ar' || !exerciseId) return storedName;
  return Object.prototype.hasOwnProperty.call(EXERCISE_NAMES_AR, exerciseId)
    ? EXERCISE_NAMES_AR[exerciseId]! : storedName;
}

/** The Arabic name of a pack exercise, or null (custom, imported or unknown id). */
export function arabicExerciseName(exerciseId: string): string | null {
  return Object.prototype.hasOwnProperty.call(EXERCISE_NAMES_AR, exerciseId) ? EXERCISE_NAMES_AR[exerciseId]! : null;
}

/**
 * Arabic search normalization: strip diacritics and tatweel; أ إ آ ٱ → ا; ى → ي; ة → ه.
 * Also lowercases and collapses spaces so Latin input keeps working.
 */
export function normalizeArabicSearch(value: string): string {
  return value
    .replace(/[ً-ٰٟۖ-ۭ]/g, '')
    .replace(/ـ/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLocaleLowerCase('en')
    .replace(/\s+/g, ' ')
    .trim();
}
