import * as ts from 'typescript';

/**
 * Accessibility source guard. Props span lines, so the rules read the TypeScript JSX tree
 * (JsxElement / JsxSelfClosingElement and their JsxAttributes), never a regular expression.
 *
 * Scans app/ and src/features/ screens (.tsx). Developer routes and tests are out of scope.
 * Shared primitives in src/design/ label themselves and are not scanned.
 */

type DirEntry = { name: string; isDirectory: () => boolean; isFile: () => boolean };
const { readdirSync, readFileSync } = jest.requireActual('fs') as {
  readdirSync: (dir: string, options: { withFileTypes: true }) => DirEntry[];
  readFileSync: (file: string, encoding: 'utf8') => string;
};
const { join, relative } = jest.requireActual('path') as {
  join: (...parts: string[]) => string;
  relative: (from: string, to: string) => string;
};

export interface AccessibilityViolation {
  line: number;
  tag: string;
  reason: string;
}

const PRESSABLES = new Set(['Pressable', 'TouchableOpacity', 'TouchableHighlight']);

function parse(fileName: string, code: string): ts.SourceFile {
  return ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function tagOf(node: ts.JsxElement | ts.JsxSelfClosingElement): string | null {
  const name = ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName;
  return ts.isIdentifier(name) ? name.text : null;
}

function attributesOf(node: ts.JsxElement | ts.JsxSelfClosingElement): readonly ts.JsxAttributeLike[] {
  return (ts.isJsxElement(node) ? node.openingElement.attributes : node.attributes).properties;
}

function findAttribute(node: ts.JsxElement | ts.JsxSelfClosingElement, name: string): ts.JsxAttribute | undefined {
  let found: ts.JsxAttribute | undefined;
  for (const attr of attributesOf(node)) {
    if (ts.isJsxAttribute(attr) && ts.isIdentifier(attr.name) && attr.name.text === name) found = attr;
  }
  return found;
}

function unwrap(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isParenthesizedExpression(current) || ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) || ts.isNonNullExpression(current) ||
    ts.isTypeAssertionExpression(current)) {
    current = current.expression;
  }
  return current;
}

function isEmptyToken(node: ts.Expression): boolean {
  if (node.kind === ts.SyntaxKind.NullKeyword || node.kind === ts.SyntaxKind.FalseKeyword) return true;
  return ts.isIdentifier(node) && (node.text === 'undefined' || node.text === 'null');
}

/** A prop value that is present and not a literal empty string, null, undefined or false. */
function hasMeaningfulValue(attr: ts.JsxAttribute | undefined): boolean {
  if (!attr?.initializer) return false;
  if (ts.isStringLiteral(attr.initializer)) return attr.initializer.text.trim().length > 0;
  if (!ts.isJsxExpression(attr.initializer) || !attr.initializer.expression) return false;
  return expressionHasValue(attr.initializer.expression);
}

function expressionHasValue(expression: ts.Expression): boolean {
  const node = unwrap(expression);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text.trim().length > 0;
  if (isEmptyToken(node) || node.kind === ts.SyntaxKind.TrueKeyword) return false;
  if (ts.isTemplateExpression(node)) {
    if (node.head.text.trim().length > 0) return true;
    return node.templateSpans.some(span => span.literal.text.trim().length > 0 || expressionHasValue(span.expression));
  }
  if (ts.isConditionalExpression(node)) return expressionHasValue(node.whenTrue) || expressionHasValue(node.whenFalse);
  if (ts.isBinaryExpression(node)) {
    const op = node.operatorToken.kind;
    if (op === ts.SyntaxKind.AmpersandAmpersandToken) return expressionHasValue(node.right);
    if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken || op === ts.SyntaxKind.PlusToken) {
      return expressionHasValue(node.left) || expressionHasValue(node.right);
    }
  }
  return true;
}

function isLiteralFalse(attr: ts.JsxAttribute | undefined): boolean {
  if (!attr?.initializer || !ts.isJsxExpression(attr.initializer) || !attr.initializer.expression) return false;
  return unwrap(attr.initializer.expression).kind === ts.SyntaxKind.FalseKeyword;
}

function isTextTag(name: string | null): boolean {
  return name === 'Text' || name === 'Typography';
}

