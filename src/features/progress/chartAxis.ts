import { formatNumber, latinDigits, translate, type AppLanguage } from '../../i18n';

type AxisUnit = 'kg' | 'lb' | 'kcal';

/** Prefer first/last plus evenly spread middle ticks for short phone charts. */
export function pickTickIndexes(total: number, maxTicks: number): number[] {
  if (!Number.isFinite(total) || total <= 0 || maxTicks <= 0) return [];
  if (total <= maxTicks) return Array.from({ length: total }, (_, i) => i);
  const last = total - 1;
  const count = Math.max(2, Math.trunc(maxTicks));
  const step = last / (count - 1);
  const set = new Set<number>([0, last]);
  for (let i = 1; i < count - 1; i += 1) {
    set.add(Math.round(i * step));
  }
  const ticks = [...set].sort((a, b) => a - b);
  if (ticks.length >= count) return ticks.slice(0, count);
  for (let i = 1; i < last && ticks.length < count; i += 1) {
    if (!set.has(i)) ticks.push(i);
  }
  return ticks.sort((a, b) => a - b);
}

function locale(language: AppLanguage): string {
  return language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US';
}

export function formatAxisDayLabel(day: string, language: AppLanguage): string {
  const [year, month, date] = day.split('-').map(Number);
  if (!year || !month || !date) return day;
  const value = new Date(Date.UTC(year, month - 1, date, 12));
  return latinDigits(new Intl.DateTimeFormat(locale(language), {
    month: 'short',
    day: 'numeric',
    numberingSystem: 'latn',
    timeZone: 'UTC',
  }).format(value));
}

export function formatAxisValueLabel(value: number, language: AppLanguage, unit: AxisUnit): string {
  const digits = unit === 'kcal' ? 0 : 1;
  const rounded = digits === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${formatNumber(language, rounded, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} ${unit === 'kcal' ? translate(language, 'trend.axisKcal') : unit}`;
}
