import { bidiIsolate, pluralForm, translate, type AppLanguage, type TranslationKey } from '../../i18n';
import { SOURCE_PHONE, SOURCE_UNKNOWN } from './presentation';

/** Source labels come from `sourceName()`; the two it invents itself are translated, app names stay as they are. */
export function sourceDisplayName(language: AppLanguage, label: string): string {
  if (label === SOURCE_PHONE) return translate(language, 'chips.phone');
  if (label === SOURCE_UNKNOWN) return translate(language, 'healthOverview.unknownSource');
  return label;
}

export type StepsPeriod = 'day' | 'week';

export function noStepsText(language: AppLanguage): string {
  return translate(language, 'healthChart.noSteps');
}

/** The source name is Latin for apps such as Samsung Health, so it is isolated inside Arabic text. */
export function stepsSourceTitle(language: AppLanguage, label: string): string {
  return translate(language, 'healthChart.sourceTitle', {
    source: bidiIsolate(language, sourceDisplayName(language, label)),
  });
}

export function stepsChartLabel(language: AppLanguage, label: string, period: StepsPeriod, total: number): string {
  return translate(language, period === 'day' ? 'healthChart.stepsHourly' : 'healthChart.stepsDaily', {
    source: sourceDisplayName(language, label), total,
  });
}

/** `days` is the number of daily bars in the week chart, so the first bar is that many days back. */
export function stepsAxisText(language: AppLanguage, period: StepsPeriod, days: number): string {
  if (period === 'day') return translate(language, 'healthChart.axisDay');
  const start = translate(language, `healthChart.daysAgo.${pluralForm(language, days)}` as TranslationKey,
    { count: days });
  return translate(language, 'healthChart.axisWeek', { start });
}

export function noHeartText(language: AppLanguage): string {
  return translate(language, 'healthChart.noHeart');
}

export function heartChartLabel(language: AppLanguage, count: number, low: number, high: number): string {
  const samples = translate(language, `healthChart.heartCount.${pluralForm(language, count)}` as TranslationKey,
    { count });
  return translate(language, 'healthChart.heartLabel', { samples, low, high });
}

export function heartChartNote(language: AppLanguage): string {
  return translate(language, 'healthChart.heartNote');
}
