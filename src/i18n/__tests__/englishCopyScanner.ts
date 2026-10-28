import * as ts from 'typescript';

/**
 * Finds English text that would reach the screen without going through `t()`.
 * It reads the TypeScript syntax tree, so concatenations (`'Resume '+title`), template literals
 * (`` `Enter ${label}` ``), JSX text (`{a} of {b}`) and conditional branches are all seen.
 * Anything wrapped in a call (`t('key')`, `translate(...)`, `fmt(...)`) is ignored on purpose:
 * keys are not copy and the translated value comes from `en.ts` / `ar.ts`.
 */

/** Props that carry text a user reads or a screen reader speaks. */
export const COPY_PROPS = new Set([
  'accessibilityLabel', 'accessibilityHint', 'label', 'title', 'subtitle', 'description', 'placeholder',
  'detail', 'message', 'error', 'unit', 'caption', 'hint',
]);
/** Object-literal keys that carry the same kind of text (option lists, results returned to a screen). */
export const COPY_KEYS = new Set([
  ...COPY_PROPS, 'note', 'body', 'text', 'reason', 'summary', 'name', 'before', 'after',
]);

export type Hit = { line: number; text: string; where: string };

const arabic = /[\u0600-\u06FF]/;
const letter = /[A-Za-z]/;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Removes allow-listed tokens (ASCII-only boundaries, so Arabic neighbours never confuse them). */
export function stripAllowed(text: string, allowed: readonly string[]): string {
  let rest = text;
  for (const token of [...allowed].sort((a, b) => b.length - a.length)) {
    rest = rest.replace(new RegExp('(?<![A-Za-z])' + escapeRegExp(token) + '(?![A-Za-z])', 'g'), ' ');
  }
  return rest;
}

type Fragment = { text: string; pos: number };

/** Literal text that ends up in the value of an expression. Calls and identifiers contribute nothing. */
export function literalFragments(node: ts.Node | undefined, sf: ts.SourceFile): Fragment[] {
  if (!node) return [];
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return [{ text: node.text, pos: node.getStart(sf) }];
  }
  if (ts.isTemplateExpression(node)) {
    return [
      { text: node.head.text, pos: node.head.getStart(sf) },
      ...node.templateSpans.flatMap(span => [
        ...literalFragments(span.expression, sf),
        { text: span.literal.text, pos: span.literal.getStart(sf) },
      ]),
    ];
  }
  if (ts.isBinaryExpression(node)) {
    const kind = node.operatorToken.kind;
    if (kind === ts.SyntaxKind.PlusToken || kind === ts.SyntaxKind.QuestionQuestionToken ||
      kind === ts.SyntaxKind.BarBarToken || kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      return [...literalFragments(node.left, sf), ...literalFragments(node.right, sf)];
    }
    return [];
  }
  if (ts.isConditionalExpression(node)) {
    const whenTrue = literalFragments(node.whenTrue, sf);
    const whenFalse = literalFragments(node.whenFalse, sf);
    // `isArabic ? 'عربي' : 'English'` is an inline pair of translations, not an untranslated string.
    if (whenTrue.some(f => arabic.test(f.text)) || whenFalse.some(f => arabic.test(f.text))) return [];
    return [...whenTrue, ...whenFalse];
  }
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node) ||
    ts.isSatisfiesExpression(node) || ts.isJsxExpression(node)) {
    return literalFragments(node.expression, sf);
  }
  return [];
}

function unwrap(node: ts.Expression): ts.Expression {
  return ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)
    ? unwrap(node.expression) : node;
}

/** Opt-out for a constant whose strings are stored ids that the screen maps through t() before showing. */
export const STORED_ID_MARKER = 'i18n-stored-ids';
function hasStoredIdMarker(node: ts.VariableDeclaration, sf: ts.SourceFile): boolean {
  const statement = node.parent.parent;
  const ranges = ts.getLeadingCommentRanges(sf.text, statement.getFullStart()) ?? [];
  return ranges.some(range => sf.text.slice(range.pos, range.end).includes(STORED_ID_MARKER));
}

