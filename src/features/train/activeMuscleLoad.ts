import { MUSCLES, type Exercise, type Muscle } from '../../services/database/gymTypes';
import type { ActiveWorkout } from './workoutData';

export type ActiveMuscleSummary = {
  credit: Record<Muscle,number>;
  primary: Muscle[]; secondary: Muscle[]; completedSets: number;
};
/** Count only completed working sets; an L/R pair gets one credit, warm-ups get none. */
export function summarizeActiveMuscles(
  workout: ActiveWorkout,
  exerciseLookup: Readonly<Record<string, Exercise>>,
): ActiveMuscleSummary {
  const credit = Object.fromEntries(MUSCLES.map(m=>[m,0])) as Record<Muscle,number>;
  const primary = new Set<Muscle>();
  const secondary = new Set<Muscle>();
  let completedSets = 0;
  for (const exercise of workout.exercises) {
    const detail = exerciseLookup[exercise.exerciseId];
    if (!detail) continue;
    const groups = new Map<number, Set<'L'|'R'|'both'>>();
    for (const set of workout.sets) {
      if (set.sessionExerciseId !== exercise.id || set.kind !== 'working' || set.reps <= 0) continue;
      const sides = groups.get(set.position) ?? new Set<'L'|'R'|'both'>();
      sides.add(set.side === null ? 'both' : set.side);
      groups.set(set.position, sides);
    }
    for (const sides of groups.values()) {
      if (exercise.unilateral && !sides.has('both') && !(sides.has('L') && sides.has('R'))) continue;
      completedSets++;
      for (const muscle of detail.primaryMuscles) {
        credit[muscle] += 1;
        primary.add(muscle);
      }
      for (const muscle of detail.secondaryMuscles) {
        if (detail.primaryMuscles.includes(muscle)) continue;
        credit[muscle] += 0.5;
        secondary.add(muscle);
      }
    }
  }
  return {credit, primary:[...primary], secondary:[...secondary].filter(m=>!primary.has(m)),completedSets};
}
