import configure from '../../../app.config';

const fs = jest.requireActual('fs') as {
  readFileSync: (path: string, encoding: 'utf8') => string;
  readdirSync: (path: string) => string[];
};
const { join } = jest.requireActual('path') as { join: (...p: string[]) => string };
const read = (...parts: string[]) => fs.readFileSync(join(process.cwd(), ...parts), 'utf8');

const config = configure({ config: { name: 'Liftria', slug: 'liftria' } } as Parameters<typeof configure>[0]);

describe('Android release configuration', () => {
  it('has the store identity and the supported SDK range', () => {
    expect(config.android?.package).toBe('com.liftria.app');
    expect(config.ios?.bundleIdentifier).toBe('com.liftria.app');
    expect(config.orientation).toBe('portrait');
    expect(config.userInterfaceStyle).toBe('automatic');
    const props = config.plugins?.find(p => Array.isArray(p) && p[0] === 'expo-build-properties') as
      [string, { android: Record<string, unknown> }];
    expect(props[1].android).toMatchObject({ minSdkVersion: 28, targetSdkVersion: 36, usesCleartextTraffic: false });
  });

  it('asks only for the permissions the app uses', () => {
    expect([...(config.android?.permissions ?? [])].sort()).toEqual([
      'android.permission.INTERNET',
      'android.permission.POST_NOTIFICATIONS',
      ...[
        'READ_ACTIVE_CALORIES_BURNED', 'READ_BASAL_METABOLIC_RATE', 'READ_BODY_FAT', 'READ_EXERCISE',
        'READ_HEALTH_DATA_HISTORY', 'READ_HEART_RATE', 'READ_LEAN_BODY_MASS', 'READ_SLEEP', 'READ_STEPS',
        'READ_TOTAL_CALORIES_BURNED', 'READ_WEIGHT',
      ].map(n => `android.permission.health.${n}`),
    ].sort());
    // Health Connect is read-only: no write permission anywhere.
    expect((config.android?.permissions ?? []).some(p => /\.WRITE_|FOREGROUND_SERVICE|ALARM/.test(p))).toBe(false);
  });

  it('blocks alarm, boot, overlay, microphone and storage permissions that libraries add', () => {
    expect(config.android?.blockedPermissions).toEqual(expect.arrayContaining([
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.USE_EXACT_ALARM',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ]));
  });

  it('keeps the database and the API key out of Android cloud backup and device transfer', () => {
    expect(config.android?.allowBackup).toBe(false);
    // expo-secure-store also writes exclusion rules; it must stay in the plugin list.
    expect(config.plugins).toContain('expo-secure-store');
  });

  it('has Arabic and English iPhone system texts and a read-only Health prompt', () => {
    for (const lang of ['en', 'ar']) {
      const strings = JSON.parse(read('locales', `${lang}.json`)).ios as Record<string, string>;
      for (const key of ['CFBundleDisplayName', 'NSCameraUsageDescription', 'NSPhotoLibraryUsageDescription', 'NSHealthShareUsageDescription']) {
        expect(strings[key]).toBeTruthy();
      }
    }
  });
});

describe('developer-only surfaces are unreachable in a store build', () => {
  it('guards every app/dev route with one layout that redirects home', () => {
    const layout = read('app', 'dev', '_layout.tsx');
    expect(layout).toContain('if (!devRoutesEnabled()) return <Redirect href="/" />');
    // A dev screen must never live outside app/dev, where that layout would not protect it.
    const all = (dir: string): string[] => fs.readdirSync(join(process.cwd(), dir))
      .flatMap(name => (/\.tsx?$/.test(name) ? [join(dir, name)] : /\./.test(name) ? [] : all(join(dir, name))));
    const outside = all('app').filter(f => !f.startsWith(join('app', 'dev')) && /(demo|diagnostics|rest-spike)/i.test(f));
    expect(outside).toEqual([]);
  });

  it('gates the demo backup preview and the dev menu behind the same flag', () => {
    expect(read('app', 'settings', 'data.tsx')).toContain("demoBackup==='1'&&devRoutesEnabled()");
    expect(read('app', 'settings', 'index.tsx')).toContain('devRoutesEnabled()');
  });

  it('only a non-store CI build sets the bundle flag', () => {
    const workflow = read('.github', 'workflows', 'phase0.yml');
    expect(workflow).toMatch(/EXPO_PUBLIC_LIFTRIA_DEV_ROUTES: \$\{\{ steps\.release_signing\.outputs\.ready == 'true' && '0' \|\| '1' \}\}/);
  });
});
