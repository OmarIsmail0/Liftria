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
    ],
  },
  plugins: [
    'expo-router',
    'expo-notifications',
    'expo-splash-screen',
    ['expo-image-picker', { cameraPermission: false, microphonePermission: false }],
    ['expo-sqlite', { useSQLCipher: false }],
    'expo-secure-store',
    'react-native-health-connect',
    ['expo-build-properties', {
      android: { minSdkVersion: 28, compileSdkVersion: 36, targetSdkVersion: 36, usesCleartextTraffic: false },
    }],
  ],
});
