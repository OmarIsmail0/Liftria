import { equipmentLabel } from '../../../i18n/equipment';
import { exerciseName } from '../../../i18n/exerciseNames';
import { muscleLabel } from '../../../i18n/muscles';
import { bundledExercises, searchExercises } from '../exerciseLibrary';
import type { Exercise } from '../gymTypes';

const { readFileSync } = jest.requireActual('fs') as {
  readFileSync: (file: string, encoding: 'utf8') => string;
};
const { join } = jest.requireActual('path') as {
  join: (...parts: string[]) => string;
};

function exercise(id: string, name: string, extra: Partial<Exercise> = {}): Exercise {
  return {
    id, name, aliases: [], equipment: null, type: 'weighted', unilateral: false,
    primaryMuscles: [], secondaryMuscles: [], instructions: [],
    source: 'custom', retired: false, packCategory: null,
    ...extra,
  };
}

const arabicOrder = new Intl.Collator('ar');

test('Arabic search ranks exact, prefix, word, contains, then a one-edit typo', () => {
  const exact = exercise('r0', 'كيرل');
  const prefix = exercise('r1', 'كيرل بالدمبل');
  const wordA = exercise('r2a', 'تمرين كيرل');
  const wordB = exercise('r2b', 'حركة كيرل');
  const contains = exercise('r3', 'الكيرل المقلوب');
  const typo = exercise('r4', 'كيرن جانبي');
  const unrelated = exercise('no', 'سكوات بالبار');
  const ids = searchExercises(
    [typo, contains, wordB, prefix, unrelated, exact, wordA], 'كيرل', null, 'ar',
  ).map(item => item.id);
  const wordIds = [wordA, wordB]
    .sort((a, b) => arabicOrder.compare(a.name, b.name))
    .map(item => item.id);
  expect(ids).toEqual(['r0', 'r1', ...wordIds, 'r3', 'r4']);
});

test('an Arabic typo matches a word of 4+ letters within one edit only', () => {
  const squat = exercise('squat', 'سكوات');
  const bench = exercise('bench', 'بنش');
  expect(searchExercises([squat], 'سكواط', null, 'ar').map(item => item.id)).toEqual(['squat']);
  expect(searchExercises([bench], 'بنس', null, 'ar')).toEqual([]);
  expect(searchExercises([squat], 'طقوات', null, 'ar')).toEqual([]);
});

test('Arabic muscle and equipment matches rank below name matches', () => {
  const chestName = exercise('name-chest', 'إطالة الصدر', { primaryMuscles: ['chest'] });
  const chestMuscle = exercise('muscle-chest', 'بنش برس', { primaryMuscles: ['chest'] });
  const chestSecondary = exercise('secondary-chest', 'سكوات عميق', {
    primaryMuscles: ['quadriceps'], secondaryMuscles: ['chest'],
  });
  const other = exercise('other', 'سحب أمامي', { primaryMuscles: ['lats'] });
  expect(muscleLabel('ar', 'chest')).toBe('الصدر');
  expect(searchExercises(
    [other, chestMuscle, chestSecondary, chestName], 'الصدر', null, 'ar',
  ).map(item => item.id)).toEqual(['name-chest', 'muscle-chest']);

  const barName = exercise('name-bar', 'تمرين بار حديد', { equipment: 'barbell' });
  const barOnly = exercise('equip-bar', 'سحب', { equipment: 'barbell', primaryMuscles: ['lats'] });
  const dumbbell = exercise('db', 'تفتيح', { equipment: 'dumbbell', primaryMuscles: ['chest'] });
  expect(equipmentLabel('ar', 'barbell', '')).toBe('بار حديد');
  expect(searchExercises([dumbbell, barOnly, barName], 'بار حديد', null, 'ar')
    .map(item => item.id)).toEqual(['name-bar', 'equip-bar']);

  const hamstrings = exercise('ham', 'رجل خلفي', { primaryMuscles: ['hamstrings'] });
  expect(searchExercises([hamstrings], 'أوتار الركبة', null, 'ar').map(item => item.id)).toEqual(['ham']);
});

test('a Latin query in Arabic mode uses the English name and aliases', () => {
  const pack = bundledExercises();
  expect(searchExercises(pack, 'barbell squat', null, 'ar')[0]?.id).toBe('Barbell_Squat');
  expect(searchExercises(pack, 'ohp', null, 'ar').map(item => item.id))
    .toEqual(searchExercises(pack, 'ohp', null, 'en').map(item => item.id));
  const arabicOnly = exercise('ar-only', 'سكوات خاص');
  const aliased = exercise('alias', 'Custom Press', { aliases: ['ZZQX'] });
  expect(searchExercises([arabicOnly], 'squat', null, 'ar')).toEqual([]);
  expect(searchExercises([arabicOnly, aliased], 'zzqx', null, 'ar').map(item => item.id)).toEqual(['alias']);
});

test('an empty Arabic query lists the bundled exercises in collator order', () => {
  const all = bundledExercises();
  const retired = exercise('gone', 'أبجد خاص', { retired: true });
  const listed = searchExercises([...all, retired], '', null, 'ar');
  expect(all).toHaveLength(876);
  expect(listed).toHaveLength(876);
  expect(listed.some(item => item.id === 'gone')).toBe(false);
  const expected = [...all].sort((a, b) => arabicOrder.compare(
    exerciseName('ar', a.id, a.name), exerciseName('ar', b.id, b.name)));
  expect(listed.map(item => item.id)).toEqual(expected.map(item => item.id));
  expect(searchExercises(all, '   ', null, 'ar')).toHaveLength(876);
  expect(searchExercises(all, 'َ', null, 'ar')).toHaveLength(876);
});

test('Arabic search over the bundled 876 exercises stays fast', () => {
  const all = bundledExercises();
  expect(all).toHaveLength(876);
  const queries = ['', 'سكوات', 'بنش بر', 'سكواط', 'الصدر', 'بار حديد', 'اطاله الخلفيه'];
  const start = performance.now();
  for (let round = 0; round < 3; round += 1) {
    for (const query of queries) searchExercises(all, query, null, 'ar');
  }
  const elapsed = performance.now() - start;
  expect(elapsed).toBeLessThan(1000);
});

test('exercise search does not pass a locale to localeCompare', () => {
  const source = readFileSync(join(process.cwd(), 'src/services/database/exerciseLibrary.ts'), 'utf8');
  expect(source).not.toMatch(/localeCompare\s*\([^)]*,/);
});
