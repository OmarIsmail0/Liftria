import { formatDate, formatNumber, latinDigits } from '..';

describe('Western digits on every platform', () => {
  it('maps Arabic-Indic and extended digits and separators back to Western', () => {
    expect(latinDigits('٢٩ أكتوبر')).toBe('29 أكتوبر');
    expect(latinDigits('١٬٢٣٠')).toBe('1,230');
    expect(latinDigits('٣٫٥')).toBe('3.5');
    expect(latinDigits('۰۹')).toBe('09');
    expect(latinDigits('Thu, Oct 29')).toBe('Thu, Oct 29');
  });
  it('formats Arabic numbers and dates without Arabic-Indic digits', () => {
    expect(formatNumber('ar', 1230)).not.toMatch(/[٠-٩۰-۹]/);
    expect(formatDate('ar', new Date(Date.UTC(2026, 9, 29, 12)), { day: 'numeric', month: 'short', timeZone: 'UTC' }))
      .toMatch(/29/);
  });
});
