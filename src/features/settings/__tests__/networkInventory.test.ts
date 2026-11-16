/** The privacy policy says Liftria goes online only for Hiku (api.anthropic.com). This guard
 * fails when a new network call, host, analytics or crash-reporting SDK appears, so the
 * policy, Settings -> Privacy and docs/store/DATA_SAFETY.md get reviewed first. */
type Entry = { name: string; isDirectory: () => boolean };
const { readdirSync, readFileSync } = jest.requireActual('fs') as {
  readdirSync: (dir: string, options: { withFileTypes: true }) => Entry[];
  readFileSync: (file: string, encoding: 'utf8') => string;
};
const { join, relative } = jest.requireActual('path') as {
  join: (...parts: string[]) => string;
  relative: (from: string, to: string) => string;
};

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === '__tests__' || entry.name === 'node_modules') return [];
    const file = join(dir, entry.name);
    return entry.isDirectory() ? sources(file) : /\.tsx?$/.test(entry.name) ? [file] : [];
  });
}
const FILES = ['app', 'src'].flatMap(root => sources(join(process.cwd(), root)))
  .map(file => ({ name: relative(process.cwd(), file).replace(/\\/g, '/'), code: readFileSync(file, 'utf8') }));

const hosts = (code: string) => [...code.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map(match => match[1]!.toLowerCase());

test('fetch is called only by the Hiku client, the key check and the developer diagnostics client', () => {
  const callers = FILES.filter(({ code }) => /(?<![A-Za-z.])fetch\s*\(|=\s*fetch\b|,\s*fetch\s*[,)]/.test(code))
    .map(({ name }) => name).sort();
  expect(callers).toEqual([
    'app/settings/hiku-key.tsx',
    'src/features/hiku/client.ts',
    'src/features/settings/keyTest.ts',
    'src/services/anthropic/index.ts',
  ]);
  expect(FILES.filter(({ code }) => /XMLHttpRequest|new\s+WebSocket|navigator\.sendBeacon/.test(code))
    .map(({ name }) => name)).toEqual([]);
});

test('every URL in the app is Anthropic, or a link the user taps to open', () => {
  const found = new Set(FILES.flatMap(({ code }) => hosts(code)));
  expect([...found].sort()).toEqual([
    'api.anthropic.com',
    'platform.claude.com', // Hiku usage: price list link (Linking.openURL on tap)
    'play.google.com', // Health Connect install page (Linking.openURL on tap)
  ]);
  for (const { name, code } of FILES) {
    for (const host of ['platform.claude.com', 'play.google.com'])
      if (code.includes(host)) expect(code).toMatch(/Linking\.openURL|HIKU_PRICE_SOURCE\s*=/);
    if (code.includes('api.anthropic.com')) expect(['app/onboarding/[step].tsx']).not.toContain(name);
  }
});

test('no analytics, crash reporting, update or remote-config SDK is installed or imported', () => {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as
    { dependencies: Record<string, string> };
  const banned = /sentry|bugsnag|crashlytics|firebase|amplitude|mixpanel|segment|posthog|datadog|appcenter|codepush|expo-updates|expo-insights|facebook|appsflyer|adjust|onesignal|admob|google-mobile-ads|branch/i;
  expect(Object.keys(pkg.dependencies).filter(name => banned.test(name))).toEqual([]);
  expect(FILES.filter(({ code }) => /from\s+['"][^'"]*(?:sentry|firebase|amplitude|mixpanel|posthog|expo-updates)/i.test(code))
    .map(({ name }) => name)).toEqual([]);
});

test('Hiku requests are HTTPS, time-limited, never retried and keep the key out of URLs', () => {
  const client = FILES.find(({ name }) => name === 'src/features/hiku/client.ts')!.code;
  expect(client).toContain("'https://api.anthropic.com/v1/messages'");
  expect(client).toMatch(/AbortController/);
  expect(client).toMatch(/45000/);
  expect(client).not.toMatch(/for\s*\(\s*(?:let|const)\s+attempt/);
  const keyCheck = FILES.find(({ name }) => name === 'src/features/settings/keyTest.ts')!.code;
  expect(keyCheck).toMatch(/AbortController/);
  for (const { code } of FILES.filter(({ code }) => code.includes('x-api-key')))
    expect(code).not.toMatch(/\?[^'"`\n]*(?:api[-_]?key|x-api-key)=/i);
});
