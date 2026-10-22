import type { ConfigContext, ExpoConfig } from 'expo/config';

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
  name: 'Liftria Diagnostics',
  slug: 'liftria',
  scheme: 'liftria',
  version: '0.0.1',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  experiments: { typedRoutes: true },
  android: {
    package: 'com.liftria.diagnostics',
    versionCode: 1,
    permissions: [...healthReadPermissions, 'android.permission.INTERNET'],
    allowBackup: false,
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
  },
  plugins: [
    'expo-router',
    ['expo-image-picker', { cameraPermission: false, microphonePermission: false }],
    ['expo-sqlite', { useSQLCipher: false }],
    'expo-secure-store',
    'react-native-health-connect',
    ['expo-build-properties', {
      android: { minSdkVersion: 26, compileSdkVersion: 36, targetSdkVersion: 36, usesCleartextTraffic: false },
    }],
  ],
});
