/** What the day summary may show. An unlogged day is not a measured zero. */
export type DaySummaryKind =
  | { kind: 'hidden'; progress: number | null; message: 'orb.hidden' | 'orb.onTrack' | 'orb.over' }
  | { kind: 'unlogged' }
  | { kind: 'open'; eaten: number }
  | { kind: 'within'; eaten: number; target: number; left: number; progress: number }
  | { kind: 'over'; eaten: number; target: number; over: number };

export function daySummaryKind(logged: boolean, eaten: number, target: number | null, hidden: boolean): DaySummaryKind {
  const safe = Math.max(0, Math.round(Number.isFinite(eaten) ? eaten : 0));
  if (hidden) {
    const progress = target === null ? null : Math.min(1, target > 0 ? safe / target : 0);
    const message = target === null ? 'orb.hidden' as const : safe > target ? 'orb.over' as const : 'orb.onTrack' as const;
    return { kind: 'hidden', progress, message };
  }
  if (!logged) return { kind: 'unlogged' };
  if (target === null || !(target > 0)) return { kind: 'open', eaten: safe };
  const left = target - safe;
  if (left >= 0) return { kind: 'within', eaten: safe, target, left, progress: Math.min(1, safe / target) };
  return { kind: 'over', eaten: safe, target, over: -left };
}

/** A fill needs both a real amount and a positive goal. Null is unknown, not zero. */
export function macroFill(amount: number | null, goal: number | null): number | null {
  if (amount === null || goal === null || !(goal > 0) || !Number.isFinite(amount)) return null;
  return Math.min(1, Math.max(0, amount / goal));
}

/** Noon on a real calendar day, so a date heading is not shifted by UTC. */
export function diaryDate(day: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = Number(match[3]);
  const parsed = new Date(year, month - 1, date, 12);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== date) return null;
  return parsed;
}
