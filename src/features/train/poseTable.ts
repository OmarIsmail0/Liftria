import type { Muscle } from '../../services/database/gymTypes';
import { BODY_REGIONS } from './bodyRegions';
import { buildPose, type BuiltPose, type PoseKey } from './exercisePoses';

/** Enough of an exercise to choose a pose. Pack rows and custom exercises both qualify. */
export interface PoseSubject {
  id: string;
  name: string;
  equipment: string | null;
  primaryMuscles: readonly Muscle[];
  secondaryMuscles: readonly Muscle[];
}

/**
 * Explicit pose for one pack exercise. Checked before the name rules, so a listed
 * id keeps its pose even if the wording would miss. Every id is a real pack exercise.
 */
export const POSE_OVERRIDES: readonly { readonly id: string; readonly pose: PoseKey }[] = [
  { id: 'Close-Grip_Front_Lat_Pulldown', pose: 'latPulldown' },
  { id: 'Full_Range-Of-Motion_Lat_Pulldown', pose: 'latPulldown' },
  { id: 'One_Arm_Lat_Pulldown', pose: 'latPulldown' },
  { id: 'Wide-Grip_Lat_Pulldown', pose: 'latPulldown' },
  { id: 'Chin-Up', pose: 'pullUp' },
  { id: 'Pullups', pose: 'pullUp' },
  { id: 'Arnold_Dumbbell_Press', pose: 'shoulderPressDumbbell' },
  { id: 'Dumbbell_Shoulder_Press', pose: 'shoulderPressDumbbell' },
  { id: 'Seated_Side_Lateral_Raise', pose: 'lateralRaise' },
  { id: 'Side_Lateral_Raise', pose: 'lateralRaise' },
  { id: 'Cable_Rear_Delt_Fly', pose: 'rearDeltFly' },
  { id: 'Reverse_Flyes', pose: 'rearDeltFly' },
  { id: 'Cable_Crossover', pose: 'cableFly' },
  { id: 'Low_Cable_Crossover', pose: 'cableFly' },
  { id: 'Dumbbell_Shrug', pose: 'shrugDumbbell' },
  { id: 'Smith_Machine_Upright_Row', pose: 'uprightRow' },
  { id: 'Upright_Barbell_Row', pose: 'uprightRow' },
  { id: 'Seated_Triceps_Press', pose: 'overheadTricepsExtension' },
  { id: 'Standing_Dumbbell_Triceps_Extension', pose: 'overheadTricepsExtension' },
  { id: 'Standing_Barbell_Calf_Raise', pose: 'calfRaise' },
  { id: 'Standing_Calf_Raises', pose: 'calfRaise' },
  { id: 'Leverage_Shoulder_Press', pose: 'shoulderPressMachine' },
  { id: 'Machine_Shoulder_Military_Press', pose: 'shoulderPressMachine' },
  { id: 'Leverage_Chest_Press', pose: 'chestPressMachine' },
  { id: 'Leverage_Incline_Chest_Press', pose: 'chestPressMachine' },
  { id: 'Machine_Bench_Press', pose: 'chestPressMachine' },
  { id: 'Butterfly', pose: 'pecDeck' },
  { id: 'Reverse_Machine_Flyes', pose: 'rearDeltFly' },
  { id: 'Triceps_Pushdown', pose: 'tricepsPushdown' },
  { id: 'Triceps_Pushdown_-_Rope_Attachment', pose: 'tricepsPushdown' },
  { id: 'Triceps_Pushdown_-_V-Bar_Attachment', pose: 'tricepsPushdown' },
  { id: 'Reverse_Grip_Triceps_Pushdown', pose: 'tricepsPushdown' },
  { id: 'Dumbbell_Bicep_Curl', pose: 'bicepCurl' },
  { id: 'Dumbbell_Alternate_Bicep_Curl', pose: 'bicepCurl' },
  { id: 'Thigh_Adductor', pose: 'hipAdduction' },
  { id: 'Cable_Hip_Adduction', pose: 'hipAdduction' },
  { id: 'Band_Hip_Adductions', pose: 'hipAdduction' },
  { id: 'Thigh_Abductor', pose: 'hipAbduction' },
];

const overrideById = new Map(POSE_OVERRIDES.map(row => [row.id, row.pose]));

function hasMuscle(exercise: PoseSubject, muscle: Muscle): boolean {
  return exercise.primaryMuscles.includes(muscle);
}

/**
 * Front or back pose for an exercise, or null when none of the drawn poses fits.
 * Side-view lifts (bench, squat, deadlift, row, hip thrust, lunge) stay null and
 * keep the muscle thumbnail. Rules use the pack name, equipment and muscles.
 */
