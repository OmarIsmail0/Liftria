import { pluralForm, bidiIsolate, formatNumber, weightUnitLabel, type TranslationKey } from '../../../src/i18n';
import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { exerciseName } from '../../../src/i18n/exerciseNames';
import { muscleLabel } from '../../../src/i18n/muscles';
import { chevronPointsLeft } from '../../../src/i18n/layout';
import { formatEditableNumber } from '../../../src/i18n/editableNumber';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Linking, Platform, Pressable, ScrollView, TextInput, Vibration, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Field, Screen, Sheet, Snackbar, Typography } from '../../../src/design/primitives';
import { ChevronIcon } from '../../../src/design/primitives/TabIcon';
import { useTheme } from '../../../src/design/ThemeProvider';
import { ExerciseFigure } from '../../../src/features/train/ExerciseFigure';
import { PlateCalculatorCard } from '../../../src/features/train/PlateCalculatorCard';
import { RestBar } from '../../../src/features/train/RestBar';
import { SetTable, type LoggedValues, type SetDraft } from '../../../src/features/train/SetTable';
import { isPlateLoadedBarbell } from '../../../src/features/train/plateCalculator';
import { askRestPermission, cancelSessionRestAlerts, prepareRestAlerts, runNotificationTurn } from '../../../src/features/train/restAlerts';
import { restBarPhase } from '../../../src/features/train/restBar';
import { elapsedLabel, nextClockDelay, restAnnouncement, selectCurrentRest, shiftRest } from '../../../src/features/train/restClock';
import {
  buildSetRows, cycleSetMark, persistedKind, type PlannedRow, type SetMark,
} from '../../../src/features/train/setTable';
import { supersetAfterSet } from '../../../src/features/train/superset';
import { alignWorkoutNotifications, subscribeWorkoutChanges, suppressWorkoutNotificationPrompt, syncWorkoutNotifications } from '../../../src/features/train/workoutNotification';
import {
  discardInProgressWorkout, logWorkoutSet, previousExerciseNote, previousWorkingSets,
  readInProgressWorkout, readWorkout, readWorkoutExerciseNote, removeActiveExercise,
  removeLoggedSet, reorderActiveExercise, saveWorkoutExerciseNote, suggestionForSlot, updateActiveSuperset,
  updateExerciseRest, updateLoggedSetKind, updateRestDeadline, workoutNumbers,
  type ActiveExercise, type ActiveSet, type ActiveWorkout, type PreviousSet,
} from '../../../src/features/train/workoutData';
import { fromKg, toKg, workoutWeightStep, type WeightUnit } from '../../../src/features/train/workoutUnits';
import { BodyMap } from '../../../src/features/train/BodyMap';
import { summarizeActiveMuscles } from '../../../src/features/train/activeMuscleLoad';
import { getSetting, setSetting } from '../../../src/services/database';
import { getExercise } from '../../../src/services/database/exerciseLibrary';
import { editSession } from '../../../src/services/database/gymRepositories';
import { getTypedSetting } from '../../../src/services/database/settings';
import { MUSCLES, type Exercise } from '../../../src/services/database/gymTypes';

function KeepScreenOn() { useKeepAwake('liftria-active-workout'); return null; }

const REST_CHOICES = [0, 60, 90, 120, 150, 180, 240];

type UndoDelete = { set: ActiveSet; key: string } | { key: string; set: null };

