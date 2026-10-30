import configure from '../../../app.config';

// Static requires are resolved by Expo/Jest's asset loader; absent assets fail the test.
const nativeAssets = {
  'icon-light': require('../../../assets/brand/icon-light.png'),
  'icon-dark': require('../../../assets/brand/icon-dark.png'),
  'splash-light': require('../../../assets/brand/splash-light.png'),
  'splash-dark': require('../../../assets/brand/splash-dark.png'),
  'adaptive-foreground': require('../../../assets/brand/adaptive-foreground.png'),
  'adaptive-monochrome': require('../../../assets/brand/adaptive-monochrome.png'),
};

const { readFileSync } = jest.requireActual('fs') as {
  readFileSync: (path: string, encoding?: 'utf8') => Uint8Array | string;
};
const { join } = jest.requireActual('path') as {
  join: (...paths: string[]) => string;
};
const asset = (file: string) => join(process.cwd(), 'assets', 'brand', file);

function readPng(file: string) {
  const data = readFileSync(asset(file)) as Uint8Array;
  const int = (at: number) => ((data[at]! * 16777216)
    + (data[at + 1]! << 16) + (data[at + 2]! << 8) + data[at + 3]!);
  expect(Array.from(data.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  return { data, width: int(16), height: int(20) };
}

describe('release branding assets', () => {
  it.each(Object.entries(nativeAssets))('%s resolves as an Expo PNG asset', (_name, value) => {
    expect(value).toBeDefined();
  });

  it('has 1024px icon and adaptive PNGs', () => {
    for (const name of ['icon-light', 'icon-dark', 'adaptive-foreground', 'adaptive-monochrome']) {
      const { width, height } = readPng(`${name}.png`);
      expect([width, height]).toEqual([1024, 1024]);
    }
  });

  it('uses a single round-join L path in the icon SVG masters', () => {
    for (const name of ['icon-light', 'icon-dark']) {
      const source = readFileSync(asset(`${name}.svg`), 'utf8') as string;
      expect(source).toContain('d="M 405 345 V 617 H 625"');
      expect(source).toContain('stroke-linejoin="round"');
      expect(source.match(/d="M 405 345 V 617 H 625"/g)).toHaveLength(1);
    }
  });

  it('keeps the adaptive SVG foreground centered within Android\'s safe region', () => {
    for (const name of ['adaptive-foreground', 'adaptive-monochrome']) {
      const source = readFileSync(asset(`${name}.svg`), 'utf8') as string;
      expect(source).toContain('translate(112.64 112.64) scale(0.78)');
      expect(source).toContain('stroke-linejoin="round"');
      expect(source).not.toContain('<rect');
    }
  });

  it('wires adaptive and themed icons, native light/dark splash, and read-only HealthKit', () => {
    const config = configure({ config: { name: 'Liftria', slug: 'liftria' } } as Parameters<typeof configure>[0]);
    expect(config.icon).toBe('./assets/brand/icon-light.png');
    expect(config.ios?.icon).toEqual({
      light: './assets/brand/icon-light.png',
      dark: './assets/brand/icon-dark.png',
    });
    expect(config.android?.adaptiveIcon?.foregroundImage).toBe('./assets/brand/adaptive-foreground.png');
    expect(config.android?.adaptiveIcon?.monochromeImage).toBe('./assets/brand/adaptive-monochrome.png');
    const splash = config.plugins?.find(p => Array.isArray(p) && p[0] === 'expo-splash-screen');
    expect(splash).toEqual(['expo-splash-screen', {
      backgroundColor: '#F3F5F8',
      image: './assets/brand/splash-light.png',
      imageWidth: 220,
      dark: { backgroundColor: '#0F1216', image: './assets/brand/splash-dark.png' },
    }]);
    const healthKit = config.plugins?.find(p => Array.isArray(p) && p[0] === '@kingstinct/react-native-healthkit');
    expect(healthKit).toBeDefined();
    expect(healthKit).toEqual(['@kingstinct/react-native-healthkit', expect.objectContaining({
      NSHealthUpdateUsageDescription: false,
      background: false,
    })]);
  });
});
