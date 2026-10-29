import rawPack from '../../../assets/data/exercises/free-exercise-db.json';
import { EXERCISE_INSTRUCTIONS_AR, exerciseInstructionDisplay } from '../exerciseInstructionsAr';
import type { Exercise } from '../../services/database/gymTypes';

// Use Jest's built-in Node implementation without adding @types/node or a runtime dependency.
const fs = jest.requireActual('fs') as { readFileSync(path: string, encoding: string): string };
const listedIds = fs.readFileSync('docs/phase5/arabic-instructions-top100.txt', 'utf8').trim().split(/\r?\n/);
const englishById = new Map((rawPack as { id: string; instructions: string[] }[])
  .map(row => [row.id, row.instructions]));

const ALLOWED_LATIN = /\b(?:EZ|V)\b/g;
function audit(data: Record<string, readonly string[]>, ids: readonly string[]) {
  return {
    missing: ids.filter(id => !Object.prototype.hasOwnProperty.call(data, id)),
    extra: Object.keys(data).filter(id => !ids.includes(id)),
    counts: ids.filter(id => data[id]?.length !== englishById.get(id)?.length),
    empty: Object.entries(data).flatMap(([id, steps]) => steps
      .flatMap((step, index) => step.trim() ? [] : [id + ':' + index])),
    latin: Object.entries(data).flatMap(([id, steps]) => steps
      .flatMap((step, index) => /[a-z]/i.test(step.replace(ALLOWED_LATIN, ''))
        ? [id + ':' + index] : [])),
  };
}

describe('Arabic pack exercise instructions: coverage and safety guards', () => {
  it('matches the exact 100 requested IDs, in the current source pack', () => {
    expect(listedIds).toHaveLength(100);
    expect(new Set(listedIds).size).toBe(100);
    expect(listedIds.every(id => englishById.has(id))).toBe(true);
    const result = audit(EXERCISE_INSTRUCTIONS_AR, listedIds);
    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([]);
  });

  it('keeps all 466 source steps in the same order, with no invented steps', () => {
    const sourceTotal = listedIds.reduce((sum, id) => sum + (englishById.get(id)?.length ?? 0), 0);
    const translatedTotal = Object.values(EXERCISE_INSTRUCTIONS_AR)
      .reduce((sum, steps) => sum + steps.length, 0);
    expect(sourceTotal).toBe(466);
    expect(translatedTotal).toBe(sourceTotal);
    expect(audit(EXERCISE_INSTRUCTIONS_AR, listedIds).counts).toEqual([]);
    // The original pack has no instructions for Side_Bridge; do not fabricate any.
    expect(englishById.get('Side_Bridge')).toEqual([]);
    expect(EXERCISE_INSTRUCTIONS_AR.Side_Bridge).toEqual([]);
  });

  it('contains no untranslated Latin words or empty steps', () => {
    const result = audit(EXERCISE_INSTRUCTIONS_AR, listedIds);
    expect(result.latin).toEqual([]);
    expect(result.empty).toEqual([]);
    const text = Object.values(EXERCISE_INSTRUCTIONS_AR).flat().join(' ');
    expect(/[٠-٩۰-۹]/.test(text)).toBe(false); // Western numerals
    expect(/\d[ \t]+(?:درجة|بوصة|قدم|ثانية|تكرار|تكرارًا)/.test(text)).toBe(false);
    expect(EXERCISE_INSTRUCTIONS_AR.Leg_Press?.join(' ')).toContain('لا تقفل ركبتيك');
    expect(EXERCISE_INSTRUCTIONS_AR.Hyperextensions_Back_Extensions?.join(' ')).toContain('لا تدوّر ظهرك');
  });

  it('fails the coverage, extra-ID, count, empty, and Latin guards on planted mistakes', () => {
    const a = audit({ a: ['ارفع الوزن'], extra: ['خطوة'] }, ['a', 'b']);
    expect(a.missing).toEqual(['b']);
    expect(a.extra).toEqual(['extra']);
    const count = audit({ Barbell_Deadlift: ['ارفع الوزن'] }, ['Barbell_Deadlift']);
    expect(count.counts).toEqual(['Barbell_Deadlift']);
    expect(audit({ a: ['   '] }, ['a']).empty).toEqual(['a:0']);
    expect(audit({ a: ['Lift الوزن'], b: ['استخدم بار EZ ومقبض V'] }, ['a', 'b']).latin)
      .toEqual(['a:0']);
  });
});

function exercise(id: string, source: Exercise['source'], instructions: string[]): Pick<Exercise, 'id'|'source'|'instructions'> {
  return { id, source, instructions };
}

describe('exerciseInstructionDisplay', () => {
  const original = ['Grasp the bar', 'Lower it carefully'];
  it('shows covered pack Arabic steps only in Arabic; English retains its original text', () => {
    const item = exercise('Barbell_Bench_Press_-_Medium_Grip', 'pack', original);
    const arabic = exerciseInstructionDisplay('ar', item);
    expect(arabic.steps).toBe(EXERCISE_INSTRUCTIONS_AR[item.id]);
    expect(arabic.englishOnly).toBe(false);
    expect(exerciseInstructionDisplay('en', item)).toEqual({
      steps: original, englishOnly: false,
    });
  });
  it('shows uncovered pack English with an Arabic-only notice', () => {
    const item = exercise('some-untranslated-pack-exercise', 'pack', original);
    expect(exerciseInstructionDisplay('ar', item)).toEqual({
      steps: original, englishOnly: true,
    });
    expect(exerciseInstructionDisplay('ar', exercise(item.id, 'pack', []))).toEqual({
      steps: [], englishOnly: false,
    });
  });
  it('never replaces custom exercise instructions', () => {
    const custom = exercise('Barbell_Squat', 'custom', ['تعليماتي الخاصة']);
    expect(exerciseInstructionDisplay('ar', custom)).toEqual({
      steps: custom.instructions, englishOnly: false,
    });
  });
});
