import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Button, EmptyState, Field, Header, ListGroup, Screen, SectionHeader, Typography } from '../../../src/design/primitives';
import { useTheme } from '../../../src/design/ThemeProvider';
import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { formatNumber } from '../../../src/i18n';
import { MealPicker } from '../../../src/features/eat/eatLayout';
import { foodName, bundledFoods, searchFoods, mealAtTime, localDay, MEALS, type Food, type MealKey } from '../../../src/features/eat/foodCatalog';
import { listFavoriteFoods, listRecentFoods, readLocalFoods, logFood, lastLoggedGrams, toggleFavorite } from '../../../src/features/eat/diaryRepository';

export default function FoodSearch() {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const params = useLocalSearchParams<{ meal?: MealKey; day?: string; q?: string }>();
  const [meal, setMeal] = useState<MealKey>(MEALS.includes(params.meal as MealKey) ? params.meal! : mealAtTime(new Date()));
  const day = params.day ?? localDay(new Date());
  const [query, setQuery] = useState(params.q ?? '');
  const [custom, setCustom] = useState<Food[]>([]);
  const [favorites, setFavorites] = useState<Food[]>([]);
  const [recent, setRecent] = useState<Food[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useFocusEffect(useCallback(() => {
    let mounted = true;
    void Promise.all([readLocalFoods(), listFavoriteFoods(), listRecentFoods(meal)]).then(([a, b, c]) => {
      if (!mounted) return;
      if (a.ok) setCustom(a.value); if (b.ok) setFavorites(b.value); if (c.ok) setRecent(c.value);
    });
    return () => { mounted = false; };
  }, [meal]));
  const catalog = useMemo(() => [...bundledFoods(), ...custom], [custom]);
  const rows = useMemo(() => query.trim() ? searchFoods(catalog, query, 60) :
    [...favorites, ...recent, ...catalog.filter(f => f.source === 'egypt')].filter(
      (food, index, array) => array.findIndex(row => row.id === food.id) === index).slice(0, 40),
  [catalog, query, favorites, recent]);
  async function quick(food: Food) {
    if (busy) return;
    setBusy(true);
    const portion = await lastLoggedGrams(food);
    const grams = portion.ok ? portion.value : (food.portions[0]?.grams ?? 100);
    const result = await logFood(food, grams, meal, day);
    if (result.ok) router.replace({ pathname: '/(tabs)/eat', params: { undo: result.value.id } });
    else { setError(true); setBusy(false); }
  }
  return <Screen embedded scroll={false}>
    <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{
      gap: theme.layout.cardGap, paddingTop: theme.space[4], paddingBottom: theme.space[8],
    }}>
      <Header mode="inline" title={t('eatI.search')} onBack={() => router.back()} />
      <MealPicker value={meal} onChange={setMeal} />
      <Field label={t('eatI.findFood')} placeholder={t('eatI.searchHint')} value={query} onChangeText={setQuery} />
      <Typography tone="secondary" size="secondary">{t('eatI.offlineSearch')}</Typography>
      <View style={{ gap: theme.space[2] }}>
        <SectionHeader title={query ? t('eatI.results') : t('eatI.recentAndEgypt')} />
        {rows.length === 0 ? <EmptyState title={t('eatI.noResults')} description={t('eatI.offlineSearch')} /> :
          <ListGroup>
            {rows.map((food, index) => {
              const title = foodName(food, language);
              const per100 = t('eatI.per100', { count: formatNumber(language, Math.round(food.kcal)) });
              const detail = food.estimate ? per100 + ' · ' + t('eatI.recipeEstimate') : per100;
              const favorite = favorites.some(item => item.id === food.id);
              return <View key={food.id} style={{
                paddingHorizontal: theme.space[4], paddingVertical: theme.space[2], gap: theme.space[1],
                borderBottomWidth: index < rows.length - 1 ? 1 : 0, borderBottomColor: theme.color.border.subtle,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[2] }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={title + '. ' + detail}
                    onPress={() => router.push({ pathname: '/(tabs)/eat/portion', params: { id: food.id, meal, day } })}
                    style={{ flex: 1, minHeight: theme.size.touch.min, justifyContent: 'center' }}>
                    <Typography bold>{title}</Typography>
                    <Typography tone="secondary" size="secondary">{detail}</Typography>
                  </Pressable>
                  <Button size="sm" variant="tonal" label={t('eatI.add')} disabled={busy} onPress={() => void quick(food)} />
                </View>
                <Button size="sm" variant="plain" label={favorite ? t('eatI.unfavorite') : t('eatI.favorite')}
                  onPress={() => void toggleFavorite(food).then(result => {
                    if (result.ok) setFavorites(previous => result.value ? [food, ...previous] : previous.filter(item => item.id !== food.id));
                  })} />
              </View>;
            })}
          </ListGroup>}
      </View>
      <Button label={t('eatI.createFood')} variant="tonal" fullWidth onPress={() =>
        router.push({ pathname: '/(tabs)/eat/custom', params: { meal, day } })} />
      <Button label={t('eatI.quick')} variant="neutral" fullWidth onPress={() =>
        router.push({ pathname: '/(tabs)/eat/quick', params: { meal, day } })} />
      {error && <Typography>{t('eatI.error')}</Typography>}
    </ScrollView>
  </Screen>;
}
