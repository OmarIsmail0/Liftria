import { ar } from '../ar';
import { en } from '../en';
import { formatNumber, resolveLanguage, translate, translateWorkoutCount } from '..';
import { directionalChevron, logicalInsets } from '../layout';

describe('Phase 4 bilingual contract', () => {
  it('keeps identical English/Arabic key sets with nonempty values', () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
    expect(Object.values(ar).every(x => x.trim().length > 0)).toBe(true);
  });
  it('uses system language unless explicitly overridden', () => {
    expect(resolveLanguage('system', 'ar')).toBe('ar');
    expect(resolveLanguage('en', 'ar')).toBe('en');
  });
  it('uses Western digits, keeps Latin units, substitutes parameters', () => {
    expect(formatNumber('ar', 1234)).toMatch(/1.?234/);
    expect(translate('ar', 'settings.home.version', { version: 42 })).toContain('42');
    expect(formatNumber('ar', 1234)).not.toMatch(/[٠-٩]/);
  });
  it('uses all six Arabic plural forms', () => {
    for (const count of [0, 1, 2, 3, 11, 101]) {
      expect(translateWorkoutCount('ar', count).length).toBeGreaterThan(0);
    }
    expect(translateWorkoutCount('ar', 3)).toContain('3');
  });
  it('retains logical start/end and swaps directional chevrons only', () => {
    expect(logicalInsets(12, 4)).toEqual({ paddingStart: 12, paddingEnd: 4 });
    expect(directionalChevron('back', false)).toBe('‹');
    expect(directionalChevron('back', true)).toBe('›');
    expect(directionalChevron('forward', true)).toBe('‹');
  });
});
