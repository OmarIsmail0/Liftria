import type { ReactNode } from 'react';
import type { TranslationKey } from '../../../src/i18n';
import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { equipmentLabel } from '../../../src/i18n/equipment';
import { exerciseName } from '../../../src/i18n/exerciseNames';
import { muscleLabel } from '../../../src/i18n/muscles';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Field, Header, Screen, Typography } from '../../../src/design/primitives';
import { useTheme } from '../../../src/design/ThemeProvider';
import { ensureExercisePack, listExercises, searchExercises } from '../../../src/services/database/exerciseLibrary';
import { appendExerciseToActiveSession, recentExerciseIds } from '../../../src/services/database/gymRepositories';
import { replaceActiveExercise } from '../../../src/features/train/workoutData';
import type { Exercise } from '../../../src/services/database/gymTypes';
import { ExerciseResultRow } from '../../../src/features/train/ExerciseResultRow';
import {
  EQUIPMENT_FILTERS, MUSCLE_FILTERS, exerciseMatchesFilters,
  type EquipmentFilter, type MuscleFilter,
} from '../../../src/features/train/exerciseFilters';
import { addExerciseButtonLabel } from '../../../src/features/train/pickLabel';
import { resultCardEdges } from '../../../src/features/train/resultCardEdges';
import {
  EXERCISE_SEARCH_DEBOUNCE_MS, exerciseListWindow, exerciseRowIdentity, exerciseThumbnailKey,
  flatListItemLayout, useDeferredQuery,
} from '../../../src/features/train/exerciseRows';

type PickRow = {
  id: string;
  exercise: Exercise;
  identity: ReturnType<typeof exerciseRowIdentity>;
};

const MUSCLE_KEY: Record<MuscleFilter, TranslationKey> = {
  all: 'pick.filterAll', chest: 'pick.filterChest', back: 'pick.filterBack',
  shoulders: 'pick.filterShoulders', arms: 'pick.filterArms', legs: 'pick.filterLegs', core: 'pick.filterCore',
};
const EQUIPMENT_KEY: Record<EquipmentFilter, TranslationKey> = {
  any: 'pick.equipAny', barbell: 'pick.equipBarbell', dumbbell: 'pick.equipDumbbell',
  machine: 'pick.equipMachine', cable: 'pick.equipCable', bodyweight: 'pick.equipBodyweight',
  kettlebell: 'pick.equipKettlebell', bands: 'pick.equipBands', other: 'pick.equipOther',
};

/** One sideways row. Logical order, so Arabic starts at the right and the first chip stays in view. */
function ChipRow({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const scroller = useRef<ScrollView>(null);
  const showStart = useCallback(() => {
    scroller.current?.scrollTo({ x: 0, animated: false });
  }, []);
  return <ScrollView horizontal ref={scroller} showsHorizontalScrollIndicator={false}
    keyboardShouldPersistTaps="handled" nestedScrollEnabled
    contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[2] }}
    onContentSizeChange={showStart}>
    {children}
  </ScrollView>;
}