/** Text a person can see or a screen reader can speak: not whitespace, not null/false. */
function expressionYieldsText(expression: ts.Expression): boolean {
  const node = unwrap(expression);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text.trim().length > 0;
  if (ts.isNumericLiteral(node)) return true;
  if (isEmptyToken(node) || node.kind === ts.SyntaxKind.TrueKeyword) return false;
  if (ts.isTemplateExpression(node)) {
    if (node.head.text.trim().length > 0) return true;
    return node.templateSpans.some(span => span.literal.text.trim().length > 0 || expressionYieldsText(span.expression));
  }
  if (ts.isConditionalExpression(node)) return expressionYieldsText(node.whenTrue) || expressionYieldsText(node.whenFalse);
  if (ts.isBinaryExpression(node)) {
    const op = node.operatorToken.kind;
    if (op === ts.SyntaxKind.AmpersandAmpersandToken) return expressionYieldsText(node.right);
    if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken || op === ts.SyntaxKind.PlusToken) {
      return expressionYieldsText(node.left) || expressionYieldsText(node.right);
    }
  }
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) return isTextTag(tagOf(node)) && elementHasVisibleText(node);
  if (ts.isJsxFragment(node)) return elementHasVisibleText(node);
  if (ts.isIdentifier(node) || ts.isCallExpression(node) || ts.isPropertyAccessExpression(node) ||
    ts.isElementAccessExpression(node) || ts.isTaggedTemplateExpression(node)) return true;
  return false;
}

function elementHasVisibleText(node: ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment): boolean {
  if (ts.isJsxSelfClosingElement(node)) return false;
  return node.children.some(child => {
    if (ts.isJsxText(child)) return child.text.trim().length > 0;
    if (ts.isJsxExpression(child)) return Boolean(child.expression && expressionYieldsText(child.expression));
    if (ts.isJsxFragment(child)) return elementHasVisibleText(child);
    if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
      return isTextTag(tagOf(child)) && elementHasVisibleText(child);
    }
    return false;
  });
}

/**
 * A direct child is Text or Typography itself (or a fragment / conditional / && that renders one).
 * Text nested in a View does not name the control. A Pressable render-prop is not a Text child.
 */
function expressionIsDirectText(expression: ts.Expression): boolean {
  const node = unwrap(expression);
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) return isTextTag(tagOf(node)) && elementHasVisibleText(node);
  if (ts.isJsxFragment(node)) return node.children.some(childIsDirectText);
  if (ts.isConditionalExpression(node)) return expressionIsDirectText(node.whenTrue) || expressionIsDirectText(node.whenFalse);
  if (ts.isBinaryExpression(node)) {
    const op = node.operatorToken.kind;
    if (op === ts.SyntaxKind.AmpersandAmpersandToken) return expressionIsDirectText(node.right);
    if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken) {
      return expressionIsDirectText(node.left) || expressionIsDirectText(node.right);
    }
  }
  return false;
}

function childIsDirectText(child: ts.JsxChild): boolean {
  if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) return isTextTag(tagOf(child)) && elementHasVisibleText(child);
  if (ts.isJsxFragment(child)) return child.children.some(childIsDirectText);
  if (ts.isJsxExpression(child) && child.expression) return expressionIsDirectText(child.expression);
  return false;
}

function hasDirectTextChild(node: ts.JsxElement | ts.JsxSelfClosingElement): boolean {
  if (ts.isJsxSelfClosingElement(node)) return false;
  return node.children.some(childIsDirectText);
}

function checkElement(node: ts.JsxElement | ts.JsxSelfClosingElement, sf: ts.SourceFile, found: AccessibilityViolation[]): void {
  const tag = tagOf(node);
  if (!tag) return;
  const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
  if (PRESSABLES.has(tag)) {
    if (!hasMeaningfulValue(findAttribute(node, 'accessibilityRole'))) {
      found.push({ line, tag, reason: tag + ' is missing accessibilityRole' });
    }
    if (!hasMeaningfulValue(findAttribute(node, 'accessibilityLabel')) && !hasDirectTextChild(node)) {
      found.push({
        line, tag,
        reason: tag + ' has no accessibilityLabel and no direct Text or Typography child with visible text',
      });
    }
    return;
  }
  if (tag === 'Image') {
    if (!hasMeaningfulValue(findAttribute(node, 'accessibilityLabel')) && !isLiteralFalse(findAttribute(node, 'accessible'))) {
      found.push({ line, tag, reason: 'Image has neither an accessibilityLabel nor accessible={false}' });
    }
    return;
  }
  if (tag === 'TextInput' && !hasMeaningfulValue(findAttribute(node, 'accessibilityLabel'))) {
    found.push({ line, tag, reason: 'TextInput is missing accessibilityLabel' });
  }
}

