import { ar } from '../ar';
import { pluralForm, translate, type TranslationKey } from '..';

/**
 * Arabic count nouns change with the number. A placeholder sitting in front of one
 * fixed noun (`{count} يوم`) is wrong for most counts, so that shape is only allowed
 * on a plural-form key (`.zero` … `.other`) chosen with pluralForm().
 * Unit labels (غ، مل، كغ، سم، %، سعرة) are not count nouns.
 */

const COUNT_NOUNS = [
  'يومين', 'يومان', 'يومًا', 'يوما', 'أيام', 'يوم',
  'أسبوعين', 'أسبوعان', 'أسبوعًا', 'أسابيع', 'أسبوع',
  'شهرين', 'شهران', 'شهرًا', 'شهور', 'أشهر', 'شهر',
  'ساعتين', 'ساعتان', 'ساعةً', 'ساعات', 'ساعة',
  'دقيقتين', 'دقيقتان', 'دقيقةً', 'دقائق', 'دقيقة',
  'ثانيتين', 'ثانيتان', 'ثانيةً', 'ثواني', 'ثوان', 'ثانية',
  'تمرينين', 'تمرينان', 'تمرينًا', 'تمارين', 'تمرين',
  'مجموعتين', 'مجموعتان', 'مجموعةً', 'مجموعات', 'مجموعة',
  'جلستين', 'جلستان', 'جلسةً', 'جلسات', 'جلسة',
  'تكرارين', 'تكراران', 'تكرارًا', 'تكرارات', 'تكرار',
  'طلبين', 'طلبان', 'طلبًا', 'طلبات', 'طلب',
  'صنفين', 'صنفان', 'صنفًا', 'أصناف', 'صنف',
  'قياسين', 'قياسان', 'قياسًا', 'قياسات', 'قياس',
  'سجلين', 'سجلان', 'سجلًا', 'سجلات', 'سجل',
  'طعامين', 'طعامان', 'طعامًا', 'أطعمة', 'طعام',
].sort((a, b) => b.length - a.length);

const PLURAL_KEY = /\.(zero|one|two|few|many|other)$/;

/** `{placeholder}` then a count noun, on a key that is not already a plural form. */
export function countNounViolations(catalog: Record<string, string>): string[] {
  const violations: string[] = [];
  for (const [key, value] of Object.entries(catalog)) {
    if (typeof value !== 'string' || PLURAL_KEY.test(key)) continue;
    const holes = /\{[A-Za-z0-9_]+\}[\s\u00A0]*/g;
    let hole: RegExpExecArray | null;
    while ((hole = holes.exec(value))) {
      const rest = value.slice(hole.index + hole[0].length);
      const noun = COUNT_NOUNS.find(candidate =>
        rest.startsWith(candidate) && !/[\u0621-\u064A]/.test(rest[candidate.length] ?? ''));
      if (noun) violations.push(`${key}: "{${hole[0].slice(1, hole[0].indexOf('}'))}}" + ${noun}`);
    }
  }
  return violations;
}

/** Accusative يومًا written without tanwin fath. The dual يومان is not this typo. */
export function missingTanweenViolations(catalog: Record<string, string>): string[] {
  return Object.entries(catalog)
    .filter(([, value]) => typeof value === 'string' && /يوما(?!ن)/.test(value))
    .map(([key]) => key);
}

describe('Arabic number agreement', () => {
  test('no fixed count noun follows a placeholder outside a plural-form key', () => {
    expect(countNounViolations(ar)).toEqual([]);
  });

  test('يوما is written يومًا', () => {
    expect(missingTanweenViolations(ar)).toEqual([]);
    expect(ar['adaptive.count.needLoggedDays.two']).toContain('يومًا');
    expect(ar['adaptive.count.needWeighIns.two']).toContain('يومًا');
  });

  test('fixed 11–99 counts use the singular accusative', () => {
    expect(ar['hikuK.timeoutHint']).toContain('45 ثانيةً');
    expect(ar['hikuK.error_timeout']).toContain('45 ثانيةً');
    expect(ar['active.30seconds']).toContain('30 ثانيةً');
    expect(ar['p4.strength.13']).toContain('72 ساعةً');
    expect(ar['recovery.recentSubtitle']).toContain('72 ساعةً');
    expect(ar['recovery.recentDesc']).toContain('24 ساعةً');
    expect(ar['recovery.recentDesc']).toContain('72 ساعةً');
  });

  test('each guard fails on a planted bad example', () => {
    expect(countNounViolations({ 'planted.days': 'آخر {count} يوم' })).toEqual([
      'planted.days: "{count}" + يوم',
    ]);
    expect(missingTanweenViolations({ 'planted.tanween': 'بعد 14 يوما' })).toEqual(['planted.tanween']);
  });

  test('plural-form keys, the dual, tanween, and unit labels are not false hits', () => {
    expect(countNounViolations({
      'count.days.few': '{count} أيام',
      'count.days.many': '{count} يومًا',
      'energy.left': 'متبقٍ {remaining}\u00A0سعرة',
      'grams': '{count}\u00A0غ',
      'daily': 'الهدف {count} سعرة يوميًا',
    })).toEqual([]);
    expect(missingTanweenViolations({
      'dual': '{count} يومان',
      'accusative': '{count} يومًا',
    })).toEqual([]);
  });

  test('English keeps working through the same plural keys', () => {
    expect(translate('en', 'eatI.items.one', { count: 1 })).toBe('1 item');
    expect(translate('en', 'eatI.items.other', { count: 5 })).toBe('5 items');
    expect(translate('en', 'recovery.sets.one', { count: 1 })).toBe('1 set');
    expect(translate('en', 'recovery.sets.other', { count: 5.5 })).toBe('5.5 sets');
    expect(translate('en', 'healthOverview.minutesAgo.many', { count: 30 })).toBe('30 min ago');
    for (const count of [0, 1, 2, 4, 14, 100]) {
      const key = `eatI.items.${pluralForm('en', count)}` as TranslationKey;
      expect(translate('en', key, { count })).toContain(String(count));
      expect(translate('ar', `eatI.items.${pluralForm('ar', count)}` as TranslationKey, { count })).toContain(String(count));
    }
    expect(translate('ar', 'eatI.items.two', { count: 2 })).toContain('صنفان');
    expect(translate('ar', 'eatI.items.many', { count: 14 })).toContain('صنفًا');
    expect(translate('ar', 'eatI.items.few', { count: 3 })).toContain('أصناف');
    expect(translate('ar', 'train.setsLogged.two', { count: 2 })).toContain('مجموعتان');
    expect(translate('ar', 'sessionDetail.minute.many', { count: 11 })).toContain('دقيقةً');
  });
});
