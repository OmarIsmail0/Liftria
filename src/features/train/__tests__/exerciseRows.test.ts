import { bundledExercises } from '../../../services/database/exerciseLibrary';
import {
  EXERCISE_ROW_HEIGHT, EXERCISE_SECTION_HEADER_HEIGHT, exerciseListWindow, exerciseRowIdentity,
  exerciseRowIdentityEqual, exerciseThumbnailKey, flatListItemLayout, frameAt, sectionListLayouts,
  thumbnailPaint, tintHex,
} from '../exerciseRows';

const { readFileSync } = jest.requireActual('fs') as {
  readFileSync: (file: string, encoding: 'utf8') => string;
};
const { join } = jest.requireActual('path') as {
  join: (...parts: string[]) => string;
};

const colors = { primary: '#FF8F6B', secondary: 'rgba(255,143,107,0.55)', idle: 'rgba(0,0,0,0.12)' };

test('a row keeps the same memo props when the exercise is copied', () => {
  const exercise = { id: 'bench', primaryMuscles: ['chest', 'triceps'], secondaryMuscles: ['shoulders'] };
  const first = exerciseRowIdentity(
    exercise.id, 'Bench Press', 'Barbell',
    exerciseThumbnailKey(exercise.primaryMuscles, exercise.secondaryMuscles), 'dark:aurora',
  );
  const copy = {
    id: exercise.id,
    primaryMuscles: [...exercise.primaryMuscles],
    secondaryMuscles: [...exercise.secondaryMuscles],
  };
  const second = exerciseRowIdentity(
    copy.id, 'Bench Press', 'Barbell',
    exerciseThumbnailKey(copy.primaryMuscles, copy.secondaryMuscles), 'dark:aurora',
  );
  expect(first).not.toBe(second);
  expect(exerciseRowIdentityEqual(first, second)).toBe(true);
});

test('a new title, muscle or theme is a different row', () => {
  const base = exerciseRowIdentity('bench', 'Bench Press', 'Barbell', exerciseThumbnailKey(['chest'], []), 'dark:aurora');
  expect(exerciseRowIdentityEqual(base, { ...base, title: 'Squat' })).toBe(false);
  expect(exerciseRowIdentityEqual(base, {
    ...base, thumbnailKey: exerciseThumbnailKey(['quadriceps'], []),
  })).toBe(false);
  expect(exerciseRowIdentityEqual(base, { ...base, themeKey: 'light:solid' })).toBe(false);
  expect(exerciseRowIdentityEqual(base, { ...base, id: 'other' })).toBe(false);
});

test('each distinct muscle pattern is painted once', () => {
  const all = bundledExercises();
  const first = thumbnailPaint(['chest'], ['triceps'], colors);
  const again = thumbnailPaint(['chest'], ['triceps'], colors);
  expect(again).toBe(first);
  expect(first.side).toBe('front');
  expect(first.torso).toBe(colors.primary);
  expect(first.arm).toBe(colors.idle);
  const secondary = thumbnailPaint([], ['chest'], colors);
  expect(secondary.torso).toBe(colors.secondary);
  expect(secondary).not.toBe(first);
  const back = thumbnailPaint(['hamstrings'], [], colors);
  expect(back.side).toBe('back');
  expect(back.leg).toBe(colors.primary);
  const paints = all.map(exercise => thumbnailPaint(exercise.primaryMuscles, exercise.secondaryMuscles, colors));
  const unique = new Set(paints.map(paint => paint.key));
  expect(unique.size).toBeLessThan(all.length);
  expect(unique.size).toBeGreaterThan(10);
  expect(tintHex('#FF8F6B', 0.55)).toBe('rgba(255,143,107,0.55)');
});

test('section layout uses one fixed height per row and header', () => {
  const frames = sectionListLayouts([
    { letter: 'B', count: 2 },
    { letter: '', count: 1 },
  ]);
  expect(frames.map(frame => frame.length)).toEqual([
    EXERCISE_SECTION_HEADER_HEIGHT, EXERCISE_ROW_HEIGHT, EXERCISE_ROW_HEIGHT, 0,
    0, EXERCISE_ROW_HEIGHT, 0,
  ]);
  expect(frames.map(frame => frame.offset)).toEqual([
    0,
    EXERCISE_SECTION_HEADER_HEIGHT,
    EXERCISE_SECTION_HEADER_HEIGHT + EXERCISE_ROW_HEIGHT,
    EXERCISE_SECTION_HEADER_HEIGHT + EXERCISE_ROW_HEIGHT * 2,
    EXERCISE_SECTION_HEADER_HEIGHT + EXERCISE_ROW_HEIGHT * 2,
    EXERCISE_SECTION_HEADER_HEIGHT + EXERCISE_ROW_HEIGHT * 2,
    EXERCISE_SECTION_HEADER_HEIGHT + EXERCISE_ROW_HEIGHT * 3,
  ]);
  expect(frameAt(frames, 1)).toEqual({
    length: EXERCISE_ROW_HEIGHT, offset: EXERCISE_SECTION_HEADER_HEIGHT, index: 1,
  });
  expect(frameAt(frames, 99).length).toBe(0);
  expect(flatListItemLayout(null, 4)).toEqual({
    length: EXERCISE_ROW_HEIGHT, offset: EXERCISE_ROW_HEIGHT * 4, index: 4,
  });
  expect(sectionListLayouts([])).toEqual([]);
});

test('the browse screens memoize rows and virtualize with fixed layout', () => {
  const files = [
    'app/(tabs)/train/library.tsx',
    'app/(tabs)/train/pick.tsx',
    'app/(tabs)/train/muscles.tsx',
  ];
  for (const file of files) {
    const source = readFileSync(join(process.cwd(), file), 'utf8');
    expect(source).toContain('ExerciseResultRow');
    expect(source).toContain('exerciseRowIdentity');
    expect(source).toContain('getItemLayout');
    expect(source).toContain('exerciseListWindow');
    expect(source).toContain('removeClippedSubviews');
    expect(source).not.toContain('BodyMap mini');
  }
  const windowSource = readFileSync(join(process.cwd(), 'src/features/train/exerciseRows.ts'), 'utf8');
  expect(windowSource).toContain('initialNumToRender: ' + exerciseListWindow.initialNumToRender);
  expect(windowSource).toContain('windowSize: ' + exerciseListWindow.windowSize);
  expect(windowSource).toContain('maxToRenderPerBatch: ' + exerciseListWindow.maxToRenderPerBatch);
  const library = readFileSync(join(process.cwd(), 'app/(tabs)/train/library.tsx'), 'utf8');
  const pick = readFileSync(join(process.cwd(), 'app/(tabs)/train/pick.tsx'), 'utf8');
  expect(library).toContain('useDeferredQuery');
  expect(pick).toContain('useDeferredQuery');
  expect(readFileSync(join(process.cwd(), 'src/features/train/ExerciseResultRow.tsx'), 'utf8'))
    .toContain('exerciseRowIdentityEqual');
  expect(readFileSync(join(process.cwd(), 'src/features/train/ExerciseThumbnail.tsx'), 'utf8'))
    .not.toContain('BodyMap');
});