/** Violations in one TSX source. `fileName` is only the parse name; it does not read the disk. */
export function findAccessibilityViolations(fileName: string, code: string): AccessibilityViolation[] {
  const sf = parse(fileName, code);
  const found: AccessibilityViolation[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) checkElement(node, sf, found);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === '__tests__') return [];
    const file = join(dir, entry.name);
    if (entry.isDirectory()) return walk(file);
    return entry.isFile() && entry.name.endsWith('.tsx') ? [file] : [];
  });
}

function repoPath(file: string): string {
  return relative(process.cwd(), file).split('\\').join('/');
}

/** app/ and src/features/ screens, without developer routes or tests. */
function scannedScreens(): { name: string; code: string }[] {
  const root = process.cwd();
  return [join(root, 'app'), join(root, 'src', 'features')].flatMap(walk)
    .map(file => ({ name: repoPath(file), file }))
    .filter(entry => !entry.name.startsWith('app/dev/'))
    .map(entry => ({ name: entry.name, code: readFileSync(entry.file, 'utf8') }));
}

const screens = scannedScreens();

function reasons(code: string): string[] {
  return findAccessibilityViolations('sample.tsx', code).map(hit => hit.reason);
}

describe('accessibility scanner on planted code', () => {
  it('fails a Pressable with no role and no name, and passes one with both', () => {
    const bad = `
      const note = "accessibilityRole=\\"button\\" accessibilityLabel={t('save')}";
      export const view = <Pressable onPress={go}><Icon /></Pressable>;
    `;
    expect(reasons(bad)).toEqual([
      'Pressable is missing accessibilityRole',
      'Pressable has no accessibilityLabel and no direct Text or Typography child with visible text',
    ]);
    const good = `
      export const view = (
        <Pressable
          onPress={go}
          accessibilityRole="button"
          accessibilityLabel={t('common.save')}
        >
          <Icon />
        </Pressable>
      );
    `;
    expect(reasons(good)).toEqual([]);
  });

  it('fails TouchableOpacity and TouchableHighlight the same way', () => {
    expect(reasons('export const a = <TouchableOpacity onPress={go}><Icon /></TouchableOpacity>;')).toEqual([
      'TouchableOpacity is missing accessibilityRole',
      'TouchableOpacity has no accessibilityLabel and no direct Text or Typography child with visible text',
    ]);
    expect(reasons('export const b = <TouchableHighlight onPress={go}><Icon /></TouchableHighlight>;')).toEqual([
      'TouchableHighlight is missing accessibilityRole',
      'TouchableHighlight has no accessibilityLabel and no direct Text or Typography child with visible text',
    ]);
    expect(reasons(`
      export const c = <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={go} />;
      export const d = <TouchableHighlight accessibilityRole="button"><Text>Save</Text></TouchableHighlight>;
    `)).toEqual([]);
  });

  it('accepts a direct Text or Typography child and rejects text nested in a View', () => {
    expect(reasons(`
      export const a = (
        <Pressable accessibilityRole="checkbox" onPress={toggle}>
          <Typography>{checked ? '☑' : '□'} {t('custom.unilateral')}</Typography>
        </Pressable>
      );
    `)).toEqual([]);
    expect(reasons(`
      export const b = (
        <Pressable accessibilityRole="button" onPress={go}>
          <Text>{title}</Text>
        </Pressable>
      );
    `)).toEqual([]);
    expect(reasons(`
      export const c = (
        <Pressable
          accessibilityRole="button"
          onPress={go}
        >
          <View>
            <Text>Save</Text>
            <Typography>{title}</Typography>
          </View>
        </Pressable>
      );
    `)).toEqual([
      'Pressable has no accessibilityLabel and no direct Text or Typography child with visible text',
    ]);
  });

  it('does not treat a comment, whitespace or a render prop as the accessible name', () => {
    const commented = `
      export const view = (
        <Pressable
          // accessibilityRole="button"
          // accessibilityLabel="Save"
          onPress={go}
        >
          <Text> </Text>
          {({ pressed }) => <Text>Save</Text>}
        </Pressable>
      );
    `;
    expect(reasons(commented)).toEqual([
      'Pressable is missing accessibilityRole',
      'Pressable has no accessibilityLabel and no direct Text or Typography child with visible text',
    ]);
    const hits = findAccessibilityViolations('sample.tsx', commented);
    expect(hits[0]?.line).toBe(3);
  });

  it('fails a bare Image and passes a label or accessible={false}, including across lines', () => {
    expect(reasons(`
      const decoy = "accessibilityLabel accessible={false}";
      export const photo = <Image source={src} />;
    `)).toEqual(['Image has neither an accessibilityLabel nor accessible={false}']);
    expect(reasons(`
      export const hidden = <Image source={src} accessible={true} />;
      export const named = <Image source={src} accessible={hidden} />;
      export const stringFalse = <Image source={src} accessible={"false"} />;
    `)).toEqual([
      'Image has neither an accessibilityLabel nor accessible={false}',
      'Image has neither an accessibilityLabel nor accessible={false}',
      'Image has neither an accessibilityLabel nor accessible={false}',
    ]);
    expect(reasons(`
      export const a = (
        <Image
          source={src}
          accessibilityLabel={t('hikuPhoto.exactImage')}
        />
      );
      export const b = (
        <Image
          source={src}
          accessible={
            false
          }
        />
      );
      export const c = <Image source={src} accessible={false as const} />;
    `)).toEqual([]);
  });

  it('fails a TextInput whose only name is a placeholder, and passes a real label', () => {
    expect(reasons(`
      export const field = (
        <TextInput
          value={name}
          placeholder="Exercise name"
          placeholderTextColor={color}
        />
      );
    `)).toEqual(['TextInput is missing accessibilityLabel']);
    expect(reasons(`
      export const field = (
        <TextInput
          value={name}
          placeholder={t('custom.name')}
          accessibilityLabel={
            t('custom.name')
          }
        />
      );
    `)).toEqual([]);
    expect(reasons('export const field = <TextInput accessibilityLabel="" placeholder="Name" />;')).toEqual([
      'TextInput is missing accessibilityLabel',
    ]);
  });

  it('ignores other elements, and reports the opening line of a multiline control', () => {
    expect(reasons(`
      export const view = <View><Button label={t('common.save')} /><Text>Hello</Text></View>;
    `)).toEqual([]);
    const [hit] = findAccessibilityViolations('sample.tsx', `
      export const view = (
        <Image
          source={src}
        />
      );
    `);
    expect(hit?.line).toBe(3);
    expect(hit?.tag).toBe('Image');
  });
});

describe('accessibility of screens', () => {
  const names = screens.map(screen => screen.name);

  it('reads app and feature screens, and skips dev routes, tests and the design system', () => {
    expect(names).toContain('app/(tabs)/today.tsx');
    expect(names).toContain('app/(tabs)/train/library.tsx');
    expect(names).toContain('app/(tabs)/progress/health.tsx');
    expect(names).toContain('src/features/train/WorkoutMiniBar.tsx');
    expect(names).toContain('src/features/train/GymStepper.tsx');
    expect(names).toContain('src/features/health/HealthCharts.tsx');
    expect(names.some(name => name.startsWith('app/dev/'))).toBe(false);
    expect(names.some(name => name.split('/').includes('__tests__'))).toBe(false);
    expect(names.some(name => name.startsWith('src/design/'))).toBe(false);
    expect(names.every(name => name.endsWith('.tsx'))).toBe(true);
    expect(names.length).toBeGreaterThan(10);
  });

  it('finds no pressable, image or text field that a screen reader cannot name', () => {
    const hits = screens.flatMap(screen =>
      findAccessibilityViolations(screen.name, screen.code).map(hit =>
        screen.name + ':' + hit.line + ' ' + hit.reason));
    expect(hits).toEqual([]);
  });
});
