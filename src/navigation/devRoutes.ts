/**
 * The hidden developer screens (app/dev/*) exist only in development builds and in
 * builds that set EXPO_PUBLIC_LIFTRIA_DEV_ROUTES=1 at bundle time. CI sets it for every
 * APK except a properly signed release, so the emulator check keeps its demo routes
 * and the store build has none.
 */
export function devRoutesEnabled(
  flag: string | undefined = process.env.EXPO_PUBLIC_LIFTRIA_DEV_ROUTES,
  development: boolean = typeof __DEV__ !== 'undefined' && __DEV__,
): boolean {
  return development || flag === '1';
}
