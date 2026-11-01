/** Local-only rest alerts and the Android workout notification id.
 * Alert ids are persisted and reconciled after process death. One session has one rest alert. */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { translate, type AppLanguage } from '../../i18n';
import { dbOperation } from '../../services/database';
import { restAt } from './restClock';

export const REST_CHANNEL = 'liftria-rest-test';
export const WORKOUT_NOTIFICATION_ID = 'liftria-workout';
export const WORKOUT_CHANNEL = 'liftria-workout';
/** Category ids cannot contain ":" or "-". */
export const WORKOUT_REST_CATEGORY = 'liftria_workout_rest';
export const REST_ACTION_SKIP = 'liftria_rest_skip';
export const REST_ACTION_PLUS_30 = 'liftria_rest_plus_30';
const KEY_PREFIX = 'rest.alert.';
const WORKOUT_KIND = 'liftria-workout';

export type AlertRef = { id:string; sessionId:string; setId:string };
type ArmedRest = { sessionId:string; deadline:string };
let armedRest: ArmedRest | null = null;
let postedNotice = '';
let turn: Promise<void> = Promise.resolve();
const handledResponses = new Map<string, number>();
let workoutActionHandler: ((sessionId:string, action:string) => Promise<void>) | null = null;

export function restAlertId(sessionId:string): string {
  return 'liftria-rest:' + sessionId;
}
export function armedRestAlert(): ArmedRest | null {
  return armedRest;
}
export function lastWorkoutNotice(): string {
  return postedNotice;
}
export function rememberWorkoutNotice(text:string): void {
  postedNotice = text;
}
export function forgetWorkoutNotice(): void {
  postedNotice = '';
}
/** Serializes rest changes so a tick cannot reschedule a deadline that was just replaced. */
export function runNotificationTurn<T>(task:() => Promise<T>): Promise<T> {
  const run = turn.then(task, task);
  turn = run.then(() => undefined, () => undefined);
  return run;
}
export function setWorkoutNotificationActionHandler(handler:((sessionId:string, action:string) => Promise<void>) | null): void {
  workoutActionHandler = handler;
}
export function isSessionRestNotification(data: Record<string,unknown> | undefined, sessionId:string):boolean {
  return data?.kind==='liftria-rest' && data?.sessionId===sessionId;
}
export function isWorkoutNotification(data: Record<string,unknown> | undefined, sessionId?:string): boolean {
  return data?.kind===WORKOUT_KIND && (sessionId===undefined || data?.sessionId===sessionId);
}
export async function prepareRestAlerts(language: AppLanguage = 'en'): Promise<boolean> {
  if(Platform.OS==='android') await Notifications.setNotificationChannelAsync(REST_CHANNEL,{
    name:translate(language,'restAlerts.channel'),importance:Notifications.AndroidImportance.HIGH,
  });
  return (await Notifications.getPermissionsAsync()).granted;
}
export async function askRestPermission(language:AppLanguage='en'):Promise<boolean> {
  if(await prepareRestAlerts(language))return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}
async function cancelSessionRestAlertsUnlocked(sessionId:string, keepPresented:boolean): Promise<void> {
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
  ids.add(restAlertId(sessionId));
  for(const entry of scheduled){
    if(isSessionRestNotification(entry.content.data as Record<string,unknown>|undefined,sessionId))
      ids.add(entry.identifier);
  }
  for(const scheduledId of ids)await Notifications.cancelScheduledNotificationAsync(scheduledId);
  if(!keepPresented){
    const shown=await Notifications.getPresentedNotificationsAsync();
    for(const entry of shown){
      if(isSessionRestNotification(entry.request.content.data as Record<string,unknown>|undefined,sessionId))
        await Notifications.dismissNotificationAsync(entry.request.identifier);
    }
  }
  if(references.length){
    const removed=await dbOperation(async db=>{
      for(const reference of references)await db.runAsync(
        'DELETE FROM app_settings WHERE key=?',[reference.key]);
    });
    if(!removed.ok)throw new Error('Failed clearing canceled rest alert IDs');
  }
  if(armedRest?.sessionId===sessionId)armedRest=null;
}
/** Cancels both persisted IDs and any matching OS requests, even if JS state was lost.
 * keepPresented leaves a delivered "Rest over" in the shade when the timer simply runs out. */
export async function cancelSessionRestAlerts(sessionId:string, options?:{keepPresented?:boolean}):Promise<void> {
  await cancelSessionRestAlertsUnlocked(sessionId, options?.keepPresented===true);
}
export async function scheduleRestOver(deadline:string,sessionId:string,exerciseName:string,setId?:string,
  language:AppLanguage='en'):Promise<string|null> {
  if(restAt(deadline).status!=='running'||!(await prepareRestAlerts(language)))return null;
  // Replace any alert for this session before arming the new deadline, so +15/−15 cannot stack.
  await cancelSessionRestAlertsUnlocked(sessionId, false);
  const notificationId=restAlertId(sessionId);
  const scheduledId=await Notifications.scheduleNotificationAsync({
    identifier:notificationId,
    content:{
      title:translate(language,'restAlerts.title'),body:translate(language,'restAlerts.body',{name:exerciseName}),
      data:{sessionId,setId,kind:'liftria-rest'},sound:'default',
    },
    trigger:{
      type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(deadline),
      ...(Platform.OS==='android'?{channelId:REST_CHANNEL}:{}),
    },
  });
  if(setId){
    const persisted=await dbOperation(async db=>db.runAsync(
      'INSERT INTO app_settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
      [KEY_PREFIX+setId,JSON.stringify({id:scheduledId,sessionId,setId})]));
    if(!persisted.ok){await Notifications.cancelScheduledNotificationAsync(scheduledId);throw new Error('Rest alert ID not saved');}
  }
  armedRest={sessionId,deadline};
  return scheduledId;
}
export async function dismissWorkoutNotification():Promise<void> {
  forgetWorkoutNotice();
  await Notifications.dismissNotificationAsync(WORKOUT_NOTIFICATION_ID).catch(()=>undefined);
  await Notifications.cancelScheduledNotificationAsync(WORKOUT_NOTIFICATION_ID).catch(()=>undefined);
}
export async function cancelRestOver(id:string|null):Promise<void> {
  if(id)await Notifications.cancelScheduledNotificationAsync(id);
}
export async function handleNotificationOpen(
  response:Notifications.NotificationResponse, open:(sessionId:string)=>void,
): Promise<void> {
  const data=response.notification.request.content.data;
  if(!data||typeof data!=='object')return;
  const record=data as Record<string,unknown>;
  const sessionId=record.sessionId;
  if((record.kind!=='liftria-rest'&&record.kind!==WORKOUT_KIND)||typeof sessionId!=='string')return;
  const key=response.notification.request.identifier+'\n'+response.actionIdentifier+'\n'+String(response.notification.date);
  const seen=handledResponses.get(key);
  const now=Date.now();
  if(seen!==undefined&&now-seen<1500)return;
  handledResponses.set(key,now);
  if(response.actionIdentifier===REST_ACTION_SKIP||response.actionIdentifier===REST_ACTION_PLUS_30)
    await workoutActionHandler?.(sessionId,response.actionIdentifier);
  open(sessionId);
}
export function subscribeRestNotificationResponse(
  open:(sessionId:string)=>void,
):Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(response=>{
    void handleNotificationOpen(response,open);
  });
}
