import { createTheme } from '../../tokens';
import { fontFamilyFor } from '../../fonts';
import { ambientGlows, cardRimStops, cssLinearGradient, ringGeometry, withOpacity, splitColor, stopProps } from '../VisualGeometry';

test('four fixed ellipse locations match the CSS prototype percentages', () => {
  expect(ambientGlows).toEqual([
    { key: 'train', cx: 12, cy: 6, rx: 55, ry: 32 },
    { key: 'hiku', cx: 98, cy: 32, rx: 60, ry: 34 },
    { key: 'health', cx: 2, cy: 72, rx: 60, ry: 34 },
    { key: 'eat', cx: 92, cy: 96, rx: 55, ry: 30 },
  ]);
  for (const mode of ['dark', 'light'] as const) {
    const theme = createTheme(mode, 'aurora');
    expect(theme.visual.ambientFade).toBe(0.7);
    for (const glow of ambientGlows) expect(theme.ambient[glow.key]).toMatch(/^rgba\(/);
  }
});

test.each(['dark', 'light'] as const)('Aurora rim and orb are themed in %s', mode => {
  const theme = createTheme(mode, 'aurora');
  expect(theme.size.border.rim).toBe(1.2);
  expect(cardRimStops).toEqual([0, 0.3, 0.55, 1]);
  expect(withOpacity(theme.color.domain.train, theme.rim.glow))
    .toContain(',' + theme.rim.glow + ')');
  expect(theme.visual.cardGlowBlur).toBe(34);
  expect(theme.orbSize.ringStroke).toBe(4);
  expect(theme.visual.orbGlowInnerBlur).toBe(60);
  expect(theme.visual.orbGlowOuterBlur).toBe(120);
  expect(theme.orb.highlight).toBe('#FFFFFF');
  expect(theme.train.gradEnd).not.toBe(theme.color.domain.train);
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

test('every typography face has a static family, independent of Android fontWeight', () => {
  expect(fontFamilyFor('Archivo', '700')).toBe('ArchivoSemiExpanded-Bold');
  expect(fontFamilyFor('Archivo', '800')).toBe('ArchivoSemiExpanded-ExtraBold');
  expect(fontFamilyFor('Figtree', '400')).toBe('Figtree-Regular');
  expect(fontFamilyFor('Figtree', '600')).toBe('Figtree-SemiBold');
  expect(fontFamilyFor('Figtree', '700')).toBe('Figtree-Bold');
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
    expect(stopProps('#FF8F6B')).toEqual({ stopColor: '#FF8F6B', stopOpacity: 1 });
  });

  test.each(['dark', 'light'] as const)('%s: glows and the card sheen are never drawn opaque', mode => {
    const t = createTheme(mode, 'aurora');
    for (const glow of Object.values(t.ambient)) expect(stopProps(glow).stopOpacity).toBeLessThan(1);
    expect(stopProps(t.glass.highlight).stopOpacity).toBeLessThan(1);
  });
});

describe('CSS-angle gradients resolve against the real card size', () => {
  test('140° on a wide card fades from the top-left corner to the bottom-right corner', () => {
    const w = 360, h = 90, g = cssLinearGradient(140, w, h);
    // Project a point onto the gradient line: 0 at the start, 1 at the end.
    const t = (x: number, y: number) => ((x - g.x1) * (g.x2 - g.x1) + (y - g.y1) * (g.y2 - g.y1)) /
      ((g.x2 - g.x1) ** 2 + (g.y2 - g.y1) ** 2);
    expect(t(0, 0)).toBeCloseTo(0);   // top-left corner = brightest stop
    expect(t(w, h)).toBeCloseTo(1);   // bottom-right corner = last stop
    // The CSS line on a 4:1 card puts the bottom-left corner about a quarter of the way along
    // (≈0.23), between the full-strength and rim.strength stops; a bounding-box diagonal would put
    // it at exactly 0.5.
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
