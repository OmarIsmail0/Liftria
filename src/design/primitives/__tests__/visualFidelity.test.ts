import { createTheme } from '../../tokens';
import { fontFamilyFor } from '../../fonts';
import { ambientGlows, cardRimStops, ringGeometry, withOpacity } from '../VisualGeometry';

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
