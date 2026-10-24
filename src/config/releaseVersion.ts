/**
 * Single source of release numbering for app.config.ts and APK verification.
 *
 * Increment androidCode whenever publishing a new signed APK to friends. Rebuilding
 * a given release is fine; shipping the same or lower code as an update is not.
 * Never change the Android application ID or release keystore during updates.
 */
export const releaseVersion = {
  name: '0.1.0',
  androidCode: 2,
} as const;
