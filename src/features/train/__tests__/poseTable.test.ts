import { createTheme } from '../../../design/tokens';
import { bundledExercises } from '../../../services/database/exerciseLibrary';
import type { Muscle } from '../../../services/database/gymTypes';
import { viewBoxSize } from '../ExerciseFigure';
import { buildPose, POSE_KEYS, type PoseKey } from '../exercisePoses';
import { tintHex } from '../exerciseRows';
import { poseRoleColors } from '../poseColors';
import {
  cachedBuiltPose, highlightForExercise, PICKER_FIGURE_LEAD_ID, POSE_OVERRIDES,
  poseForExercise, withPickerFigureLead, type PoseSubject,
} from '../poseTable';
import { rotateList } from '../poseTransform';

const pack = bundledExercises();
const byId = (id: string): PoseSubject => {
  const found = pack.find(exercise => exercise.id === id);
  if (!found) throw new Error('missing pack exercise ' + id);
  return found;
};

function subject(name: string, equipment: string | null, primary: Muscle[], secondary: Muscle[] = []): PoseSubject {
  return { id: 'custom-' + name, name, equipment, primaryMuscles: primary, secondaryMuscles: secondary };
}

test('every pose is reachable and overrides name real pack exercises', () => {
  const ids = new Set(pack.map(exercise => exercise.id));
  const seen = new Set<string>();
  for (const row of POSE_OVERRIDES) {
    expect(seen.has(row.id)).toBe(false);
    seen.add(row.id);
    expect(ids.has(row.id)).toBe(true);
    expect(poseForExercise(byId(row.id))).toBe(row.pose);
  }
  const reached = new Set<PoseKey>();
  for (const exercise of pack) {
    const pose = poseForExercise(exercise);
    if (pose) reached.add(pose);
  }
  expect([...reached].sort()).toEqual([...POSE_KEYS].sort());
});

test('name rules map variants the override list does not spell out', () => {
  expect(poseForExercise(byId('V-Bar_Pulldown'))).toBe('latPulldown');
  expect(poseForExercise(byId('Underhand_Cable_Pulldowns'))).toBe('latPulldown');
  expect(poseForExercise(byId('Wide-Grip_Pulldown_Behind_The_Neck'))).toBe('latPulldown');
  expect(poseForExercise(byId('V-Bar_Pullup'))).toBe('pullUp');
  expect(poseForExercise(byId('Band_Assisted_Pull-Up'))).toBe('pullUp');
  expect(poseForExercise(byId('Dumbbell_One-Arm_Shoulder_Press'))).toBe('shoulderPressDumbbell');
  expect(poseForExercise(byId('One-Arm_Side_Laterals'))).toBe('lateralRaise');
  expect(poseForExercise(byId('Incline_Cable_Flye'))).toBe('cableFly');
  expect(poseForExercise(byId('Middle_Back_Shrug'))).toBe('shrugDumbbell');
  expect(poseForExercise(byId('Smith_Machine_One-Arm_Upright_Row'))).toBe('uprightRow');
  expect(poseForExercise(byId('Dumbbell_One-Arm_Triceps_Extension'))).toBe('overheadTricepsExtension');
  expect(poseForExercise(byId('Standing_Dumbbell_Calf_Raise'))).toBe('calfRaise');
  expect(poseForExercise(subject('Close-Grip Front Lat Pulldown', 'cable', ['lats'], ['biceps']))).toBe('latPulldown');
});

test('unmapped exercises, including side-view lifts, fall back', () => {
  const unmapped = [
    'Barbell_Bench_Press_-_Medium_Grip', 'Barbell_Squat', 'Barbell_Deadlift',
    'Bent_Over_Barbell_Row', 'Barbell_Hip_Thrust', 'Barbell_Lunge',
    'Straight-Arm_Pulldown', 'Dumbbell_Flyes', 'Scapular_Pull-Up', 'Rocky_Pull-Ups_Pulldowns',
    'Barbell_Shoulder_Press', 'Standing_Dumbbell_Upright_Row', 'Triceps_Pushdown',
    'Seated_Calf_Raise', 'Donkey_Calf_Raises',
  ];
  for (const id of unmapped) expect(poseForExercise(byId(id))).toBeNull();
  expect(poseForExercise(subject('My Movement', 'other', ['chest']))).toBeNull();
  const mapped = pack.filter(exercise => poseForExercise(exercise) !== null);
  expect(mapped.length).toBeGreaterThanOrEqual(POSE_KEYS.length);
  expect(mapped.length).toBeLessThan(pack.length / 2);
  expect(cachedBuiltPose(byId('Barbell_Bench_Press_-_Medium_Grip'))).toBeNull();
});