export default function AddWorkoutExercise() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { id, replaceId } = useLocalSearchParams<{ id: string; replaceId?: string }>();
  const [query, setQuery] = useState('');
  const appliedQuery = useDeferredQuery(query, EXERCISE_SEARCH_DEBOUNCE_MS);
  const [all, setAll] = useState<Exercise[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [muscle, setMuscle] = useState<MuscleFilter>('all');
  const [equipment, setEquipment] = useState<EquipmentFilter>('any');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const edges = useMemo(() => resultCardEdges(theme), [theme]);
  const themeKey = theme.mode + ':' + theme.effectiveStyle;
  useFocusEffect(useCallback(() => {
    let live = true;
    void (async () => {
      const seeded = await ensureExercisePack();
      const [exercises, latest] = await Promise.all([
        seeded.ok ? listExercises() : Promise.resolve(null),
        recentExerciseIds(24),
      ]);
      if (!live) return;
      if (exercises?.ok) setAll(exercises.value);
      else setError(t('pick.libraryError'));
      if (latest.ok) setRecent(latest.value);
    })();
    return () => { live = false; };
  }, [t]));
  const matches = useMemo(() => searchExercises(all, appliedQuery, null, language)
    .filter(exercise => exerciseMatchesFilters(exercise, muscle, equipment)), [all, appliedQuery, language, muscle, equipment]);
  const ordered = useMemo(() => {
    const rank = new Map(recent.map((exerciseId, index) => [exerciseId, index]));
    return [...matches].sort((a, b) => {
      const left = rank.get(a.id);
      const right = rank.get(b.id);
      if (left === undefined && right === undefined) return 0;
      if (left === undefined) return 1;
      if (right === undefined) return -1;
      return left - right;
    });
  }, [matches, recent]);
  const rows = useMemo<PickRow[]>(() => ordered.map(exercise => {
    const title = exerciseName(language, exercise.id, exercise.name);
    const primary = exercise.primaryMuscles[0];
    const detail = t('pick.detailLine', {
      muscle: primary ? muscleLabel(language, primary) : t('pick.noMuscle'),
      equipment: equipmentLabel(language, exercise.equipment, t('pick.noEquipment')),
    });
    return {
      id: exercise.id,
      exercise,
      identity: exerciseRowIdentity(exercise.id, title, detail,
        exerciseThumbnailKey(exercise.primaryMuscles, exercise.secondaryMuscles), themeKey),
    };
  }), [ordered, language, t, themeKey]);
  const saveOne = useCallback(async (exerciseId: string) => {
    const saved = replaceId
      ? await replaceActiveExercise(id, replaceId, exerciseId)
      : await appendExerciseToActiveSession(exerciseId);
    return saved.ok && !!saved.value;
  }, [id, replaceId]);
  const add = useCallback((exerciseId: string) => {
    if (busy) return;
    if (replaceId) {
      setBusy(true);
      void saveOne(exerciseId).then(ok => {
        if (ok) router.replace({ pathname: '/(tabs)/train/active', params: { id } });
        else { setError(t('pick.addError')); setBusy(false); }
      });
      return;
    }
    setSelected(current => {
      const next = new Set(current);
      if (next.has(exerciseId)) next.delete(exerciseId);
      else next.add(exerciseId);
      return next;
    });
  }, [busy, id, replaceId, saveOne, t]);
  const commit = useCallback(async () => {
    if (busy || selected.size === 0) return;
    setBusy(true);
    const ids = rows.map(row => row.id).filter(exerciseId => selected.has(exerciseId));
    for (const exerciseId of ids) {
      const ok = await saveOne(exerciseId);
      if (!ok) { setError(t('pick.addError')); setBusy(false); return; }
    }
    router.replace({ pathname: '/(tabs)/train/active', params: { id } });
  }, [busy, id, rows, saveOne, selected, t]);
  const openExercise = useCallback((exerciseId: string) => {
    router.push({ pathname: '/(tabs)/train/exercise/[id]', params: { id: exerciseId } });
  }, []);
  const renderItem = useCallback(({ item, index }: { item: PickRow; index: number }) =>
    <ExerciseResultRow identity={item.identity} exercise={item.exercise} edges={edges.body}
      divider={index !== rows.length - 1} onOpen={openExercise} onAdd={add}
      addLabel={t('exerciseRow.add')} marked={replaceId ? undefined : selected.has(item.id)} />,
  [add, edges, openExercise, replaceId, rows.length, selected, t]);
  const count = selected.size;
  const addLabel = addExerciseButtonLabel(language, count);
  const addButtonHeight = theme.size.touch.min;
  const miniBarHeight = theme.size.touch.workout;
  const listBottomPad = replaceId ? theme.space[4] : addButtonHeight + miniBarHeight + insets.bottom;
  const chip = (key: string, label: string, on: boolean, press: () => void) => <Pressable key={key}
    accessibilityRole="button" accessibilityState={{ selected: on }} onPress={press}
    style={{ minHeight: theme.size.touch.min, paddingHorizontal: theme.space[3], borderRadius: theme.radius.pill,
      alignItems: 'center', justifyContent: 'center', borderWidth: theme.size.border.thin,
      borderColor: on ? theme.color.domain.train : theme.surface.hairline,
      backgroundColor: on ? theme.color.tint.train : theme.surface.control }}>
    <Typography size="small" bold>{label}</Typography>
  </Pressable>;
  return <Screen embedded scroll={false}>
    <View style={{ flex: 1 }}>
      <FlatList
        style={{ flex: 1 }}
        data={rows}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        contentContainerStyle={{ paddingBottom: listBottomPad }}
        getItemLayout={flatListItemLayout}
        removeClippedSubviews={Platform.OS === 'android'}
        {...exerciseListWindow}
        ListHeaderComponent={<View style={{ gap: theme.layout.cardGap, paddingTop: theme.space[4] }}>
          <Header title={replaceId ? t('pick.replace') : t('pick.add')} onBack={() => router.back()} />
          <View style={[edges.top, rows.length > 0 ? { paddingBottom: theme.space[3] } : null]}>
            <View style={{ gap: theme.space[3] }}>
              <Field label={t('pick.search')} value={query} onChangeText={setQuery} />
              <Typography size="label" tone="tertiary">{t('pick.muscleFilter')}</Typography>
              <ChipRow>
                {MUSCLE_FILTERS.map(value => chip(value, t(MUSCLE_KEY[value]), muscle === value, () => setMuscle(value)))}
              </ChipRow>
              <Typography size="label" tone="tertiary">{t('pick.equipmentFilter')}</Typography>
              <ChipRow>
                {EQUIPMENT_FILTERS.map(value => chip(value, t(EQUIPMENT_KEY[value]), equipment === value, () => setEquipment(value)))}
              </ChipRow>
              {recent.length > 0 && rows.length > 0 && <Typography size="label" tone="tertiary">{t('pick.recentFirst')}</Typography>}
              {rows.length === 0 && <Typography tone="secondary">
                {muscle === 'all' && equipment === 'any' ? t('pick.noMatch') : t('pick.noFilterMatch')}
              </Typography>}
            </View>
          </View>
        </View>}
        renderItem={renderItem}
        ListFooterComponent={<View>
          <View style={edges.bottom} />
          {error && <Typography>{error}</Typography>}
        </View>}
      />
      {!replaceId && <View style={{ position: 'absolute', start: theme.layout.gutter, end: theme.layout.gutter, bottom: 0 }}>
        {count === 0 ? <Pressable accessibilityRole="button" accessibilityState={{ disabled: true }} disabled
          accessibilityLabel={addLabel}
          style={{ minHeight: addButtonHeight, borderRadius: theme.radius.pill, alignItems: 'center',
            justifyContent: 'center', opacity: 1, backgroundColor: theme.surface.control,
            borderWidth: theme.size.border.thin, borderColor: theme.surface.hairline }}>
          <Typography tone="tertiary" bold>{addLabel}</Typography>
        </Pressable> : <Button label={addLabel} variant="train" fullWidth disabled={busy}
          onPress={() => void commit()} />}
      </View>}
    </View>
  </Screen>;
}
