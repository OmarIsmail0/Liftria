/**
 * Liftria native design tokens.
 * Source: docs/phase1/DESIGN_SYSTEM.md §§1–3, 5–7 and ACCESSIBILITY.md.
 * Values follow the prototype's documented palettes; layout uses native dp, not CSS.
 * Do not place user data, UI state or platform code in this module.
 */
export type ColorScheme = 'dark' | 'light';
export type VisualStyle = 'aurora' | 'solid';
export type ThemeMode = 'system' | ColorScheme;

const palette = {
  dark: {
    color: {
      bg: { base: '#0F1216', surface: '#161A20', raised: '#1E232B', glass: 'rgba(30,35,43,0.78)' },
      border: { subtle: '#272D37', strong: '#636D7B', control: '#929CAA' },
      text: { primary: '#EEF1F5', secondary: '#BFC6D1', tertiary: '#A3ACBA', inverse: '#0F1216' },
      action: { primary: { bg: '#EEF1F5', fg: '#0F1216' } },
      domain: { train: '#FF8F6B', eat: '#FFCF5E', health: '#46E0BC', hiku: '#BDB1FF' },
      on: { train: '#1A0D06', hiku: '#120E2B' },
      tint: {
        train: 'rgba(255,138,92,0.14)', eat: 'rgba(242,193,78,0.14)',
        health: 'rgba(76,195,166,0.14)', hiku: 'rgba(169,156,255,0.15)',
        warning: 'rgba(242,180,76,0.14)', danger: 'rgba(255,107,107,0.14)',
      },
      macro: { protein: '#8CBEFF', carbs: '#FFCF5E', fat: '#FF9AC0' },
      status: { success: '#5BD08F', warning: '#F2B44C', danger: '#FF7A7A' },
      track: 'rgba(255,255,255,0.09)',
      board: { bg: '#0A0C0F' },
      chip: { hiku: { bg: 'rgba(169,156,255,0.15)', fg: '#BDB1FF' } },
    },
    aurora: { base: '#06070C' },
    glass: {
      card: 'rgba(12,13,24,0.62)', highlight: 'rgba(255,255,255,0.10)',
      border: 'rgba(255,255,255,0.08)',
      // CSS design reference only. Primitives use platform-native shadow properties.
      shadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 18px 44px rgba(0,0,0,0.50)',
    },
    rim: { strength: 0.25, glow: 0.12 },
    ambient: {
      train: 'rgba(255,94,126,0.45)', hiku: 'rgba(123,92,255,0.50)',
      health: 'rgba(25,194,160,0.38)', eat: 'rgba(255,190,80,0.26)',
    },
    train: { gradEnd: '#FF6A6A' },
    orb: { 1: '#FFCF5E', 2: '#FF8F6B', 3: '#7B5CFF', ink: '#120B22' },
    rest: { 1: '#FFC2A3', 2: '#FF8F6B', 3: '#D9487A' },
    sheet: { glass: 'rgba(16,17,30,0.94)' },
    elevation: { card: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.35)' },
  },
  light: {
    color: {
      bg: { base: '#F3F5F8', surface: '#FFFFFF', raised: '#FFFFFF', glass: 'rgba(255,255,255,0.82)' },
      border: { subtle: '#E1E5EB', strong: '#808996', control: '#5F6978' },
      text: { primary: '#12161C', secondary: '#4D5767', tertiary: '#5E6878', inverse: '#FFFFFF' },
      action: { primary: { bg: '#12161C', fg: '#FFFFFF' } },
      domain: { train: '#A83E18', eat: '#855D00', health: '#126B57', hiku: '#6150D8' },
      on: { train: '#FFFFFF', hiku: '#FFFFFF' },
      tint: {
        train: 'rgba(210,85,42,0.10)', eat: 'rgba(154,108,0,0.10)',
        health: 'rgba(27,138,112,0.10)', hiku: 'rgba(97,80,216,0.10)',
        warning: 'rgba(148,99,0,0.10)', danger: 'rgba(201,54,54,0.10)',
      },
      macro: { protein: '#2E6BD3', carbs: '#855D00', fat: '#B8406F' },
      status: { success: '#177A45', warning: '#8A5C00', danger: '#C93636' },
      track: 'rgba(18,22,28,0.09)',
      board: { bg: '#E4E8EE' },
      chip: { hiku: { bg: 'rgba(97,80,216,0.10)', fg: '#6150D8' } },
    },
    aurora: { base: '#EEF0F7' },
    glass: {
      card: 'rgba(255,255,255,0.78)', highlight: 'rgba(255,255,255,0.75)',
      border: 'rgba(255,255,255,0.90)',
      shadow: 'inset 0 1px 0 rgba(255,255,255,0.90), 0 14px 34px rgba(60,70,120,0.14)',
    },
    rim: { strength: 0.15, glow: 0.07 },
    ambient: {
      train: 'rgba(255,170,140,0.60)', hiku: 'rgba(170,150,255,0.55)',
      health: 'rgba(120,225,200,0.50)', eat: 'rgba(255,215,130,0.50)',
    },
    train: { gradEnd: '#B8322E' },
    orb: { 1: '#FFE09A', 2: '#FFB496', 3: '#B9A8FF', ink: '#120B22' },
    rest: { 1: '#FFD9C7', 2: '#FFB496', 3: '#F08DB0' },
    sheet: { glass: 'rgba(255,255,255,0.95)' },
    elevation: { card: '0 1px 2px rgba(18,22,28,0.06), 0 6px 18px rgba(18,22,28,0.07)' },
  },
} as const;