test('highlights follow the exercise muscles through BODY_REGIONS', () => {
  const lat = byId('Wide-Grip_Lat_Pulldown');
  expect(highlightForExercise(lat)).toEqual({
    primary: ['upper-back'],
    secondary: ['biceps', 'deltoids'],
  });
  expect(highlightForExercise(subject('Curl', null, ['abdominals'], ['chest', 'lats']))).toEqual({
    primary: ['abs', 'obliques'],
    secondary: ['chest', 'upper-back'],
  });
  expect(highlightForExercise(subject('Press', 'dumbbell', ['shoulders'], ['shoulders', 'triceps']))).toEqual({
    primary: ['deltoids'],
    secondary: ['triceps'],
  });
  const pose = buildPose('latPulldown', highlightForExercise(lat));
  expect(pose.primitives.some(part => part.kind === 'path' && part.role === 'p')).toBe(true);
  expect(pose.primitives.some(part => part.kind === 'path' && part.role === 's')).toBe(true);
});

test('a pose is built once for the same exercise and muscles', () => {
  const exercise = byId('Side_Lateral_Raise');
  const first = cachedBuiltPose(exercise);
  const again = cachedBuiltPose({ ...exercise, primaryMuscles: [...exercise.primaryMuscles] });
  expect(first).toBe(again);
  expect(first?.primitives.length).toBeGreaterThan(40);
  const other = cachedBuiltPose(subject('Side Lateral Raise', 'dumbbell', ['shoulders'], ['traps']));
  expect(other).not.toBe(first);
});

test('path transforms are rotate lists the figure can nest', () => {
  for (const key of POSE_KEYS) {
    for (const part of buildPose(key).primitives) {
      if (part.kind !== 'path' || !part.transform) continue;
      const steps = rotateList(part.transform);
      expect(steps?.join(' ')).toBe(part.transform);
    }
  }
  expect(rotateList('rotate(35 950 350) rotate(120 915 525)')).toEqual([
    'rotate(35 950 350)', 'rotate(120 915 525)',
  ]);
  expect(rotateList('translate(1 2)')).toBeNull();
  expect(rotateList('rotate(35 950 350) scale(2)')).toBeNull();
});

test('role colours match the body map in light and dark', () => {
  for (const mode of ['light', 'dark'] as const) {
    const theme = createTheme(mode, 'solid');
    const colors = poseRoleColors(theme);
    expect(colors.m.fill).toBe(theme.color.track);
    expect(colors.m.stroke).toBe(theme.color.border.control);
    expect(colors.p.fill).toBe(theme.color.domain.train);
    expect(colors.p.stroke).toBe(theme.color.border.control);
    expect(colors.s.fill).toBe(tintHex(theme.color.domain.train, 0.55));
    expect(colors.s.stroke).toBe(theme.color.border.control);
    expect(colors.skin.fill).toBe(theme.color.border.strong);
    expect(colors.eq.stroke).toBe('none');
    expect(colors.eqd.stroke).toBe('none');
    expect(colors.eq.fill).not.toBe(colors.eqd.fill);
  }
  expect(poseRoleColors(createTheme('dark', 'aurora')).s.fill).toBe('rgba(255,143,107,0.55)');
  expect(poseRoleColors(createTheme('light', 'solid')).p.fill).toBe('#A83E18');
});

test('the exercise screen draws the whole figure above the muscle map', () => {
  const { readFileSync } = jest.requireActual('fs') as {
    readFileSync: (file: string, encoding: 'utf8') => string;
  };
  const { join } = jest.requireActual('path') as { join: (...parts: string[]) => string };
  const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
  const detail = read('app/(tabs)/train/exercise/[id].tsx');
  const figureAt = detail.indexOf('ExerciseFigure');
  const mapAt = detail.indexOf('<BodyMap');
  expect(figureAt).toBeGreaterThan(0);
  expect(mapAt).toBeGreaterThan(figureAt);
  expect(detail).toContain('crop="full"');
  expect(read('src/features/train/ExerciseResultRow.tsx')).toContain('ExerciseFigure');
  expect(read('app/(tabs)/train/pick.tsx')).toContain('withPickerFigureLead');
  expect(read('app/(tabs)/train/library.tsx')).toContain('ExerciseFigure');
  expect(read('app/(tabs)/train/preview.tsx')).toContain('ExerciseFigure');
  expect(read('app/import/preview.tsx')).toContain('ExerciseFigure');
});

test('a square crop stays square and a tall figure keeps its aspect', () => {
  expect(viewBoxSize('692 9 784 784', 52)).toEqual({ width: 52, height: 52 });
  expect(viewBoxSize('731 -151 705 1550', 220)).toEqual({ width: 220, height: 484 });
  expect(viewBoxSize('bad', 40)).toEqual({ width: 40, height: 40 });
});

test('the picker without a workout leads with a lat pulldown', () => {
  const rows = [{ id: '3_4_Sit-Up' }, { id: PICKER_FIGURE_LEAD_ID }, { id: 'Pullups' }];
  expect(withPickerFigureLead(rows, undefined).map(row => row.id)).toEqual([
    PICKER_FIGURE_LEAD_ID, '3_4_Sit-Up', 'Pullups',
  ]);
  expect(withPickerFigureLead(rows, 'workout-1')).toBe(rows);
  expect(withPickerFigureLead([{ id: 'Pullups' }], undefined)).toEqual([{ id: 'Pullups' }]);
});
