import {Platform} from 'react-native';
import * as Notifications from 'expo-notifications';
import {prepareRestAlerts,REST_CHANNEL} from '../restAlerts';
jest.mock('../../../services/database',()=>({dbOperation:jest.fn()}));
jest.mock('expo-notifications',()=>({
 setNotificationChannelAsync:jest.fn(async()=>({})),
 getPermissionsAsync:jest.fn(async()=>({granted:true})),
 AndroidImportance:{HIGH:4},
}));
const originalPlatform=Platform.OS;
beforeEach(()=>{
 Object.defineProperty(Platform,'OS',{configurable:true,value:'ios'});
 jest.clearAllMocks();
});
afterAll(()=>Object.defineProperty(Platform,'OS',{configurable:true,value:originalPlatform}));
test('iPhone checks notification permission without using Android notification channels',async()=>{
 expect(await prepareRestAlerts()).toBe(true);
 expect(Notifications.getPermissionsAsync).toHaveBeenCalledTimes(1);
 expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
});
test('Android still configures its rest channel before checking permissions',async()=>{
 Object.defineProperty(Platform,'OS',{configurable:true,value:'android'});
 expect(await prepareRestAlerts()).toBe(true);
 expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(REST_CHANNEL,
  {name:'Rest timer (device test)',importance:Notifications.AndroidImportance.HIGH});
 expect(Notifications.getPermissionsAsync).toHaveBeenCalledTimes(1);
});
