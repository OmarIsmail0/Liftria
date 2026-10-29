import {healthConnect,readDailyEnergy,requestHistoryReadPermission,
 normalizeEnergyAggregate} from '../index.ios';
import {metricTypes} from '../types';

// Jest has no Nitro binary. Unavailable HealthKit must not invent readings.
jest.mock('@kingstinct/react-native-healthkit', () => ({
 isHealthDataAvailableAsync: jest.fn(async () => false),
 requestAuthorization: jest.fn(async () => false),
 queryQuantitySamples: jest.fn(async () => []),
 queryCategorySamples: jest.fn(async () => []),
 queryWorkoutSamples: jest.fn(async () => []),
 queryStatisticsForQuantity: jest.fn(async () => ({ sources: [] })),
 WorkoutTypeIdentifier: 'HKWorkoutTypeIdentifier',
 WorkoutActivityType: {},
}));

test('iOS health adapter provides no Health Connect status, permission or fake records',async()=>{
 expect(await healthConnect.getAvailability()).toBe('unsupported');
 const permissions=await healthConnect.getPermissionStatus([...metricTypes]);
 expect(Object.values(permissions)).toEqual(metricTypes.map(()=> 'unknown'));
 expect(await healthConnect.requestPermissions([...metricTypes])).toEqual(permissions);
 expect(await healthConnect.read('steps',{start:new Date(0),end:new Date()}))
  .toEqual({status:'unavailable'});
 expect(await requestHistoryReadPermission()).toBe('unavailable');
 expect(await readDailyEnergy(7)).toEqual([]);
 expect(normalizeEnergyAggregate('active-calories',{ACTIVE_CALORIES_TOTAL:{inKilocalories:200}},
  '2026-10-20','2026-10-21')).toBeNull();
});
