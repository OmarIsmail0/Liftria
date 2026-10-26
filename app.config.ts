import type { ConfigContext, ExpoConfig } from 'expo/config';
import releaseVersion from './src/config/releaseVersion.json';
import { resolveAndroidVersionCode } from './src/config/androidVersion';

const healthReadPermissions = [
  'android.permission.health.READ_STEPS',
  'android.permission.health.READ_HEART_RATE',
  'android.permission.health.READ_ACTIVE_CALORIES_BURNED',
  'android.permission.health.READ_TOTAL_CALORIES_BURNED',
  'android.permission.health.READ_BASAL_METABOLIC_RATE',
  'android.permission.health.READ_EXERCISE',
  'android.permission.health.READ_SLEEP',
  'android.permission.health.READ_WEIGHT',
  'android.permission.health.READ_BODY_FAT',
  'android.permission.health.READ_LEAN_BODY_MASS',
  'android.permission.health.READ_HEALTH_DATA_HISTORY',
];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Liftria',
  slug: 'liftria',
  scheme: 'liftria',
  version: releaseVersion.name,
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  experiments: { typedRoutes: true },
  ios: {
    bundleIdentifier: 'com.liftria.app',
    supportsTablet: false,
  },
  // iPhone system texts (app name under the icon, permission prompts) in English and Arabic.
  locales: { en: './locales/en.json', ar: './locales/ar.json' },
  android: {
    package: 'com.liftria.app',
    versionCode: resolveAndroidVersionCode(process.env.LIFTRIA_ANDROID_VERSION_CODE, releaseVersion.androidCode),
    permissions: [...healthReadPermissions, 'android.permission.INTERNET', 'android.permission.POST_NOTIFICATIONS'],
    allowBackup: false,
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.USE_EXACT_ALARM',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      // expo-image-picker adds these for Android 12 and older; the system picker needs no storage permission.
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ],
  },
  plugins: [
    'expo-router',
    'expo-notifications',
    'expo-splash-screen',
    // Camera (owner, 2026-10-26): only when the user taps "Take a photo" for a Hiku estimate.
    // The plugin also writes the iPhone permission texts (NSCameraUsageDescription etc.).
    ['expo-image-picker', {
      cameraPermission: 'Liftria uses the camera only when you take a meal photo for a Hiku estimate.',
      photosPermission: 'Liftria opens your photos only when you choose a meal photo for a Hiku estimate.',
      microphonePermission: false,
    }],
    // iPhone: right to left from the first launch on an Arabic phone (Android uses the plugin below).
    ['expo-localization', { supportsRTL: true }],
    ['expo-sqlite', { useSQLCipher: false }],
    'expo-secure-store',
    // RTL from the first launch on an Arabic phone (otherwise only after a restart).
    './plugins/withArabicFirstLaunchRtl',
    'react-native-health-connect',
    ['expo-build-properties', {
      android: { minSdkVersion: 28, compileSdkVersion: 36, targetSdkVersion: 36, usesCleartextTraffic: false },
    }],
  ],
});
