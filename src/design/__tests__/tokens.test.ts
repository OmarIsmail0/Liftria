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

describe.each(['dark', 'light'] as ColorScheme[])('%s v2 tokens', mode => {
  const t = createTheme(mode, 'aurora');
  const surface = t.color.bg.surface;
  const textOnSurface = [
    ['primary text', t.color.text.primary],
    ['secondary text', t.color.text.secondary],
    ['tertiary text', t.color.text.tertiary],
    ['accent', t.color.accent],
    ['protein', t.color.macro.protein],
    ['carbs', t.color.macro.carbs],
    ['fat', t.color.macro.fat],
    ['success', t.color.status.success],
    ['warning', t.color.status.warning],
    ['danger', t.color.status.danger],
  ] as const;

  test.each(textOnSurface)('%s meets AA on a card', (_, value) => {
    expect(ratio(value, surface)).toBeGreaterThanOrEqual(4.5);
  });

  test('filled button text, page text and the flat orb meet AA', () => {
    expect(ratio(t.color.on.accent, t.color.accent)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(t.color.text.primary, t.color.bg.base)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(t.color.text.secondary, t.color.bg.base)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(t.color.text.primary, t.color.bg.raised)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(t.color.status.success, t.color.tint.success)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(t.color.status.warning, t.color.tint.warning)).toBeGreaterThanOrEqual(4.5);
  });

  test('uses the approved v2 hex values', () => {
    expect(t.color.bg.base).toBe(mode === 'light' ? '#F4F3F1' : '#0D0E10');
    expect(t.color.bg.surface).toBe(mode === 'light' ? '#FFFFFF' : '#18191C');
    expect(t.color.bg.raised).toBe(mode === 'light' ? '#ECEAE6' : '#232529');
    expect(t.color.border.subtle).toBe(mode === 'light' ? '#E3E1DC' : '#2B2D32');
    expect(t.color.text.primary).toBe(mode === 'light' ? '#17181A' : '#F2F3F5');
    expect(t.color.text.secondary).toBe(mode === 'light' ? '#5C6066' : '#A9ADB4');
    expect(t.color.text.tertiary).toBe(mode === 'light' ? '#6E7279' : '#8D9199');
    expect(t.color.accent).toBe(mode === 'light' ? '#C2410C' : '#FF8A5C');
    expect(t.color.on.accent).toBe(mode === 'light' ? '#FFFFFF' : '#1A0D06');
    expect(t.color.tint.accent).toBe(mode === 'light' ? '#FBE9DF' : '#3A2218');
    expect(t.color.status.success).toBe(mode === 'light' ? '#177A45' : '#5BD08F');
    expect(t.color.tint.success).toBe(mode === 'light' ? '#E3F3E9' : '#16301F');
    expect(t.color.status.danger).toBe(mode === 'light' ? '#B3261E' : '#FF7A7A');
    expect(t.color.macro).toEqual(mode === 'light'
      ? { protein: '#2E6BD3', carbs: '#9A6C00', fat: '#B8406F' }
      : { protein: '#8CBEFF', carbs: '#FFCF5E', fat: '#FF9AC0' });
  });

  test('old interactive names point at the accent', () => {
    for (const name of ['train', 'eat', 'health', 'hiku'] as const) {
      expect(t.color.domain[name]).toBe(t.color.accent);
      expect(t.color.tint[name]).toBe(t.color.tint.accent);
    }
    expect(t.color.action.primary).toEqual({ bg: t.color.accent, fg: t.color.on.accent });
    expect(t.color.on.train).toBe(t.color.on.accent);
    expect(t.color.on.hiku).toBe(t.color.on.accent);
    expect(t.color.text.inverse).toBe(t.color.on.accent);
    expect(t.effectiveStyle).toBe('solid');
    expect(t.background).toBe(t.color.bg.base);
    expect(t.cardFill).toBe(t.color.bg.surface);
    expect(t.sheetFill).toBe(t.color.bg.surface);
  });
});

test('type, spacing and radius use the six sizes and the v2 scale', () => {
  const t = createTheme('dark', 'solid');
  expect(t.type.metric.xl).toMatchObject({ size: 44, line: 48, weight: '700' });
  expect(t.type.largeTitle).toMatchObject({ size: 30, line: 36, weight: '700' });
  expect(t.type.title).toMatchObject({ size: 20, line: 26, weight: '600' });
  expect(t.type.body).toMatchObject({ size: 16, line: 22, weight: '400' });
  expect(t.type.body.strong).toMatchObject({ size: 16, line: 22, weight: '600' });
  expect(t.type.secondary).toMatchObject({ size: 14, line: 20 });
  expect(t.type.caption).toMatchObject({ size: 12, line: 16 });
  expect(t.type.display).toBe(t.type.largeTitle);
  expect(t.type.head).toBe(t.type.title);
  expect(t.type.metric.l).toBe(t.type.title);
  expect(t.type.metric.m).toBe(t.type.title);
  expect(t.type.small).toBe(t.type.secondary);
  expect(t.type.label).toBe(t.type.caption);
  expect(t.type.label).not.toHaveProperty('letterSpacingEm');
  expect(t.type.label).not.toHaveProperty('uppercase');
  expect(t.space).toEqual({ 1: 4, 2: 8, 3: 12, 4: 16, 5: 16, 6: 24, 8: 32, 10: 32 });
  expect(t.radius).toEqual({ sm: 8, md: 12, lg: 16, pill: 999 });
  expect(t.layout.gutter).toBe(16);
  expect(t.layout.cardGap).toBe(24);
  expect(t.motion.quick.duration).toBe(120);
  expect(t.motion.base.duration).toBe(220);
});

test('removed effect groups stay gone and touch sizes stay at least 48', () => {
  const t = createTheme('dark', 'solid');
  for (const name of ['color', 'type', 'space', 'radius', 'motion', 'layout', 'sheet', 'dock', 'surface']) {
    expect(t).toHaveProperty(name);
  }
  for (const name of ['glass', 'ambient', 'rim', 'orb', 'aurora', 'visual']) {
    expect(t).not.toHaveProperty(name);
  }
  expect(t.color.border.control).toBe('#8D9199');
  expect(t.size.touch.min).toBe(48);
  expect(t.size.touch.workout).toBe(64);
  expect(t.size.touch.nav).toBeGreaterThanOrEqual(56);
  expect(t.controlOutline).toBe(t.color.border.strong);
  expect(createTheme('light', 'aurora').effectiveStyle).toBe('solid');
  expect(createTheme('light', 'aurora').controlOutline).toBe('#5C6066');
});

test('a requested aurora style still resolves to solid', () => {
  expect(resolveEffectiveStyle('aurora', true, false)).toBe('solid');
  expect(resolveEffectiveStyle('aurora', false, true)).toBe('solid');
  expect(resolveEffectiveStyle('aurora', false, false)).toBe('solid');
  expect(resolveEffectiveStyle('solid', false, false)).toBe('solid');
});
