import { restDeadline } from '../restClock';
import { REST_OVER_HOLD_MS, restBarPhase } from '../restBar';
import {
  SET_HOLD_DELETE_MS, buildSetRows, commitSetDraft, cycleSetMark, persistedKind,
  previousCellText, previousForWorkingSet, rowKey, setMarkGlyph, setRowAccessibilityLabel,
  setTableColumns, uncheckedRowPayload, visualColumnOrder,
} from '../setTable';
import { equipmentFilterOf, exerciseMatchesFilters, muscleFilterMatches } from '../exerciseFilters';
import { bundledExercises } from '../../../services/database/exerciseLibrary';

test('placeholders become the logged values only when the set is checked', () => {
  const suggestion = { placeholderWeight: 82.5, placeholderReps: 8 };
  expect(uncheckedRowPayload()).toBeNull();
  expect(commitSetDraft({ weightText: '', repsText: '', ...suggestion })).toEqual({
    ok: true, weight: 82.5, reps: 8,
  });
  expect(commitSetDraft({ weightText: '75', repsText: '5', ...suggestion })).toEqual({
    ok: true, weight: 75, reps: 5,
  });
  expect(commitSetDraft({ weightText: '', repsText: '6', placeholderWeight: 80, placeholderReps: 8 }))
    .toEqual({ ok: true, weight: 80, reps: 6 });
  expect(commitSetDraft({ weightText: '', repsText: '', placeholderWeight: null, placeholderReps: null }))
    .toEqual({ ok: false, reason: 'weight' });
  expect(commitSetDraft({ weightText: '80', repsText: '', placeholderWeight: 80, placeholderReps: null }))
    .toEqual({ ok: false, reason: 'reps' });
});

test('previous set lookup matches position and side, and formats 80 × 8', () => {
  const history = [
    { position: 0, side: null, weight: 80, reps: 8 },
    { position: 1, side: null, weight: 80, reps: 7 },
    { position: 0, side: 'L' as const, weight: 20, reps: 10 },
  ];
  expect(previousForWorkingSet(history, 1, null)).toEqual(history[1]);
  expect(previousForWorkingSet(history, 0, 'L')).toEqual(history[2]);
  expect(previousForWorkingSet(history, 3, null)).toBeNull();
  expect(previousCellText('en', 80, 8, 'kg')).toBe('80 × 8');
  expect(previousCellText('ar', 80, 8, 'kg')).toBe('\u206880 × 8\u2069');
});

test('set type cycles working, warm-up, drop, failure and only warm-up changes the stored kind', () => {
  expect(cycleSetMark('working')).toBe('warm-up');
  expect(cycleSetMark('warm-up')).toBe('drop');
  expect(cycleSetMark('drop')).toBe('failure');
  expect(cycleSetMark('failure')).toBe('working');
  expect(setMarkGlyph('warm-up', 1)).toBe('W');
  expect(setMarkGlyph('drop', 2)).toBe('D');
  expect(setMarkGlyph('failure', 3)).toBe('F');
  expect(setMarkGlyph('working', 2)).toBe('2');
  expect(persistedKind('warm-up')).toBe('warm-up');
  expect(persistedKind('drop')).toBe('working');
  expect(persistedKind('failure')).toBe('working');
  const id = 'exercise';
  const rows = buildSetRows({
    sessionExerciseId: id, targetSets: 3, unilateral: false, extraRows: 0,
    sets: [], marks: { [rowKey(id, 0, null)]: 'warm-up', [rowKey(id, 2, null)]: 'drop' },
  });
  expect(rows.map(row => setMarkGlyph(row.mark, row.workingNumber ?? 0))).toEqual(['W', '1', 'D']);
  expect(rows.map(row => row.workingNumber)).toEqual([null, 1, null]);
});

