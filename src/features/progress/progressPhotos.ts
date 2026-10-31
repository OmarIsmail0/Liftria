import { bidiIsolate, formatNumber, weightUnitLabel, type AppLanguage } from '../../i18n';
import { fromKg, type WeightUnit } from '../train/workoutUnits';

export const PROGRESS_PHOTO_LONG_EDGE = 1080;
export const PROGRESS_PHOTO_JPEG_QUALITY = 0.7;
export const PROGRESS_PHOTO_BLUR = 24;
export const PROGRESS_PHOTO_MAX_BASE64 = 12_000_000;
export const POSES = ['front', 'side', 'back'] as const;
export type Pose = (typeof POSES)[number];

export type ProgressPhoto = {
  id: string;
  takenAt: string;
  pose: Pose;
  jpegBase64: string;
  width: number;
  height: number;
  note: string | null;
  source: 'liftria';
};

/** A photo on screen: a stored JPEG, or a drawn preview that is not a photograph. */
export type ProgressPhotoFrame = {
  id: string;
  takenAt: string;
  pose: Pose;
  note: string | null;
  image: { kind: 'jpeg'; base64: string } | { kind: 'drawing'; variant: 'a' | 'b' };
};

export function isPose(value: string): value is Pose {
  return (POSES as readonly string[]).includes(value);
}

export function frameFromPhoto(photo: ProgressPhoto): ProgressPhotoFrame {
  return {
    id: photo.id,
    takenAt: photo.takenAt,
    pose: photo.pose,
    note: photo.note,
    image: { kind: 'jpeg', base64: photo.jpegBase64 },
  };
}

/** Off until this visit's tap, unless Settings says to show photos without one. */
export function progressPhotosBlurred(showWithoutTap: boolean, revealedThisVisit: boolean): boolean {
  return !showWithoutTap && !revealedThisVisit;
}

export function resizeForProgressPhoto(width: number, height: number): { width?: number; height?: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('Invalid photo dimensions');
  }
  if (Math.max(width, height) <= PROGRESS_PHOTO_LONG_EDGE) return {};
  return width >= height ? { width: PROGRESS_PHOTO_LONG_EDGE } : { height: PROGRESS_PHOTO_LONG_EDGE };
}

export function groupPhotosByDay<T extends { id: string; takenAt: string }>(
  photos: readonly T[],
  dayOf: (takenAt: string) => string,
): { day: string; photos: T[] }[] {
  const sorted = [...photos].sort((a, b) => b.takenAt.localeCompare(a.takenAt) || b.id.localeCompare(a.id));
  const groups: { day: string; photos: T[] }[] = [];
  for (const photo of sorted) {
    const day = dayOf(photo.takenAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.photos.push(photo);
    else groups.push({ day, photos: [photo] });
  }
  return groups;
}

export function latestByPose<T extends { id: string; pose: Pose; takenAt: string }>(
  photos: readonly T[],
): { pose: Pose; photo: T | null }[] {
  return POSES.map(pose => {
    const matches = photos.filter(photo => photo.pose === pose)
      .sort((a, b) => b.takenAt.localeCompare(a.takenAt) || b.id.localeCompare(a.id));
    return { pose, photo: matches[0] ?? null };
  });
}

/** The latest logged weight on the photo's calendar day, or null when that day has none. */
export function loggedWeightKgOnDay(
  weights: readonly { at: string; kg: number }[],
  takenAt: string,
  dayOf: (iso: string) => string,
): number | null {
  const day = dayOf(takenAt);
  const matches = weights.filter(weight => dayOf(weight.at) === day && Number.isFinite(weight.kg) && weight.kg > 0);
  if (matches.length === 0) return null;
  matches.sort((a, b) => b.at.localeCompare(a.at));
  return matches[0]?.kg ?? null;
}

export function formatLoggedBodyWeight(language: AppLanguage, kg: number, storedUnit: WeightUnit): string {
  const shown = formatNumber(language, fromKg(kg, storedUnit), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return bidiIsolate(language, shown + '\u00A0' + weightUnitLabel(language, storedUnit));
}

/** One photo per day for a pose, earliest day first. A later photo that day replaces the earlier one. */
export function comparePhotosForPose<T extends { id: string; pose: Pose; takenAt: string }>(
  photos: readonly T[],
  pose: Pose,
  dayOf: (takenAt: string) => string,
): T[] {
  const byDay = new Map<string, T>();
  const ordered = photos.filter(photo => photo.pose === pose)
    .sort((a, b) => a.takenAt.localeCompare(b.takenAt) || a.id.localeCompare(b.id));
  for (const photo of ordered) byDay.set(dayOf(photo.takenAt), photo);
  return [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, photo]) => photo);
}

export function defaultCompareIds(options: readonly { id: string }[]): { earlierId: string; laterId: string } | null {
  const first = options[0];
  const last = options[options.length - 1];
  if (!first || !last || options.length < 2) return null;
  return { earlierId: first.id, laterId: last.id };
}

export function chooseComparePhoto(
  options: readonly { id: string }[],
  earlierId: string,
  laterId: string,
  pickedId: string,
): { earlierId: string; laterId: string } {
  if (pickedId === earlierId || pickedId === laterId) return { earlierId, laterId };
  const index = new Map(options.map((photo, place) => [photo.id, place]));
  const picked = index.get(pickedId);
  const earlier = index.get(earlierId);
  const later = index.get(laterId);
  if (picked === undefined || earlier === undefined || later === undefined) return { earlierId, laterId };
  if (picked < later && picked <= (earlier + later) / 2) return { earlierId: pickedId, laterId };
  if (picked > earlier) return { earlierId, laterId: pickedId };
  return { earlierId: pickedId, laterId };
}
