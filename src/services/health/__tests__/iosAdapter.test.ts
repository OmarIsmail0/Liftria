import {healthConnect,readDailyEnergy,requestHistoryReadPermission,
 normalizeEnergyAggregate} from '../index.ios';
import {metricTypes} from '../types';

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
