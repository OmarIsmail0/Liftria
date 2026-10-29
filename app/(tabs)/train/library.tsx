import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { equipmentLabel } from '../../../src/i18n/equipment';
import type { TranslationKey } from '../../../src/i18n';
import { exerciseName } from '../../../src/i18n/exerciseNames';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, SectionList, TextInput, View } from 'react-native';
import { ExerciseThumbnail } from '../../../src/features/train/ExerciseThumbnail';
import { librarySections } from '../../../src/features/train/exerciseSections';
import { resultCardEdges } from '../../../src/features/train/resultCardEdges';
import { Button, Card, EmptyState, Header, ListRow, Screen, Typography } from '../../../src/design/primitives';
import { useTheme } from '../../../src/design/ThemeProvider';
import { MUSCLE_GROUPS, type Exercise } from '../../../src/services/database/gymTypes';
import { ensureExercisePack, listExercises, searchExercises } from '../../../src/services/database/exerciseLibrary';
import { recentExerciseIds } from '../../../src/services/database/gymRepositories';

const groups = ['All', ...Object.keys(MUSCLE_GROUPS)] as const;

type BrowseRow = { id: string; exercise: Exercise; title: string; detail: string };

function libraryDetail(exercise: Exercise, language: 'en' | 'ar', t: (key: TranslationKey, params?: Record<string, string | number>) => string): string {
  const muscles = exercise.primaryMuscles.map(muscle => t(`muscle.${muscle}` as TranslationKey)).join(', ');
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
  const [group, setGroup] = useState<string>('All');
  const [all, setAll] = useState<Exercise[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const edges = resultCardEdges(theme);
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
    let rows = searchExercises(all, query, null, language);
    if (group !== 'All') {
      const muscles = MUSCLE_GROUPS[group as keyof typeof MUSCLE_GROUPS];
      if (muscles) rows = rows.filter(exercise => exercise.primaryMuscles.some(muscle => (muscles as readonly string[]).includes(muscle))
        || exercise.secondaryMuscles.some(muscle => (muscles as readonly string[]).includes(muscle)));
    }
    return rows;
  }, [all, query, group, language]);
  const rows = useMemo<BrowseRow[]>(() => filtered.map(exercise => ({
    id: exercise.id,
    exercise,
    title: exerciseName(language, exercise.id, exercise.name),
    detail: libraryDetail(exercise, language, t),
  })), [filtered, language, t]);
  const browsing = query.trim() === '';
  const showList = !loading && !error;
  const sections = useMemo(
    () => librarySections(showList ? rows : [], row => row.title, browsing),
    [showList, rows, browsing],
  );
  const showResults = sections.length > 0;
  const recentRows = useMemo(() => recent.flatMap(id => {
    const exercise = all.find(item => item.id === id);
    if (!exercise) return [];
    return [{ exercise, title: exerciseName(language, exercise.id, exercise.name), detail: libraryDetail(exercise, language, t) }];
  }), [recent, all, language, t]);
  const openExercise = (id: string) => router.push({ pathname: '/(tabs)/train/exercise/[id]', params: { id } });
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
        {showList && !showResults && <EmptyState title={query.trim() ? t('library.noMatch', { query }) : t('library.noGroup')}
          description={t('library.emptyHint')}
          action={<Button label={t('library.createNamed', { name: query.trim() || t('library.exercise') })}
            onPress={() => router.push({ pathname: '/(tabs)/train/create', params: { name: query.trim() } })} />} />}
        {showResults && <View style={[edges.top, { paddingBottom: theme.space[3] }]}>
          <Typography size="head">{cardTitle}</Typography>
        </View>}
      </View>}
      renderSectionHeader={({ section }) => section.letter === '' ? null : <View accessible accessibilityRole="header"
        accessibilityLabel={section.letter} style={[edges.body, { paddingBottom: theme.space[3] }]}>
        <Typography size="small" bold>{section.letter}</Typography>
      </View>}
      renderItem={({ item, index, section }) => {
        const endOfSection = index === section.data.length - 1;
        const isLast = endOfSection && section.data === sections[sections.length - 1]?.data;
        return <View style={[edges.body, isLast ? null : { paddingBottom: theme.space[3] }]}>
          <ListRow title={item.title} detail={item.detail} leading={<ExerciseThumbnail exercise={item.exercise} />}
            divider={!endOfSection} onPress={() => openExercise(item.id)} />
        </View>;
      }}
      ListFooterComponent={<View>
        {showResults && <View style={edges.bottom} />}
        <View style={{ marginTop: theme.space[3] }}>
          <Typography tone="tertiary" size="small">{t('library.attribution')}</Typography>
        </View>
      </View>}
    />
  </Screen>;
}
