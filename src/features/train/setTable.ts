import {
  bidiIsolate, formatNumber, pluralForm, translate, type AppLanguage, type TranslationKey,
} from '../../i18n';
import { fromKg, sideLabel, type WeightUnit } from './workoutUnits';

/** Long-press a set row for about half a second to delete it. */
export const SET_HOLD_DELETE_MS = 500;

export const REST_PRESETS = [0, 60, 90, 120, 150, 180, 240] as const;

export type SetMark = 'working' | 'warm-up' | 'drop' | 'failure';

/** Working, then warm-up, drop and failure. One more tap returns to working. */
export const SET_MARK_ORDER: readonly SetMark[] = ['working', 'warm-up', 'drop', 'failure'];

export type SetColumnId = 'set' | 'previous' | 'weight' | 'reps' | 'effort' | 'check';

export type PlannedSet = {
  id: string;
  position: number;
  side: 'L' | 'R' | null;
  kind: 'working' | 'warm-up';
  /** Absent on a row built before the mark was stored. Null is a plain working set or warm-up. */
  mark?: 'drop' | 'failure' | null;
};

export type PlannedRow = {
  key: string;
  position: number;
  side: 'L' | 'R' | null;
  mark: SetMark;
  loggedId: string | null;
  /** 1-based among numbered working sets. Warm-up, drop and failure have none. */
  workingNumber: number | null;
};

export type DraftNumbers = {
  weightText: string;
  repsText: string;
  placeholderWeight: number | null;
  placeholderReps: number | null;
};

export type CommitResult =
  | { ok: true; weight: number; reps: number }
  | { ok: false; reason: 'weight' | 'reps' };

export function cycleSetMark(mark: SetMark): SetMark {
  const index = SET_MARK_ORDER.indexOf(mark);
  return SET_MARK_ORDER[(index + 1) % SET_MARK_ORDER.length] ?? 'working';
}

const MARK_GLYPH: Record<'warm-up' | 'drop' | 'failure', string> = {
  'warm-up': 'W',
  drop: 'D',
  failure: 'F',
};

export function setMarkGlyph(mark: SetMark, workingNumber: number): string {
  if (mark === 'working') return String(workingNumber);
  return MARK_GLYPH[mark];
}

/** Drop and failure stay working sets in the database. Only a warm-up changes kind. */
export function persistedKind(mark: SetMark): 'working' | 'warm-up' {
  return mark === 'warm-up' ? 'warm-up' : 'working';
}

/** The sets.mark column. Working and warm-up store null so kind keeps its old meaning. */
export function persistedMark(mark: SetMark): 'drop' | 'failure' | null {
  return mark === 'drop' || mark === 'failure' ? mark : null;
}

export function setMarkFromStored(kind: 'working' | 'warm-up', mark: string | null | undefined): SetMark {
  if (kind === 'warm-up') return 'warm-up';
  if (mark === 'drop' || mark === 'failure') return mark;
  return 'working';
}

/** Logical order. A row laid out as flexDirection 'row' mirrors in RTL, so SET sits on the right. */
export function setTableColumns(options: { effort: boolean; check: boolean }): SetColumnId[] {
  const columns: SetColumnId[] = ['set', 'previous', 'weight', 'reps'];
  if (options.effort) columns.push('effort');
  if (options.check) columns.push('check');
  return columns;
}

/** Left-to-right visual order after mirroring. RTL ends with SET. */
export function visualColumnOrder<T>(columns: readonly T[], rtl: boolean): T[] {
  return rtl ? [...columns].reverse() : [...columns];
}

function parseWeight(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'));
  if (!Number.isFinite(value) || value < 0 || value > 10000) return null;
  return value;
}

function parseReps(text: string): number | null {
  const value = Number(text.trim());
  if (!Number.isInteger(value) || value < 1 || value > 500) return null;
  return value;
}

/**
 * Placeholders are not a logged payload. Only ✓ calls this, and an empty field
 * takes the placeholder at that moment. A typed field wins over the placeholder.
 */
export function commitSetDraft(draft: DraftNumbers): CommitResult {
  const weightEmpty = draft.weightText.trim() === '';
  const repsEmpty = draft.repsText.trim() === '';
  const weight = weightEmpty ? draft.placeholderWeight : parseWeight(draft.weightText);
  const reps = repsEmpty ? draft.placeholderReps : parseReps(draft.repsText);
  if (weight === null || !Number.isFinite(weight) || weight < 0) return { ok: false, reason: 'weight' };
  if (reps === null || !Number.isInteger(reps) || reps < 1) return { ok: false, reason: 'reps' };
  return { ok: true, weight, reps };
}

/** Reading a row does not log it. Suggested numbers stay unsaved until ✓. */
export function uncheckedRowPayload(): null {
  return null;
}

export function previousForWorkingSet<T extends { position: number; side: 'L' | 'R' | null }>(
  history: readonly T[], position: number, side: 'L' | 'R' | null,
): T | null {
  return history.find(set => set.position === position && set.side === side) ?? null;
}

export function previousCellText(
  language: AppLanguage, weightKg: number, reps: number, unit: WeightUnit,
): string {
  const weight = formatNumber(language, fromKg(weightKg, unit), { maximumFractionDigits: 2 });
  const repsText = formatNumber(language, reps);
  return bidiIsolate(language, weight + ' × ' + repsText);
}

function spokenUnit(language: AppLanguage, unit: WeightUnit): string {
  return translate(language, unit === 'kg' ? 'workout.kilograms' : 'workout.pounds');
}

function spokenNumber(language: AppLanguage, value: number): string {
  return bidiIsolate(language, formatNumber(language, value, { maximumFractionDigits: 2 }));
}

