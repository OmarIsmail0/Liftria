import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, View } from 'react-native';
import { BodyMap } from '../../../src/features/train/BodyMap';
import { ExerciseResultRow } from '../../../src/features/train/ExerciseResultRow';
import { resultCardEdges } from '../../../src/features/train/resultCardEdges';
import {
  exerciseListWindow, exerciseRowIdentity, exerciseThumbnailKey, flatListItemLayout,
} from '../../../src/features/train/exerciseRows';
import { Card, EmptyState, Header, Screen, Typography } from '../../../src/design/primitives';
import { useTheme } from '../../../src/design/ThemeProvider';
import { pluralForm, type TranslationKey } from '../../../src/i18n';
import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { equipmentLabel } from '../../../src/i18n/equipment';
import { exerciseName } from '../../../src/i18n/exerciseNames';
import { muscleLabel } from '../../../src/i18n/muscles';
import { MUSCLES, type Exercise, type Muscle } from '../../../src/services/database/gymTypes';
import { ensureExercisePack, listExercises, searchExercises } from '../../../src/services/database/exerciseLibrary';

type MuscleRow = {
  id: string;
  exercise: Exercise;
  identity: ReturnType<typeof exerciseRowIdentity>;
};

export default function MuscleBrowser() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { muscle } = useLocalSearchParams<{ muscle?: string }>();
  const requested = MUSCLES.find(item => item === muscle) ?? 'chest';
  const [selected, setSelected] = useState<Muscle>(requested);
  const [all, setAll] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const edges = useMemo(() => resultCardEdges(theme), [theme]);
  const themeKey = theme.mode + ':' + theme.effectiveStyle;
  useFocusEffect(useCallback(() => {
    let mounted = true;
    void (async () => {
      const pack = await ensureExercisePack();
      const loaded = pack.ok ? await listExercises() : null;
      if (mounted) {
        if (loaded?.ok) setAll(loaded.value);
        else setError(true);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []));
  const matches = useMemo(() => searchExercises(all, '', selected, language), [all, selected, language]);
  const rows = useMemo<MuscleRow[]>(() => matches.map(exercise => {
    const title = exerciseName(language, exercise.id, exercise.name);
    const detail = equipmentLabel(language, exercise.equipment, t('muscle.notSpecified'))
      + ' · ' + (exercise.primaryMuscles.includes(selected) ? t('muscle.primary') : t('muscle.secondary'));
    return {
      id: exercise.id,
      exercise,
      identity: exerciseRowIdentity(exercise.id, title, detail,
        exerciseThumbnailKey(exercise.primaryMuscles, exercise.secondaryMuscles), themeKey),
    };
  }), [matches, language, selected, t, themeKey]);
  const showRows = !loading && !error && rows.length > 0;
  const openExercise = useCallback((id: string) => {
    router.push({ pathname: '/(tabs)/train/exercise/[id]', params: { id } });
  }, []);
  const renderItem = useCallback(({ item, index }: { item: MuscleRow; index: number }) =>
    <ExerciseResultRow identity={item.identity} exercise={item.exercise} edges={edges.body}
      divider={index !== rows.length - 1} onOpen={openExercise} />, [edges, openExercise, rows.length]);
  return <Screen embedded scroll={false}>
    <FlatList
      style={{ flex: 1 }}
      data={showRows ? rows : []}
      keyExtractor={item => item.id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingVertical: theme.space[3] }}
      getItemLayout={flatListItemLayout}
      removeClippedSubviews={Platform.OS === 'android'}
      {...exerciseListWindow}
      ListHeaderComponent={<View style={{ gap: theme.layout.cardGap }}>
        <Header title={t('train.muscles')} subtitle={t('muscle.browserSubtitle')} onBack={() => router.back()} />
        <Card rim="train">
          <BodyMap selected={selected} primary={[selected]} onSelect={setSelected} />
        </Card>
        <View style={[edges.top, showRows ? { paddingBottom: theme.space[3] } : null]}>
          <View style={{ gap: theme.space[3] }}>
            <Typography size="head">{t((`muscle.browserCount.${pluralForm(language, matches.length)}`) as TranslationKey, { name: muscleLabel(language, selected), count: matches.length })}</Typography>
            <Typography tone="secondary" size="small">{t('muscle.browserDescription')}</Typography>
            {loading && <ActivityIndicator color={theme.color.domain.train} />}
            {error && <Typography>{t('muscle.browserLoadError')}</Typography>}
            {!loading && !error && rows.length === 0 && <EmptyState title={t('muscle.browserEmpty')}
              description={t('muscle.browserEmptyDescription')} />}
          </View>
        </View>
      </View>}
      renderItem={renderItem}
      ListFooterComponent={<View>
        <View style={edges.bottom} />
        <View style={{ marginTop: theme.layout.cardGap }}>
          <Typography tone="tertiary" size="small">{t('muscle.browserData', { count: MUSCLES.length })}</Typography>
        </View>
      </View>}
    />
  </Screen>;
}
