/** The iOS Metro entrypoint for Health. Never import react-native-health-connect here:
 * it has Android-only native APIs. Apple Health is read-only and imported only from this file. */
import { appleHealth, normalizeAppleEnergyAggregate, readAppleDailyEnergy } from './appleHealth';
import { energyMetrics, type AggregateValue, type DailyEnergyRow, type EnergyMetric } from './types';

export { energyMetrics } from './types';
export type { EnergyMetric, DailyEnergyRow } from './types';

/** The platform health source. On iPhone this is Apple Health, where Android uses Health Connect. */
export const healthConnect = appleHealth;

/** HealthKit has no separate history-read grant. Nothing is requested. */
export async function requestHistoryReadPermission(): Promise<'unavailable'> {
  return 'unavailable';
}

/** Health Connect energy shapes are not Apple Health statistics and stay null. */
export function normalizeEnergyAggregate(
  metric: EnergyMetric, raw: unknown, windowStart: string, windowEnd: string,
): AggregateValue | null {
  return normalizeAppleEnergyAggregate(metric, raw, windowStart, windowEnd);
}

export async function readDailyEnergy(days = 7): Promise<DailyEnergyRow[]> {
  return readAppleDailyEnergy(days);
}

/** Compile-time export parity: adding a runtime export on Android must also update
 * the iOS adapter or tsc fails. The type-only import does not load native code. */
const _parity: Record<keyof typeof import('./android'), unknown> = {
  healthConnect, requestHistoryReadPermission, energyMetrics, normalizeEnergyAggregate, readDailyEnergy,
};
void _parity;