test('RTL column order puts SET on the right and keeps a logical row', () => {
  const columns = setTableColumns({ effort: false, check: true });
  expect(columns).toEqual(['set', 'previous', 'weight', 'reps', 'check']);
  expect(visualColumnOrder(columns, false)[0]).toBe('set');
  expect(visualColumnOrder(columns, true).at(-1)).toBe('set');
  expect(visualColumnOrder(setTableColumns({ effort: true, check: true }), true))
    .toEqual(['check', 'effort', 'reps', 'weight', 'previous', 'set']);
  expect(SET_HOLD_DELETE_MS).toBe(500);
});

test('a set row is announced with previous, weight, reps and whether it is logged', () => {
  expect(setRowAccessibilityLabel({
    language: 'en', setLabel: '2', previousKg: 80, previousReps: 8,
    weightKg: 80, reps: 8, unit: 'kg', logged: false,
  })).toBe('Set 2, previous 80 kilograms times 8, 80 kilograms, 8 reps, not logged');
  expect(setRowAccessibilityLabel({
    language: 'en', setLabel: '1', previousKg: null, previousReps: null,
    weightKg: 60, reps: 1, unit: 'kg', logged: true,
  })).toBe('Set 1, previous none, 60 kilograms, 1 rep, logged');
  const arabic = setRowAccessibilityLabel({
    language: 'ar', setLabel: '2', previousKg: 80, previousReps: 8,
    weightKg: 80, reps: 8, unit: 'kg', logged: false,
  });
  expect(arabic).toContain('كيلوغرام');
  expect(arabic).toContain('\u20682\u2069');
  expect(arabic).not.toMatch(/[٠-٩]/);
});

test('the rest bar follows the stored deadline and shows Rest over for 3 seconds', () => {
  jest.useFakeTimers();
  const loggedAt = '2026-11-01T12:00:00.000Z';
  const deadline = restDeadline(loggedAt, 90);
  const start = Date.parse(loggedAt);
  const end = Date.parse(deadline);
  jest.setSystemTime(start + 1000);
  const running = restBarPhase(deadline, loggedAt, 90);
  expect(running.phase).toBe('running');
  if (running.phase === 'running') expect(running.label).toBe('1:29');
  jest.setSystemTime(end + 1);
  expect(restBarPhase(deadline, loggedAt, 90)).toEqual({ phase: 'over', label: 'Rest over' });
  jest.setSystemTime(end + REST_OVER_HOLD_MS - 1);
  expect(restBarPhase(deadline, loggedAt, 90).phase).toBe('over');
  jest.setSystemTime(end + REST_OVER_HOLD_MS);
  expect(restBarPhase(deadline, loggedAt, 90).phase).toBe('hidden');
  expect(restBarPhase(null, null, 90).phase).toBe('hidden');
  jest.useRealTimers();
});

test('muscle and equipment chips map the pack, and recent filters do not drop the library', () => {
  const all = bundledExercises();
  expect(all.filter(exercise => equipmentFilterOf(exercise.equipment) === 'barbell').length).toBeGreaterThan(20);
  expect(all.filter(exercise => equipmentFilterOf(exercise.equipment) === 'other').length).toBeGreaterThan(0);
  expect(all.filter(exercise => muscleFilterMatches(exercise.primaryMuscles, 'core')).length).toBeGreaterThan(10);
  expect(all.filter(exercise => muscleFilterMatches(exercise.primaryMuscles, 'chest')).length).toBeGreaterThan(20);
  expect(equipmentFilterOf(null)).toBe('bodyweight');
  expect(equipmentFilterOf('e-z curl bar')).toBe('barbell');
  expect(equipmentFilterOf('medicine ball')).toBe('other');
  const bench = all.find(exercise => exercise.primaryMuscles.includes('chest') && exercise.equipment === 'barbell');
  expect(bench).toBeDefined();
  expect(exerciseMatchesFilters(bench!, 'chest', 'barbell')).toBe(true);
  expect(exerciseMatchesFilters(bench!, 'legs', 'any')).toBe(false);
  expect(all.filter(exercise => exerciseMatchesFilters(exercise, 'all', 'any'))).toHaveLength(876);
});
