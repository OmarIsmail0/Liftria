/**
 * Liftria design tokens, v2.
 * Colours, type, spacing and radius come from docs/design-v2 and PHASE_6_ISSUES.md.
 * Old token paths stay so existing screens keep compiling; their values are the nearest v2 step.
 * The phone's system font is used, so these roles set no font family.
 */
export type ColorScheme = 'dark' | 'light';
/** Stored appearance values. Effective style is always solid; aurora is no longer drawn. */
export type VisualStyle = 'aurora' | 'solid';
export type ThemeMode = 'system' | ColorScheme;

const metric = { size: 44, line: 48, weight: '700', tabular: true } as const;
const largeTitle = { size: 30, line: 36, weight: '700' } as const;
const title = { size: 20, line: 26, weight: '600' } as const;
const body = { size: 16, line: 22, weight: '400' } as const;
const bodyStrong = { size: 16, line: 22, weight: '600' } as const;
const secondary = { size: 14, line: 20, weight: '400' } as const;
const caption = { size: 12, line: 16, weight: '400' } as const;
const button = { size: 16, line: 22, weight: '600' } as const;

const palette = {
  dark: {
    color: {
      bg: { base: '#0D0E10', surface: '#18191C', raised: '#232529' },
      border: { subtle: '#2B2D32', strong: '#6A6F76', control: '#8D9199' },
      text: { primary: '#F2F3F5', secondary: '#A9ADB4', tertiary: '#8D9199', inverse: '#1A0D06' },
      accent: '#FF8A5C',
      action: { primary: { bg: '#FF8A5C', fg: '#1A0D06' } },
      domain: { train: '#FF8A5C', eat: '#FF8A5C', health: '#FF8A5C', hiku: '#FF8A5C' },
      on: { accent: '#1A0D06', train: '#1A0D06', hiku: '#1A0D06' },
      tint: {
        accent: '#3A2218', success: '#16301F',
        train: '#3A2218', eat: '#3A2218', health: '#3A2218', hiku: '#3A2218',
        warning: '#37302B', danger: '#232529',
      },
      macro: { protein: '#8CBEFF', carbs: '#FFCF5E', fat: '#FF9AC0' },
      status: { success: '#5BD08F', warning: '#F2B44C', danger: '#FF7A7A' },
      track: '#232529',
      board: { bg: '#0D0E10' },
      chip: { hiku: { bg: '#3A2218', fg: '#FF8A5C' } },
    },
    // Two equipment tones stay distinct so exercise figures keep a light and a dark gear.
    surface: { hairline: '#2B2D32', control: '#232529', pressed: '#2B2D32' },
    sheet: { scrim: 'rgba(0,0,0,0.60)' },
  },
  light: {
    color: {
      bg: { base: '#F4F3F1', surface: '#FFFFFF', raised: '#ECEAE6' },
      border: { subtle: '#E3E1DC', strong: '#5C6066', control: '#6E7279' },
      text: { primary: '#17181A', secondary: '#5C6066', tertiary: '#666A71', inverse: '#FFFFFF' },
      accent: '#B83B09',
      action: { primary: { bg: '#B83B09', fg: '#FFFFFF' } },
      domain: { train: '#B83B09', eat: '#B83B09', health: '#B83B09', hiku: '#B83B09' },
      on: { accent: '#FFFFFF', train: '#FFFFFF', hiku: '#FFFFFF' },
      tint: {
        accent: '#FBE9DF', success: '#E3F3E9',
        train: '#FBE9DF', eat: '#FBE9DF', health: '#FBE9DF', hiku: '#FBE9DF',
        warning: '#F4EFE6', danger: '#ECEAE6',
      },
      macro: { protein: '#2E6BD3', carbs: '#8F6500', fat: '#B8406F' },
      status: { success: '#177A45', warning: '#8A5C00', danger: '#B3261E' },
      track: '#ECEAE6',
      board: { bg: '#F4F3F1' },
      chip: { hiku: { bg: '#FBE9DF', fg: '#B83B09' } },
    },
    surface: { hairline: '#E3E1DC', control: '#ECEAE6', pressed: '#E3E1DC' },
    sheet: { scrim: 'rgba(16,24,40,0.36)' },
  },
} as const;

const shared = {
  type: {
    metric: { xl: metric, l: title, m: title },
    largeTitle,
    title,
    body: { ...body, strong: bodyStrong },
    secondary,
    caption,
    // Old names, mapped onto the six v2 sizes.
    display: largeTitle,
    head: title,
    small: secondary,
    label: caption,
    button,
  },
  // 5 was 20 and 10 was 40; both sit on the nearest v2 step (16 and 32).
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 16, 6: 24, 8: 32, 10: 32 },
  radius: { sm: 8, md: 12, lg: 16, pill: 999 },
  layout: { gutter: 16, cardGap: 24, sheetMaxHeight: '90%' },
  size: {
    iconStroke: 1.8,
    touch: { min: 48, primary: 56, workout: 64, nav: 56 },
    border: { thin: 1 },
  },
  motion: {
    quick: { duration: 120, easing: 'standard' },
    base: { duration: 220, easing: [0.2, 0.8, 0.2, 1] },
    slow: { duration: 550, range: [500, 600], easing: [0.2, 0.8, 0.2, 1] },
    breathe: { duration: 5000, scale: 1.03 },
    press: { scale: 0.97 },
    spring: { damping: 22, stiffness: 320, mass: 0.8 },
    enter: { duration: 220, offset: 10 },
  },
  elevation: {
    card: '0 8px 24px rgba(0,0,0,0.18)',
    thumb: '0 1px 2px rgba(0,0,0,0.12)',
  },
} as const;

/** Always solid. The requested style is kept only so stored preferences still type-check. */
export function createTheme(mode: ColorScheme, requestedStyle: VisualStyle) {
  void requestedStyle;
  const values = palette[mode];
  return {
    ...values,
    ...shared,
    mode,
    effectiveStyle: 'solid' as const,
    dock: { bg: values.color.bg.base },
    controlOutline: values.color.border.strong,
    background: values.color.bg.base,
    cardFill: values.color.bg.surface,
    sheetFill: values.color.bg.surface,
  };
}

export type LiftriaTheme = ReturnType<typeof createTheme>;
