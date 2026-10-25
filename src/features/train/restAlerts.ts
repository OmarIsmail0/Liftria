/** Local-only best-effort rest alerts. Persist IDs in SQLite and reconcile OS schedules after process death. */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { dbOperation } from '../../services/database';
import { restAt } from './restClock';

export const REST_CHANNEL = 'liftria-rest-test';
const KEY_PREFIX = 'rest.alert.';
export type AlertRef = { id:string; sessionId:string; setId:string };
export function isSessionRestNotification(data: Record<string,unknown> | undefined, sessionId:string):boolean {
  return data?.kind==='liftria-rest' && data?.sessionId===sessionId;
}
export async function prepareRestAlerts(): Promise<boolean> {
  if(Platform.OS==='android') await Notifications.setNotificationChannelAsync(REST_CHANNEL,{
    name:'Rest timer (device test)',importance:Notifications.AndroidImportance.HIGH,
  });
  return (await Notifications.getPermissionsAsync()).granted;
}
export async function askRestPermission():Promise<boolean> {
  if(await prepareRestAlerts())return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}
export async function scheduleRestOver(deadline:string,sessionId:string,exerciseName:string,setId?:string)
  :Promise<string|null> {
  if(restAt(deadline).status!=='running'||!(await prepareRestAlerts()))return null;
  const notificationId=await Notifications.scheduleNotificationAsync({
    content:{
      title:'Rest over',body:'Ready for your next set of '+exerciseName,
      data:{sessionId,setId,kind:'liftria-rest'},sound:'default',
    },
    trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(deadline)},
  });
  if(setId){
    const persisted=await dbOperation(async db=>db.runAsync(
      'INSERT INTO app_settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
      [KEY_PREFIX+setId,JSON.stringify({id:notificationId,sessionId,setId})]));
    if(!persisted.ok){await Notifications.cancelScheduledNotificationAsync(notificationId);throw new Error('Rest alert ID not saved');}
  }
  return notificationId;
}
/** Cancels both persisted IDs and any matching OS requests, even if JS state was lost. */
export async function cancelSessionRestAlerts(sessionId:string):Promise<void> {
  const stored=await dbOperation(async db=>db.getAllAsync<{key:string;value:string}>(
    'SELECT key,value FROM app_settings WHERE key LIKE ?',[KEY_PREFIX+'%']));
  if(!stored.ok)throw new Error('Could not read scheduled rest alerts');
  const references=stored.value.flatMap(row=>{
    try{const parsed=JSON.parse(row.value) as AlertRef;
      return parsed.sessionId===sessionId?[{...parsed,key:row.key}]:[];
    }catch{return [];}
  });
  const scheduled=await Notifications.getAllScheduledNotificationsAsync();
  const ids=new Set(references.map(record=>record.id));
  for(const entry of scheduled){
    if(isSessionRestNotification(entry.content.data as Record<string,unknown>|undefined,sessionId))
      ids.add(entry.identifier);
  }
  for(const scheduledId of ids)await Notifications.cancelScheduledNotificationAsync(scheduledId);
  const shown=await Notifications.getPresentedNotificationsAsync();
  for(const entry of shown){
    if(isSessionRestNotification(entry.request.content.data as Record<string,unknown>|undefined,sessionId))
      await Notifications.dismissNotificationAsync(entry.request.identifier);
  }
  if(references.length){
    const removed=await dbOperation(async db=>{
      for(const reference of references)await db.runAsync(
        'DELETE FROM app_settings WHERE key=?',[reference.key]);
    });
    if(!removed.ok)throw new Error('Failed clearing canceled rest alert IDs');
  }
}
export async function cancelRestOver(id:string|null):Promise<void> {
  if(id)await Notifications.cancelScheduledNotificationAsync(id);
}
export function subscribeRestNotificationResponse(
  open:(sessionId:string)=>void,
):Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(response=>{
    const data=response.notification.request.content.data;
    if(data?.kind==='liftria-rest'&&typeof data.sessionId==='string')open(data.sessionId);
  });
}