export function poseForExercise(exercise: PoseSubject): PoseKey | null {
  const listed = overrideById.get(exercise.id);
  if (listed) return listed;
  const name = exercise.name;
  const equipment = exercise.equipment;

  if (/lat pulldown|v-bar pulldown|underhand cable pulldown|pulldown behind the neck/i.test(name)
    && hasMuscle(exercise, 'lats') && equipment === 'cable') return 'latPulldown';

  if (/\b(?:pull-?ups?|chin-?ups?|pullups)\b/i.test(name)
    && (hasMuscle(exercise, 'lats') || hasMuscle(exercise, 'middle back'))
    && !/rocky|scapular/i.test(name)) return 'pullUp';

  if (equipment === 'dumbbell' && hasMuscle(exercise, 'shoulders')
    && /shoulder press|arnold dumbbell press/i.test(name)) return 'shoulderPressDumbbell';

  if (equipment === 'dumbbell' && hasMuscle(exercise, 'shoulders')
    && /side lateral/i.test(name) && !/bent|lying|rear|pulley/i.test(name)) return 'lateralRaise';

  if (hasMuscle(exercise, 'shoulders') && !/row|sled|face pull|lying|bent/i.test(name)
    && /reverse fly|rear delt fly|rear delt raise|rear lateral|back fly/i.test(name)) return 'rearDeltFly';

  if (equipment === 'cable' && hasMuscle(exercise, 'chest')
    && /cross-?\s*over|cable flye?/i.test(name)
    && !/bench|lunge|lying|stride|jump/i.test(name)) return 'cableFly';

  if (equipment === 'dumbbell' && /shrug/i.test(name)
    && (hasMuscle(exercise, 'traps') || hasMuscle(exercise, 'middle back'))) return 'shrugDumbbell';

  if (/\bupright\b/i.test(name) && /\brow\b/i.test(name)
    && (equipment === 'barbell' || equipment === 'machine')) return 'uprightRow';

  if (equipment === 'dumbbell' && hasMuscle(exercise, 'triceps') && /tricep/i.test(name)
    && !/lying|decline|bent|kickback|skull|bench/i.test(name)) return 'overheadTricepsExtension';

  if (hasMuscle(exercise, 'calves') && /calf raises?/i.test(name)
    && !/seated|donkey|stretch|press|reverse/i.test(name)) return 'calfRaise';

  // Machine and custom names (Hevy imports such as "Lateral Raise (Machine)" become custom exercises).
  if (/chest press/i.test(name) && (equipment === 'machine' || /machine/i.test(name))) return 'chestPressMachine';
  if (/pec deck|butterfly/i.test(name)) return 'pecDeck';
  if (/shoulder press/i.test(name) && (equipment === 'machine' || /machine/i.test(name))) return 'shoulderPressMachine';
  if (/lateral raise/i.test(name) && (equipment === 'machine' || /machine/i.test(name))) return 'lateralRaiseMachine';
  if (/rear delt.*(fly|flye)|reverse (fly|flye)/i.test(name) && (equipment === 'machine' || /machine/i.test(name))) return 'rearDeltFly';
  if (/tricep.*push-?down|push-?down.*tricep|rope push-?down/i.test(name)) return 'tricepsPushdown';
  if (/\bbicep curl\b/i.test(name) && (equipment === 'dumbbell' || /dumbbell/i.test(name))) return 'bicepCurl';
  if (/hip adduction|thigh adductor/i.test(name)) return 'hipAdduction';
  if (/hip abduction|thigh abductor/i.test(name)) return 'hipAbduction';

  return null;
}

/** Body-map slugs for this exercise. Primary wins when a muscle is listed twice. */
export function highlightForExercise(exercise: PoseSubject): { primary: string[]; secondary: string[] } {
  const primary: string[] = [];
  const seenPrimary = new Set<string>();
  for (const muscle of exercise.primaryMuscles) {
    for (const slug of BODY_REGIONS[muscle] ?? []) {
      if (seenPrimary.has(slug)) continue;
      seenPrimary.add(slug);
      primary.push(slug);
    }
  }
  const secondary: string[] = [];
  const seenSecondary = new Set<string>();
  for (const muscle of exercise.secondaryMuscles) {
    if (exercise.primaryMuscles.includes(muscle)) continue;
    for (const slug of BODY_REGIONS[muscle] ?? []) {
      if (seenPrimary.has(slug) || seenSecondary.has(slug)) continue;
      seenSecondary.add(slug);
      secondary.push(slug);
    }
  }
  return { primary, secondary };
}

const builtPoses = new Map<string, BuiltPose>();

function builtKey(pose: PoseKey, exercise: PoseSubject): string {
  return pose + '\n' + [...exercise.primaryMuscles].sort().join(',')
    + '\n' + [...exercise.secondaryMuscles].sort().join(',');
}

/** One built figure per pose and muscle set. Theme colours are applied later, at draw time. */
export function cachedBuiltPose(exercise: PoseSubject): BuiltPose | null {
  const pose = poseForExercise(exercise);
  if (!pose) return null;
  const key = builtKey(pose, exercise);
  const cached = builtPoses.get(key);
  if (cached) return cached;
  const built = buildPose(pose, highlightForExercise(exercise));
  builtPoses.set(key, built);
  return built;
}
