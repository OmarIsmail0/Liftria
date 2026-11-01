import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { equipmentLabel } from '../../../src/i18n/equipment';
import { joinList, type TranslationKey } from '../../../src/i18n';
import { exerciseName } from '../../../src/i18n/exerciseNames';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, SectionList, TextInput, View } from 'react-native';
import { ExerciseResultRow } from '../../../src/features/train/ExerciseResultRow';
import { ExerciseThumbnail } from '../../../src/features/train/ExerciseThumbnail';
import { librarySections } from '../../../src/features/train/exerciseSections';
import {
  EXERCISE_SEARCH_DEBOUNCE_MS, EXERCISE_SECTION_HEADER_HEIGHT, exerciseListWindow, exerciseRowIdentity,
  exerciseThumbnailKey, frameAt, sectionListLayouts, useDeferredQuery,
} from '../../../src/features/train/exerciseRows';
import { resultCardEdges } from '../../../src/features/train/resultCardEdges';
import { Button, Card, EmptyState, Header, ListRow, Screen, Typography } from '../../../src/design/primitives';
import { useTheme } from '../../../src/design/ThemeProvider';
import { MUSCLE_GROUPS, type Exercise } from '../../../src/services/database/gymTypes';
import { ensureExercisePack, listExercises, searchExercises } from '../../../src/services/database/exerciseLibrary';
import { recentExerciseIds } from '../../../src/services/database/gymRepositories';

const groups = ['All', ...Object.keys(MUSCLE_GROUPS)] as const;

type BrowseRow = {
  id: string;
  exercise: Exercise;
  title: string;
  detail: string;
  identity: ReturnType<typeof exerciseRowIdentity>;
};

function libraryDetail(exercise: Exercise, language: 'en' | 'ar', t: (key: TranslationKey, params?: Record<string, string | number>) => string): string {
  const muscles = joinList(language, exercise.primaryMuscles.map(muscle => t(`muscle.${muscle}` as TranslationKey)));
  const mine = exercise.source === 'custom' ? ' · ' + t('library.mine') : '';
  return equipmentLabel(language, exercise.equipment, t('library.equipmentUnknown')) + ' · ' + muscles + mine;
}

