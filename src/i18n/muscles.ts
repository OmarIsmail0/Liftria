import { titleMuscle, type Muscle } from '../services/database/gymTypes';
import { translate, type AppLanguage, type TranslationKey } from './index';

/** Muscle IDs, exercise IDs and imported names remain English; only labels localize. */
const labels: Record<Muscle, TranslationKey> = {
  "abdominals": "muscle.abdominals",
  "abductors": "muscle.abductors",
  "adductors": "muscle.adductors",
  "biceps": "muscle.biceps",
  "calves": "muscle.calves",
  "chest": "muscle.chest",
  "forearms": "muscle.forearms",
  "glutes": "muscle.glutes",
  "hamstrings": "muscle.hamstrings",
  "lats": "muscle.lats",
  "lower back": "muscle.lower back",
  "middle back": "muscle.middle back",
  "neck": "muscle.neck",
  "quadriceps": "muscle.quadriceps",
  "shoulders": "muscle.shoulders",
  "traps": "muscle.traps",
  "triceps": "muscle.triceps",
};
export function muscleLabel(language: AppLanguage, muscle: Muscle): string {
  return language === 'en' ? titleMuscle(muscle) : translate(language, labels[muscle]);
}
