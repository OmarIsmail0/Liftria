import { createTheme, type ColorScheme } from '../tokens';
import { resolveEffectiveStyle } from '../ThemeProvider';

/** WCAG 2.2 relative luminance / compositing, as used in ACCESSIBILITY.md. */
type RGBA = [number, number, number, number];
function rgba(value: string): RGBA {
  if (value.startsWith('#')) {
    const h = value.slice(1);
    if (h.length !== 6) throw new Error('Only 6-digit hex expected');
    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).concat(1) as RGBA;
  }
  const match = /^rgba?\(([^)]+)\)$/.exec(value);
  if (!match) throw new Error(`Unsupported color: ${value}`);
  const values = match[1]!.split(',').map(v => Number(v.trim()));
  if (values.length < 3 || values.some(value => !Number.isFinite(value))) throw new Error(`Malformed color: ${value}`);
  return [values[0]!, values[1]!, values[2]!, values[3] ?? 1];
}
function blend(foreground: RGBA, background: RGBA): RGBA {
  const alpha = foreground[3] + background[3] * (1 - foreground[3]);
  return [
    (foreground[0] * foreground[3] + background[0] * background[3] * (1 - foreground[3])) / alpha,
    (foreground[1] * foreground[3] + background[1] * background[3] * (1 - foreground[3])) / alpha,
    (foreground[2] * foreground[3] + background[2] * background[3] * (1 - foreground[3])) / alpha,
    alpha,
  ];
}
function luminance(color: RGBA): number {
  const values = color.slice(0, 3).map(channel => {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return values[0]! * 0.2126 + values[1]! * 0.7152 + values[2]! * 0.0722;
}
function ratio(foreground: string | RGBA, background: string | RGBA): number {
  const a = typeof foreground === 'string' ? rgba(foreground) : foreground;
  const b = typeof background === 'string' ? rgba(background) : background;
  const text = blend(a, b);
  const first = luminance(text), second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

describe.each(['dark', 'light'] as ColorScheme[])('%s Liftria tokens', mode => {
  const t = createTheme(mode, 'aurora');
  const surface = t.color.bg.surface;
  const solidPairs = [
    ['primary text', t.color.text.primary, mode === 'dark' ? 15.41 : 18.15],
    ['secondary text', t.color.text.secondary, mode === 'dark' ? 10.15 : 7.31],
    ['tertiary text', t.color.text.tertiary, mode === 'dark' ? 7.62 : 5.63],
    ['train', t.color.domain.train, mode === 'dark' ? 7.81 : 6.24],
    ['eat', t.color.domain.eat, mode === 'dark' ? 11.92 : 5.89],
    ['health', t.color.domain.health, mode === 'dark' ? 10.52 : 6.43],
    ['hiku', t.color.domain.hiku, mode === 'dark' ? 9.06 : 5.76],
    ['protein', t.color.macro.protein, mode === 'dark' ? 9.08 : 5.05],
    ['fat', t.color.macro.fat, mode === 'dark' ? 8.84 : 5.25],
    ['success', t.color.status.success, mode === 'dark' ? 9.03 : 5.38],
    ['warning', t.color.status.warning, mode === 'dark' ? 9.49 : 5.19],
    ['danger', t.color.status.danger, mode === 'dark' ? 6.29 : 5.17],
    ['solid control border', t.color.border.strong, mode === 'dark' ? 3.33 : 3.54],
  ] as const;
  test.each(solidPairs)('%s maintains the documented Solid contrast minimum', (_, value, minimum) => {
    // Published ratios are rounded to hundredths; permit only numeric roundoff.
    expect(ratio(value, surface)).toBeGreaterThanOrEqual(minimum - 0.035);
  });

  test('chalk primary action, filled domain actions and alternate surfaces', () => {
    expect(ratio(t.color.action.primary.fg, t.color.action.primary.bg)).toBeGreaterThanOrEqual(16.5);
    expect(ratio(t.color.on.train, t.color.domain.train)).toBeGreaterThanOrEqual(6.2);
    expect(ratio(t.color.on.hiku, t.color.domain.hiku)).toBeGreaterThanOrEqual(5.7);
    expect(ratio(t.color.text.tertiary, t.color.bg.raised)).toBeGreaterThanOrEqual(5.15);
    expect(ratio(t.color.text.tertiary, t.color.bg.base)).toBeGreaterThanOrEqual(5.15);
  });

  // Four non-overlapping glows are tested at full alpha. Adjacent simultaneous glow
  // overlap is a separate on-device visual acceptance case (ACCESSIBILITY §1D).
  const backgrounds = [t.ambient.train, t.ambient.health, t.ambient.hiku, t.ambient.eat]
    .map(glow => blend(rgba(glow), rgba(t.aurora.base)));
  test.each(backgrounds.map((bg, index) => [index, bg] as const))(
    'glass text, status and control outlines over full-strength glow %s',
    (_, glowingPage) => {
      const card = blend(rgba(t.glass.card), glowingPage);
      const sheen = blend(rgba(t.glass.highlight), card);
      for (const background of [card, sheen]) {
        for (const value of [
          t.color.text.primary, t.color.text.secondary, t.color.text.tertiary,
          ...Object.values(t.color.domain), ...Object.values(t.color.macro),
          t.color.status.danger,
        ]) expect(ratio(value, background)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(t.color.border.control, background)).toBeGreaterThanOrEqual(3);
      }
      expect(ratio(t.color.border.control, glowingPage)).toBeGreaterThanOrEqual(3);
      const hikuChip = blend(rgba(t.color.chip.hiku.bg), card);
      const warningChip = blend(rgba(t.color.tint.warning), card);
      expect(ratio(t.color.chip.hiku.fg, hikuChip)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(t.color.status.warning, warningChip)).toBeGreaterThanOrEqual(4.5);
    },
  );

  test('empty orb text contrasts against unlit sphere stops over glass', () => {
    const underlay = blend(rgba(t.glass.card), rgba(t.aurora.base));
    const sphereStops = [t.orb[1], t.orb[2], t.orb[3]];
    for (const stop of sphereStops) {
      const emptyFill = blend([...rgba(stop).slice(0, 3), t.orbEmpty.fillOpacity] as RGBA, underlay);
      expect(ratio(t.color.text.primary, emptyFill)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('orb text is legible at its two text-bearing fill stops', () => {
    expect(ratio(t.orb.ink, t.orb[1])).toBeGreaterThanOrEqual(mode === 'dark' ? 6.28 : 10.19);
    expect(ratio(t.orb.ink, t.orb[2])).toBeGreaterThanOrEqual(mode === 'dark' ? 6.28 : 10.19);
  });
});

test('all semantic token families and minimum touch sizes are present', () => {
  const t = createTheme('dark', 'solid');
  for (const name of ['color', 'glass', 'ambient', 'rim', 'orb', 'rest', 'type',
    'space', 'radius', 'motion', 'layout', 'sheet', 'dock']) {
    expect(t).toHaveProperty(name);
  }
  expect(t.color.border.control).toBe('#929CAA');
  expect(t.size.touch.min).toBe(48);
  expect(t.size.touch.workout).toBe(64);
  expect(t.controlOutline).toBe(t.color.border.strong);
  expect(createTheme('light', 'aurora').controlOutline).toBe('#5F6978');
});

test('high contrast and reduce transparency always force Solid without overwriting preference', () => {
  expect(resolveEffectiveStyle('aurora', true, false)).toBe('solid');
  expect(resolveEffectiveStyle('aurora', false, true)).toBe('solid');
  expect(resolveEffectiveStyle('aurora', false, false)).toBe('aurora');
  expect(resolveEffectiveStyle('solid', false, false)).toBe('solid');
});
