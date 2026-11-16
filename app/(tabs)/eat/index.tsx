import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Button, Card, Header, ListGroup, ListRow, Screen, Snackbar, Typography } from '../../../src/design/primitives';
import { useTheme } from '../../../src/design/ThemeProvider';
import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { formatDate, formatNumber, pluralForm, type TranslationKey } from '../../../src/i18n';
import { CalorieSummaryCard } from '../../../src/features/eat/CalorieSummaryCard';
import { diaryDate } from '../../../src/features/eat/daySummary';
import { AccentRow, DaySwitcher, MealHeading, PlusIcon } from '../../../src/features/eat/eatLayout';
import { WaterRow } from '../../../src/features/eat/WaterRow';
import { getCurrentTarget, type Target } from '../../../src/services/database/targets';
import { getTypedSetting } from '../../../src/services/database/settings';
import { dayOffset, entryName, localDay, MEALS, mealAtTime, type MealKey } from '../../../src/features/eat/foodCatalog';
import { copyDay, copyMeal, deleteEntry, listSavedMeals, logSavedMeal, readDiaryDay,
  summarizeEntries, type DiaryEntry, type SavedMeal } from '../../../src/features/eat/diaryRepository';

export default function EatHome() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const params = useLocalSearchParams<{ undo?: string; day?: string; demoWater?: string }>();
  const [day, setDay] = useState(params.day ?? localDay(new Date()));
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [target, setTarget] = useState<Target | null>(null);
  const [hidden, setHidden] = useState(false);
  const [ramadan, setRamadan] = useState(false);
  const [iftarTime, setIftarTime] = useState('18:00');
  const [labels, setLabels] = useState<Partial<Record<MealKey, string>>>({});
  const [saved, setSaved] = useState<SavedMeal[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [undo, setUndo] = useState<string | null>(params.undo ?? null);
  const [error, setError] = useState(false);
  const reload = useCallback(async () => {
    const [diary, goal, hide, fast, names, meals, iftar] = await Promise.all([
      readDiaryDay(day), getCurrentTarget(), getTypedSetting('hideNumbers'),
      getTypedSetting('eat.ramadan'), getTypedSetting('eat.mealNames'), listSavedMeals(), getTypedSetting('eat.iftarTime')]);
    if (diary.ok) setEntries(diary.value); else setError(true);
    if (goal.ok) setTarget(goal.value);
    if (hide.ok) setHidden(hide.value);
    if (fast.ok) setRamadan(fast.value);
    if (iftar.ok) setIftarTime(iftar.value);
    if (names.ok) setLabels(names.value ?? {});
    if (meals.ok) setSaved(meals.value);
  }, [day]);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  useEffect(() => {
    if (!undo) return;
    const timeout = setTimeout(() => setUndo(null), 4000);
    return () => clearTimeout(timeout);
  }, [undo]);
  const today = localDay(new Date());
  const summary = summarizeEntries(entries);
  const format = (value: number) => formatNumber(language, value);
  const mealName = (key: MealKey) => labels[key] ||
    (ramadan ? (key === 'breakfast' ? t('eatI.suhoor') : key === 'dinner' ? t('eatI.iftar') :
      key === 'snacks' ? t('eatI.snacks') : t('eatI.lunch')) : t(`eatI.${key}`));
  const go = (meal: MealKey) => router.push({ pathname: '/(tabs)/eat/search', params: { meal, day } });
  const openTargets = () => router.push('/(tabs)/eat/targets');
  const parsed = diaryDate(day);
  const dateLabel = !parsed ? day : day === today
    ? t('eatI.dayToday', { date: formatDate(language, parsed, { month: 'short', day: 'numeric' }) })
    : formatDate(language, parsed, { weekday: 'short', month: 'short', day: 'numeric' });
  async function repeat(meal: MealKey | null) {
    const result = meal ? await copyMeal(dayOffset(day, -1), day, meal) : await copyDay(dayOffset(day, -1), day);
    if (result.ok && result.value > 0) {
      setNotice(t((`eatI.copied.${pluralForm(language, result.value)}`) as TranslationKey, { count: result.value }));
      await reload();
    } else setNotice(t('eatI.nothingCopy'));
  }
  async function applySaved(savedMeal: SavedMeal, meal: MealKey) {
    const result = await logSavedMeal(savedMeal, meal, day);
    if (result.ok) { setNotice(t('eatI.savedLogged', { name: savedMeal.name })); await reload(); }
    else setError(true);
  }
  return <Screen embedded scroll={false}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{
      gap: theme.layout.cardGap, paddingTop: theme.space[4], paddingBottom: theme.space[8],
    }}>
      <View style={{ gap: theme.space[2] }}>
        <Header mode="large" title={t('nav.eat')} right={
          <Pressable accessibilityRole="button" accessibilityLabel={t('eatI.quick')}
            onPress={() => router.push({ pathname: '/(tabs)/eat/quick', params: {
              day, meal: mealAtTime(new Date(), ramadan, iftarTime),
            } })}
            style={{ width: theme.size.touch.min, height: theme.size.touch.min, alignItems: 'center', justifyContent: 'center' }}>
            <PlusIcon color={theme.color.text.primary} size={theme.space[6]} strokeWidth={theme.size.iconStroke} />
          </Pressable>} />
        <DaySwitcher label={dateLabel} nextDisabled={day >= today}
          onPrevious={() => setDay(dayOffset(day, -1))} onNext={() => setDay(dayOffset(day, 1))} />
      </View>
      <CalorieSummaryCard logged={summary.logged} eaten={summary.kcal} target={target} hidden={hidden}
        protein={summary.protein} carbs={summary.carbs} fat={summary.fat}
        fiber={summary.fiber} sugar={summary.sugar} sodium={summary.sodium}
        completeMacroItems={summary.completeMacroItems} itemCount={summary.count}
        onSetTarget={openTargets} onShowNumbers={openTargets} />
      {MEALS.map(meal => {
        const inMeal = entries.filter(entry => entry.meal === meal);
        const part = summary.byMeal[meal];
        const mealValue = part.count === 0 ? undefined : hidden
          ? t((`eatI.items.${pluralForm(language, part.count)}`) as TranslationKey, { count: part.count })
          : t('eatI.kcal', { count: format(part.kcal) });
        return <View key={meal} style={{ gap: theme.space[2] }}>
          <MealHeading title={mealName(meal)} value={mealValue} />
          <ListGroup>
            {inMeal.map(entry => <ListRow key={entry.id} title={entryName(entry, language)}
              detail={hidden ? t('eatI.hidden') : entry.grams ? t('eatI.grams', { count: format(entry.grams) }) : undefined}
              value={hidden ? undefined : t('eatI.kcal', { count: format(entry.kcal) })}
              onPress={() => router.push({ pathname: '/(tabs)/eat/meal', params: { meal, day } })} />)}
            <AccentRow label={t('eatI.addRow')} onPress={() => go(meal)} />
          </ListGroup>
          {saved.length > 0 && <ListGroup>
            {saved.slice(0, 2).map(item => <ListRow key={item.id} title={item.name}
              detail={t('eatI.savedMeal')} onPress={() => void applySaved(item, meal)} />)}
          </ListGroup>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
            <Button label={t('eatI.repeatYesterday')} variant="plain" onPress={() => void repeat(meal)} />
            {part.count > 0 && <Button label={t('eatI.details')} variant="plain" onPress={() =>
              router.push({ pathname: '/(tabs)/eat/meal', params: { meal, day } })} />}
          </View>
        </View>;
      })}
      <WaterRow day={day} demoGlasses={params.demoWater === '3' ? 3 : undefined} />
      <View style={{ gap: theme.space[2] }}>
        <MealHeading title={t('eatI.repeatDay')} />
        <Card>
          <Typography tone="secondary" size="secondary">{t('eatI.repeatDayHint')}</Typography>
          <Button label={t('eatI.copyYesterday')} variant="tonal" onPress={() => void repeat(null)} />
        </Card>
      </View>
      <ListGroup>
        <ListRow title={t('eatI.targets')} onPress={openTargets} />
        <ListRow title={t('eatI.history')} onPress={() => router.push('/(tabs)/eat/history')} />
      </ListGroup>
      {(notice || undo) && <Snackbar message={notice ?? t('eatI.added')}
        onUndo={undo ? () => void deleteEntry(undo).then(() => { setUndo(null); void reload(); }) : undefined}
        onDismiss={() => { setUndo(null); setNotice(null); }} />}
      {error && <Typography tone="secondary">{t('eatI.error')}</Typography>}
    </ScrollView>
  </Screen>;
}
