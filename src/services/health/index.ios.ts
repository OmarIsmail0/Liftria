/** The iOS Metro entrypoint for Health. Never import react-native-health-connect here:
 * it has Android-only native APIs. HealthKit is deliberately not enabled yet.
 * Return unsupported/unknown rather than synthetic or Android-cached readings. */
import {metricTypes,energyMetrics,type AggregateValue,type HealthDataSource,
 type PermissionState,type EnergyMetric,type DailyEnergyRow} from './types';
export {energyMetrics} from './types';
export type {EnergyMetric,DailyEnergyRow} from './types';
export const healthConnect:HealthDataSource={
 id:'health-connect',
 async getAvailability(){return 'unsupported';},
 async getPermissionStatus(_types){
  return Object.fromEntries(metricTypes.map(metric=>[metric,'unknown'])) as Record<MetricType,PermissionState>;
 },
 async requestPermissions(_types){
  return Object.fromEntries(metricTypes.map(metric=>[metric,'unknown'])) as Record<MetricType,PermissionState>;
 },
 async read(){return {status:'unavailable'};},
};
export async function requestHistoryReadPermission():Promise<'unavailable'>{
 return 'unavailable';
}
/** No data is sourced from HealthKit until a separately approved integration. */
export function normalizeEnergyAggregate(_metric:EnergyMetric,_raw:unknown,
 _windowStart:string,_windowEnd:string):AggregateValue|null{return null;}
export async function readDailyEnergy(_days=7):Promise<DailyEnergyRow[]>{return [];}

/** Compile-time export parity: adding a runtime export on Android must also update
 * the iOS adapter or tsc fails. The type-only import does not load native code. */
const _parity:Record<keyof typeof import('./android'),unknown>={
 healthConnect,requestHistoryReadPermission,energyMetrics,normalizeEnergyAggregate,readDailyEnergy,
};
void _parity;
