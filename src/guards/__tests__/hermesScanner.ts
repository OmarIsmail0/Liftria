import { lineOf, maskNonCode } from './maskNonCode';

export interface Violation {
  line: number;
  text: string;
  reason: string;
}

/** Hermes ships only these `Intl` APIs. Their option and part types are erased at build time. */
const ALLOWED_INTL = /^(?:NumberFormat|DateTimeFormat|Collator)(?:Options|Part|PartTypes)?$/;

const lineText = (code: string, line: number): string => (code.split('\n')[line - 1] ?? '').trim();

/**
 * Finds the two Hermes rules from HANDOFF.md "Technical gotchas": only `Intl.NumberFormat`,
 * `DateTimeFormat` and `Collator` exist (never `Intl.PluralRules` and friends), and there is no
 * `crypto` global (use `newGymId()`). Comments and string text are ignored, so prose that names
 * the forbidden API does not count.
 */
export function findHermesViolations(source: string): Violation[] {
  const code = maskNonCode(source);
  const withStrings = maskNonCode(source, { keepStrings: true });
  const found: Violation[] = [];
  const add = (index: number, reason: string) => {
    const line = lineOf(source, index);
    found.push({ line, text: lineText(source, line), reason });
  };

  for (const hit of code.matchAll(/(?<![\w$])Intl(?![\w$])(?:\s*\.\s*([A-Za-z_$][\w$]*))?/g)) {
    const member = hit[1];
    if (member === undefined) add(hit.index, 'Intl used without a named member; only NumberFormat, DateTimeFormat and Collator exist on Hermes');
    else if (!ALLOWED_INTL.test(member)) add(hit.index, `Intl.${member} does not exist on Hermes (use pluralForm() for plurals)`);
  }
  for (const hit of code.matchAll(/(?<![\w$])crypto\s*(?:\?\s*)?(?:\.|\[)/g)) {
    add(hit.index, 'crypto.* does not exist on Hermes (use newGymId())');
  }
  for (const hit of withStrings.matchAll(/(?<![\w$])(?:from|require\s*\(|import\s*\(?)\s*(['"])(?:node:)?crypto(?:\/[^'"]*)?\1/g)) {
    add(hit.index, 'importing crypto is not available on Hermes (use newGymId())');
  }
  return found.sort((a, b) => a.line - b.line);
}
