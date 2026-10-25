/** The 17 pack categories are the single source for muscle IDs and map regions. */
export const MUSCLES = [
  'abdominals','abductors','adductors','biceps','calves','chest','forearms',
  'glutes','hamstrings','lats','lower back','middle back','neck','quadriceps',
  'shoulders','traps','triceps',
] as const;
export type Muscle = typeof MUSCLES[number];
export type ExerciseType = 'weighted' | 'dumbbell' | 'assisted' | 'bodyweight';
export type ExerciseSource = 'pack' | 'custom' | 'import';
export type Exercise = {
  id: string; name: string; aliases: string[]; equipment: string | null;
  type: ExerciseType; unilateral: boolean; primaryMuscles: Muscle[];
  secondaryMuscles: Muscle[]; instructions: string[];
  source: ExerciseSource; retired: boolean; packCategory: string | null;
};
export type PackExercise = {
  id: string; name: string; category: string; equipment: string | null;
  primaryMuscles: string[]; secondaryMuscles: string[]; instructions: string[];
};
export const MUSCLE_GROUPS = {
  Chest: ['chest'],
  Back: ['lats','middle back','lower back','traps'],
  Shoulders: ['shoulders'],
  Arms: ['biceps','triceps','forearms'],
  Legs: ['quadriceps','hamstrings','glutes','calves','abductors','adductors'],
  Core: ['abdominals'],
  Neck: ['neck'],
} as const satisfies Record<string, readonly Muscle[]>;
export const regionKey = (muscle: string): string => muscle.replace(/\s+/g, '').toLowerCase();
export const titleMuscle = (muscle: string): string => muscle.replace(/\b\w/g, c => c.toUpperCase());
