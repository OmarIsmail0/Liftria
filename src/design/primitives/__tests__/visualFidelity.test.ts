import { createTheme } from '../../tokens';
import { cssLinearGradient, ringGeometry, withOpacity, splitColor, stopProps, shouldShowOrbHighlight } from '../VisualGeometry';

test('the system font module loads no bundled face', () => {
  const { readFileSync } = jest.requireActual('fs') as { readFileSync: (file: string, encoding: 'utf8') => string };
  const { join } = jest.requireActual('path') as { join: (...parts: string[]) => string };
  const source = readFileSync(join(process.cwd(), 'src/design/fonts.ts'), 'utf8');
  expect(source).not.toMatch(/\.ttf|Archivo|Figtree|IBMPlex|fontFamilyFor|bundledFonts/);
});

test('a flat theme has no glow tokens', () => {
  for (const mode of ['dark', 'light'] as const) {
    const theme = createTheme(mode, 'solid');
    expect(theme.effectiveStyle).toBe('solid');
    expect(theme.orbSize.ringStroke).toBe(4);
    expect(withOpacity(theme.color.accent, 0.55)).toContain(',0.55)');
  }
});

test('one SVG arc is a continuous circumference with clamped dash offset', () => {
  const start = ringGeometry(236, 4, 0);
  const half = ringGeometry(236, 4, 0.5);
  const full = ringGeometry(236, 4, 1);
  expect(start.radius).toBeGreaterThan(0);
  expect(start.offset).toBeCloseTo(start.circumference);
  expect(half.offset).toBeCloseTo(half.circumference / 2);
  expect(full.offset).toBeCloseTo(0);
  expect(ringGeometry(236, 4, -2).offset).toBeCloseTo(start.offset);
  expect(ringGeometry(236, 4, 4).offset).toBeCloseTo(0);
});

describe('gradient stops keep each token\'s transparency', () => {
  test('rgba tokens split into an opaque color and their own opacity', () => {
    expect(splitColor('rgba(255,255,255,0.10)')).toEqual({ color: 'rgb(255,255,255)', opacity: 0.1 });
    expect(splitColor('rgba(123, 92, 255, 0.50)')).toEqual({ color: 'rgb(123,92,255)', opacity: 0.5 });
    expect(splitColor('#FFCF5E')).toEqual({ color: '#FFCF5E', opacity: 1 });
  });

  test('a stop multiplies the token alpha by the stop opacity', () => {
    expect(stopProps('rgba(255,94,126,0.45)', 1)).toEqual({ stopColor: 'rgb(255,94,126)', stopOpacity: 0.45 });
    expect(stopProps('rgba(255,94,126,0.45)', 0).stopOpacity).toBe(0);
    expect(stopProps('#FF8A5C')).toEqual({ stopColor: '#FF8A5C', stopOpacity: 1 });
  });
});

describe('CSS-angle gradients resolve against the real card size', () => {
  test('140° on a wide card fades from the top-left corner to the bottom-right corner', () => {
    const w = 360, h = 90, g = cssLinearGradient(140, w, h);
    const t = (x: number, y: number) => ((x - g.x1) * (g.x2 - g.x1) + (y - g.y1) * (g.y2 - g.y1)) /
      ((g.x2 - g.x1) ** 2 + (g.y2 - g.y1) ** 2);
    expect(t(0, 0)).toBeCloseTo(0);
    expect(t(w, h)).toBeCloseTo(1);
    expect(t(0, h)).toBeCloseTo(0.23, 2);
  });
  test('180° is a plain top-to-bottom gradient over the full height', () => {
    const g = cssLinearGradient(180, 200, 100);
    expect(g.x1).toBeCloseTo(100); expect(g.x2).toBeCloseTo(100);
    expect(g.y1).toBeCloseTo(0); expect(g.y2).toBeCloseTo(100);
  });
  test('90° is a plain left-to-right gradient over the full width', () => {
    const g = cssLinearGradient(90, 200, 100);
    expect(g.x1).toBeCloseTo(0); expect(g.x2).toBeCloseTo(200);
    expect(g.y1).toBeCloseTo(50); expect(g.y2).toBeCloseTo(50);
  });
});

test('a flat orb never draws a highlight', () => {
  expect(shouldShowOrbHighlight(null, 'aurora')).toBe(false);
  expect(shouldShowOrbHighlight(null, 'solid')).toBe(false);
  expect(shouldShowOrbHighlight(0, 'aurora')).toBe(false);
  expect(shouldShowOrbHighlight(0.54, 'aurora')).toBe(false);
  expect(shouldShowOrbHighlight(0.54, 'solid')).toBe(false);
  expect(shouldShowOrbHighlight(null, 'aurora', 'dark')).toBe(false);
  expect(shouldShowOrbHighlight(null, 'solid', 'light')).toBe(false);
});
