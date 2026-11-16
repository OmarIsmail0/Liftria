import { formatEditableNumber, parseEditableNumber } from '../editableNumber';

describe('formatEditableNumber', () => {
  it('drops the float noise a stored or computed value carries', () => {
    expect(formatEditableNumber(23.112000000000002, 'grams')).toBe('23.1');
    expect(formatEditableNumber(0.1 + 0.2, 'grams')).toBe('0.3');
    expect(formatEditableNumber(240.058, 'kcal')).toBe('240');
    expect(formatEditableNumber(2203.9999999999995, 'kcal')).toBe('2204');
  });

  it('rounds calories and counts to whole numbers', () => {
    expect(formatEditableNumber(1812.4, 'kcal')).toBe('1812');
    expect(formatEditableNumber(1812.6, 'kcal')).toBe('1813');
    expect(formatEditableNumber(1999.5, 'count')).toBe('2000');
  });

  it('keeps grams, kilograms, pounds, lengths and effort to one decimal', () => {
    expect(formatEditableNumber(112.46, 'grams')).toBe('112.5');
    expect(formatEditableNumber(80.34999999999999, 'weight')).toBe('80.3');
    expect(formatEditableNumber(176.8912, 'length')).toBe('176.9');
    expect(formatEditableNumber(7.5, 'effort')).toBe('7.5');
  });

  it('keeps a workout load plate-exact, without the stored unit conversion noise', () => {
    expect(formatEditableNumber(46.25, 'load')).toBe('46.25');
    expect(formatEditableNumber(1.25, 'load')).toBe('1.25');
    expect(formatEditableNumber(45.35924, 'load')).toBe('45.36');
  });

  it('leaves whole values whole, with no trailing zeros', () => {
    expect(formatEditableNumber(1800, 'kcal')).toBe('1800');
    expect(formatEditableNumber(80, 'weight')).toBe('80');
    expect(formatEditableNumber(100, 'grams')).toBe('100');
    expect(formatEditableNumber(80.1, 'weight')).toBe('80.1');
    expect(formatEditableNumber(0, 'kcal')).toBe('0');
  });

  it('leaves a field with no value empty, never 0', () => {
    expect(formatEditableNumber(null, 'grams')).toBe('');
    expect(formatEditableNumber(undefined, 'grams')).toBe('');
    expect(formatEditableNumber(null, 'kcal')).toBe('');
    expect(formatEditableNumber(null, 'effort')).toBe('');
  });

  it('leaves an unusable number empty rather than printing NaN', () => {
    expect(formatEditableNumber(Number.NaN, 'kcal')).toBe('');
    expect(formatEditableNumber(Number.POSITIVE_INFINITY, 'weight')).toBe('');
    expect(formatEditableNumber(Number.NEGATIVE_INFINITY, 'weight')).toBe('');
  });

  it('keeps a negative value visible, with its sign, so it can be corrected', () => {
    expect(formatEditableNumber(-3.26, 'weight')).toBe('-3.3');
    expect(formatEditableNumber(-240.058, 'kcal')).toBe('-240');
    expect(formatEditableNumber(-0.04, 'grams')).toBe('0');
  });
});

describe('parseEditableNumber', () => {
  it('reads a blank field as no value, never 0', () => {
    expect(parseEditableNumber('')).toBeNull();
    expect(parseEditableNumber('   ')).toBeNull();
  });

  it('reads Western, Arabic-Indic and Persian digits as the same value', () => {
    expect(parseEditableNumber('72.5')).toBe(72.5);
    expect(parseEditableNumber('٧٢٫٥')).toBe(72.5);
    expect(parseEditableNumber('۷۲٫۵')).toBe(72.5);
    expect(parseEditableNumber('٧٢.٥')).toBe(72.5);
    expect(parseEditableNumber('72,5')).toBe(72.5);
    expect(parseEditableNumber(' ١٢ ')).toBe(12);
    expect(parseEditableNumber('12.')).toBe(12);
    expect(parseEditableNumber('.5')).toBe(0.5);
    expect(parseEditableNumber('0')).toBe(0);
  });

  it('refuses anything that is not a plain number instead of guessing', () => {
    for (const text of ['-5', '+5', '1e3', '0x10', 'Infinity', 'NaN', 'abc', '1.2.3', '1,2.3', '1 000', '.', '٫', '5kg']) {
      expect(parseEditableNumber(text)).toBeNaN();
    }
  });

  it('round-trips every value formatEditableNumber puts in a field', () => {
    for (const [value, kind] of [[46.25, 'load'], [80.3, 'weight'], [1812, 'kcal'], [112.5, 'grams']] as const) {
      expect(parseEditableNumber(formatEditableNumber(value, kind))).toBe(value);
    }
  });
});
