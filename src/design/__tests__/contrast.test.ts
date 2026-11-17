import { createTheme, type ColorScheme } from '../tokens';
import { buttonColors, provenancePresentation, provenanceKinds } from '../primitives/contracts';

/** WCAG 2.2 contrast ratio; a translucent foreground is composited over the background first. */
function channels(value: string): [number, number, number, number] {
  if (value.startsWith('#') && value.length === 7) {
    return [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16)).concat(1) as [number, number, number, number];
  }
  const match = /^rgba?\(([^)]+)\)$/.exec(value);
  if (!match) throw new Error(`Unsupported colour: ${value}`);
  const parts = match[1]!.split(',').map(part => Number(part.trim()));
  return [parts[0]!, parts[1]!, parts[2]!, parts[3] ?? 1];
}
function luminance(rgb: number[]): number {
  const [r, g, b] = rgb.map(c => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return r! * 0.2126 + g! * 0.7152 + b! * 0.0722;
}
function contrast(foreground: string, background: string): number {
  const fg = channels(foreground);
  const bg = channels(background);
  const mixed = [0, 1, 2].map(i => fg[i]! * fg[3] + bg[i]! * (1 - fg[3]));
  const a = luminance(mixed);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe.each(['light', 'dark'] as ColorScheme[])('%s contrast (WCAG 2.2 AA)', mode => {
  const t = createTheme(mode, 'solid');
  const c = t.color;
  const surfaces = { base: c.bg.base, surface: c.bg.surface, raised: c.bg.raised } as const;

  describe('body text (4.5:1)', () => {
    const texts = { primary: c.text.primary, secondary: c.text.secondary, tertiary: c.text.tertiary } as const;
    for (const [textName, text] of Object.entries(texts)) {
      for (const [surfaceName, surface] of Object.entries(surfaces)) {
        test(`${textName} text on ${surfaceName}`, () => {
          expect(contrast(text, surface)).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
    test('accent text on base, surface and raised', () => {
      for (const surface of Object.values(surfaces)) expect(contrast(c.accent, surface)).toBeGreaterThanOrEqual(4.5);
    });
    test('placeholder text (tertiary) on the input fill and text on the logged set tint', () => {
      expect(contrast(c.text.tertiary, c.bg.raised)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.text.primary, c.tint.success)).toBeGreaterThanOrEqual(4.5);
    });
    test('macro and status colours on a card and on the page', () => {
      for (const value of [...Object.values(c.macro), ...Object.values(c.status)]) {
        expect(contrast(value, c.bg.surface)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(value, c.bg.base)).toBeGreaterThanOrEqual(4.5);
      }
    });
    test('status colours on their tints', () => {
      expect(contrast(c.status.success, c.tint.success)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.status.warning, c.tint.warning)).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('buttons and chips', () => {
    test.each(['primary', 'tonal', 'neutral', 'plain', 'destructive'] as const)('%s button label', variant => {
      const colors = buttonColors(t, variant);
      // A transparent button sits on a card or the page; check both.
      const backgrounds = colors.bg === 'transparent' ? [c.bg.surface, c.bg.base] : [colors.bg];
      for (const background of backgrounds) expect(contrast(colors.fg, background)).toBeGreaterThanOrEqual(4.5);
    });
    test('selected chip and option rows (accent and primary text on the accent tint)', () => {
      expect(contrast(c.accent, c.tint.accent)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.text.primary, c.tint.accent)).toBeGreaterThanOrEqual(4.5);
    });
    test.each(provenanceKinds)('provenance chip %s', kind => {
      const p = provenancePresentation(t, kind);
      expect(contrast(p.fg, p.bg)).toBeGreaterThanOrEqual(4.5);
    });
    test('set tick: logged check on the success fill and idle check on the raised fill (3:1 glyph)', () => {
      expect(contrast(c.bg.surface, c.status.success)).toBeGreaterThanOrEqual(3);
      expect(contrast(c.text.tertiary, c.bg.raised)).toBeGreaterThanOrEqual(3);
    });
  });

  describe('tab bar', () => {
    test('inactive (tertiary) and active (accent) label and icon on the bar surface', () => {
      expect(contrast(c.text.tertiary, c.bg.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.accent, c.bg.surface)).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('non-text UI (3:1)', () => {
    test('control outlines against the surfaces they sit on', () => {
      expect(contrast(c.border.control, c.bg.surface)).toBeGreaterThanOrEqual(3);
      expect(contrast(c.border.control, c.bg.base)).toBeGreaterThanOrEqual(3);
      expect(contrast(c.border.strong, c.bg.surface)).toBeGreaterThanOrEqual(3);
    });
    test('progress fill against its track and the card', () => {
      expect(contrast(c.accent, c.bg.raised)).toBeGreaterThanOrEqual(3);
      expect(contrast(c.accent, c.bg.surface)).toBeGreaterThanOrEqual(3);
    });
  });

  test('the sheet scrim darkens the page behind it', () => {
    expect(contrast(t.sheet.scrim, c.bg.base)).toBeGreaterThan(1);
  });
});
