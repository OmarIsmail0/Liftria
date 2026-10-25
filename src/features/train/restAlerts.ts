/** Local-only, best-effort TR-9 spike. No foreground service or exact alarms. */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { restAt } from './restClock';

export const REST_CHANNEL = 'liftria-rest-test';
export async function prepareRestAlerts(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(REST_CHANNEL, {
      name: 'Rest timer (device test)',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const status = await Notifications.getPermissionsAsync();
  return status.granted;
}
/** Only call after the in-context user choice at their first rest. */
export async function askRestPermission(): Promise<boolean> {
  if (await prepareRestAlerts()) return true;
  const granted = await Notifications.requestPermissionsAsync();
  return granted.granted;
}
/** A scheduled OS notification may arrive late under Doze. Never call it exact or guaranteed. */
export async function scheduleRestOver(
  deadline: string, sessionId: string, exerciseName: string,
): Promise<string | null> {
  if (restAt(deadline).status !== 'running') return null;
  if (!(await prepareRestAlerts())) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Rest over',
      body: 'Ready for your next set of ' + exerciseName,
      data: { sessionId, kind: 'liftria-rest' },
      sound: 'default',
    },
    trigger: new Date(deadline),
  });
}
export async function cancelRestOver(id: string | null): Promise<void> {
  if (id) await Notifications.cancelScheduledNotificationAsync(id);
}
