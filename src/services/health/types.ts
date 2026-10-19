export const metricTypes = [
  'steps', 'heart-rate', 'active-calories', 'total-calories',
  'basal-metabolic-rate', 'exercise-session', 'sleep-session',
  'weight', 'body-fat', 'lean-body-mass',
] as const;
export type MetricType = typeof metricTypes[number];
export type PermissionState = 'granted' | 'denied' | 'unknown';
export type SourceMeta = {
  adapter: 'health-connect' | 'samsung-health';
  recordId: string;
  dataOrigin: string;
  device?: { manufacturer?: string; model?: string; type?: string };
  lastModified?: string;
};
export type InstantSample = SourceMeta & {
  kind: 'instant'; metric: 'weight' | 'body-fat' | 'lean-body-mass';
  time: string; zoneOffset?: string; value: number; unit: 'kg' | '%';
};
export type RateSample = SourceMeta & {
  kind: 'rate'; metric: 'basal-metabolic-rate'; time: string; zoneOffset?: string;
  value: number; unit: 'kcal/day' | 'W';
};
export type IntervalSample = SourceMeta & {
  kind: 'interval'; metric: 'steps' | 'active-calories' | 'total-calories';
  start: string; end: string; value: number; unit: 'count' | 'kcal';
};
export type SeriesSample = SourceMeta & {
  kind: 'series'; metric: 'heart-rate'; start: string; end: string;
  points: { time: string; value: number }[]; unit: 'bpm';
};
export type ExerciseSession = SourceMeta & {
  kind: 'session'; start: string; end: string; exerciseType: string;
  title?: string; durationSec: number;
};
export type SleepSession = SourceMeta & {
  kind: 'sleep'; start: string; end: string;
  stages?: { stage: string; start: string; end: string }[];
};
export type AggregateValue = {
  kind: 'aggregate'; metric: MetricType; adapter: SourceMeta['adapter'];
  operation: string; windowStart: string; windowEnd: string;
  value: number; unit: 'kcal' | 'count'; dataOrigin?: string;
};
export type HealthRecord =
  | InstantSample | RateSample | IntervalSample | SeriesSample | ExerciseSession | SleepSession;
export type HealthValue = HealthRecord | AggregateValue;
export type ReadResult =
  | { status: 'ok'; records: HealthValue[] }
  | { status: 'empty' | 'permission-denied' | 'unsupported' | 'unavailable' }
  | { status: 'error'; code: string; message: string };
export interface HealthDataSource {
  id: SourceMeta['adapter'];
  getAvailability(): Promise<'available' | 'not-installed' | 'needs-update' | 'unsupported'>;
  getPermissionStatus(types: MetricType[]): Promise<Record<MetricType, PermissionState>>;
  requestPermissions(types: MetricType[]): Promise<Record<MetricType, PermissionState>>;
  read(type: MetricType, range: { start: Date; end: Date }): Promise<ReadResult>;
}
