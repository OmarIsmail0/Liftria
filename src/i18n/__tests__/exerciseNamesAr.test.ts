import rawPack from '../../../assets/data/exercises/free-exercise-db.json';
import { EXERCISE_NAMES_AR } from '../exerciseNamesAr';
import { exerciseName, normalizeArabicSearch } from '../exerciseNames';
import { bundledExercises, searchExercises } from '../../services/database/exerciseLibrary';
import type { Exercise } from '../../services/database/gymTypes';

const pack = rawPack as { id: string; name: string }[];
const englishById = new Map(pack.map(item => [item.id, item.name]));

// Latin letters allowed only as real tokens (the EZ bar, the V handle).
const ALLOWED_LATIN = /\b(EZ|V)\b/g;
function coverage(names: Record<string, string>, ids: string[]) {
  return { missing: ids.filter(id => !(id in names)), extra: Object.keys(names).filter(id => !ids.includes(id)) };
}
function latinNames(names: Record<string, string>): string[] {
  return Object.entries(names).filter(([, name]) => /[A-Za-z]/.test(name.replace(ALLOWED_LATIN, ''))).map(([id]) => id);
}
function emptyNames(names: Record<string, string>): string[] {
  return Object.entries(names).filter(([, name]) => name.trim() === '').map(([id]) => id);
}
function duplicateNames(names: Record<string, string>): string[] {
  const seen = new Map<string, string>();
  const dups: string[] = [];
  for (const [id, name] of Object.entries(names)) {
    if (seen.has(name)) dups.push(`${seen.get(name)} / ${id}`); else seen.set(name, id);
  }
  return dups;
}
/** One Arabic term per concept: an English name with the term must have its Arabic term. */
const GLOSSARY: [RegExp, string, RegExp?][] = [
  [/Bench Press/, 'بنش برس'], [/Deadlift/, 'ديدليفت'], [/Squat/, 'سكوات'],
  [/Curl/, 'كيرل', /Leg Curl|Lower Back Curl|Hamstring Curl/], [/Leg Curl/, 'رجل خلفي'],
  [/Leg Extension/, 'رجل أمامي'], [/Lunge/, 'لانج'], [/Stretch/, 'إطالة'], [/-SMR/, 'تدليك'],
  [/Shrug/, 'ترابيس'], [/Crunch/, 'كرانش'], [/Pullover/, 'بول أوفر'], [/Kickback/, 'كيك باك'],
  [/Dumbbell/, 'دمبل'], [/Kettlebell/, 'كيتل بيل'], [/Smith/, 'السميث'], [/Barbell/, 'بالبار'],
  [/Pull-?[Uu]ps?\b|Pullups/, 'عقلة'], [/Push-?[Uu]ps?\b|Pushups?/, 'ضغط'], [/Snatch/, 'سناتش'],
  [/Clean/, 'كلين'], [/Jerk/, 'جيرك'], [/Calf Raise/, 'رفع سمانة'], [/Good Morning/, 'جود مورنينج'],
  [/Incline/, 'مائل'], [/Decline/, 'مائل لأسفل'], [/Chains/, 'بالسلاسل'], [/Hammer/, 'هامر'],
  [/Preacher/, 'بريتشر'], [/Close-Grip/, 'قبضة ضيقة'],
];
function glossaryViolations(names: Record<string, string>, english: Map<string, string>): string[] {
  const out: string[] = [];
  for (const [id, arabic] of Object.entries(names)) {
    const name = english.get(id) ?? '';
    for (const [pattern, term, except] of GLOSSARY) {
      if (pattern.test(name) && !(except && except.test(name)) && !arabic.includes(term)) out.push(`${name} → ${arabic} (needs ${term})`);
    }
  }
  return out;
}

describe('Arabic exercise names: guards', () => {
  it('cover every pack id, and only pack ids', () => {
    expect(coverage(EXERCISE_NAMES_AR, pack.map(item => item.id))).toEqual({ missing: [], extra: [] });
  });
  it('have no empty names, no Latin letters and no duplicates', () => {
    expect(emptyNames(EXERCISE_NAMES_AR)).toEqual([]);
    expect(latinNames(EXERCISE_NAMES_AR)).toEqual([]);
    expect(duplicateNames(EXERCISE_NAMES_AR)).toEqual([]);
  });
  it('use the glossary terms consistently', () => {
    expect(glossaryViolations(EXERCISE_NAMES_AR, englishById)).toEqual([]);
  });
  it('each guard fails on a planted bad example', () => {
    expect(coverage({ a: 'سكوات', fake: 'سكوات أمامي' }, ['a', 'b'])).toEqual({ missing: ['b'], extra: ['fake'] });
    expect(emptyNames({ a: ' ' })).toEqual(['a']);
    expect(latinNames({ a: 'Bench بنش', b: 'كيرل بالبار EZ', c: 'سحب بمقبض V' })).toEqual(['a']);
    expect(duplicateNames({ a: 'سكوات', b: 'سكوات' })).toEqual(['a / b']);
    expect(glossaryViolations({ x: 'ضغط صدر بالبار' }, new Map([['x', 'Barbell Bench Press']]))).toHaveLength(1);
  });
});

const custom: Exercise = {
  id: 'custom-1', name: 'My Cable Thing', aliases: [], equipment: 'cable', type: 'weighted', unilateral: false,
  primaryMuscles: ['chest'], secondaryMuscles: [], instructions: [], source: 'custom', retired: false, packCategory: null,
};

describe('exerciseName', () => {
  it('shows the Arabic name for pack exercises in Arabic only', () => {
    expect(exerciseName('ar', 'Barbell_Squat', 'Barbell Squat')).toBe('سكوات بالبار');
    expect(exerciseName('en', 'Barbell_Squat', 'Barbell Squat')).toBe('Barbell Squat');
  });
  it('keeps the typed name for custom and unknown exercises', () => {
    expect(exerciseName('ar', custom.id, custom.name)).toBe('My Cable Thing');
    expect(exerciseName('ar', null, 'Imported Row')).toBe('Imported Row');
    expect(exerciseName('ar', 'constructor', 'Object key')).toBe('Object key');
  });
});

describe('Arabic search', () => {
  const all = [...bundledExercises(), custom];
  const ids = (query: string) => searchExercises(all, query, null, 'ar').map(e => e.id);
  it('normalizes hamza, alef maqsura, ta marbuta, diacritics and tatweel', () => {
    expect(normalizeArabicSearch('أَإِآ')).toBe('ااا');
    expect(normalizeArabicSearch('إطالـــة')).toBe('اطاله');
    expect(normalizeArabicSearch('علي  على')).toBe('علي علي');
  });
  it('matches the Arabic name, including a partial word and spelling variants', () => {
    expect(ids('سكوات بالبار')[0]).toBe('Barbell_Squat');
    expect(ids('بنش بر')).toContain('Barbell_Bench_Press_-_Medium_Grip');
    expect(ids('اطاله الخلفيه')).toContain('Hamstring_Stretch');
  });
  it('still matches English names, and custom names, in Arabic', () => {
    expect(ids('barbell squat')[0]).toBe('Barbell_Squat');
    expect(ids('ohp').length).toBeGreaterThan(0);
    expect(searchExercises(all, 'my cable', null, 'ar').map(e => e.id)).toContain('custom-1');
  });
  it('leaves English search unchanged', () => {
    expect(searchExercises(all, 'barbell squat', null, 'en')[0]?.id).toBe('Barbell_Squat');
  });
});
