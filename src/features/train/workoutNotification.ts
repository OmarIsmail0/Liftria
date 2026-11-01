/** Android ongoing workout notification, plus the rest alert kept in step with the stored deadline.
 * expo-notifications cannot set an Android chronometer, so rest shows the end time ("Rest ends at 18:42")
 * instead of a countdown that would freeze when the process is suspended. There is no foreground service
 * and no exact alarm: while the app is backgrounded for a long time the elapsed time stops updating,
 * and the end-of-rest alert is an ordinary inexact alarm that Doze may delay. The next launch rebuilds
 * the notification from the saved workout. iPhone keeps the end-of-rest alert only; a Live Activity
 * needs a widget extension and is not built here. */
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { bidiIsolate, formatDate, pluralForm, translate, type AppLanguage, type TranslationKey } from '../../i18n';
import { exerciseName } from '../../i18n/exerciseNames';
import { readInProgressWorkout, readWorkout, updateRestDeadline, type ActiveWorkout } from './workoutData';
import {
  REST_ACTION_PLUS_30, REST_ACTION_SKIP, WORKOUT_CHANNEL, WORKOUT_NOTIFICATION_ID, WORKOUT_REST_CATEGORY,
  armedRestAlert, cancelSessionRestAlerts, dismissWorkoutNotification, lastWorkoutNotice, prepareRestAlerts,
  rememberWorkoutNotice, runNotificationTurn, scheduleRestOver, setWorkoutNotificationActionHandler,
} from './restAlerts';
import { elapsedLabel, nextClockDelay, selectCurrentRest, shiftRest } from './restClock';

let syncLanguage: AppLanguage = 'en';
let channelsFor: AppLanguage | null = null;
let workoutLive = false;
const listeners = new Set<() => void>();

export function subscribeWorkoutChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function emitWorkoutChange(): void {
  for (const listener of listeners) listener();
}
export function resetWorkoutNotificationCache(): void {
  channelsFor = null;
}
/** Screenshot routes pass auto=1. They must show the workout, not the permission sheet. */
export function suppressWorkoutNotificationPrompt(auto: string | string[] | undefined): boolean {
  const flag = Array.isArray(auto) ? auto[0] : auto;
  return flag === '1';
}

export function formatClock(language: AppLanguage, ms: number): string {
  return formatDate(language, new Date(ms), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}

export type WorkoutNotice = { phase: 'working' | 'rest'; title: string; body: string; setId: string | null };

function openSlot(workout: ActiveWorkout): { id: string; exerciseId: string; name: string; current: number; total: number } | null {
  const ordered = [...workout.exercises].sort((a, b) => a.position - b.position);
  for (const exercise of ordered) {
    for (let position = 0; position < exercise.targetSets; position++) {
      const sides = exercise.unilateral ? (['L', 'R'] as const) : ([null] as const);
      const done = sides.every(side => workout.sets.some(set =>
        set.sessionExerciseId === exercise.id && set.position === position && set.side === side &&
        set.kind === 'working' && set.reps > 0));
      if (!done) return {
        id: exercise.id, exerciseId: exercise.exerciseId, name: exercise.name,
        current: position + 1, total: exercise.targetSets,
      };
    }
  }
  const last = ordered[ordered.length - 1];
  return last ? {
    id: last.id, exerciseId: last.exerciseId, name: last.name, current: last.targetSets, total: last.targetSets,
  } : null;
}

export function workoutNotificationText(workout: ActiveWorkout, language: AppLanguage, nowMs: number): WorkoutNotice {
  const rest = selectCurrentRest(workout.sets, workout.state, nowMs);
  const slot = openSlot(workout);
  const elapsed = bidiIsolate(language, elapsedLabel(workout.startedAt, nowMs));
  const resting = rest.status === 'running' && rest.set?.restDeadline ? rest.set : null;
  if (resting?.restDeadline) {
    const owner = workout.exercises.find(exercise => exercise.id === resting.sessionExerciseId);
    const name = owner ? exerciseName(language, owner.exerciseId, owner.name) : workout.title;
    const next = slot
      ? translate(language, (`workoutNotice.nextSet.${pluralForm(language, slot.current)}`) as TranslationKey, {
        current: slot.current, total: slot.total,
      })
      : translate(language, 'workoutNotice.nextExercise');
    return {
      phase: 'rest', setId: resting.id,
      title: translate(language, 'workoutNotice.restTitle', {
        time: bidiIsolate(language, formatClock(language, Date.parse(resting.restDeadline))),
      }),
      body: translate(language, 'workoutNotice.restBody', { exercise: name, next }),
    };
  }
  if (!slot) return {
    phase: 'working', setId: null, title: workout.title,
    body: translate(language, 'workoutNotice.workingBodyNoExercise', { elapsed }),
  };
  return {
    phase: 'working', setId: null, title: workout.title,
    body: translate(language, (`workoutNotice.workingBody.${pluralForm(language, slot.current)}`) as TranslationKey, {
      exercise: exerciseName(language, slot.exerciseId, slot.name),
      current: slot.current, total: slot.total, elapsed,
    }),
  };
}

async function notificationPermission(language: AppLanguage): Promise<boolean> {
  if (channelsFor === language) return (await Notifications.getPermissionsAsync()).granted;
  const granted = await prepareRestAlerts(language);
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(WORKOUT_CHANNEL, {
      name: translate(language, 'workoutNotice.channel'),
      importance: Notifications.AndroidImportance.LOW,
      sound: null, enableVibrate: false, showBadge: false,
    });
    await Notifications.setNotificationCategoryAsync(WORKOUT_REST_CATEGORY, [
      { identifier: REST_ACTION_SKIP, buttonTitle: translate(language, 'active.skipRest'),
        options: { opensAppToForeground: true } },
      { identifier: REST_ACTION_PLUS_30, buttonTitle: translate(language, 'active.restPlus30'),
        options: { opensAppToForeground: true } },
    ]);
  }
  channelsFor = language;
  return granted;
}

