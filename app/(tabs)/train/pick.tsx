import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { equipmentLabel } from '../../../src/i18n/equipment';
import { exerciseName } from '../../../src/i18n/exerciseNames';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Platform, View } from 'react-native';
import { Button, Field, Header, Screen, Typography } from '../../../src/design/primitives';
import { useTheme } from '../../../src/design/ThemeProvider';
import { ensureExercisePack, listExercises, searchExercises } from '../../../src/services/database/exerciseLibrary';
import { appendExerciseToActiveSession } from '../../../src/services/database/gymRepositories';
import { replaceActiveExercise } from '../../../src/features/train/workoutData';
import type { Exercise } from '../../../src/services/database/gymTypes';
import { ExerciseResultRow } from '../../../src/features/train/ExerciseResultRow';
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

export default function AddWorkoutExercise() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { id, replaceId } = useLocalSearchParams<{ id: string; replaceId?: string }>();
  const [query, setQuery] = useState('');
  const appliedQuery = useDeferredQuery(query, EXERCISE_SEARCH_DEBOUNCE_MS);
  const [all, setAll] = useState<Exercise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const edges = useMemo(() => resultCardEdges(theme), [theme]);
  const themeKey = theme.mode + ':' + theme.effectiveStyle;
  useFocusEffect(useCallback(() => {
    let live = true;
    void (async () => {
      const seeded = await ensureExercisePack();
      const exercises = seeded.ok ? await listExercises() : null;
      if (!live) return;
      if (exercises?.ok) setAll(exercises.value);
      else setError(t('pick.libraryError'));
    })();
    return () => { live = false; };
  }, [t]));
  const matches = useMemo(() => searchExercises(all, appliedQuery, null, language), [all, appliedQuery, language]);
  const rows = useMemo<PickRow[]>(() => matches.map(exercise => {
    const title = exerciseName(language, exercise.id, exercise.name);
    const detail = equipmentLabel(language, exercise.equipment, t('pick.noEquipment'));
    return {
      id: exercise.id,
      exercise,
      identity: exerciseRowIdentity(exercise.id, title, detail,
        exerciseThumbnailKey(exercise.primaryMuscles, exercise.secondaryMuscles), themeKey),
    };
  }), [matches, language, t, themeKey]);
  const add = useCallback(async (exerciseId: string) => {
    if (busy) return;
    setBusy(true);
    const saved = replaceId ? await replaceActiveExercise(id, replaceId, exerciseId) :
      await appendExerciseToActiveSession(exerciseId);
    if (saved.ok && saved.value) router.replace({ pathname: '/(tabs)/train/active', params: { id } });
    else { setError(t('pick.addError')); setBusy(false); }
  }, [busy, id, replaceId, t]);
  const openExercise = useCallback((exerciseId: string) => {
    router.push({ pathname: '/(tabs)/train/exercise/[id]', params: { id: exerciseId } });
  }, []);
  const renderItem = useCallback(({ item, index }: { item: PickRow; index: number }) =>
    <ExerciseResultRow identity={item.identity} exercise={item.exercise} edges={edges.body}
      divider={index !== rows.length - 1} onOpen={openExercise} onAdd={add}
      addLabel={t('exerciseRow.add')} />, [add, edges, openExercise, rows.length, t]);
  return <Screen embedded scroll={false}>
    <FlatList
      style={{ flex: 1 }}
      data={rows}
      keyExtractor={item => item.id}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      contentContainerStyle={{ paddingVertical: theme.space[4] }}
      getItemLayout={flatListItemLayout}
      removeClippedSubviews={Platform.OS === 'android'}
      {...exerciseListWindow}
      ListHeaderComponent={<View style={{ gap: theme.layout.cardGap }}>
        <Header title={replaceId ? t('pick.replace') : t('pick.add')} onBack={() => router.back()} />
        <View style={[edges.top, rows.length > 0 ? { paddingBottom: theme.space[3] } : null]}>
          <View style={{ gap: theme.space[3] }}>
            <Typography size="head">{t('pick.offlineLibrary')}</Typography>
            <Field label={t('pick.search')} value={query} onChangeText={setQuery} />
            {rows.length === 0 && <Typography tone="secondary">{t('pick.noMatch')}</Typography>}
          </View>
        </View>
      </View>}
      renderItem={renderItem}
      ListFooterComponent={<View>
        <View style={edges.bottom} />
        <View style={{ gap: theme.layout.cardGap, marginTop: theme.layout.cardGap }}>
          {error && <Typography>{error}</Typography>}
          <Button label={t('common.cancel')} variant="secondary" disabled={busy} onPress={() => router.back()} />
        </View>
      </View>}
    />
  </Screen>;
}