export default function ActiveWorkoutScreen() {
  const { id, auto } = useLocalSearchParams<{ id?: string; auto?: string }>();
  const { theme } = useTheme();
  const { t, language, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<ActiveWorkout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [focused, setFocused] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [haptics, setHaptics] = useState(false);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [smallPlates, setSmallPlates] = useState(false);
  const [effortMode, setEffortMode] = useState<'off' | 'rpe' | 'rir'>('off');
  const [askVisible, setAskVisible] = useState(false);
  const [denied, setDenied] = useState(false);
  const [finishVisible, setFinishVisible] = useState(false);
  const [discardVisible, setDiscardVisible] = useState(false);
  const [muscleOpen, setMuscleOpen] = useState(false);
  const [plateFor, setPlateFor] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [restFor, setRestFor] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [removeFor, setRemoveFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [exerciseNote, setExerciseNote] = useState('');
  const [previousNote, setPreviousNote] = useState<string | null>(null);
  const [muscleLookup, setMuscleLookup] = useState<Record<string, Exercise>>({});
  const [history, setHistory] = useState<Record<string, PreviousSet[]>>({});
  const [drafts, setDrafts] = useState<Record<string, SetDraft>>({});
  const [marks, setMarks] = useState<Record<string, SetMark>>({});
  const [extraRows, setExtraRows] = useState<Record<string, number>>({});
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [undo, setUndo] = useState<UndoDelete | null>(null);
  const [hintSeen, setHintSeen] = useState(true);
  const previousRestMs = useRef<number | null>(null);
  const restPhase = useRef<string>('hidden');
  const listRef = useRef<ScrollView>(null);
  const places = useRef<Record<string, number>>({});
  const currentId = id ?? '';
  const refresh = useCallback(async () => {
    const loaded = currentId ? await readWorkout(currentId) : await readInProgressWorkout();
    if (loaded.ok) setView(loaded.value);
    else setError(t('active.loadError'));
  }, [currentId, t]);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    void refresh();
    void getTypedSetting('keepScreenOn').then(result => { if (result.ok) setScreenOn(result.value); });
    void getTypedSetting('haptics').then(result => { if (result.ok) setHaptics(result.value); });
    void getTypedSetting('units.weight').then(result => { if (result.ok) setWeightUnit(result.value); });
    void getTypedSetting('units.smallPlates').then(result => { if (result.ok) setSmallPlates(result.value); });
    void getTypedSetting('train.effortField').then(result => { if (result.ok) setEffortMode(result.value); });
    void getSetting('train.holdDeleteSeen').then(result => { if (result.ok) setHintSeen(result.value === 'yes'); });
    void syncWorkoutNotifications(language);
    return () => setFocused(false);
  }, [refresh, language]));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let live = true;
    const tick = () => {
      if (!live) return;
      setNow(Date.now());
      timer = setTimeout(tick, nextClockDelay(Date.now()));
    };
    timer = setTimeout(tick, nextClockDelay(Date.now()));
    return () => { live = false; clearTimeout(timer); };
  }, []);
  const exerciseIds = (view?.exercises ?? []).map(exercise => exercise.exerciseId).join('|');
  useEffect(() => {
    let live = true;
    const ids = exerciseIds.split('|').filter(Boolean);
    void Promise.all(ids.map(exerciseId => getExercise(exerciseId))).then(results => {
      if (!live) return;
      setMuscleLookup(Object.fromEntries(ids.flatMap((exerciseId, index) => {
        const found = results[index];
        return found?.ok && found.value ? [[exerciseId, found.value]] : [];
      })));
    });
    void Promise.all(ids.map(exerciseId => previousWorkingSets(exerciseId))).then(results => {
      if (!live) return;
      setHistory(Object.fromEntries(ids.flatMap((exerciseId, index) => {
        const found = results[index];
        return found?.ok ? [[exerciseId, found.value]] : [];
      })));
    });
    return () => { live = false; };
  }, [exerciseIds]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      setNow(Date.now());
      void refresh();
    });
    return () => sub.remove();
  }, [refresh]);
  useEffect(() => subscribeWorkoutChanges(() => { void refresh(); }), [refresh]);
  const workoutId = view?.id, workoutState = view?.state;
  useEffect(() => {
    if (!workoutId || workoutState !== 'in-progress' || suppressWorkoutNotificationPrompt(auto)) return;
    let live = true;
    void (async () => {
      const asked = await getSetting('rest.permissionPromptSeen');
      if (!live) return;
      if (!asked.ok || asked.value !== 'yes') { setAskVisible(true); return; }
      const granted = await prepareRestAlerts(language).catch(() => false);
      if (live) setDenied(!granted);
    })();
    return () => { live = false; };
  }, [workoutId, workoutState, language, auto]);
  const rest = view ? selectCurrentRest(view.sets, view.state, now) : { set: null, status: 'idle' as const, remainingMs: 0 };
  const restExercise = view?.exercises.find(exercise => exercise.id === rest.set?.sessionExerciseId);
  const phase = restBarPhase(rest.set?.restDeadline ?? null, rest.set?.loggedAt ?? null, restExercise?.restSec ?? 0, now, language);
  useEffect(() => {
    if (!focused || rest.status === 'idle') return;
    const prior = previousRestMs.current;
    if (prior !== null) {
      const message = restAnnouncement(prior, rest.remainingMs, language);
      if (message) void AccessibilityInfo.announceForAccessibility(message);
    }
    previousRestMs.current = rest.remainingMs;
  }, [rest.remainingMs, rest.status, focused, language]);
  useEffect(() => {
    if (restPhase.current === 'running' && phase.phase === 'over' && haptics) Vibration.vibrate(20);
    restPhase.current = phase.phase;
  }, [phase.phase, haptics]);
  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), 4000);
    return () => clearTimeout(timer);
  }, [undo]);
  const noteExercise = view?.exercises.find(exercise => exercise.id === noteFor);
  useEffect(() => {
    if (!noteExercise) return;
    let live = true;
    void Promise.all([
      readWorkoutExerciseNote(noteExercise.id), previousExerciseNote(noteExercise.exerciseId),
    ]).then(([current, previous]) => {
      if (!live) return;
      if (current.ok) setExerciseNote(current.value);
      if (previous.ok) setPreviousNote(previous.value);
    });
    return () => { live = false; };
  }, [noteExercise]);
  const muscleSummary = useMemo(() => view ? summarizeActiveMuscles(view, muscleLookup) : null, [view, muscleLookup]);
  const loggedValues = useMemo(() => {
    const values: Record<string, LoggedValues> = {};
    for (const set of view?.sets ?? []) values[set.id] = {
      weight: set.weight, reps: set.reps, effort: formatEditableNumber(set.rpe ?? set.rir, 'effort'),
    };
    return values;
  }, [view]);
  const stats = view ? workoutNumbers(view) : null;
  const loggedCount = view?.sets.filter(set => set.reps > 0).length ?? 0;
  const unitLabel = weightUnitLabel(language, weightUnit);
  const volumeText = bidiIsolate(language, formatNumber(language, fromKg(stats?.volume ?? 0, weightUnit), {
    maximumFractionDigits: 1,
  }) + ' ' + unitLabel);
  const rememberDelete = () => {
    if (hintSeen) return;
    setHintSeen(true);
    void setSetting('train.holdDeleteSeen', 'yes');
  };
  const scrollToExercise = (exerciseId: string) => {
    const y = places.current[exerciseId];
    if (y === undefined) return;
    listRef.current?.scrollTo({ y: Math.max(0, y - theme.space[2]), animated: true });
  };
  const runLogged = async (task: () => Promise<void>) => {
    if (!view || busy) return;
    setBusy(true);
    setError(null);
    try {
      await runNotificationTurn(async () => {
        await cancelSessionRestAlerts(view.id);
        await task();
        await alignWorkoutNotifications(language);
      });
    } catch { setError(t('active.cancelAlertError')); setBusy(false); return; }
    setBusy(false);
    await refresh();
  };
  const logRow = async (exercise: ActiveExercise, row: PlannedRow, values: { weight: number; reps: number; effort: string }) => {
    if (!view) return;
    const kg = toKg(values.weight, weightUnit);
    if (values.reps < 1) { setError(t('active.needReps')); return; }
    if (kg > 500 || values.reps > 100) { setError(t('active.largeValues')); return; }
    const kind = persistedKind(row.mark);
    const index = view.exercises.findIndex(item => item.id === exercise.id);
    const roundReady = !exercise.unilateral || row.side !== 'L';
    const superset = kind === 'working' && roundReady
      ? supersetAfterSet(view.exercises, index)
      : { nextIndex: null as number | null, startRest: kind !== 'working' };
    const effectiveRest = superset.startRest ? exercise.restSec : 0;
    const effortNumber = !values.effort.trim() ? null : Number(values.effort);
    let savedId = '';
    await runLogged(async () => {
      const result = await logWorkoutSet({
        sessionId: view.id, sessionExerciseId: exercise.id, position: row.position,
        side: exercise.unilateral ? row.side : null, kind, weight: kg, reps: values.reps, restSec: effectiveRest,
        rpe: kind === 'working' && effortMode === 'rpe' ? effortNumber : null,
        rir: kind === 'working' && effortMode === 'rir' ? effortNumber : null,
      });
      if (!result.ok) throw new Error('log');
      savedId = result.value.id;
    });
    if (!savedId) return;
    if (haptics) Vibration.vibrate(12);
    if (row.mark === 'drop' || row.mark === 'failure') setMarks(current => ({ ...current, [savedId]: row.mark }));
    setDrafts(current => { const next = { ...current }; delete next[row.key]; return next; });
    if (superset.nextIndex !== null && superset.nextIndex !== index) {
      const next = view.exercises[superset.nextIndex];
      if (next) scrollToExercise(next.id);
      void AccessibilityInfo.announceForAccessibility(t('workout.nextSuperset'));
    }
    void AccessibilityInfo.announceForAccessibility(t(
      (`active.loggedAnnouncement.${pluralForm(language, effectiveRest)}`) as TranslationKey, {
        name: kind === 'warm-up' ? t('active.warmupSet') : t('active.set', { count: row.workingNumber ?? row.position + 1 }),
        count: effectiveRest,
      }));
  };
  const forgetRow = (key: string) => setHidden(current => { const next = new Set(current); next.add(key); return next; });
  const restoreRow = (key: string) => setHidden(current => { const next = new Set(current); next.delete(key); return next; });
  const unlog = async (row: PlannedRow) => {
    if (!view || !row.loggedId) return;
    const set = view.sets.find(item => item.id === row.loggedId);
    if (!set) return;
    setDrafts(current => ({
      ...current,
      [row.key]: {
        weight: formatEditableNumber(fromKg(set.weight, weightUnit), 'load'),
        reps: formatEditableNumber(set.reps, 'count'),
        effort: formatEditableNumber(set.rpe ?? set.rir, 'effort'),
      },
    }));
    let removed = false;
    await runLogged(async () => {
      const result = await removeLoggedSet(set.id, view.id);
      removed = !!(result.ok && result.value);
      if (!removed) throw new Error('undo');
    });
    if (removed) setUndo({ set, key: row.key });
  };
  const deleteRow = async (row: PlannedRow) => {
    rememberDelete();
    if (!view) return;
    if (!row.loggedId) { forgetRow(row.key); setUndo({ set: null, key: row.key }); return; }
    const set = view.sets.find(item => item.id === row.loggedId);
    if (!set) return;
    let removed = false;
    await runLogged(async () => {
      const result = await removeLoggedSet(set.id, view.id);
      removed = !!(result.ok && result.value);
      if (!removed) throw new Error('delete');
    });
    if (!removed) return;
    forgetRow(row.key);
    setUndo({ set, key: row.key });
  };
  const undoDelete = async () => {
    const item = undo;
    setUndo(null);
    if (!item || !view) return;
    restoreRow(item.key);
    if (!item.set) return;
    const set = item.set;
    await runLogged(async () => {
      const result = await logWorkoutSet({
        sessionId: view.id, sessionExerciseId: set.sessionExerciseId, position: set.position,
        side: set.side, kind: set.kind, weight: set.weight, reps: set.reps,
        restSec: 0, rpe: set.rpe ?? null, rir: set.rir ?? null,
      });
      if (!result.ok) throw new Error('restore');
    });
  };
  const cycle = async (exercise: ActiveExercise, row: PlannedRow) => {
    if (!view) return;
    const next = cycleSetMark(row.mark);
    setMarks(current => ({ ...current, [row.key]: next, ...(row.loggedId ? { [row.loggedId]: next } : {}) }));
    if (!row.loggedId) return;
    const set = view.sets.find(item => item.id === row.loggedId);
    const kind = persistedKind(next);
    if (!set || set.kind === kind) return;
    await runLogged(async () => {
      const result = await updateLoggedSetKind(set.id, view.id, kind);
      if (!result.ok || !result.value) throw new Error('kind');
    });
  };
  const adjust = async (delta: number) => {
    if (!view || !rest.set) return;
    const target = rest.set;
    const next = shiftRest(target.restDeadline, delta, Date.now());
    await runLogged(async () => {
      const saved = await updateRestDeadline(target.id, view.id, next);
      if (!saved.ok || !saved.value) throw new Error('adjust');
    });
  };
  const allow = async (grant: boolean) => {
    setAskVisible(false);
    await setSetting('rest.permissionPromptSeen', 'yes');
    if (grant) setDenied(!(await askRestPermission(language).catch(() => false)));
    else setDenied(true);
    try { await syncWorkoutNotifications(language); }
    catch { setError(t('active.scheduleError')); }
  };
  const saveTitle = async () => {
    if (!view) return;
    const name = titleDraft.trim();
    setRenaming(false);
    if (!name || name === view.title) return;
    const saved = await editSession(view.id, name, view.notes);
    if (!saved.ok) setError(t('active.saveError'));
    await refresh();
  };
  const menuExercise = view?.exercises.find(exercise => exercise.id === menuFor) ?? null;
  const menuIndex = menuExercise && view ? view.exercises.findIndex(exercise => exercise.id === menuExercise.id) : -1;
  const plateExercise = view?.exercises.find(exercise => exercise.id === plateFor) ?? null;
  const plateRecord = plateExercise ? muscleLookup[plateExercise.exerciseId] : undefined;
  if (!view) return <Screen embedded safeBottom>
    <Typography tone="secondary">{error ?? t('active.opening')}</Typography>
  </Screen>;
  const barPad = phase.phase === 'hidden' ? theme.space[4] : 120;
  return <Screen embedded safeBottom scroll={false}>
    {screenOn && focused && <KeepScreenOn />}
    <View style={{ paddingHorizontal: theme.layout.gutter, paddingTop: theme.space[2], gap: theme.space[2],
      borderBottomWidth: theme.size.border.thin, borderBottomColor: theme.surface.hairline, paddingBottom: theme.space[2] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[2] }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')}
          onPress={() => router.replace('/(tabs)/train')}
          style={{ width: theme.size.touch.min, height: theme.size.touch.min, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronIcon left={chevronPointsLeft('back', isRTL)} color={theme.color.text.primary}
            size={theme.space[5]} strokeWidth={2.2} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          {renaming ? <TextInput value={titleDraft} onChangeText={setTitleDraft} onBlur={() => void saveTitle()}
            autoFocus accessibilityLabel={t('workout.rename')}
            style={{ color: theme.color.text.primary, fontSize: theme.type.head.size, minHeight: theme.size.touch.min }} /> :
            <Pressable accessibilityRole="button" accessibilityLabel={t('workout.rename')}
              onPress={() => { setTitleDraft(view.title); setRenaming(true); }}
              style={{ minHeight: theme.size.touch.min, justifyContent: 'center' }}>
              <Typography size="head" lines={1}>{view.title}</Typography>
            </Pressable>}
          <Typography tone="secondary" size="small" lines={2}>
            {t('workout.elapsed') + ' ' + bidiIsolate(language, elapsedLabel(view.startedAt, now))
              + '  ' + t('workout.sets') + ' ' + bidiIsolate(language, formatNumber(language, loggedCount))
              + '  ' + t('workout.volume') + ' ' + volumeText}
          </Typography>
        </View>
        <Button label={t('active.finish')} size="sm" variant="train"
          onPress={() => stats?.pending ? setFinishVisible(true) :
            router.push({ pathname: '/(tabs)/train/summary', params: { id: view.id } })} />
      </View>
    </View>
    <ScrollView ref={listRef} keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      contentContainerStyle={{ padding: theme.layout.gutter, gap: theme.space[2], paddingBottom: barPad + insets.bottom }}>
      {loggedCount === 0 && <View style={{
        padding: theme.space[3], borderRadius: theme.radius.md, backgroundColor: theme.color.tint.train,
        borderWidth: theme.size.border.thin, borderStyle: 'dashed', borderColor: theme.color.domain.train,
      }}>
        <Typography tone="secondary">{t('workout.hint')}</Typography>
      </View>}
      {view.exercises.length === 0 && <View style={{ gap: theme.space[2] }}>
        <Typography size="head">{t('active.noExercises')}</Typography>
        <Typography tone="secondary">{t('active.addHint')}</Typography>
      </View>}
      {view.exercises.map((exercise, index) => {
        const record = muscleLookup[exercise.exerciseId];
        const muscle = record?.primaryMuscles[0];
        const rows = buildSetRows({
          sessionExerciseId: exercise.id, targetSets: exercise.targetSets, unilateral: exercise.unilateral,
          extraRows: extraRows[exercise.id] ?? 0, sets: view.sets.filter(set => set.sessionExerciseId === exercise.id),
          marks, hidden,
        });
        const step = workoutWeightStep(exercise.type, weightUnit, smallPlates);
        const linked = !!exercise.supersetGroup;
        return <View key={exercise.id} onLayout={event => { places.current[exercise.id] = event.nativeEvent.layout.y; }}
          style={{
            gap: theme.space[2], paddingVertical: theme.space[2],
            borderStartWidth: linked ? 3 : 0, borderStartColor: theme.color.status.warning, paddingStart: linked ? theme.space[2] : 0,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[2] }}>
            <Pressable accessibilityRole="button"
              accessibilityLabel={t('exerciseRow.open', { name: bidiIsolate(language, exerciseName(language, exercise.exerciseId, exercise.name)) })}
              onPress={() => router.push({ pathname: '/(tabs)/train/exercise/[id]', params: { id: exercise.exerciseId } })}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.space[2], minHeight: theme.size.touch.min }}>
              {record ? <ExerciseFigure exercise={record} /> : null}
              <View style={{ flex: 1 }}>
                <Typography size="head" lines={2}>{exerciseName(language, exercise.exerciseId, exercise.name)}</Typography>
                {muscle ? <Typography tone="secondary" size="small">{muscleLabel(language, muscle)}</Typography> : null}
              </View>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t('workout.menu')}
              onPress={() => setMenuFor(exercise.id)}
              style={{ width: theme.size.touch.min, height: theme.size.touch.min, alignItems: 'center', justifyContent: 'center' }}>
              <Typography size="head">⋯</Typography>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.space[2] }}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('workout.restTime')}
              onPress={() => setRestFor(exercise.id)}
              style={{ minHeight: theme.size.touch.min, paddingHorizontal: theme.space[3], borderRadius: theme.radius.pill,
                alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface.control,
                borderWidth: theme.size.border.thin, borderColor: theme.surface.hairline }}>
              <Typography size="small" bold>{t('workout.restChip', {
                time: bidiIsolate(language, formatClock(exercise.restSec)),
              })}</Typography>
            </Pressable>
            {linked && <Typography tone="secondary" size="small">{t('workout.superset')}</Typography>}
            <Pressable accessibilityRole="button" accessibilityLabel={t('active.notes')}
              onPress={() => setNoteFor(exercise.id)} style={{ minHeight: theme.size.touch.min, justifyContent: 'center' }}>
              <Typography tone="secondary" size="small" lines={2}>
                {exercise.note?.trim() ? exercise.note : t('workout.notePlaceholder')}
              </Typography>
            </Pressable>
          </View>
          <SetTable rows={rows} history={history[exercise.exerciseId] ?? []} unit={weightUnit} effort={effortMode}
            drafts={drafts} loggedValues={loggedValues} repMax={exercise.repMax}
            expectedRows={exercise.targetSets * (exercise.unilateral ? 2 : 1)} weightStep={step} busy={busy}
            onDraft={(key, draft) => setDrafts(current => ({ ...current, [key]: draft }))}
            onLog={(row, values) => void logRow(exercise, row, values)}
            onUnlog={row => void unlog(row)} onCycle={row => void cycle(exercise, row)}
            onDelete={row => void deleteRow(row)}
            onAdd={() => setExtraRows(current => ({ ...current, [exercise.id]: (current[exercise.id] ?? 0) + 1 }))}
            onReject={reason => setError(t(reason === 'reps' ? 'setError.reps' : 'setError.weight'))} />
          {index === 0 && !hintSeen && <Typography tone="tertiary" size="small">{t('workout.holdHint')}</Typography>}
          {index < view.exercises.length - 1 && <View style={{ height: 1, backgroundColor: theme.surface.hairline }} />}
        </View>;
      })}
      <Button label={t('workout.addExercise')} variant="ghost"
        onPress={() => router.push({ pathname: '/(tabs)/train/pick', params: { id: view.id } })} />
      <Button label={t('workout.discard')} variant="danger" onPress={() => setDiscardVisible(true)} />
      {denied && <View style={{ gap: theme.space[1] }}>
        <Typography tone="secondary" size="small">{t('active.alertsOff')}</Typography>
        <Button label={t('active.enableNotifications')} variant="secondary" onPress={() => void Linking.openSettings()} />
      </View>}
      {error && <Typography>{error}</Typography>}
      <Pressable accessibilityRole="button" accessibilityLabel={t('polish.musclesSoFar')}
        onPress={() => setMuscleOpen(true)} style={{ minHeight: theme.size.touch.min, justifyContent: 'center' }}>
        <Typography tone="secondary">{t('polish.musclesSoFar')}</Typography>
      </Pressable>
    </ScrollView>
    <RestBar phase={phase} onMinus={() => void adjust(-15)} onPlus={() => void adjust(15)} onSkip={() => void adjust(-3600)} />
    {undo && <View style={{ position: 'absolute', start: theme.layout.gutter, end: theme.layout.gutter, bottom: barPad }}>
      <Snackbar message={t('workout.setDeleted')} onUndo={() => void undoDelete()} onDismiss={() => setUndo(null)} />
    </View>}
    <Sheet visible={askVisible && !suppressWorkoutNotificationPrompt(auto)} title={t('active.restPermissionTitle')}
      description={t(Platform.OS === 'android' ? 'active.restPermissionDesc' : 'active.restPermissionDescIos')}
      onClose={() => void allow(false)}>
      <Button label={t('active.restAllow')} variant="train" fullWidth onPress={() => void allow(true)} />
      <Button label={t('active.restAppOnly')} variant="secondary" fullWidth onPress={() => void allow(false)} />
    </Sheet>
    <Sheet visible={menuExercise !== null} title={menuExercise ? exerciseName(language, menuExercise.exerciseId, menuExercise.name) : t('workout.menu')}
      onClose={() => setMenuFor(null)}>
      <Button label={t('active.replace')} variant="secondary" fullWidth onPress={() => {
        const exercise = menuExercise;
        setMenuFor(null);
        if (exercise) router.push({ pathname: '/(tabs)/train/pick', params: { id: view.id, replaceId: exercise.id } });
      }} />
      {menuExercise && !menuExercise.supersetGroup && menuIndex + 1 < view.exercises.length &&
        <Button label={t('gymParity.linkNext')} variant="secondary" fullWidth onPress={() => {
          void updateActiveSuperset(view.id, menuIndex, 2).then(() => { void refresh(); setMenuFor(null); });
        }} />}
      {menuExercise && !menuExercise.supersetGroup && menuIndex + 2 < view.exercises.length &&
        <Button label={t('gymParity.superset') + ' × 3'} variant="secondary" fullWidth onPress={() => {
          void updateActiveSuperset(view.id, menuIndex, 3).then(() => { void refresh(); setMenuFor(null); });
        }} />}
      {menuExercise?.supersetGroup && <Button label={t('gymParity.unlink')} variant="secondary" fullWidth onPress={() => {
        void updateActiveSuperset(view.id, menuIndex, 0).then(() => { void refresh(); setMenuFor(null); });
      }} />}
      <Button label={t('active.notes')} variant="secondary" fullWidth onPress={() => {
        const exercise = menuExercise; setMenuFor(null); if (exercise) setNoteFor(exercise.id);
      }} />
      <Button label={t('active.earlier')} variant="secondary" fullWidth disabled={menuIndex <= 0}
        onPress={() => { if (menuExercise) void reorderActiveExercise(view.id, menuExercise.id, -1).then(() => { void refresh(); setMenuFor(null); }); }} />
      <Button label={t('active.later')} variant="secondary" fullWidth disabled={menuIndex < 0 || menuIndex >= view.exercises.length - 1}
        onPress={() => { if (menuExercise) void reorderActiveExercise(view.id, menuExercise.id, 1).then(() => { void refresh(); setMenuFor(null); }); }} />
      <Button label={t('workout.restTime')} variant="secondary" fullWidth onPress={() => {
        const exercise = menuExercise; setMenuFor(null); if (exercise) setRestFor(exercise.id);
      }} />
      {plateExercise === null && menuExercise && <Button
        label={t(isPlateLoadedBarbell(menuExercise.type, muscleLookup[menuExercise.exerciseId]?.equipment) ? 'gymParity.plates' : 'gymParity.warmups')}
        variant="secondary" fullWidth disabled={menuExercise.type !== 'weighted' && menuExercise.type !== 'dumbbell'}
        onPress={() => { const exercise = menuExercise; setMenuFor(null); if (exercise) setPlateFor(exercise.id); }} />}
      <Button label={t('workout.removeExercise')} variant="danger" fullWidth onPress={() => {
        const exercise = menuExercise; setMenuFor(null); if (exercise) setRemoveFor(exercise.id);
      }} />
    </Sheet>
    <Sheet visible={restFor !== null} title={t('workout.restTime')} onClose={() => setRestFor(null)}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
        {REST_CHOICES.map(seconds => {
          const exercise = view.exercises.find(item => item.id === restFor);
          const selected = exercise?.restSec === seconds;
          const label = seconds === 0 ? t('workout.restOff') : bidiIsolate(language, formatClock(seconds));
          return <Button key={seconds} label={label} variant={selected ? 'train' : 'secondary'}
            onPress={() => {
              if (!restFor) return;
              void updateExerciseRest(restFor, seconds).then(result => {
                if (!result.ok) setError(t('active.saveError'));
                void refresh();
                setRestFor(null);
              });
            }} />;
        })}
      </View>
    </Sheet>
    <Sheet visible={noteFor !== null} title={t('active.noteTitle')} onClose={() => setNoteFor(null)}>
      {previousNote && <Typography tone="secondary">{t('gymParity.previousNote', { note: previousNote })}</Typography>}
      <Field label={t('active.notesLabel')} value={exerciseNote} onChangeText={setExerciseNote} multiline />
      <Button label={t('active.saveNote')} variant="train" fullWidth onPress={() => {
        if (!noteFor) return;
        void saveWorkoutExerciseNote(noteFor, exerciseNote).then(result => {
          if (result.ok) { setNoteFor(null); void refresh(); }
          else setError(t('active.saveError'));
        });
      }} />
    </Sheet>
    <Sheet visible={plateExercise !== null} title={t(plateRecord && isPlateLoadedBarbell(plateExercise?.type ?? 'weighted', plateRecord.equipment) ? 'gymParity.plates' : 'gymParity.warmups')}
      onClose={() => setPlateFor(null)}>
      {plateExercise && <PlateCalculatorCard targetKg={suggestionForSlot(
        history[plateExercise.exerciseId] ?? [], 0, plateExercise.unilateral ? 'L' : null,
        plateExercise.repMax, plateExercise.targetSets * (plateExercise.unilateral ? 2 : 1),
        workoutWeightStep(plateExercise.type, weightUnit, smallPlates),
      )?.weight ?? 20} showPlates={!!plateRecord && isPlateLoadedBarbell(plateExercise.type, plateRecord.equipment)}
        unplatedStepKg={workoutWeightStep(plateExercise.type, weightUnit, smallPlates)}
        onWarmup={item => {
          const rows = buildSetRows({
            sessionExerciseId: plateExercise.id, targetSets: plateExercise.targetSets,
            unilateral: plateExercise.unilateral, extraRows: extraRows[plateExercise.id] ?? 0,
            sets: view.sets.filter(set => set.sessionExerciseId === plateExercise.id), marks, hidden,
          });
          const target = rows.find(row => !row.loggedId) ?? rows[0];
          if (!target) return;
          setDrafts(current => ({
            ...current,
            [target.key]: {
              weight: formatEditableNumber(fromKg(item.weight, weightUnit), 'load'),
              reps: formatEditableNumber(item.reps, 'count'),
              effort: '',
            },
          }));
          setMarks(current => ({ ...current, [target.key]: 'warm-up' }));
          setPlateFor(null);
        }} />}
    </Sheet>
    <Sheet visible={muscleOpen} title={t('polish.musclesSoFar')} description={t('polish.effectiveHint')}
      onClose={() => setMuscleOpen(false)}>
      <BodyMap primary={muscleSummary?.primary ?? []} secondary={muscleSummary?.secondary ?? []} />
      {(muscleSummary?.completedSets ?? 0) === 0 ? <Typography tone="secondary">{t('polish.noSetsYet')}</Typography> :
        MUSCLES.filter(muscle => (muscleSummary?.credit[muscle] ?? 0) > 0).map(muscle =>
          <Typography key={muscle}>{muscleLabel(language, muscle) + ' · ' + formatNumber(language, muscleSummary?.credit[muscle] ?? 0)}</Typography>)}
    </Sheet>
    <Sheet visible={removeFor !== null} title={t('workout.removeExercise')} description={t('workout.removeConfirm')}
      onClose={() => setRemoveFor(null)}>
      <Button label={t('workout.removeKeep')} fullWidth onPress={() => setRemoveFor(null)} />
      <Button label={t('workout.removeExercise')} variant="danger" fullWidth onPress={() => {
        if (!removeFor) return;
        void removeActiveExercise(view.id, removeFor).then(() => { setRemoveFor(null); void refresh(); });
      }} />
    </Sheet>
    <Sheet visible={discardVisible} title={t('train.discardTitle')} destructive
      description={t((`train.discardDescription.${pluralForm(language, stats?.sets ?? 0)}`) as TranslationKey, { count: stats?.sets ?? 0 })}
      onClose={() => setDiscardVisible(false)}>
      <Button label={t('train.keep')} fullWidth onPress={() => setDiscardVisible(false)} />
      <Button label={t('workout.discard')} variant="danger" fullWidth onPress={() => {
        void discardInProgressWorkout(view.id).then(() => router.replace('/(tabs)/train'));
      }} />
    </Sheet>
    <Sheet visible={finishVisible} title={(stats?.pending ?? 0) > 0
      ? t((`active.pendingFinish.${pluralForm(language, stats?.pending ?? 0)}`) as TranslationKey, { count: stats?.pending ?? 0 })
      : t('active.finishTitle')}
      description={(stats?.pending ?? 0) > 0 ? t('active.dropPending') : t('active.reviewBeforeSave')}
      onClose={() => setFinishVisible(false)}>
      <Button label={t('active.backToWorkout')} fullWidth onPress={() => setFinishVisible(false)} />
      <Button label={t('active.reviewSummary')} variant="train" fullWidth onPress={() => {
        setFinishVisible(false);
        router.push({ pathname: '/(tabs)/train/summary', params: { id: view.id } });
      }} />
    </Sheet>
  </Screen>;
}

function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  return Math.floor(safe / 60) + ':' + String(safe % 60).padStart(2, '0');
}
