import configure from '../../../app.config';

// Static requires are resolved by Expo/Jest's asset loader and fail if a native asset is absent.
const nativeAssets = {
  'icon-light': require('../../../assets/brand/icon-light.png'),
  'icon-dark': require('../../../assets/brand/icon-dark.png'),
  'splash-light': require('../../../assets/brand/splash-light.png'),
  'splash-dark': require('../../../assets/brand/splash-dark.png'),
};

describe('release branding assets', () => {
  it.each(Object.entries(nativeAssets))('%s resolves as an Expo PNG asset', (_name, value) => {
    expect(value).toBeDefined();
  });

  it('wires native light/dark icons and splash without extra permissions', () => {
    const config = configure({ config: { name: 'Liftria', slug: 'liftria' } } as Parameters<typeof configure>[0]);
    expect(config.icon).toBe('./assets/brand/icon-light.png');
    expect(config.ios?.icon).toEqual({
      light: './assets/brand/icon-light.png',
      dark: './assets/brand/icon-dark.png',
    });
    expect(config.android?.adaptiveIcon?.foregroundImage).toBe('./assets/brand/splash-light.png');
    const splash = config.plugins?.find(p => Array.isArray(p) && p[0] === 'expo-splash-screen');
    expect(splash).toEqual(['expo-splash-screen', {
      backgroundColor: '#F3F5F8',
      image: './assets/brand/splash-light.png',
      imageWidth: 220,
      dark: { backgroundColor: '#0F1216', image: './assets/brand/splash-dark.png' },
    }]);
  });
});
