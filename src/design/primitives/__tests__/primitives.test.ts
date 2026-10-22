import { createTheme } from '../../tokens';
import {
  buttonColors, buttonHeight, buttonSizes, buttonVariants, capsuleTabs,
  orbSummary, provenanceKinds, provenancePresentation,
} from '../contracts';
import { isPrimitiveStoryId, primitiveStories } from '../stories';

describe.each(['dark', 'light'] as const)('native primitive tokens in %s', scheme => {
  const theme = createTheme(scheme, 'aurora');
  it('enforces at least 48dp touch height for all sizes, including small buttons', () => {
    for (const size of buttonSizes) {
      expect(buttonHeight(theme, size)).toBeGreaterThanOrEqual(48);
    }
    expect(buttonHeight(theme, 'xl')).toBe(theme.size.touch.workout);
    expect(theme.size.touch.nav).toBeGreaterThanOrEqual(48);
    expect(theme.size.touch.min).toBeGreaterThanOrEqual(48);
  });
  it('has valid themed fg/bg/border colors for every button variant', () => {
    for (const variant of buttonVariants) {
      const value = buttonColors(theme, variant);
      expect(value).toEqual({
        bg: expect.any(String), fg: expect.any(String), border: expect.any(String),
      });
      expect(value.fg).not.toBe('transparent');
    }
    expect(buttonColors(theme, 'danger').bg).toBe(theme.color.status.danger);
  });
  it('uses source labels plus icon for every provenance type, never color alone', () => {
    for (const kind of provenanceKinds) {
      const style = provenancePresentation(theme, kind);
      expect(style.label.length).toBeGreaterThan(0);
      expect(style.glyph.length).toBeGreaterThan(0);
      expect(style.fg.length).toBeGreaterThan(0);
    }
    expect(provenancePresentation(theme, 'estimate').dashed).toBe(true);
    expect(provenancePresentation(theme, 'phone').label).toBe('Phone');
    expect(provenancePresentation(theme, 'hiku').bg).toBe(theme.color.chip.hiku.bg);
  });
});

test('capsule includes five exact tabs with unique accessible labels', () => {
  expect(capsuleTabs.map(tab => tab.label)).toEqual(['Today', 'Train', 'Eat', 'Progress', 'Hiku']);
  expect(new Set(capsuleTabs.map(tab => tab.key)).size).toBe(5);
  expect(capsuleTabs.every(tab => Boolean(tab.glyph))).toBe(true);
});

describe('honest Pulse Orb states', () => {
  it('matches the Today screen-reader example with an estimated target', () => {
    expect(orbSummary(1420, 2650)).toMatchObject({
      label: '1,230 kcal left',
      progress: 1420 / 2650,
      accessibilityLabel: '1,230 kilocalories left. 1,420 of 2,650 eaten, estimated target',
    });
  });
  it('does not invent a target or render a progress ring without one', () => {
    expect(orbSummary(0, null)).toEqual({
      label: '0 kcal eaten', progress: null,
      accessibilityLabel: '0 kilocalories eaten, no target set',
    });
    expect(orbSummary(1420, null).progress).toBeNull();
  });
  it('keeps an over-target state nonjudgmental and caps the ring at full', () => {
    const result = orbSummary(2830, 2650);
    expect(result.label).toBe('+180 kcal over');
    expect(result.progress).toBe(1);
    expect(result.accessibilityLabel).not.toMatch(/bad|fail|cheat/i);
  });
  it('does not expose values when numbers are hidden', () => {
    expect(orbSummary(1420, 2650, true).label).toBe('On track');
    expect(orbSummary(2830, 2650, true).label).toBe('A bit over');
    expect(orbSummary(1420, null, true).progress).toBeNull();
  });
});

test('all required primitives have a unique hidden developer story screen', () => {
  const required = [
    'screen', 'header', 'card', 'button', 'chip', 'banner', 'snackbar', 'sheet',
    'stepper', 'toggle', 'field', 'list-row', 'empty-state', 'skeleton', 'orb', 'capsule-nav',
  ];
  expect(primitiveStories.map(s => s.id)).toEqual(required);
  expect(new Set(primitiveStories.map(s => s.id)).size).toBe(required.length);
  for (const item of primitiveStories) expect(isPrimitiveStoryId(item.id)).toBe(true);
  expect(isPrimitiveStoryId('anything-else')).toBe(false);
});
