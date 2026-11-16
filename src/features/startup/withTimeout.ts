/** Long enough for a slow phone to open and migrate the database, short enough that a
 * stuck open never leaves the user on the splash or a blank screen. */
export const STARTUP_TIMEOUT_MS = 15000;

/** Resolves to `fallback` when `task` neither resolves nor rejects in time. */
export function withTimeout<T>(task: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<T>(resolve => { timer = setTimeout(() => resolve(fallback), ms); });
  return Promise.race([task, deadline]).finally(() => clearTimeout(timer));
}
