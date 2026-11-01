import { useEffect, useState } from 'react';
import type { Muscle } from '../../services/database/gymTypes';
import { preferredBodySide } from './bodyRegions';

/** Fixed heights so SectionList / FlatList can skip measurement on a fast fling. */
export const EXERCISE_ROW_HEIGHT = 64;
export const EXERCISE_SECTION_HEADER_HEIGHT = 32;
/** Search waits this long after the last key before filtering 876 names. */
export const EXERCISE_SEARCH_DEBOUNCE_MS = 200;

export const exerciseListWindow = {
  initialNumToRender: 12,
  maxToRenderPerBatch: 10,
  windowSize: 7,
  updateCellsBatchingPeriod: 50,
} as const;

export function tintHex(hex: string, opacity: number): string {
  const normalized = hex.replace('#', '');
  const value = parseInt(normalized, 16);
  if (!Number.isFinite(value) || normalized.length !== 6) return hex;
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${opacity})`;
}

export interface ThumbnailColors {
  primary: string;
  secondary: string;
  idle: string;
}

export interface ThumbnailPaint {
  key: string;
  side: 'front' | 'back';
  head: string;
  shoulder: string;
  torso: string;
  arm: string;
  hip: string;
  leg: string;
  calf: string;
}

const FRONT = {
  head: ['neck'],
  shoulder: ['shoulders'],
  torso: ['chest', 'abdominals'],
  arm: ['biceps', 'forearms'],
  hip: ['adductors'],
  leg: ['quadriceps'],
  calf: ['calves'],
} as const;

const BACK = {
  head: ['neck'],
  shoulder: ['traps'],
  torso: ['lats', 'middle back', 'lower back'],
  arm: ['triceps', 'forearms'],
  hip: ['glutes', 'abductors'],
  leg: ['hamstrings'],
  calf: ['calves'],
} as const;

type ThumbnailSlot = keyof typeof FRONT;

const paints = new Map<string, ThumbnailPaint>();

function slotColor(
  muscles: readonly string[],
  primary: ReadonlySet<string>,
  secondary: ReadonlySet<string>,
  colors: ThumbnailColors,
): string {
  if (muscles.some(muscle => primary.has(muscle))) return colors.primary;
  if (muscles.some(muscle => secondary.has(muscle))) return colors.secondary;
  return colors.idle;
}

/** One paint per muscle pattern and color set. List rows share it instead of redrawing a body. */
export function thumbnailPaint(
  primary: readonly Muscle[],
  secondary: readonly Muscle[],
  colors: ThumbnailColors,
): ThumbnailPaint {
  const side = preferredBodySide(primary);
  const slots = side === 'back' ? BACK : FRONT;
  const primaryKey = [...primary].sort().join('\n');
  const secondaryKey = [...secondary].sort().join('\n');
  const key = [side, colors.primary, colors.secondary, colors.idle, primaryKey, secondaryKey].join('|');
  const cached = paints.get(key);
  if (cached) return cached;
  const primarySet = new Set<string>(primary);
  const secondarySet = new Set<string>(secondary);
  const color = (slot: ThumbnailSlot) => slotColor(slots[slot], primarySet, secondarySet, colors);
  const paint: ThumbnailPaint = {
    key,
    side,
    head: color('head'),
    shoulder: color('shoulder'),
    torso: color('torso'),
    arm: color('arm'),
    hip: color('hip'),
    leg: color('leg'),
    calf: color('calf'),
  };
  paints.set(key, paint);
  return paint;
}

export interface ExerciseRowIdentity {
  id: string;
  title: string;
  detail: string;
  thumbnailKey: string;
  themeKey: string;
}

export function exerciseThumbnailKey(primary: readonly string[], secondary: readonly string[]): string {
  return [...primary].sort().join('\n') + '\u0000' + [...secondary].sort().join('\n');
}

export function exerciseRowIdentity(
  id: string,
  title: string,
  detail: string,
  thumbnailKey: string,
  themeKey: string,
): ExerciseRowIdentity {
  return { id, title, detail, thumbnailKey, themeKey };
}

/** True when a memoized row can skip rendering. Object identity does not matter. */
export function exerciseRowIdentityEqual(previous: ExerciseRowIdentity, next: ExerciseRowIdentity): boolean {
  return previous.id === next.id
    && previous.title === next.title
    && previous.detail === next.detail
    && previous.thumbnailKey === next.thumbnailKey
    && previous.themeKey === next.themeKey;
}

export interface SectionFrameInput {
  letter: string;
  count: number;
}

export interface ListFrame {
  length: number;
  offset: number;
}

/**
 * SectionList inserts a header cell and a footer cell around every section,
 * including a search section whose header renders nothing.
 */
export function sectionListLayouts(sections: readonly SectionFrameInput[]): ListFrame[] {
  const frames: ListFrame[] = [];
  let offset = 0;
  const push = (length: number) => {
    frames.push({ length, offset });
    offset += length;
  };
  for (const section of sections) {
    push(section.letter === '' ? 0 : EXERCISE_SECTION_HEADER_HEIGHT);
    for (let index = 0; index < section.count; index += 1) push(EXERCISE_ROW_HEIGHT);
    push(0);
  }
  return frames;
}

export function frameAt(frames: readonly ListFrame[], index: number): { length: number; offset: number; index: number } {
  const frame = frames[index];
  if (frame) return { length: frame.length, offset: frame.offset, index };
  const last = frames[frames.length - 1];
  return { length: 0, offset: last ? last.offset + last.length : 0, index };
}

export function flatListItemLayout(_data: unknown, index: number): { length: number; offset: number; index: number } {
  return { length: EXERCISE_ROW_HEIGHT, offset: EXERCISE_ROW_HEIGHT * index, index };
}

/** The field updates immediately. Filtering uses the value from `delayMs` ago. */
export function useDeferredQuery(value: string, delayMs: number): string {
  const [deferred, setDeferred] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDeferred(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);
  return deferred;
}
