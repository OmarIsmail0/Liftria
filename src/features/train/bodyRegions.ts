import type { Slug } from 'react-native-body-highlighter';
import { MUSCLES, regionKey, type Muscle } from '../../services/database/gymTypes';

/** Liftria's 17 stable muscle IDs remain distinct in text, even when artwork shares an SVG region. */
export const BODY_REGIONS: Record<Muscle, readonly Slug[]> = {
  abdominals: ['abs', 'obliques'],
  abductors: ['gluteal'],
  adductors: ['adductors'],
  biceps: ['biceps'],
  calves: ['calves'],
  chest: ['chest'],
  forearms: ['forearm'],
  glutes: ['gluteal'],
  hamstrings: ['hamstring'],
  lats: ['upper-back'],
  'lower back': ['lower-back'],
  'middle back': ['upper-back'],
  neck: ['neck'],
  quadriceps: ['quadriceps'],
  shoulders: ['deltoids'],
  traps: ['trapezius'],
  triceps: ['triceps'],
};
export type MuscleShade = 'higher' | 'some' | 'low' | 'untrained';
export type BodyIntensity = 'primary' | 'secondary' | MuscleShade;
export const DRAWN_REGIONS = Object.keys(BODY_REGIONS).map(regionKey).sort();
export const BUNDLED_REGIONS = MUSCLES.map(regionKey).sort();

const priority: Record<BodyIntensity, number> = {
  primary: 6, higher: 5, secondary: 4, some: 3, low: 2, untrained: 1,
};
export function mapBodyRegions(
  primary: readonly Muscle[], secondary: readonly Muscle[],
  shading?: Partial<Record<Muscle, MuscleShade>>, selected?: Muscle | null,
): Map<Slug, BodyIntensity> {
  const result = new Map<Slug, BodyIntensity>();
  for (const muscle of MUSCLES) {
    const intensity: BodyIntensity | null =
      muscle === selected || primary.includes(muscle) ? 'primary' :
      shading?.[muscle] ?? (secondary.includes(muscle) ? 'secondary' : null);
    if (!intensity) continue;
    for (const slug of BODY_REGIONS[muscle]) {
      const old = result.get(slug);
      if (!old || priority[intensity] > priority[old]) result.set(slug, intensity);
    }
  }
  return result;
}
const front = new Set<Slug>(['abs', 'obliques', 'adductors', 'biceps', 'chest', 'quadriceps']);
const back = new Set<Slug>(['gluteal', 'hamstring', 'upper-back', 'lower-back', 'trapezius', 'triceps']);
/** Prefer the side with the most primary highlighted artwork, ties go to front. */
export function preferredBodySide(primary: readonly Muscle[]): 'front' | 'back' {
  let f = 0, b = 0;
  for (const muscle of primary) {
    for (const slug of BODY_REGIONS[muscle]) {
      if (front.has(slug)) f++;
      if (back.has(slug)) b++;
    }
  }
  return b > f ? 'back' : 'front';
}
