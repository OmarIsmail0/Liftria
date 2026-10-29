import { findHermesViolations } from './hermesScanner';
import { readAppSources } from './sourceFiles';

const reasons = (code: string) => findHermesViolations(code).map(v => v.reason);

describe('Hermes scanner on planted code', () => {
  it.each([
    ['PluralRules', "const r = new Intl.PluralRules('ar').select(3);", 'Intl.PluralRules'],
    ['RelativeTimeFormat', 'const f = new Intl.RelativeTimeFormat("en");', 'Intl.RelativeTimeFormat'],
    ['ListFormat', "const f = new Intl.ListFormat('en', { style: 'long' });", 'Intl.ListFormat'],
    ['Segmenter', 'const s = new Intl.Segmenter();', 'Intl.Segmenter'],
    ['spaced member access', 'const r = new Intl .  PluralRules();', 'Intl.PluralRules'],
    ['through globalThis', 'new globalThis.Intl.PluralRules();', 'Intl.PluralRules'],
    ['inside a template expression', 'const t = `${new Intl.ListFormat().format(a)}`;', 'Intl.ListFormat'],
    ['inside JSX', '<Text>{new Intl.RelativeTimeFormat().format(1, "day")}</Text>', 'Intl.RelativeTimeFormat'],
  ])('flags Intl.%s', (_name, code, expected) => {
    expect(reasons(code).join('\n')).toContain(expected);
  });

  it('flags an Intl reference with no named member, which could reach any API', () => {
    expect(findHermesViolations('const { PluralRules } = Intl;')).toHaveLength(1);
    expect(findHermesViolations("const x = Intl['PluralRules'];")).toHaveLength(1);
  });

  it('reports the line of the violation and its source text', () => {
    const [violation] = findHermesViolations('const a = 1;\n\nconst r = new Intl.PluralRules();\n');
    expect(violation?.line).toBe(3);
    expect(violation?.text).toBe('const r = new Intl.PluralRules();');
  });

  it.each([
    ['NumberFormat', "new Intl.NumberFormat('en-US').format(1)"],
    ['DateTimeFormat', "new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d)"],
    ['Collator', "new Intl.Collator('ar').compare(a, b)"],
    ['option types', 'export function f(options?: Intl.NumberFormatOptions, d?: Intl.DateTimeFormatOptions) {}'],
    ['a spaced allowed member', 'new Intl . NumberFormat()'],
    ['a name that merely contains Intl', 'const MyIntl = 1; const IntlHelper = MyIntl; MyIntl.PluralRules;'],
  ])('allows %s', (_name, code) => {
    expect(findHermesViolations(code)).toEqual([]);
  });

  it('ignores Intl.PluralRules in comments, strings, templates and regular expressions', () => {
    const code = [
      '// never use new Intl.PluralRules here',
      '/* Intl.ListFormat crashed History */',
      '/**\n * Intl.RelativeTimeFormat\n */',
      "const a = 'Intl.PluralRules';",
      'const b = "Intl.ListFormat";',
      'const c = `Intl.Segmenter and crypto.randomUUID()`;',
      'const d = /Intl\\.PluralRules/;',
    ].join('\n');
    expect(findHermesViolations(code)).toEqual([]);
  });

  it('still finds code that follows a string, a comment or a regular expression', () => {
    const code = "const a = 'it\\'s'; // note\nconst b = /['\"]/.test(x); new Intl.PluralRules();";
    expect(reasons(code)).toEqual([expect.stringContaining('Intl.PluralRules')]);
  });

  it.each([
    ['crypto.randomUUID()', 'const id = crypto.randomUUID();'],
    ['crypto.getRandomValues', 'crypto.getRandomValues(new Uint8Array(8));'],
    ['optional chaining', 'const id = crypto?.randomUUID?.();'],
    ['globalThis.crypto', 'return globalThis.crypto.randomUUID();'],
    ['window.crypto', 'window.crypto.subtle.digest(a, b);'],
    ['global.crypto', 'global.crypto.randomUUID();'],
    ['bracket access', "crypto['randomUUID']();"],
    ['spaced access', 'crypto\n  .randomUUID();'],
  ])('flags %s', (_name, code) => {
    expect(reasons(code).join('\n')).toContain('crypto');
  });

  it.each([
    ["import from 'crypto'", "import { randomUUID } from 'crypto';"],
    ['import from node:crypto', 'import { randomUUID } from "node:crypto";'],
    ['require', "const { randomUUID } = require('crypto');"],
    ['dynamic import', "const c = await import('node:crypto');"],
    ['a crypto subpath', "import { webcrypto } from 'crypto/webcrypto';"],
  ])('flags %s', (_name, code) => {
    expect(reasons(code).join('\n')).toContain('importing crypto');
  });

  it('allows the guarded global read that newGymId() uses and unrelated names', () => {
    const code = [
      'const web = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;',
      "if (typeof web?.randomUUID === 'function') return web.randomUUID();",
      'const cryptography = 1; const encrypto = 2; cryptoKey.value;',
      "import { x } from 'crypto-js-lookalike';",
    ].join('\n');
    expect(findHermesViolations(code)).toEqual([]);
  });
});

describe('Hermes rules over app/** and src/**', () => {
  it('finds source files to scan', () => {
    const paths = readAppSources().map(f => f.path);
    expect(paths.length).toBeGreaterThan(100);
    expect(paths).toContain('src/i18n/index.ts');
    expect(paths).toContain('src/services/database/exerciseLibrary.ts');
    expect(paths.some(p => p.includes('__tests__'))).toBe(false);
    expect(paths.some(p => /\.test\./.test(p))).toBe(false);
  });

  it('uses no Intl API beyond NumberFormat, DateTimeFormat and Collator, and no crypto', () => {
    const violations = readAppSources().flatMap(file =>
      findHermesViolations(file.code).map(v => `${file.path}:${v.line}: ${v.reason}: ${v.text}`));
    expect(violations).toEqual([]);
  });
});
