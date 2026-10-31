import { translate, weightUnitLabel, type AppLanguage } from '../../i18n';
/** Stored values stay metric; conversions are display-only. */
export type WeightUnit = 'kg' | 'lb';
export type HeightUnit = 'cm' | 'ftin';
export const LB_PER_KG = 2.2046226218487757;
export const CM_PER_IN = 2.54;
export function displayWeight(kg: number, unit: WeightUnit, language: AppLanguage = 'en'): string {
  if (!Number.isFinite(kg)) return '—';
  const shown = unit === 'kg' ? kg : kg * LB_PER_KG;
  return `${shown.toFixed(1)} ${weightUnitLabel(language, unit)}`;
}
export function displayHeight(cm: number, unit: HeightUnit, language: AppLanguage = 'en'): string {
  if (!Number.isFinite(cm)) return '—';
  if (unit === 'cm') return `${cm.toFixed(0)} ${translate(language, 'units.cm')}`;
  const rounded = Math.round(cm / CM_PER_IN);
  return `${Math.floor(rounded / 12)}′ ${rounded % 12}″`;
}
export function toMetricWeight(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value / LB_PER_KG;
}
export function toMetricHeight(feet: number, inches: number, unit: HeightUnit): number {
  return unit === 'cm' ? feet : (feet * 12 + inches) * CM_PER_IN;
}
