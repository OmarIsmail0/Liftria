import { Platform, Settings } from 'react-native';
import { devRoutesEnabled } from './devRoutes';

/** iOS user-defaults key the iPhone screenshot check sets before each launch. */
export const CHECK_ROUTE_KEY = 'liftriaCheckRoute';

/**
 * The route the iPhone screenshot check asks the app to open at launch. A deep link would show
 * iOS's "Open in Liftria?" prompt on the simulator, so the check writes the route to the app's
 * user defaults instead (`simctl spawn … defaults write`). Only CI builds with the developer
 * routes read it; a store build always returns null.
 */
export function screenshotRoute(
  read: (key: string) => unknown = key => Settings.get(key),
  os: string = Platform.OS,
  enabled: boolean = devRoutesEnabled(),
): string | null {
  if (os !== 'ios' || !enabled) return null;
  const value = read(CHECK_ROUTE_KEY);
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : null;
}
