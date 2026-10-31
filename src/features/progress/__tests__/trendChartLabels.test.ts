import React from 'react';
import { Text, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { Text as SvgText } from 'react-native-svg';
import { createTheme } from '../../../design/tokens';
import type { AppLanguage, TranslationKey, TranslationParams } from '../../../i18n';
import { fromKg, type WeightUnit } from '../../train/workoutUnits';
import { formatAxisDayLabel, formatAxisValueLabel, pickTickIndexes } from '../chartAxis';
import { NutritionGraph, WeightGraph } from '../TrendCharts';
import type { NutritionTrend, WeightTrend } from '../trendMath';

/** Typography lives next to animated primitives. The label test only needs its text. */
jest.mock('react-native-reanimated', () => {
  const { View: AnimatedView } = jest.requireActual('react-native') as typeof import('react-native');
  const identity = (value: unknown) => value;
  return {
    __esModule: true,
    default: { View: AnimatedView },
    Easing: { linear: identity, out: identity, in: identity, inOut: identity, bezier: () => identity },
    useSharedValue: (value: unknown) => ({ get: () => value, set: () => undefined }),
    useAnimatedStyle: (factory: () => object) => factory(),
    withSpring: identity,
    withTiming: identity,
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

/**
 * Providers load settings before they render. The charts only need a theme and a language,
 * so the test supplies those directly and checks the painted labels.
 */
let mockLanguage: AppLanguage = 'en';
jest.mock('../../../design/ThemeProvider', () => {
  const tokens = jest.requireActual('../../../design/tokens') as typeof import('../../../design/tokens');
  const theme = tokens.createTheme('dark', 'solid');
  return { useTheme: () => ({ theme }) };
});
jest.mock('../../../i18n/LanguageProvider', () => ({
  useLanguage: () => {
    const i18n = jest.requireActual('../../../i18n') as typeof import('../../../i18n');
    return {
      language: mockLanguage,
      t: (key: TranslationKey, params?: TranslationParams) => i18n.translate(mockLanguage, key, params),
    };
  },
}));

const theme = createTheme('dark', 'solid');

function nutritionTrend(): NutritionTrend {
  const days: NutritionTrend['days'] = [
    { day: '2026-10-01', logged: true, kcal: 2000, protein: null, carbs: null, fat: null,
      completeMacros: false, proteinGoal: 'unknown' },
    { day: '2026-10-15', logged: true, kcal: 1000, protein: null, carbs: null, fat: null,
      completeMacros: false, proteinGoal: 'unknown' },
  ];
  return {
    days, loggedDays: 2, avgKcal: 1500, avgProtein: null, avgCarbs: null, avgFat: null,
    completeMacroDays: 0, proteinMetDays: 0,
  };
}

function weightTrend(): WeightTrend {
  return {
    startDay: '2026-10-01', endDay: '2026-10-15', latest: null, change: null,
    points: [
      { day: '2026-10-01', kg: 80, trend: 80, entries: [
        { id: 'a', at: '2026-10-01T08:00:00.000Z', kg: 80, source: 'liftria' }] },
      { day: '2026-10-15', kg: 79, trend: 79.5, entries: [
        { id: 'b', at: '2026-10-15T08:00:00.000Z', kg: 79, source: 'liftria' }] },
    ],
  };
}

function nutritionLabels(language: AppLanguage, hidden: boolean): string[] {
  const trend = nutritionTrend();
  const logged = trend.days.filter(day => day.logged).map(day => day.kcal ?? 0);
  const ceiling = Math.max(1, ...logged) * 1.1;
  const values = hidden ? [] : [0, ceiling / 2, ceiling].map(value =>
    formatAxisValueLabel(value, language, 'kcal'));
  const dates = pickTickIndexes(trend.days.length, 4).map(index =>
    formatAxisDayLabel(trend.days[index]!.day, language));
  return [...values, ...dates];
}

function weightLabels(language: AppLanguage, unit: WeightUnit, hidden: boolean): string[] {
  const trend = weightTrend();
  const all = trend.points.flatMap(day => [day.trend, ...day.entries.map(entry => entry.kg)]);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = Math.max(1, max - min);
  const minY = min - span * 0.1;
  const maxY = max + span * 0.1;
  const values = hidden ? [] : [minY, (minY + maxY) / 2, maxY].map(value =>
    formatAxisValueLabel(fromKg(value, unit), language, unit));
  const dates = pickTickIndexes(trend.points.length, 4).map(index =>
    formatAxisDayLabel(trend.points[index]!.day, language));
  return [...values, ...dates];
}

function render(element: React.ReactElement): TestRenderer.ReactTestRenderer {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(element); });
  return renderer;
}

function labelText(renderer: TestRenderer.ReactTestRenderer): string[] {
  return renderer.root.findAllByType(Text).map(node => {
    const children = node.props.children;
    if (typeof children !== 'string') throw new Error('axis label is not a text string');
    return children;
  }).sort();
}

function tickStyle(node: TestRenderer.ReactTestInstance): { left: number; top: number; translateX: string } {
  let current: TestRenderer.ReactTestInstance | null = node.parent;
  while (current) {
    const style = current.props.style as { position?: string; left?: number; top?: number;
      transform?: { translateX?: string }[] } | undefined;
    if (style?.position === 'absolute' && typeof style.left === 'number' && typeof style.top === 'number') {
      const translateX = style.transform?.[0]?.translateX;
      if (typeof translateX !== 'string') throw new Error('tick is not shifted onto its anchor');
      return { left: style.left, top: style.top, translateX };
    }
    current = current.parent;
  }
  throw new Error('tick has no absolute position');
}

/** Same anchors the nutrition chart used when its labels were SVG text. */
function expectNutritionAnchors(tree: TestRenderer.ReactTestRenderer, language: AppLanguage, width: number): void {
  const pad = { top: 12, right: 12, bottom: 30, left: language === 'ar' ? 76 : 58 };
  const height = 178;
  const ceiling = 2200;
  const y = (n: number) => height - pad.bottom - (height - pad.top - pad.bottom) * n / ceiling;
  const x = (index: number) => pad.left + index * (width - pad.left - pad.right);
  const fontSize = theme.type.small.size;
  const byText = new Map(tree.root.findAllByType(Text).map(node => [String(node.props.children), node]));
  for (const value of [0, ceiling / 2, ceiling]) {
    expect(tickStyle(byText.get(formatAxisValueLabel(value, language, 'kcal'))!)).toEqual({
      left: pad.left - 6, top: y(value) + 4 - fontSize, translateX: '-100%',
    });
  }
  for (const [index, day] of ['2026-10-01', '2026-10-15'].entries()) {
    expect(tickStyle(byText.get(formatAxisDayLabel(day, language))!)).toEqual({
      left: x(index), top: height - 8 - fontSize, translateX: '-50%',
    });
  }
}

test('nutrition and weight tick labels are RN text in English and Arabic', () => {
  const cases: { language: AppLanguage; nutrition: string[]; weight: string[] }[] = (['en', 'ar'] as const).map(language => ({
    language,
    nutrition: nutritionLabels(language, false),
    weight: weightLabels(language, 'kg', false),
  }));
  expect(cases[0]!.nutrition).toEqual([
    '0 kcal', '1,100 kcal', '2,200 kcal',
    formatAxisDayLabel('2026-10-01', 'en'), formatAxisDayLabel('2026-10-15', 'en'),
  ]);
  expect(cases[1]!.nutrition).toEqual([
    '0 سعرة', '1,100 سعرة', '2,200 سعرة',
    formatAxisDayLabel('2026-10-01', 'ar'), formatAxisDayLabel('2026-10-15', 'ar'),
  ]);
  expect(formatAxisDayLabel('2026-10-01', 'ar')).toMatch(/[\u0600-\u06FF]/);
  expect(cases[1]!.nutrition.join(' ')).not.toMatch(/kcal/);

  for (const { language, nutrition, weight } of cases) {
    mockLanguage = language;
    const nutritionTree = render(React.createElement(NutritionGraph, { trend: nutritionTrend(), target: null }));
    const weightTree = render(React.createElement(WeightGraph, {
      trend: weightTrend(), hidden: false, unit: 'kg' as const,
    }));
    for (const tree of [nutritionTree, weightTree]) {
      expect(tree.root.findAllByType(SvgText)).toEqual([]);
      expect(tree.root.findAll(node => node.props.textAnchor !== undefined)).toEqual([]);
    }
    expect(labelText(nutritionTree)).toEqual([...nutrition].sort());
    expect(labelText(weightTree)).toEqual([...weight].sort());
    for (const node of [...nutritionTree.root.findAllByType(Text), ...weightTree.root.findAllByType(Text)]) {
      expect(node.props.style.fontSize).toBe(theme.type.small.size);
      expect(node.props.style.color).toBe(theme.color.text.secondary);
    }
    expectNutritionAnchors(nutritionTree, language, 320);
    for (const tree of [nutritionTree, weightTree]) {
      const chart = tree.root.findAllByType(View).find(node => node.props.accessibilityRole === 'image');
      expect(chart?.props.accessible).toBe(true);
      const layer = tree.root.findAllByType(View).find(node => node.props.style?.direction === 'ltr');
      expect(layer?.props.importantForAccessibility).toBe('no-hide-descendants');
      expect(layer?.props.accessibilityElementsHidden).toBe(true);
      for (const node of tree.root.findAllByType(Text)) {
        let hidden = false;
        let current: TestRenderer.ReactTestInstance | null = node.parent;
        while (current) {
          if (current.props.importantForAccessibility === 'no-hide-descendants' &&
            current.props.accessibilityElementsHidden === true) hidden = true;
          current = current.parent;
        }
        expect(hidden).toBe(true);
      }
    }
    const chart = nutritionTree.root.findAllByType(View).find(node => node.props.accessibilityRole === 'image');
    expect(chart?.props.accessibilityLabel).not.toContain(nutrition[0]);
    if (language === 'en') {
      act(() => {
        chart?.props.onLayout({ nativeEvent: { layout: { width: 280, height: 178 } } });
      });
      expectNutritionAnchors(nutritionTree, language, 280);
    }
  }
});

test('hidden charts omit value ticks and keep the date ticks as RN text', () => {
  mockLanguage = 'ar';
  const tree = render(React.createElement(NutritionGraph, {
    trend: nutritionTrend(), target: null, hidden: true,
  }));
  expect(tree.root.findAllByType(SvgText)).toEqual([]);
  expect(labelText(tree)).toEqual([...nutritionLabels('ar', true)].sort());
  expect(labelText(tree).some(label => label.includes('سعرة'))).toBe(false);
  for (const node of tree.root.findAllByType(Text)) expect(tickStyle(node).translateX).toBe('-50%');
});
