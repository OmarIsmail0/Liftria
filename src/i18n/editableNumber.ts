/**
 * Text for a number that is about to be edited in a `Field`.
 *
 * Stored and computed values carry float noise (23.112000000000002) and more
 * precision than the fields accept, so every kind declares how many decimals
 * survive editing. Always Western digits: the keyboard is numeric and the text
 * is parsed straight back into a stored number.
 */
export type EditableNumberKind = 'kcal' | 'grams' | 'weight' | 'load' | 'length' | 'count' | 'effort';

/** 'load' keeps two decimals: a workout weight can be plate-exact (46.25 kg). */
const decimalsFor: Record<EditableNumberKind, number> = {
  kcal: 0, grams: 1, weight: 1, load: 2, length: 1, count: 0, effort: 1,
};

/** No data is not 0: a missing or unusable value leaves the field empty. */
export function formatEditableNumber(value: number | null | undefined, kind: EditableNumberKind): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  return String(Number(value.toFixed(decimalsFor[kind])));
}

/**
 * The number a person typed into a numeric field, or `null` when the field is blank.
 *
 * Arabic phones often type Arabic-Indic (٠–٩) or Persian (۰–۹) digits and the Arabic
 * decimal separator (٫); some keyboards type a comma. Each is accepted, so the same
 * value reads the same in either language. Anything else is `NaN`, never 0: signs,
 * exponents ("1e3"), hex, words, spaces inside the number or more than one separator.
 * Range checks stay with each field.
 */
export function parseEditableNumber(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const western = trimmed
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06F0))
    .replace(/[٫,]/g, '.');
  if (!/^(\d+\.?\d*|\.\d+)$/.test(western)) return Number.NaN;
  return Number(western);
}
