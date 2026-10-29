import type { AppLanguage } from './index';
import type { Exercise } from '../services/database/gymTypes';
import { EXERCISE_INSTRUCTIONS_AR } from './exerciseInstructionsAr';

type InstructionExercise = Pick<Exercise, 'id' | 'source' | 'instructions'>;

export type LocalizedInstructions = {
  steps: string[];
  /** The original English pack steps are shown in Arabic mode because there is no translation. */
  untranslated: boolean;
};

/** Display-only localization: never mutate the pack, the exercise or the stored instruction steps. */
export function localizedExerciseInstructions(
  language: AppLanguage, exercise: InstructionExercise,
): LocalizedInstructions {
  if (language !== 'ar' || exercise.source !== 'pack') {
    return { steps: exercise.instructions, untranslated: false };
  }
  if (Object.prototype.hasOwnProperty.call(EXERCISE_INSTRUCTIONS_AR, exercise.id)) {
    return { steps: EXERCISE_INSTRUCTIONS_AR[exercise.id]!, untranslated: false };
  }
  return { steps: exercise.instructions, untranslated: exercise.instructions.length > 0 };
}
