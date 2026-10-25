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
export function displayRest(deadline: string | null, nowMs: number = Date.now()): string {
  const state = restAt(deadline, nowMs);
  if (state.status === 'idle') return 'No rest timer';
  if (state.status === 'over') return 'Rest over';
  const seconds = Math.ceil(state.remainingMs / 1000);
  const minutes = Math.floor(seconds / 60);
  return minutes + ':' + String(seconds % 60).padStart(2, '0');
}
export function elapsedLabel(startedAt: string, nowMs: number = Date.now()): string {
  const start = Date.parse(startedAt);
  const seconds = Number.isFinite(start) ? Math.max(0, Math.floor((nowMs - start) / 1000)) : 0;
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}
/** Only four TalkBack announcements per rest, not once per second. */
export function restAnnouncement(previousMs: number, currentMs: number): string | null {
  for (const [threshold, description] of [[30000,'30 seconds'],[10000,'10 seconds'],[0,'Rest over']] as const) {
    if (previousMs > threshold && currentMs <= threshold) return description;
  }
  return null;
}
