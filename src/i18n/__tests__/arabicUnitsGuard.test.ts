import { ar } from '../ar';
import type { TranslationKey } from '../en';

describe('Arabic units guard', () => {
  test('no Latin kcal in Arabic translations', () => {
    const violations: string[] = [];
    for (const [key, value] of Object.entries(ar)) {
      if (typeof value === 'string' && /\bkcal\b/.test(value)) {
        // Allow kcal only in placeholder names like {kcal}
        if (!/\{kcal\}/.test(value)) {
          violations.push(`${key}: "${value}"`);
        }
      }
    }
    if (violations.length > 0) {
      throw new Error(
        `Found ${violations.length} Arabic translations with Latin "kcal":\n${violations.join('\n')}`
      );
    }
  });

  test('no Latin g unit in Arabic translations', () => {
    const violations: string[] = [];
    for (const [key, value] of Object.entries(ar)) {
      if (typeof value === 'string') {
        // Match " g" but not in placeholder names or at start of string
        // Allow {grams}, {granted}, etc.
        const matches = value.match(/(?<!{[a-z]*)\s+g(?![a-z}])/g);
        if (matches) {
          violations.push(`${key}: "${value}"`);
        }
      }
    }
    if (violations.length > 0) {
      throw new Error(
        `Found ${violations.length} Arabic translations with Latin " g":\n${violations.join('\n')}`
      );
    }
  });

  test('no Latin mg unit in Arabic translations', () => {
    const violations: string[] = [];
    for (const [key, value] of Object.entries(ar)) {
      if (typeof value === 'string') {
        // Match " mg" not in placeholders
        if (/\s+mg\b/.test(value) && !/\{[^}]*mg[^}]*\}/.test(value)) {
          violations.push(`${key}: "${value}"`);
        }
      }
    }
    if (violations.length > 0) {
      throw new Error(
        `Found ${violations.length} Arabic translations with Latin " mg":\n${violations.join('\n')}`
      );
    }
  });

  test('no Latin ml unit in Arabic translations', () => {
    const violations: string[] = [];
    for (const [key, value] of Object.entries(ar)) {
      if (typeof value === 'string') {
        // Match " ml" not in placeholders
        if (/\s+ml\b/.test(value) && !/\{[^}]*ml[^}]*\}/.test(value)) {
          violations.push(`${key}: "${value}"`);
        }
      }
    }
    if (violations.length > 0) {
      throw new Error(
        `Found ${violations.length} Arabic translations with Latin " ml":\n${violations.join('\n')}`
      );
    }
  });

  test('Arabic *.many count keys use singular accusative form', () => {
    const violations: string[] = [];
    const manyKeys = Object.keys(ar).filter((k) => k.endsWith('.many'));

    for (const key of manyKeys) {
      const value = ar[key as TranslationKey];
      if (typeof value !== 'string' || !value) continue;

      // Extract the Arabic text after {count}
      const match = value.match(/\{count\}\s+(.+)/);
      if (!match || !match[1]) continue;

      const arabicText = match[1];
      
      // Check for singular accusative markers:
      // - يومًا (day accusative)
      // - تمرينًا (workout accusative)
      // - طلبًا (request accusative)
      // The pattern is: ends with ـًا or contains singular forms with tanwin fatḥ (ًا)
      
      // Common plural forms that should NOT appear in 'many':
      // - أيام (days plural)
      // - تمارين (workouts plural)  
      // - طلبات (requests plural)
      const hasPlural = /أيام|تمارين|طلبات|عناصر/.test(arabicText);
      
      if (hasPlural) {
        violations.push(`${key}: "${value}" uses plural form instead of singular accusative`);
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `Found ${violations.length} Arabic 'many' keys without singular accusative:\n${violations.join('\n')}`
      );
    }
  });
});
