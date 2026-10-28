/**
 * Text for a number that is about to be edited in a `Field`.
 *
 * Stored and computed values carry float noise (23.112000000000002) and more
 * precision than the fields accept, so every kind declares how many decimals
 * survive editing. Always Western digits: the keyboard is numeric and the text
 * is parsed straight back into a stored number.
 */
export type EditableNumberKind = 'kcal' | 'grams' | 'weight' | 'length' | 'count' | 'effort';

const decimalsFor: Record<EditableNumberKind, number> = {
  kcal: 0, grams: 1, weight: 1, length: 1, count: 0, effort: 1,
};

/** No data is not 0: a missing or unusable value leaves the field empty. */
export function formatEditableNumber(value: number | null | undefined, kind: EditableNumberKind): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  return String(Number(value.toFixed(decimalsFor[kind])));
}