/** Make the shade match the saved workout. Call inside a notification turn, or via syncWorkoutNotifications. */
export async function alignWorkoutNotifications(language: AppLanguage, nowMs: number = Date.now()): Promise<void> {
  syncLanguage = language;
  const loaded = await readInProgressWorkout();
  if (!loaded.ok) throw new Error('Could not read the in-progress workout');
  const workout = loaded.value;
  workoutLive = !!workout;
  if (!workout) {
    await dismissWorkoutNotification();
    return;
  }
  const granted = await notificationPermission(language);
  const rest = selectCurrentRest(workout.sets, workout.state, nowMs);
  const armed = armedRestAlert();
  if (!granted) {
    if (armed?.sessionId === workout.id) await cancelSessionRestAlerts(workout.id);
    if (Platform.OS === 'android') await dismissWorkoutNotification();
    return;
  }
  if (rest.status === 'running' && rest.set?.restDeadline) {
    if (armed?.sessionId !== workout.id || armed.deadline !== rest.set.restDeadline) {
      const owner = workout.exercises.find(exercise => exercise.id === rest.set!.sessionExerciseId);
      const name = owner ? exerciseName(language, owner.exerciseId, owner.name) : workout.title;
      await scheduleRestOver(rest.set.restDeadline, workout.id, name, rest.set.id, language);
    }
  } else if (armed?.sessionId === workout.id) {
    await cancelSessionRestAlerts(workout.id, { keepPresented: rest.status === 'over' });
  }
  if (Platform.OS !== 'android') return;
  const notice = workoutNotificationText(workout, language, nowMs);
  const fingerprint = workout.id + '\n' + notice.phase + '\n' + notice.title + '\n' + notice.body;
  if (fingerprint === lastWorkoutNotice()) return;
  await Notifications.scheduleNotificationAsync({
    identifier: WORKOUT_NOTIFICATION_ID,
    content: {
      title: notice.title, body: notice.body,
      data: {
        kind: 'liftria-workout', sessionId: workout.id,
        ...(notice.setId ? { setId: notice.setId } : {}),
      },
      sound: false, sticky: true, autoDismiss: false,
      priority: Notifications.AndroidNotificationPriority.LOW,
      ...(notice.phase === 'rest' ? { categoryIdentifier: WORKOUT_REST_CATEGORY } : {}),
    },
    trigger: { channelId: WORKOUT_CHANNEL },
  });
  rememberWorkoutNotice(fingerprint);
}

export async function syncWorkoutNotifications(language: AppLanguage, nowMs: number = Date.now()): Promise<void> {
  try { await runNotificationTurn(() => alignWorkoutNotifications(language, nowMs)); }
  catch { /* The next tick retries. A failed alert must not take down the workout. */ }
}

async function applyRestAction(sessionId: string, action: string): Promise<void> {
  await runNotificationTurn(async () => {
    const loaded = await readWorkout(sessionId);
    if (!loaded.ok || !loaded.value || loaded.value.state !== 'in-progress') return;
    const nowMs = Date.now();
    const rest = selectCurrentRest(loaded.value.sets, loaded.value.state, nowMs);
    if (rest.status !== 'running' || !rest.set?.restDeadline) return;
    const next = action === REST_ACTION_SKIP
      ? new Date(nowMs).toISOString()
      : shiftRest(rest.set.restDeadline, 30, nowMs);
    if (!next) return;
    await cancelSessionRestAlerts(sessionId);
    const saved = await updateRestDeadline(rest.set.id, sessionId, next);
    if (!saved.ok || !saved.value) return;
    await alignWorkoutNotifications(syncLanguage, nowMs);
    emitWorkoutChange();
  });
}

let installed = false;
export function installNotificationBehavior(): void {
  if (installed) return;
  installed = true;
  setWorkoutNotificationActionHandler((sessionId, action) => applyRestAction(sessionId, action));
  Notifications.setNotificationHandler({
    handleNotification: async notification => {
      const data = notification.request.content.data;
      const alert = !!data && typeof data === 'object' && (data as Record<string, unknown>).kind === 'liftria-rest';
      return { shouldShowBanner: true, shouldShowList: true, shouldPlaySound: alert, shouldSetBadge: false };
    },
  });
}

/** Rebuilds the Android workout notification from the saved deadline while the app is open. */
export function useWorkoutNotificationSync(language: AppLanguage): void {
  useEffect(() => {
    syncLanguage = language;
    installNotificationBehavior();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const arm = () => {
      if (timer) clearTimeout(timer);
      if (stopped || AppState.currentState !== 'active') return;
      const delay = workoutLive ? nextClockDelay(Date.now()) : 5000;
      timer = setTimeout(() => { void syncWorkoutNotifications(language).finally(arm); }, delay);
    };
    void syncWorkoutNotifications(language).finally(arm);
    const sub = AppState.addEventListener('change', state => {
      void syncWorkoutNotifications(language);
      if (state === 'active') arm();
      else if (timer) { clearTimeout(timer); timer = undefined; }
    });
    return () => { stopped = true; if (timer) clearTimeout(timer); sub.remove(); };
  }, [language]);
}
