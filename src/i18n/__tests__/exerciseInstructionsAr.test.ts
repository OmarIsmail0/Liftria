import rawPack from '../../../assets/data/exercises/free-exercise-db.json';
import { EXERCISE_INSTRUCTIONS_AR } from '../exerciseInstructionsAr';
import { localizedExerciseInstructions } from '../exerciseInstructions';

const { readFileSync } = jest.requireActual('fs') as {
  readFileSync: (path: string, encoding: 'utf8') => string;
};
const { join } = jest.requireActual('path') as {
  join: (...paths: string[]) => string;
};

const listFiles = [
  'arabic-instructions-top100.txt',
  'arabic-instructions-next120.txt',
  'arabic-instructions-batch3.txt',
];
const ids = listFiles.flatMap(file =>
  readFileSync(join(process.cwd(), 'docs', 'phase5', file), 'utf8')
    .trim().split(/\r?\n/).filter(Boolean),
);
const pack = rawPack as { id: string; instructions: string[] }[];
const englishById = new Map(pack.map(exercise => [exercise.id, exercise.instructions]));

type Translations = Record<string, string[]>;
function coverage(translations: Translations, expected: string[]) {
  return {
    missing: expected.filter(id => !Object.prototype.hasOwnProperty.call(translations, id)),
    extra: Object.keys(translations).filter(id => !expected.includes(id)),
  };
}
function wrongStepCounts(translations: Translations, english: Map<string, string[]>) {
  return Object.entries(translations)
    .filter(([id, steps]) => !english.has(id) || steps.length !== english.get(id)!.length)
    .map(([id]) => id);
}
function invalidSteps(translations: Translations) {
  return Object.entries(translations).flatMap(([id, steps]) =>
    steps.flatMap((step, index) => {
      // Real bar/handle tokens only. English movement names and other Latin copy are forbidden.
      const latin = step.replace(/\b(?:EZ|V)\b/g, '');
      return !step.trim() || /[A-Za-z]/.test(latin) || /[٠-٩۰-۹]/.test(step)
        ? [`${id} step ${index + 1}`] : [];
    }));
}

describe('Arabic common-exercise instructions guards', () => {
  it('covers exactly the listed pack IDs from the three lists, with no duplicates', () => {
    expect(listFiles).toEqual([
      'arabic-instructions-top100.txt',
      'arabic-instructions-next120.txt',
      'arabic-instructions-batch3.txt',
    ]);
    expect(new Set(ids).size).toBe(370);
    expect(ids).toHaveLength(370);
    expect(ids.every(id => englishById.has(id))).toBe(true);
    expect(coverage(EXERCISE_INSTRUCTIONS_AR, ids)).toEqual({ missing: [], extra: [] });
  });
  it('keeps the English step count and order of the listed IDs', () => {
    expect(wrongStepCounts(EXERCISE_INSTRUCTIONS_AR, englishById)).toEqual([]);
    // The pack has zero instructions for this listed exercise: do not invent any.
    expect(englishById.get('Side_Bridge')).toEqual([]);
    expect(EXERCISE_INSTRUCTIONS_AR.Side_Bridge).toEqual([]);
  });
  it('has nonempty Arabic steps, Western digits, and no unapproved Latin letters', () => {
    expect(invalidSteps(EXERCISE_INSTRUCTIONS_AR)).toEqual([]);
  });
  it('detects planted missing/extra keys, wrong counts and untranslated text', () => {
    expect(coverage({ A: ['سكوات'], fake: [] }, ['A', 'B']))
      .toEqual({ missing: ['B'], extra: ['fake'] });
    expect(wrongStepCounts({ A: ['خطوة', 'خطوة أخرى'] }, new Map([['A', ['English']]])))
      .toEqual(['A']);
    expect(invalidSteps({ A: ['Do a Bench Press', 'ارفع الوزن'], B: [''] }))
      .toEqual(['A step 1', 'B step 1']);
    expect(invalidSteps({ A: ['٣ تكرارات'] })).toEqual(['A step 1']);
    expect(invalidSteps({ A: ['بار EZ ومقبض V'] })).toEqual([]);
  });
});

describe('localizedExerciseInstructions', () => {
  const squat = {
    id: 'Barbell_Squat', source: 'pack' as const,
    instructions: englishById.get('Barbell_Squat')!,
  };
  it('shows matching Arabic steps only for the translated pack exercise in Arabic', () => {
    const result = localizedExerciseInstructions('ar', squat);
    expect(result).toEqual({ steps: EXERCISE_INSTRUCTIONS_AR.Barbell_Squat, untranslated: false });
    expect(squat.instructions).toEqual(englishById.get('Barbell_Squat'));
    expect(localizedExerciseInstructions('en', squat))
      .toEqual({ steps: squat.instructions, untranslated: false });
  });
  it('keeps English steps with a note for an unlisted pack exercise in Arabic', () => {
    const exercise = { id: 'Ab_Roller', source: 'pack' as const, instructions: ['Original English'] };
    expect(localizedExerciseInstructions('ar', exercise))
      .toEqual({ steps: ['Original English'], untranslated: true });
  });
  it('never changes custom exercise instructions, regardless of ID', () => {
    const custom = { ...squat, source: 'custom' as const, instructions: ['My own step'] };
    expect(localizedExerciseInstructions('ar', custom))
      .toEqual({ steps: ['My own step'], untranslated: false });
  });
  it('shows no invented directions or English fallback notice when pack instructions are empty', () => {
    expect(localizedExerciseInstructions('ar', {
      id: 'Side_Bridge', source: 'pack', instructions: [],
    })).toEqual({ steps: [], untranslated: false });
    expect(localizedExerciseInstructions('ar', {
      id: 'unknown', source: 'pack', instructions: [],
    })).toEqual({ steps: [], untranslated: false });
  });
});
