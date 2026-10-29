import { lineOf, maskNonCode } from './maskNonCode';
import type { Violation } from './hermesScanner';

const ASSIGNMENT_OPERATOR = String.raw`(?:\*\*|>>>|<<|>>|&&|\|\||\?\?|[-+*/%&|^])?=(?![=>])`;
const lineText = (code: string, line: number): string => (code.split('\n')[line - 1] ?? '').trim();

/**
 * Finds writes to `.value` (`x.value = 1`, `x.value += 1`, `x.value++`, `++x.value`,
 * `x['value'] = 1`). The React Compiler lint rejects them on Reanimated shared values, which
 * must use `.set()`. A static scan cannot tell a shared value from a plain object, so any
 * `.value` write in app code counts; reads (`x.value`, `x.value === 1`) are fine.
 */
export function findSharedValueAssignments(source: string): Violation[] {
  const code = maskNonCode(source);
  const withStrings = maskNonCode(source, { keepStrings: true });
  const found: Violation[] = [];
  const add = (index: number) => {
    const line = lineOf(source, index);
    found.push({ line, text: lineText(source, line), reason: 'write to .value; use .set() on shared values' });
  };

  const patterns = [
    new RegExp(String.raw`\.\s*value(?![\w$])\s*${ASSIGNMENT_OPERATOR}`, 'g'),
    /\.\s*value(?![\w$])\s*(?:\+\+|--)/g,
    /(?<![\w$\])])(?:\+\+|--)[ \t]*[\w$.]*(?:\[[^\]\n]*\][\w$.]*)*\.value(?![\w$])/g,
  ];
  for (const pattern of patterns) {
    for (const hit of code.matchAll(pattern)) add(hit.index);
  }
  const bracket = new RegExp(String.raw`\[\s*(['"])value\1\s*\]\s*(?:${ASSIGNMENT_OPERATOR}|\+\+|--)`, 'g');
  for (const hit of withStrings.matchAll(bracket)) add(hit.index);

  const seen = new Set<string>();
  return found
    .filter(v => !seen.has(`${v.line}:${v.text}`) && seen.add(`${v.line}:${v.text}`))
    .sort((a, b) => a.line - b.line);
}
