import type { AppLanguage } from '../../i18n';
import { displayRest, restAt, restVisual } from './restClock';

/** After the deadline, the bar stays on "Rest over" for three seconds, then hides. */
export const REST_OVER_HOLD_MS = 3000;

export type RestBarPhase =
  | { phase: 'hidden' }
  | { phase: 'running'; label: string; fraction: number }
  | { phase: 'over'; label: string };

/**
 * The bar reads the same absolute deadline as the ongoing notification.
 * Time comes from the wall clock, never from an interval counter.
 */
export function restBarPhase(
  deadline: string | null,
  loggedAt: string | null,
  plannedSec: number,
  nowMs: number = Date.now(),
  language: AppLanguage = 'en',
): RestBarPhase {
  const state = restAt(deadline, nowMs);
  if (!deadline || state.status === 'idle') return { phase: 'hidden' };
  if (state.status === 'running') {
    const visual = restVisual(deadline, loggedAt, plannedSec, nowMs, language);
    return { phase: 'running', label: visual.label, fraction: visual.fraction };
  }
  const end = Date.parse(deadline);
  if (Number.isFinite(end) && nowMs >= end && nowMs - end < REST_OVER_HOLD_MS) {
    return { phase: 'over', label: displayRest(deadline, nowMs, language) };
  }
  return { phase: 'hidden' };
}
