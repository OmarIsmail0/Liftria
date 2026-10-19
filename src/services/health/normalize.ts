import type { HealthRecord, MetricType, SourceMeta } from './types';

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw => (v && typeof v === 'object' && !Array.isArray(v) ? v as Raw : {});
const str = (v: unknown): string | undefined => typeof v === 'string' && v.length > 0 ? v : undefined;
const num = (v: unknown): number | undefined => typeof v === 'number' && Number.isFinite(v) ? v : undefined;
const amount = (o: unknown, property: string): number | undefined => num(obj(o)[property]);
const base = (raw: Raw): SourceMeta | null => {
  const metadata = obj(raw.metadata);
  const id = str(metadata.id);
  // We never invent a source record ID. Unidentified records cannot be persisted.
  if (!id) return null;
  const rawDevice = obj(metadata.device);
  const device = Object.keys(rawDevice).length > 0
    ? { manufacturer: str(rawDevice.manufacturer), model: str(rawDevice.model),
        type: rawDevice.type == null ? undefined : String(rawDevice.type) }
    : undefined;
  return {
    adapter: 'health-connect', recordId: id,
    dataOrigin: str(metadata.dataOrigin) ?? 'unknown', device,
    lastModified: str(metadata.lastModifiedTime),
  };
};
export function normalizeHealthRecord(metric: MetricType, input: unknown): HealthRecord | null {
  const raw = obj(input);
  const meta = base(raw);
  if (!meta) return null;
  const start = str(raw.startTime);
  const end = str(raw.endTime);
  switch (metric) {
    case 'steps':
    case 'active-calories':
    case 'total-calories': {
      const value = metric === 'steps' ? num(raw.count) : amount(raw.energy, 'inKilocalories');
      if (!start || !end || value === undefined) return null;
      return {
        ...meta, kind: 'interval', metric, start, end, value,
        unit: metric === 'steps' ? 'count' : 'kcal',
      };
    }
    case 'heart-rate': {
      if (!start || !end || !Array.isArray(raw.samples)) return null;
      const points = raw.samples.flatMap((rawSample: unknown) => {
        const sample = obj(rawSample);
        const time = str(sample.time);
        const value = num(sample.beatsPerMinute);
        return time && value !== undefined ? [{ time, value }] : [];
      });
      return { ...meta, kind: 'series', metric, start, end, points, unit: 'bpm' };
    }
    case 'basal-metabolic-rate': {
      const time = str(raw.time);
      const power = obj(raw.basalMetabolicRate);
      // A point-in-time POWER/RATE, not an energy total.
      const watts = num(power.inWatts);
      const kcalPerDay = num(power.inKilocaloriesPerDay);
      if (!time || (watts === undefined && kcalPerDay === undefined)) return null;
      return {
        ...meta, kind: 'rate', metric, time, zoneOffset: str(raw.zoneOffset),
        value: watts ?? kcalPerDay!, unit: watts === undefined ? 'kcal/day' : 'W',
      };
    }
    case 'exercise-session': {
      if (!start || !end) return null;
      const exerciseType = raw.exerciseType;
      if (typeof exerciseType !== 'string' && typeof exerciseType !== 'number') return null;
      const durationSec = (Date.parse(end) - Date.parse(start)) / 1000;
      if (!Number.isFinite(durationSec) || durationSec < 0) return null;
      return { ...meta, kind: 'session', start, end, exerciseType: String(exerciseType), title: str(raw.title), durationSec };
    }
    case 'sleep-session': {
      if (!start || !end) return null;
      const stages = Array.isArray(raw.stages)
        ? raw.stages.flatMap((item: unknown) => {
            const stage = obj(item);
            const from = str(stage.startTime);
            const to = str(stage.endTime);
            return from && to && stage.stage != null ? [{ start: from, end: to, stage: String(stage.stage) }] : [];
          })
        : undefined;
      return { ...meta, kind: 'sleep', start, end, stages };
    }
    case 'weight':
    case 'lean-body-mass':
    case 'body-fat': {
      const time = str(raw.time);
      const value = metric === 'body-fat'
        ? (num(raw.percentage) ?? amount(raw.percentage, 'inPercent'))
        : amount(metric === 'weight' ? raw.weight : raw.mass, 'inKilograms');
      if (!time || value === undefined) return null;
      return { ...meta, kind: 'instant', metric, time, zoneOffset: str(raw.zoneOffset),
        value, unit: metric === 'body-fat' ? '%' : 'kg' };
    }
  }
}
