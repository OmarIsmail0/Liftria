import { MUSCLE_GROUPS, type Muscle } from '../../services/database/gymTypes';

export const MUSCLE_FILTERS = ['all', 'chest', 'back', 'shoulders', 'arms', 'legs', 'core'] as const;
export type MuscleFilter = typeof MUSCLE_FILTERS[number];

export const EQUIPMENT_FILTERS = [
  'any', 'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'bands', 'other',
] as const;
export type EquipmentFilter = typeof EQUIPMENT_FILTERS[number];

const NAMED_EQUIPMENT: Record<Exclude<EquipmentFilter, 'any' | 'other'>, readonly string[]> = {
  barbell: ['barbell', 'e-z curl bar'],
  dumbbell: ['dumbbell', 'dumbbells'],
  machine: ['machine'],
  cable: ['cable'],
  bodyweight: ['body only', 'bodyweight'],
  kettlebell: ['kettlebell', 'kettlebells'],
  bands: ['bands', 'resistance band'],
};

const MUSCLE_FILTER_GROUP: Record<Exclude<MuscleFilter, 'all'>, readonly Muscle[]> = {
  chest: MUSCLE_GROUPS.Chest,
  back: MUSCLE_GROUPS.Back,
  shoulders: MUSCLE_GROUPS.Shoulders,
  arms: MUSCLE_GROUPS.Arms,
  legs: MUSCLE_GROUPS.Legs,
  core: MUSCLE_GROUPS.Core,
};

/** Pack equipment strings collapse into the picker chips. Unknown gear is Other. */
export function equipmentFilterOf(equipment: string | null): Exclude<EquipmentFilter, 'any'> {
  const key = equipment?.trim().toLowerCase() ?? '';
  if (!key) return 'bodyweight';
  for (const [group, values] of Object.entries(NAMED_EQUIPMENT) as [
    Exclude<EquipmentFilter, 'any' | 'other'>, readonly string[],
  ][]) {
    if (values.includes(key)) return group;
  }
  return 'other';
}

export function muscleFilterMatches(primary: readonly string[], filter: MuscleFilter): boolean {
  if (filter === 'all') return true;
  const group = MUSCLE_FILTER_GROUP[filter];
  return primary.some(muscle => group.includes(muscle as Muscle));
}

export function exerciseMatchesFilters(
  exercise: { equipment: string | null; primaryMuscles: readonly string[] },
  muscle: MuscleFilter,
  equipment: EquipmentFilter,
): boolean {
  if (!muscleFilterMatches(exercise.primaryMuscles, muscle)) return false;
  if (equipment === 'any') return true;
  return equipmentFilterOf(exercise.equipment) === equipment;
}