const shared = {
  type: {
    display: { face: 'Archivo', size: 34, line: 36, weight: '800', widthFactor: 1.12 },
    title: { face: 'Archivo', size: 22, line: 26, weight: '700', widthFactor: 1.08 },
    head: { face: 'Archivo', size: 17, line: 22, weight: '700', widthFactor: 1.04 },
    metric: {
      xl: { face: 'Archivo', size: 52, line: 52, weight: '800', widthFactor: 1.16, tabular: true },
      l: { face: 'Archivo', size: 30, line: 30, weight: '800', widthFactor: 1.16, tabular: true },
      m: { face: 'Archivo', size: 24, line: 24, weight: '800', widthFactor: 1.16, tabular: true },
    },
    body: { face: 'Figtree', size: 15, line: 22, weight: '400',
      strong: { face: 'Figtree', size: 15, line: 22, weight: '600' } },
    small: { face: 'Figtree', size: 13, line: 18, weight: '400' },
    label: { face: 'Figtree', size: 11, line: 14, weight: '700', letterSpacingEm: 0.09, uppercase: true },
    button: { face: 'Figtree', size: 15, line: 20, weight: '700' },
  },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 },
  radius: { sm: 8, md: 14, lg: 22, pill: 999 },
  layout: { gutter: 18, cardGap: 14 },
  size: { touch: { min: 48, primary: 56, workout: 64, nav: 56 } },
  motion: {
    quick: { duration: 120, easing: 'standard' },
    base: { duration: 220, easing: [0.2, 0.8, 0.2, 1] },
    slow: { duration: 550, range: [500, 600], easing: [0.2, 0.8, 0.2, 1] },
    breathe: { duration: 5000, scale: 1.03 },
  },
  orbSize: { today: 236, compact: 200, diary: 132, ringStroke: 12 },
} as const;

/**
 * The output retains documented token paths (theme.color.border.control etc.).
 * Native consumers must use effectiveStyle rather than opting into translucent glass
 * while high contrast text is enabled.
 */
export function createTheme(mode: ColorScheme, effectiveStyle: VisualStyle) {
  const values = palette[mode];
  return {
    ...values, ...shared,
    mode, effectiveStyle,
    dock: { bg: effectiveStyle === 'solid' ? values.color.bg.base : values.aurora.base },
    // The thin glass outline is decorative; interactive outlines must be >=3:1.
    controlOutline: effectiveStyle === 'aurora' ? values.color.border.control : values.color.border.strong,
    background: effectiveStyle === 'aurora' ? values.aurora.base : values.color.bg.base,
    cardFill: effectiveStyle === 'aurora' ? values.glass.card : values.color.bg.surface,
    sheetFill: effectiveStyle === 'aurora' ? values.sheet.glass : values.color.bg.surface,
  };
}

export type LiftriaTheme = ReturnType<typeof createTheme>;
