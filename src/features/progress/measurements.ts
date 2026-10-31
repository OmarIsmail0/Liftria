import { bidiIsolate, formatNumber, translate, type AppLanguage } from '../../i18n';
import type { WeightUnit } from '../train/workoutUnits';

/** Tape sites, in the order the form and the summary card show them. */
export const MEASUREMENT_SITES = [
  'waist', 'hips', 'chest', 'neck', 'shoulders',
  'arm_left', 'arm_right', 'thigh_left', 'thigh_right', 'calf_left', 'calf_right',
] as const;

export type MeasurementSite = (typeof MEASUREMENT_SITES)[number];
export type LengthUnit = 'cm' | 'in';

export const CM_PER_INCH = 2.54;

export type BodyMeasurement = {
  id: string;
  measuredAt: string;
  site: MeasurementSite;
  cm: number;
  note: string | null;
  source: 'liftria';
};

export type SiteSummary = {
  site: MeasurementSite;
  latest: BodyMeasurement;
  previous: BodyMeasurement | null;
  /** Latest minus the previous entry, in centimeters. Null when this is the first entry. */
  changeCm: number | null;
};

export function isMeasurementSite(value: string): value is MeasurementSite {
  return (MEASUREMENT_SITES as readonly string[]).includes(value);
}

/** Inches when the person weighs in pounds; centimeters otherwise. */
export function lengthUnitForWeight(unit: WeightUnit): LengthUnit {
  return unit === 'lb' ? 'in' : 'cm';
}

export function lengthUnitLabel(language: AppLanguage, unit: LengthUnit): string {
  return translate(language, unit === 'in' ? 'measure.unit.in' : 'measure.unit.cm');
}

/** Nearest tenth. Display and entry both use this precision. */
export function roundTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Convert a shown length to stored centimeters.
 * The shown value is rounded to 0.1 first. Centimeters are then kept to 0.01
 * so 0.1 inch (0.254 cm) still displays as the same tenth.
 */
export function toCm(shown: number, unit: LengthUnit): number {
  if (!Number.isFinite(shown)) return Number.NaN;
  const tenth = roundTenth(shown);
  const cm = unit === 'in' ? tenth * CM_PER_INCH : tenth;
  return Math.round(cm * 100) / 100;
}

export function fromCm(cm: number, unit: LengthUnit): number {
  if (!Number.isFinite(cm)) return Number.NaN;
  return roundTenth(unit === 'in' ? cm / CM_PER_INCH : cm);
}

const NBSP = '\u00A0';

function lengthText(shown: number, unit: LengthUnit, language: AppLanguage): string {
  const number = formatNumber(language, shown, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return number + NBSP + lengthUnitLabel(language, unit);
}

/** One direction-safe value: number, no-break space, unit. */
/** A value that is already in the shown unit (the chart axis uses this). */
export function formatShownLength(shown: number, unit: LengthUnit, language: AppLanguage): string {
  return bidiIsolate(language, lengthText(roundTenth(shown), unit, language));
}

export function formatMeasurement(cm: number, unit: LengthUnit, language: AppLanguage): string {
  return formatShownLength(fromCm(cm, unit), unit, language);
}

/** Difference of the two displayed values, so the change matches what the person sees. */
export function shownChange(latestCm: number, previousCm: number, unit: LengthUnit): number {
  return roundTenth(fromCm(latestCm, unit) - fromCm(previousCm, unit));
}

export function formatSignedMeasurement(delta: number, unit: LengthUnit, language: AppLanguage): string {
  const rounded = roundTenth(delta);
  const number = formatNumber(language, rounded, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const signed = rounded > 0 ? '+' + number : number;
  return bidiIsolate(language, signed + NBSP + lengthUnitLabel(language, unit));
}

export function measurementDateOk(at: string): boolean {
  const date = new Date(at);
  return Number.isFinite(date.getTime()) && date.getTime() <= Date.now() + 86400000;
}

export function validateMeasurement(cm: number, at: string, site: string): boolean {
  return isMeasurementSite(site) && Number.isFinite(cm) && cm > 0 && cm < 400 && measurementDateOk(at);
}

export type ParsedField =
  | { kind: 'blank' }
  | { kind: 'invalid' }
  | { kind: 'value'; cm: number };

/** A blank field is not a measurement. Zero and anything outside 0–400 cm is invalid, never stored as 0. */
export function parseMeasurementInput(raw: string, unit: LengthUnit): ParsedField {
  if (raw.trim() === '') return { kind: 'blank' };
  const parsed = Number(raw.trim().replace(',', '.'));
  if (!Number.isFinite(parsed)) return { kind: 'invalid' };
  const cm = toCm(parsed, unit);
  if (!(cm > 0 && cm < 400)) return { kind: 'invalid' };
  return { kind: 'value', cm };
}

export type DraftResult =
  | { ok: true; values: { site: MeasurementSite; cm: number }[] }
  | { ok: false; reason: 'empty' | 'invalid' };

export function measurementDrafts(
  fields: Partial<Record<MeasurementSite, string>>,
  unit: LengthUnit,
): DraftResult {
  const values: { site: MeasurementSite; cm: number }[] = [];
  let invalid = false;
  for (const site of MEASUREMENT_SITES) {
    const raw = fields[site];
    if (raw === undefined) continue;
    const parsed = parseMeasurementInput(raw, unit);
    if (parsed.kind === 'blank') continue;
    if (parsed.kind === 'invalid') {
      invalid = true;
      continue;
    }
    values.push({ site, cm: parsed.cm });
  }
  if (invalid) return { ok: false, reason: 'invalid' };
  if (values.length === 0) return { ok: false, reason: 'empty' };
  return { ok: true, values };
}

export function cleanNote(note: string | null): string | null {
  if (note === null) return null;
  const trimmed = note.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function roundCm(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Latest value per site that has data, in site order, with the change from the previous entry. */
export function summarizeMeasurements(rows: readonly BodyMeasurement[]): SiteSummary[] {
  const bySite = new Map<MeasurementSite, BodyMeasurement[]>();
  for (const row of rows) {
    const list = bySite.get(row.site) ?? [];
    list.push(row);
    bySite.set(row.site, list);
  }
  const summaries: SiteSummary[] = [];
  for (const site of MEASUREMENT_SITES) {
    const list = bySite.get(site);
    if (!list || list.length === 0) continue;
    const ordered = [...list].sort((a, b) =>
      b.measuredAt.localeCompare(a.measuredAt) || b.id.localeCompare(a.id));
    const latest = ordered[0];
    if (!latest) continue;
    const previous = ordered[1] ?? null;
    summaries.push({
      site,
      latest,
      previous,
      changeCm: previous ? roundCm(latest.cm - previous.cm) : null,
    });
  }
  return summaries;
}
