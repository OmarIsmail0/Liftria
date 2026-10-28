/** The iOS Metro entrypoint for Health. Never import react-native-health-connect here:
 * it has Android-only native APIs. HealthKit is deliberately not enabled yet.
 * Return unsupported/unknown rather than synthetic or Android-cached readings. */
import {metricTypes,type AggregateValue,type HealthDataSource,type MetricType,
 type PermissionState} from './types';
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
export const energyMetrics=['active-calories','total-calories','basal-metabolic-rate'] as const;
export type EnergyMetric=typeof energyMetrics[number];
export type DailyEnergyRow=
 |{metric:EnergyMetric;date:string;status:'ok'|'no-source';value:AggregateValue}
 |{metric:EnergyMetric;date:string;status:'empty'|'unavailable'|'permission-denied'|'error';message?:string};
/** No data is sourced from HealthKit until a separately approved integration. */
export function normalizeEnergyAggregate(_metric:EnergyMetric,_raw:unknown,
 _windowStart:string,_windowEnd:string):AggregateValue|null{return null;}
export async function readDailyEnergy(_days=7):Promise<DailyEnergyRow[]>{return [];}
