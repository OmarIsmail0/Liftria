import { lineOf, maskNonCode } from './maskNonCode';

describe('maskNonCode', () => {
  it('keeps length and line breaks so reported lines match the source', () => {
    const code = "const a = 'x';\n// note\n/* two\nlines */\nconst b = `t\nu`;\n";
    const masked = maskNonCode(code);
    expect(masked).toHaveLength(code.length);
    expect(masked.split('\n')).toHaveLength(code.split('\n').length);
    expect(lineOf(code, code.indexOf('const b'))).toBe(5);
  });

  it('blanks comments, quoted text and template text but keeps code', () => {
    expect(maskNonCode("go('abc'); // tail")).toBe("go('   '); " + ' '.repeat('// tail'.length));
  });

  it('keeps string text on request and still masks comments and regular expressions', () => {
    const masked = maskNonCode("a('keep'); // gone\nb(/gone/);", { keepStrings: true });
    expect(masked).toContain("'keep'");
    expect(masked).not.toContain('gone');
  });

  it('treats a template expression as code and the text around it as text', () => {
    const masked = maskNonCode('`text ${value.value} more ${a + `inner ${b}`}`');
    expect(masked).toContain('value.value');
    expect(masked).toContain('a + ');
    expect(masked).not.toContain('text');
    expect(masked).not.toContain('inner');
    expect(masked).toContain('${b}');
  });

  it('does not mistake JSX closing tags or division for a regular expression', () => {
    expect(maskNonCode('<A>{x}</A><B>{Intl.Other}</B>')).toContain('Intl.Other');
    expect(maskNonCode('const r = a / b; const s = c.value / 2; use(Intl.X);')).toContain('use(Intl.X)');
  });

  it('masks regular expressions, including quotes and slashes inside a class', () => {
    const masked = maskNonCode('const r = /["\'/]Intl\\.X/g; run(Intl.Y);');
    expect(masked).not.toContain('Intl\\.X');
    expect(masked).toContain('run(Intl.Y)');
    expect(maskNonCode('x => /Intl.X/.test(x)')).not.toContain('Intl.X');
  });

  it('ends an unclosed quote at the line break', () => {
    const masked = maskNonCode("<Text>don't</Text>\nnew Intl.PluralRules();");
    expect(masked).toContain('new Intl.PluralRules()');
  });
});
