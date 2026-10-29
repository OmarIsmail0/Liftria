import { findSharedValueAssignments } from './sharedValueScanner';
import { readAppSources } from './sourceFiles';

describe('shared value scanner on planted code', () => {
  it.each([
    ['assignment', 'offset.value = 10;'],
    ['no spaces', 'offset.value=10;'],
    ['a value assigned from another value', 'progress.value = other.value;'],
    ['a nested value', 'state.scale.value = withSpring(1);'],
    ['a value on the next line', 'offset.value\n  = 10;'],
    ['addition', 'offset.value += 5;'],
    ['subtraction', 'offset.value -= 5;'],
    ['multiplication', 'offset.value *= 2;'],
    ['division', 'offset.value /= 2;'],
    ['remainder', 'offset.value %= 360;'],
    ['exponent', 'offset.value **= 2;'],
    ['bit shifts', 'offset.value <<= 1; offset.value >>= 1; offset.value >>>= 1;'],
    ['bitwise operators', 'flags.value &= 1; flags.value |= 2; flags.value ^= 4;'],
    ['logical assignment', 'a.value &&= 1; a.value ||= 2; a.value ??= 3;'],
    ['postfix increment', 'count.value++;'],
    ['postfix decrement', 'count.value--;'],
    ['prefix increment', '++count.value;'],
    ['prefix decrement of a nested value', '--state.count.value;'],
    ['an indexed target', 'items[i].value = 3;'],
    ['bracket access', "offset['value'] = 3;"],
    ['an assignment in an arrow body', 'const go = () => { offset.value = 1; };'],
    ['an assignment inside a worklet', "const style = useAnimatedStyle(() => { 'worklet'; width.value = 2; return {}; });"],
    ['an assignment inside a template expression', 'const t = `${(x.value = 3)}`;'],
    ['an assignment in JSX', '<Pressable onPress={() => { scale.value = 0.9; }} />'],
  ])('flags %s', (_name, code) => {
    expect(findSharedValueAssignments(code).length).toBeGreaterThan(0);
  });

  it('reports the line and source text of the write', () => {
    expect(findSharedValueAssignments('const a = 1;\n\n  offset.value = 10;\n')).toEqual([
      { line: 3, text: 'offset.value = 10;', reason: expect.stringContaining('.set()') },
    ]);
  });

  it('reports each line once and each write on its own line', () => {
    const found = findSharedValueAssignments('a.value = 1;\nb.value += 2;\nc.value++;');
    expect(found.map(v => v.line)).toEqual([1, 2, 3]);
  });

  it.each([
    ['reading a value', 'const x = offset.value;'],
    ['strict equality', 'if (offset.value === 1) go();'],
    ['loose equality', 'if (offset.value == 1) go();'],
    ['inequality', 'if (offset.value !== 1 && offset.value != 2) go();'],
    ['comparison', 'if (a.value >= 1 || a.value <= 2 || a.value > 3 || a.value < 4) go();'],
    ['arithmetic that is not assigned', 'const y = a.value + 1; const z = a.value - 1; const w = a.value * 2;'],
    ['a value used as an argument', 'withTiming(offset.value + 5);'],
    ['an arrow function after a value', 'rows.map(row => row.value).filter(v => v => 1);'],
    ['setting through .set()', 'offset.set(10); offset.set(offset.get() + 1);'],
    ['a longer property name', 'row.valueOf = 3; row.values = 4; row.value2 = 5; row.valueText += "a";'],
    ['a different property', 'row.values.value;'],
    ['a destructured name', 'const { value = 1 } = props;'],
    ['an object literal key', 'const x = { value: 1 };'],
    ['a declaration', 'let value = 1; value = 2; value += 1;'],
    ['a postfix operator on another property', 'count.total++; --count.total;'],
    ['an increment before a read', 'i++;\nconst v = x.value;'],
  ])('allows %s', (_name, code) => {
    expect(findSharedValueAssignments(code)).toEqual([]);
  });

  it('ignores writes mentioned in comments, strings, templates and regular expressions', () => {
    const code = [
      '// offset.value = 10 is rejected by the React Compiler lint',
      '/* count.value++ */',
      "const a = 'offset.value = 1';",
      'const b = "x.value += 1";',
      'const c = `use .set(), not offset.value = 1`;',
      'const d = /offset\\.value = 1/;',
    ].join('\n');
    expect(findSharedValueAssignments(code)).toEqual([]);
  });
});

describe('shared value rule over app/** and src/**', () => {
  it('assigns shared values only through .set()', () => {
    const violations = readAppSources().flatMap(file =>
      findSharedValueAssignments(file.code).map(v => `${file.path}:${v.line}: ${v.text}`));
    expect(violations).toEqual([]);
  });
});
