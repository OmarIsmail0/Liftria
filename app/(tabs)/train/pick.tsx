import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { equipmentLabel } from '../../../src/i18n/equipment';
import { exerciseName } from '../../../src/i18n/exerciseNames';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Platform, View } from 'react-native';
import { Button, Field, Header, ListRow, Screen, Typography } from '../../../src/design/primitives';
import { useTheme } from '../../../src/design/ThemeProvider';
import { ensureExercisePack, listExercises, searchExercises } from '../../../src/services/database/exerciseLibrary';
import { appendExerciseToActiveSession } from '../../../src/services/database/gymRepositories';
import { replaceActiveExercise } from '../../../src/features/train/workoutData';
import type { Exercise } from '../../../src/services/database/gymTypes';
import { ExerciseThumbnail } from '../../../src/features/train/ExerciseThumbnail';
import { resultCardEdges } from '../../../src/features/train/resultCardEdges';

type PickRow = { id: string; exercise: Exercise; title: string; detail: string };

export default function AddWorkoutExercise() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { id, replaceId } = useLocalSearchParams<{ id: string; replaceId?: string }>();
  const [query, setQuery] = useState('');
  const [all, setAll] = useState<Exercise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const edges = resultCardEdges(theme);
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
  const matches = useMemo(() => searchExercises(all, query, null, language), [all, query, language]);
  const rows = useMemo<PickRow[]>(() => matches.map(exercise => ({
    id: exercise.id,
    exercise,
    title: exerciseName(language, exercise.id, exercise.name),
    detail: equipmentLabel(language, exercise.equipment, t('pick.noEquipment')),
  })), [matches, language, t]);
  const add = async (exerciseId: string) => {
    if (busy) return;
    setBusy(true);
    const saved = replaceId ? await replaceActiveExercise(id, replaceId, exerciseId) :
      await appendExerciseToActiveSession(exerciseId);
    if (saved.ok && saved.value) router.replace({ pathname: '/(tabs)/train/active', params: { id } });
    else { setError(t('pick.addError')); setBusy(false); }
  };
  return <Screen embedded scroll={false}>
    <FlatList
      style={{ flex: 1 }}
      data={rows}
      keyExtractor={item => item.id}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      contentContainerStyle={{ paddingVertical: theme.space[4] }}
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
      renderItem={({ item, index }) => {
        const isLast = index === rows.length - 1;
        return <View style={[edges.body, isLast ? null : { paddingBottom: theme.space[3] }]}>
          <ListRow title={item.title} detail={item.detail} leading={<ExerciseThumbnail exercise={item.exercise} />}
            divider={!isLast} onPress={() => void add(item.id)} />
        </View>;
      }}
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
