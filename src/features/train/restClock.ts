import { translate, type AppLanguage } from '../../i18n';
/** The countdown is always derived from a persisted absolute deadline, never an interval counter. */
export type RestState = { status: 'idle' | 'running' | 'over'; remainingMs: number };
export function restDeadline(loggedAt: string, seconds: number): string {
  const start = Date.parse(loggedAt);
  if (!Number.isFinite(start) || !Number.isFinite(seconds) || seconds < 0)
    throw new Error('Invalid rest deadline');
  return new Date(start + Math.round(seconds * 1000)).toISOString();
}
export function restAt(deadline: string | null, nowMs: number = Date.now()): RestState {
  if (!deadline) return { status: 'idle', remainingMs: 0 };
  const end = Date.parse(deadline);
  if (!Number.isFinite(end)) return { status: 'idle', remainingMs: 0 };
  const remainingMs = Math.max(0, end - nowMs);
  return { status: remainingMs > 0 ? 'running' : 'over', remainingMs };
}
/** Rest adjustments are made against the remaining deadline; a negative result means rest is over. */
export function shiftRest(deadline: string | null, deltaSeconds: number, nowMs: number = Date.now()): string | null {
  if (!deadline || !Number.isFinite(Date.parse(deadline)) || !Number.isFinite(deltaSeconds)) return null;
  return new Date(Math.max(nowMs, Date.parse(deadline) + deltaSeconds * 1000)).toISOString();
}
export function displayRest(deadline: string | null, nowMs: number = Date.now(), language: AppLanguage = 'en'): string {
  const state = restAt(deadline, nowMs);
  if (state.status === 'idle') return translate(language, 'active.noRestTimer');
  if (state.status === 'over') return translate(language, 'active.restOver');
  const seconds = Math.ceil(state.remainingMs / 1000);
  const minutes = Math.floor(seconds / 60);
  return minutes + ':' + String(seconds % 60).padStart(2, '0');
}
export function elapsedLabel(startedAt: string, nowMs: number = Date.now()): string {
  const start = Date.parse(startedAt);
  const seconds = Number.isFinite(start) ? Math.max(0, Math.floor((nowMs - start) / 1000)) : 0;
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}
/** Delay until the next wall-clock second, so a timer doesn't drift ahead of the deadline. */
export function nextClockDelay(nowMs: number): number {
  const delay = 1000 - (nowMs % 1000);
  return delay === 0 ? 1000 : delay;
}
/**
 * Ring and label share the ceiled seconds. The total grows when rest is extended, so
 * +30 s does not pin the ring at full while the number shows the extra time.
 */
export function restVisual(
  deadline: string | null, loggedAt: string | null, plannedSec: number, nowMs: number, language: AppLanguage = 'en',
): { status: RestState['status']; remainingMs: number; totalMs: number; fraction: number; label: string } {
  const state = restAt(deadline, nowMs);
  const label = displayRest(deadline, nowMs, language);
  if (state.status !== 'running' || !deadline) {
    return { status: state.status, remainingMs: 0, totalMs: 0, fraction: 0, label };
  }
  const end = Date.parse(deadline);
  const start = loggedAt ? Date.parse(loggedAt) : Number.NaN;
  const plannedMs = Number.isFinite(plannedSec) && plannedSec > 0 ? Math.round(plannedSec * 1000) : 0;
  const spanMs = Number.isFinite(start) ? Math.max(0, end - start) : 0;
  const totalMs = Math.max(plannedMs, spanMs, state.remainingMs, 1000);
  const shown = Math.ceil(state.remainingMs / 1000);
  const totalShown = Math.max(1, Math.ceil(totalMs / 1000));
  return {
    status: 'running', remainingMs: state.remainingMs, totalMs, label,
    fraction: Math.max(0, Math.min(1, shown / totalShown)),
  };
}
/** A clock label fits the big metric; a word ("Rest over") uses a smaller line so it stays inside the ring. */
export function restOrbTextSize(label: string): 'metric-xl' | 'head' {
  return /^\d+:\d{2}$/.test(label) ? 'metric-xl' : 'head';
}
export type RestSetRef = {
  id: string; loggedAt: string; restDeadline: string | null; sessionExerciseId: string;
};
/**
 * Rest belongs to the latest logged set only, and only while that workout is still
 * in progress. An earlier deadline must not revive after a superset step, an undo or a finish.
 */
export function selectCurrentRest<T extends RestSetRef>(
  sets: readonly T[], workoutState: string, nowMs: number,
): { set: T | null; status: RestState['status']; remainingMs: number } {
  if (workoutState !== 'in-progress') return { set: null, status: 'idle', remainingMs: 0 };
  const latest = [...sets].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt) || b.id.localeCompare(a.id))[0];
  if (!latest?.restDeadline) return { set: null, status: 'idle', remainingMs: 0 };
  const state = restAt(latest.restDeadline, nowMs);
  if (state.status === 'idle') return { set: null, status: 'idle', remainingMs: 0 };
  return { set: latest, status: state.status, remainingMs: state.remainingMs };
}
/** Only four TalkBack announcements per rest, not once per second.
 * A jump (the app was backgrounded) announces the lowest threshold it crossed. */
export function restAnnouncement(previousMs: number, currentMs: number, language: AppLanguage = 'en'): string | null {
  let message: string | null = null;
  for (const [threshold, key] of [[30000, 'active.30seconds'], [10000, 'active.10seconds'], [0, 'active.restOver']] as const) {
    if (previousMs > threshold && currentMs <= threshold) message = translate(language, key);
  }
  return message;
}
