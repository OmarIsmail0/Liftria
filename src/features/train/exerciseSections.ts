/**
 * Letter sections for a list that is already ordered (searchExercises sorts).
 * This walks that order and does not sort again: a per-comparison collator is
 * too expensive on Hermes, and a second sort could disagree with the search.
 */

export interface ExerciseLetterSection<T> {
  /** First letter of the displayed name. Empty when the list is not A–Z (a ranked search). */
  letter: string;
  data: T[];
}

const ALEF = /^[أإآٱ]$/;

/** First letter of a displayed name. Latin letters are uppercase; alef variants share ا. */
export function displayLetter(name: string): string {
  const first = Array.from(name.trim())[0];
  if (!first) return '#';
  if (ALEF.test(first)) return 'ا';
  if (first >= 'a' && first <= 'z') return first.toUpperCase();
  return first;
}

/**
 * Group consecutive items that share a display letter. Items stay in the order given,
 * including a repeated letter when the order is not alphabetical.
 */
export function groupByDisplayLetter<T>(
  items: readonly T[],
  displayName: (item: T) => string,
): ExerciseLetterSection<T>[] {
  const sections: ExerciseLetterSection<T>[] = [];
  for (const item of items) {
    const letter = displayLetter(displayName(item));
    const last = sections[sections.length - 1];
    if (last && last.letter === letter) last.data.push(item);
    else sections.push({ letter, data: [item] });
  }
  return sections;
}

/**
 * Library sections. An empty query is A–Z (letter headers). A ranked search stays one
 * untitled section so the same letter is not repeated down the relevance order.
 */
export function librarySections<T>(
  items: readonly T[],
  displayName: (item: T) => string,
  alphabetical: boolean,
): ExerciseLetterSection<T>[] {
  if (items.length === 0) return [];
  if (!alphabetical) return [{ letter: '', data: [...items] }];
  return groupByDisplayLetter(items, displayName);
}
