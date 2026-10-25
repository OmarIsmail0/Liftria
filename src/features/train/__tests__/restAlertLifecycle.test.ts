
import * as Notifications from 'expo-notifications';
import { dbOperation } from '../../../services/database';
import { cancelSessionRestAlerts } from '../restAlerts';
import { shouldAdvanceRotation } from '../workoutData';

jest.mock('expo-notifications',()=>({
  getAllScheduledNotificationsAsync:jest.fn(),
  getPresentedNotificationsAsync:jest.fn(),
  cancelScheduledNotificationAsync:jest.fn(),
  dismissNotificationAsync:jest.fn(),
}));
jest.mock('../../../services/database',()=>({dbOperation:jest.fn()}));

const scheduled=Notifications.getAllScheduledNotificationsAsync as jest.Mock;
const presented=Notifications.getPresentedNotificationsAsync as jest.Mock;
const cancel=Notifications.cancelScheduledNotificationAsync as jest.Mock;
const dismiss=Notifications.dismissNotificationAsync as jest.Mock;
const operation=dbOperation as jest.Mock;
const query=jest.fn();
const execute=jest.fn();

beforeEach(()=>{
  jest.clearAllMocks();
  operation.mockImplementation(async(fn:(db:unknown)=>Promise<unknown>)=>
    ({ok:true,value:await fn({getAllAsync:query,runAsync:execute})}));
  execute.mockResolvedValue({changes:1});
  query.mockResolvedValue([{key:'rest.alert.set-1',
    value:JSON.stringify({id:'persisted-1',sessionId:'workout-1',setId:'set-1'})},
    {key:'rest.alert.other',
      value:JSON.stringify({id:'unrelated',sessionId:'workout-2',setId:'other'})}]);
  scheduled.mockResolvedValue([{identifier:'native-after-kill',content:{
    data:{kind:'liftria-rest',sessionId:'workout-1',setId:'set-1'}}},
    {identifier:'other-native',content:{data:{kind:'liftria-rest',sessionId:'workout-2'}}}]);
  presented.mockResolvedValue([{request:{identifier:'delivered-after-kill',
    content:{data:{kind:'liftria-rest',sessionId:'workout-1'}}}},
    {request:{identifier:'other-delivered',
      content:{data:{kind:'liftria-rest',sessionId:'workout-2'}}}}]);
});

test('rest IDs survive process loss and cancel stored, scheduled and displayed alerts only for the session',async()=>{
  await cancelSessionRestAlerts('workout-1');
  expect(cancel).toHaveBeenCalledTimes(2);
  expect(cancel).toHaveBeenCalledWith('persisted-1');
  expect(cancel).toHaveBeenCalledWith('native-after-kill');
  expect(cancel).not.toHaveBeenCalledWith('unrelated');
  expect(cancel).not.toHaveBeenCalledWith('other-native');
  expect(dismiss).toHaveBeenCalledTimes(1);
  expect(dismiss).toHaveBeenCalledWith('delivered-after-kill');
  expect(execute).toHaveBeenCalledTimes(1);
  expect(execute).toHaveBeenCalledWith(
    'DELETE FROM app_settings WHERE key=?',['rest.alert.set-1']);
});

test('failed cancellation keeps IDs in SQLite for the next retry',async()=>{
  cancel.mockRejectedValueOnce(new Error('Android failure'));
  await expect(cancelSessionRestAlerts('workout-1')).rejects.toThrow('Android failure');
  expect(execute).not.toHaveBeenCalled();
});

test('rotation only advances when the actual next template finishes',()=>{
  expect(shouldAdvanceRotation(['A','B'],0,'A')).toBe(true);
  expect(shouldAdvanceRotation(['A','B'],0,'B')).toBe(false);
  expect(shouldAdvanceRotation(['A','B'],3,'B')).toBe(true);
  expect(shouldAdvanceRotation(['A','B'],3,null)).toBe(false);
  expect(shouldAdvanceRotation([],3,'A')).toBe(false);
});