export default function ExerciseLibrary() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const groupLabel = (name: string) => name === 'All' ? t('library.all') : name === 'Chest' ? t('library.chest') :
    name === 'Back' ? t('library.back') : name === 'Arms' ? t('library.arms') :
    name === 'Shoulders' ? t('polish.groupShoulders') : name === 'Core' ? t('polish.groupCore') :
    name === 'Neck' ? t('polish.groupNeck') : t('library.legs');
  const params = useLocalSearchParams<{ query?: string }>();
  const [query, setQuery] = useState(params.query ?? '');
  const appliedQuery = useDeferredQuery(query, EXERCISE_SEARCH_DEBOUNCE_MS);
  const [group, setGroup] = useState<string>('All');
  const [all, setAll] = useState<Exercise[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const edges = useMemo(() => resultCardEdges(theme), [theme]);
  const themeKey = theme.mode + ':' + theme.effectiveStyle;
  useFocusEffect(useCallback(() => {
    let active = true;
    async function refresh() {
      setLoading(true); setError(null);
      const seeded = await ensureExercisePack();
      if (!seeded.ok) { if (active) { setError(t('library.openError')); setLoading(false); } return; }
      const [result, history] = await Promise.all([listExercises(), recentExerciseIds()]);
      if (!active) return;
      if (result.ok) setAll(result.value);
      else setError(t('library.readError'));
      setRecent(history.ok ? history.value : []);
      setLoading(false);
    }
    void refresh();
    return () => { active = false; };
  }, [t]));
  const filtered = useMemo(() => {
    let rows = searchExercises(all, appliedQuery, null, language);
    if (group !== 'All') {
      const muscles = MUSCLE_GROUPS[group as keyof typeof MUSCLE_GROUPS];
      if (muscles) rows = rows.filter(exercise => exercise.primaryMuscles.some(muscle => (muscles as readonly string[]).includes(muscle))
        || exercise.secondaryMuscles.some(muscle => (muscles as readonly string[]).includes(muscle)));
    }
    return rows;
  }, [all, appliedQuery, group, language]);
  const rows = useMemo<BrowseRow[]>(() => filtered.map(exercise => {
    const title = exerciseName(language, exercise.id, exercise.name);
    const detail = libraryDetail(exercise, language, t);
    return {
      id: exercise.id,
      exercise,
      title,
      detail,
      identity: exerciseRowIdentity(exercise.id, title, detail,
        exerciseThumbnailKey(exercise.primaryMuscles, exercise.secondaryMuscles), themeKey),
    };
  }), [filtered, language, t, themeKey]);
  const browsing = appliedQuery.trim() === '';
  const showList = !loading && !error;
  const sections = useMemo(
    () => librarySections(showList ? rows : [], row => row.title, browsing),
    [showList, rows, browsing],
  );
  const frames = useMemo(
    () => sectionListLayouts(sections.map(section => ({ letter: section.letter, count: section.data.length }))),
    [sections],
  );
  const getItemLayout = useCallback((_: unknown, index: number) => frameAt(frames, index), [frames]);
  const showResults = sections.length > 0;
  const recentRows = useMemo(() => recent.flatMap(id => {
    const exercise = all.find(item => item.id === id);
    if (!exercise) return [];
    return [{ exercise, title: exerciseName(language, exercise.id, exercise.name), detail: libraryDetail(exercise, language, t) }];
  }), [recent, all, language, t]);
  const openExercise = useCallback((id: string) => {
    router.push({ pathname: '/(tabs)/train/exercise/[id]', params: { id } });
  }, []);
  const renderItem = useCallback(({ item, index, section }: {
    item: BrowseRow; index: number; section: { data: readonly BrowseRow[] };
  }) => <ExerciseResultRow identity={item.identity} exercise={item.exercise} edges={edges.body}
    divider={index !== section.data.length - 1} onOpen={openExercise} />, [edges, openExercise]);
  const cardTitle = !browsing ? t('library.results', { count: rows.length }) : group === 'All'
    ? t('library.allResults', { count: rows.length }) : t('library.groupResults', { name: groupLabel(group), count: rows.length });
  return <Screen embedded scroll={false}>
    <SectionList
      style={{ flex: 1 }}
      sections={sections}
      keyExtractor={item => item.id}
      keyboardShouldPersistTaps="handled"
      stickySectionHeadersEnabled={false}
      contentContainerStyle={{ paddingVertical: theme.space[3] }}
      getItemLayout={getItemLayout}
      removeClippedSubviews={Platform.OS === 'android'}
      {...exerciseListWindow}
      ListHeaderComponent={<View style={{ gap: theme.space[3] }}>
        <Header title={t('library.title')} subtitle={t('library.subtitle')} onBack={() => router.back()}
          right={<Button label={t('library.new')} variant="secondary" onPress={() => router.push('/(tabs)/train/create')} />} />
        <TextInput value={query} onChangeText={setQuery} accessibilityLabel={t('library.searchLabel')}
          placeholder={t('library.searchHint')} placeholderTextColor={theme.color.text.tertiary}
          style={{ color: theme.color.text.primary, backgroundColor: theme.cardFill, borderColor: theme.controlOutline,
            borderWidth: 1, borderRadius: theme.radius.pill, minHeight: 52, paddingHorizontal: theme.space[4],
            fontSize: theme.type.body.size }} />
        <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: theme.space[2], paddingVertical: theme.space[1] }}>
          <Button label={t('library.muscles')} variant="secondary" onPress={() => router.push('/(tabs)/train/muscles')} />
          {groups.map(name => <Pressable key={name} accessibilityRole="button"
            accessibilityLabel={t('library.filter', { name: groupLabel(name) })} accessibilityState={{ selected: group === name }}
            onPress={() => setGroup(name)} style={{ minHeight: theme.size.touch.min,
              paddingHorizontal: theme.space[4], borderRadius: theme.radius.pill,
              borderWidth: 1, borderColor: group === name ? theme.color.domain.train : theme.controlOutline,
              justifyContent: 'center', backgroundColor: group === name ? theme.color.tint.train : theme.cardFill }}>
            <Typography size="small" bold={group === name}>{groupLabel(name)}</Typography>
          </Pressable>)}
        </ScrollView>
        {loading && <ActivityIndicator color={theme.color.domain.train} />}
        {error && <Card><Typography>{error}</Typography><Button label={t('common.back')} onPress={() => router.back()} /></Card>}
        {showList && browsing && group === 'All' && recentRows.length > 0 &&
          <Card title={t('library.recent')}>{recentRows.map(row => <ListRow key={row.exercise.id} title={row.title}
            detail={row.detail} leading={<ExerciseThumbnail exercise={row.exercise} />}
            onPress={() => openExercise(row.exercise.id)} />)}</Card>}
        {showList && !showResults && <EmptyState title={appliedQuery.trim() ? t('library.noMatch', { query: appliedQuery }) : t('library.noGroup')}
          description={t('library.emptyHint')}
          action={<Button label={t('library.createNamed', { name: query.trim() || t('library.exercise') })}
            onPress={() => router.push({ pathname: '/(tabs)/train/create', params: { name: query.trim() } })} />} />}
        {showResults && <View style={[edges.top, { paddingBottom: theme.space[3] }]}>
          <Typography size="head">{cardTitle}</Typography>
        </View>}
      </View>}
      renderSectionHeader={({ section }) => section.letter === '' ? null : <View accessible accessibilityRole="header"
        accessibilityLabel={section.letter} style={[edges.body, {
          height: EXERCISE_SECTION_HEADER_HEIGHT, justifyContent: 'center', overflow: 'hidden' }]}>
        <Typography size="small" bold>{section.letter}</Typography>
      </View>}
      renderItem={renderItem}
      ListFooterComponent={<View>
        {showResults && <View style={edges.bottom} />}
        <View style={{ marginTop: theme.space[3] }}>
          <Typography tone="tertiary" size="small">{t('library.attribution')}</Typography>
        </View>
      </View>}
    />
  </Screen>;
}