function propName(name: ts.PropertyName | ts.JsxAttributeName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return null;
}

/**
 * - 'any': JSX text and copy props, where every literal letter is read by the user.
 * - 'copy': plain .ts results and copy keys. Codes and SQL live there too, so only text that looks like
 *   copy counts: several words, a capital first letter, or a word glued to a value (`' each'`).
 * - 'sentence': constants and default values, where a single capitalised word may be a key (`'Sun'`).
 */
type Mode = 'any' | 'copy' | 'sentence';
const sql = /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|PRAGMA|WITH)\s/;

function looksLikeCopy(text: string, mode: Mode): boolean {
  if (!letter.test(text) || sql.test(text)) return false;
  if (mode === 'any') return true;
  const trimmed = text.trim();
  const sentence = /\s/.test(trimmed) || trimmed !== text;
  return mode === 'sentence' ? sentence : sentence || /^[A-Z]/.test(trimmed);
}

/**
 * `{ code: 'db-error', message: '...' }` is a developer diagnostic that no screen renders (screens map the
 * failure to their own `t()` message), so a `message` next to a `code` is not copy.
 */
function isDiagnosticMessage(node: ts.PropertyAssignment, name: string): boolean {
  if (name !== 'message' || !ts.isObjectLiteralExpression(node.parent)) return false;
  return node.parent.properties.some(p => ts.isPropertyAssignment(p) && propName(p.name) === 'code');
}

export function scanSource(
  fileName: string, code: string, allowed: readonly string[], translationKeys: ReadonlySet<string> = new Set(),
): Hit[] {
  const isTsx = fileName.endsWith('.tsx');
  const sf = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true,
    isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const hits: Hit[] = [];
  const report = (pos: number, text: string, where: string) => {
    hits.push({ line: sf.getLineAndCharacterOfPosition(pos).line + 1, text: text.trim(), where });
  };
  const check = (fragments: Fragment[], where: string, mode: Mode) => {
    for (const fragment of fragments) {
      if (translationKeys.has(fragment.text)) continue;
      const rest = stripAllowed(fragment.text, allowed);
      if (looksLikeCopy(rest, mode)) report(fragment.pos, fragment.text, where);
    }
  };
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      const rest = stripAllowed(node.text, allowed);
      if (letter.test(rest)) report(node.getStart(sf), node.text, 'JSX text');
    } else if (ts.isJsxExpression(node) && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      check(literalFragments(node.expression, sf), 'JSX child', 'any');
    } else if (ts.isJsxAttribute(node)) {
      const name = propName(node.name);
      const init = node.initializer;
      if (name && COPY_PROPS.has(name) && init) check(literalFragments(init, sf), '<' + name + '>', 'any');
    } else if (ts.isPropertyAssignment(node)) {
      const name = propName(node.name);
      if (name && COPY_KEYS.has(name) && !isDiagnosticMessage(node, name)) {
        check(literalFragments(node.initializer, sf), name + ':', isTsx ? 'any' : 'copy');
      }
    } else if (ts.isVariableDeclaration(node) && node.initializer && !hasStoredIdMarker(node, sf)) {
      const init = unwrap(node.initializer);
      const values = ts.isArrayLiteralExpression(init) ? init.elements : [init];
      check(values.flatMap(value => literalFragments(value, sf)), 'const', 'sentence');
    } else if (ts.isParameter(node) && node.initializer) {
      check(literalFragments(node.initializer, sf), 'default value', 'sentence');
    } else if (!isTsx && ts.isReturnStatement(node)) {
      check(literalFragments(node.expression, sf), 'return', 'copy');
    } else if (!isTsx && ts.isArrowFunction(node) && !ts.isBlock(node.body)) {
      check(literalFragments(node.body, sf), 'arrow result', 'copy');
    } else if (!isTsx && ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      (ts.isPropertyAccessExpression(node.left) || ts.isElementAccessExpression(node.left)) &&
      !(ts.isPropertyAccessExpression(node.left) && node.left.name.text === 'name')) {
      check(literalFragments(node.right, sf), 'assignment', 'copy');
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return hits;
}
