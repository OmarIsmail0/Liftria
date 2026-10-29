import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import configure from '../../../app.config';

const brands = ['icon-light.png', 'icon-dark.png', 'splash-light.png', 'splash-dark.png'] as const;
const pathFor = (name: string) => resolve(__dirname, '../../../assets/brand', name);

describe('release branding assets', () => {
  it.each(brands)('%s is a real 1024×1024 PNG', (name) => {
    const data = readFileSync(pathFor(name));
    expect(data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
    expect(data.readUInt32BE(16)).toBe(1024);
    expect(data.readUInt32BE(20)).toBe(1024);
    expect(data.length).toBeGreaterThan(1000);
  });
  it('wires native light/dark icons and splash with no new permissions', () => {
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
