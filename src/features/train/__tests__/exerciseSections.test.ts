import { bundledExercises, searchExercises } from '../../../services/database/exerciseLibrary';
import { exerciseName } from '../../../i18n/exerciseNames';
import { displayLetter, groupByDisplayLetter, librarySections } from '../exerciseSections';

const { readFileSync } = jest.requireActual('fs') as {
  readFileSync: (file: string, encoding: 'utf8') => string;
};
const { join } = jest.requireActual('path') as {
  join: (...parts: string[]) => string;
};

test('display letter uses the shown name, with one Latin case and one alef', () => {
  expect(displayLetter('Bench Press')).toBe('B');
  expect(displayLetter(' squat ')).toBe('S');
  expect(displayLetter('3/4 Sit-Up')).toBe('3');
  expect(displayLetter('إطالة الفخذ')).toBe('ا');
  expect(displayLetter('أحجار أطلس')).toBe('ا');
  expect(displayLetter('آيس كريم')).toBe('ا');
  expect(displayLetter('احتضان')).toBe('ا');
  expect(displayLetter('بنش برس')).toBe('ب');
  expect(displayLetter('')).toBe('#');
  expect(displayLetter('   ')).toBe('#');
});

test('grouping keeps the given order and does not drop or reorder items', () => {
  const items = [
    { id: '1', name: 'Zebra' },
    { id: '2', name: 'Apple' },
    { id: '3', name: 'ant' },
    { id: '4', name: 'احتضان' },
    { id: '5', name: 'أحجار' },
    { id: '6', name: 'إطالة' },
    { id: '7', name: 'بنش' },
  ];
  const before = items.map(item => ({ ...item }));
  const sections = groupByDisplayLetter(items, item => item.name);
  expect(items).toEqual(before);
  expect(sections.map(section => section.letter)).toEqual(['Z', 'A', 'ا', 'ب']);
  expect(sections.find(section => section.letter === 'A')?.data.map(item => item.id)).toEqual(['2', '3']);
  expect(sections.find(section => section.letter === 'ا')?.data).toHaveLength(3);
  expect(sections.flatMap(section => section.data)).toEqual(items);
});

test('a repeated letter stays repeated when the list is not alphabetical', () => {
  const items = [{ id: '1', name: 'Press' }, { id: '2', name: 'Squat' }, { id: '3', name: 'Pull' }];
  expect(groupByDisplayLetter(items, item => item.name).map(section => section.letter)).toEqual(['P', 'S', 'P']);
});

test('a ranked search is one untitled section; an empty query is A–Z', () => {
  const items = [{ id: '1', name: 'Squat' }, { id: '2', name: 'Press' }];
  expect(librarySections<{ id: string; name: string }>([], item => item.name, true)).toEqual([]);
  expect(librarySections(items, item => item.name, false)).toEqual([{ letter: '', data: items }]);
  expect(librarySections(items, item => item.name, true).map(section => section.letter)).toEqual(['S', 'P']);
});

test('the helper does not compare names itself', () => {
  const source = readFileSync(join(process.cwd(), 'src/features/train/exerciseSections.ts'), 'utf8');
  expect(source).not.toMatch(/localeCompare\s*\(/);
  expect(source).not.toMatch(/Intl\s*\./);
});

test('every bundled exercise is listed, in English and Arabic, with no cap', () => {
  const all = bundledExercises();
  expect(all).toHaveLength(876);

  for (const language of ['en', 'ar'] as const) {
    const listed = searchExercises(all, '', null, language);
    expect(listed).toHaveLength(876);
    const sections = librarySections(listed, exercise => exerciseName(language, exercise.id, exercise.name), true);
    expect(sections.flatMap(section => section.data).map(exercise => exercise.id)).toEqual(listed.map(exercise => exercise.id));
    expect(new Set(sections.map(section => section.letter)).size).toBe(sections.length);
    for (const section of sections) {
      for (const exercise of section.data) {
        expect(displayLetter(exerciseName(language, exercise.id, exercise.name))).toBe(section.letter);
      }
    }
  }

  const english = librarySections(searchExercises(all, '', null, 'en'), exercise => exercise.name, true);
  expect(english.some(section => section.letter === 'B' && section.data.length > 60)).toBe(true);
  expect(english.every(section => section.letter === '#' || /^[0-9A-Z]$/.test(section.letter))).toBe(true);

  const arabic = librarySections(
    searchExercises(all, '', null, 'ar'),
    exercise => exerciseName('ar', exercise.id, exercise.name),
    true,
  );
  expect(arabic.every(section => /^[\u0600-\u06FF]$/.test(section.letter))).toBe(true);
  const bench = all.find(exercise => exercise.name.includes('Bench Press'));
  expect(bench).toBeDefined();
  expect(arabic.find(section => section.data.some(exercise => exercise.id === bench?.id))?.letter).toBe('ب');
  const stretch = all.find(exercise => exerciseName('ar', exercise.id, exercise.name).startsWith('إ'));
  expect(stretch).toBeDefined();
  expect(arabic.find(section => section.data.some(exercise => exercise.id === stretch?.id))?.letter).toBe('ا');

  expect(searchExercises(all, '', 'chest', 'en').length).toBeGreaterThan(50);
  expect(searchExercises(all, 'press', null, 'en').length).toBeGreaterThan(60);
});
