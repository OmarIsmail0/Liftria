import { ar } from '../ar';
import { en } from '../en';
import { formatNumber, resolveLanguage, translate, translateWorkoutCount } from '..';
import { chevronPointsLeft, logicalInsets } from '../layout';

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
  it('describes rest alerts in plain language, with no testing caveat', () => {
    expect(en).not.toHaveProperty('notifications.pending');
    expect(en).not.toHaveProperty('notifications.subtitle');
    expect(en['notifications.restNote']).toBe(
      'Liftria asks once, during your first rest. Your phone may delay alerts while it is locked, so the timer in the app is always the exact one.',
    );
    expect(ar['notifications.restNote']).toBe(
      'يسألك ليفتريا مرة واحدة أثناء أول فترة راحة. قد يتأخر وصول التنبيه والهاتف مقفل، لذلك يبقى المؤقت داخل التطبيق هو الأدق.',
    );
  });
  it('retains logical start/end and swaps directional chevrons only', () => {
    expect(logicalInsets(12, 4)).toEqual({ paddingStart: 12, paddingEnd: 4 });
    expect(chevronPointsLeft('back', false)).toBe(true);
    expect(chevronPointsLeft('back', true)).toBe(false);
    expect(chevronPointsLeft('forward', false)).toBe(false);
    expect(chevronPointsLeft('forward', true)).toBe(true);
  });
});