export function setRowAccessibilityLabel(input: {
  language: AppLanguage;
  setLabel: string;
  previousKg: number | null;
  previousReps: number | null;
  weightKg: number | null;
  reps: number | null;
  unit: WeightUnit;
  logged: boolean;
}): string {
  const { language, unit } = input;
  const previous = input.previousKg === null || input.previousReps === null
    ? translate(language, 'workout.previousNone')
    : translate(language, 'workout.previousTimes', {
      weight: spokenNumber(language, fromKg(input.previousKg, unit)),
      unit: spokenUnit(language, unit),
      reps: spokenNumber(language, input.previousReps),
    });
  const weight = input.weightKg === null
    ? translate(language, 'workout.previousNone')
    : translate(language, 'workout.weightSpoken', {
      weight: spokenNumber(language, fromKg(input.weightKg, unit)),
      unit: spokenUnit(language, unit),
    });
  const reps = input.reps === null
    ? translate(language, 'workout.previousNone')
    : translate(language, (`workout.repsSpoken.${pluralForm(language, input.reps)}`) as TranslationKey, {
      count: spokenNumber(language, input.reps),
    });
  return translate(language, 'workout.rowA11y', {
    set: bidiIsolate(language, input.setLabel),
    previous,
    weight,
    reps,
    state: translate(language, input.logged ? 'workout.logged' : 'workout.notLogged'),
  });
}

export function rowKey(sessionExerciseId: string, position: number, side: 'L' | 'R' | null): string {
  return sessionExerciseId + ':' + String(position) + ':' + (side ?? 'both');
}

function markFor(
  key: string, logged: PlannedSet | null, marks: Readonly<Record<string, SetMark>>,
): SetMark {
  const chosen = (logged ? marks[logged.id] : undefined) ?? marks[key];
  if (chosen) return chosen;
  if (!logged) return 'working';
  return setMarkFromStored(logged.kind, logged.mark);
}

/** Visible set name in History and on the exercise screen. Drop and failure stay D and F. */
export function historySetTitle(language: AppLanguage, input: {
  kind: 'working' | 'warm-up';
  mark?: string | null;
  position: number;
}): string {
  const shown = setMarkFromStored(input.kind, input.mark);
  if (shown === 'warm-up') return translate(language, 'sessionDetail.warmup');
  if (shown === 'drop' || shown === 'failure') return setMarkGlyph(shown, 0);
  return translate(language, 'sessionDetail.set', { count: input.position + 1 });
}

/** Spoken name for a drop or failure set. Other sets use the same words as the title. */
export function historySetSpoken(language: AppLanguage, input: {
  kind: 'working' | 'warm-up';
  mark?: string | null;
  position: number;
}): string {
  const shown = setMarkFromStored(input.kind, input.mark);
  if (shown === 'drop') return translate(language, 'workout.drop');
  if (shown === 'failure') return translate(language, 'workout.failure');
  return historySetTitle(language, input);
}

/** One line of logged sets. Drop and failure keep the D and F glyphs from the set table. */
export function markedSetLine(
  language: AppLanguage,
  sets: readonly {
    kind: 'working' | 'warm-up';
    mark?: string | null;
    weight: number;
    reps: number;
    side?: 'L' | 'R' | null;
  }[],
  unit: WeightUnit,
): string {
  return sets.map(set => {
    const shown = setMarkFromStored(set.kind, set.mark);
    const cell = previousCellText(language, set.weight, set.reps, unit);
    const glyph = shown === 'working' ? '' : setMarkGlyph(shown, 0) + ' ';
    const side = set.side ? ' ' + sideLabel(set.side, language) : '';
    return glyph + cell + side;
  }).join(' · ');
}

/** Rows for one exercise: planned working slots, logged extras, and legacy warm-ups. */
export function buildSetRows(input: {
  sessionExerciseId: string;
  targetSets: number;
  unilateral: boolean;
  extraRows: number;
  sets: readonly PlannedSet[];
  marks: Readonly<Record<string, SetMark>>;
  hidden?: ReadonlySet<string>;
}): PlannedRow[] {
  const sides: ('L' | 'R' | null)[] = input.unilateral ? ['L', 'R'] : [null];
  const planned = Math.max(0, input.targetSets) + Math.max(0, input.extraRows);
  const positions = new Set<number>();
  for (let position = 0; position < planned; position += 1) positions.add(position);
  for (const set of input.sets) if (set.position < 99) positions.add(set.position);
  const rows: PlannedRow[] = [];
  const legacy = input.sets
    .filter(set => set.kind === 'warm-up' && set.position >= 99)
    .sort((a, b) => a.position - b.position || (a.side ?? '').localeCompare(b.side ?? ''));
  for (const set of legacy) {
    const key = rowKey(input.sessionExerciseId, set.position, set.side);
    rows.push({
      key, position: set.position, side: set.side,
      mark: markFor(key, set, input.marks), loggedId: set.id, workingNumber: null,
    });
  }
  let workingNumber = 0;
  for (const position of [...positions].sort((a, b) => a - b)) {
    const drafted = sides.map(side => {
      const logged = input.sets.find(set => set.position === position && set.side === side
        && !(set.kind === 'warm-up' && set.position >= 99)) ?? null;
      const key = rowKey(input.sessionExerciseId, position, side);
      return { side, logged, key, mark: markFor(key, logged, input.marks) };
    }).filter(row => row.logged || !input.hidden?.has(row.key));
    if (drafted.some(row => row.mark === 'working')) workingNumber += 1;
    for (const row of drafted) {
      rows.push({
        key: row.key, position, side: row.side, mark: row.mark, loggedId: row.logged?.id ?? null,
        workingNumber: row.mark === 'working' ? workingNumber : null,
      });
    }
  }
  return rows;
}
