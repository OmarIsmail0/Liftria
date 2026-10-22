/**
 * Resolve initial accessibility settings before showing the first app frame.
 * Any error or the 1.5s deadline fails closed to Solid / reduced motion.
 *
 * No late promise can change the initial decision: the result of Promise.race
 * is final. Later OS changes are handled by ThemeProvider event subscriptions.
 */
export type StartupAccessibility = {
  highTextContrast: boolean;
  reduceTransparency: boolean;
  reduceMotion: boolean;
  source: 'resolved' | 'fallback';
};

export type AccessibilityChecks = {
  highTextContrast: () => Promise<boolean>;
  reduceTransparency: () => Promise<boolean>;
  reduceMotion: () => Promise<boolean>;
};

const FALLBACK: StartupAccessibility = {
  highTextContrast: true,
  reduceTransparency: true,
  reduceMotion: true,
  source: 'fallback',
};

export async function resolveStartupAccessibility(
  checks: AccessibilityChecks,
  timeoutMs = 1500,
): Promise<StartupAccessibility> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<StartupAccessibility>(resolve => {
    timer = setTimeout(() => resolve(FALLBACK), timeoutMs);
  });
  const read = Promise.all([
    checks.highTextContrast(),
    checks.reduceTransparency(),
    checks.reduceMotion(),
  ]).then(([highTextContrast, reduceTransparency, reduceMotion]): StartupAccessibility => ({
    highTextContrast, reduceTransparency, reduceMotion, source: 'resolved',
  })).catch((): StartupAccessibility => FALLBACK);

  try {
    return await Promise.race([read, deadline]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
