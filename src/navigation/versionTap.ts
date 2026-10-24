/** Internal seven-tap developer entry, reset when the gap exceeds two seconds. */
export const VERSION_TAP_TIMEOUT_MS = 2_000;
export const VERSION_TAPS_TO_UNLOCK = 7;

export type VersionTapState = Readonly<{ count: number; lastTapAt: number | null }>;

export const initialVersionTapState: VersionTapState = { count: 0, lastTapAt: null };

export function advanceVersionTap(previous: VersionTapState, now: number): {
  state: VersionTapState; unlocked: boolean;
} {
  // A backwards system-clock adjustment is treated as an expired gesture.
  const withinWindow = previous.lastTapAt !== null && now >= previous.lastTapAt &&
    now - previous.lastTapAt <= VERSION_TAP_TIMEOUT_MS;
  const count = (withinWindow ? previous.count : 0) + 1;
  if (count >= VERSION_TAPS_TO_UNLOCK) {
    return { state: initialVersionTapState, unlocked: true };
  }
  return { state: { count, lastTapAt: now }, unlocked: false };
}
