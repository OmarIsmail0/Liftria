import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Card, Chip, Field, Header, Screen, Typography } from '../../../src/design/primitives';
import { useTheme } from '../../../src/design/ThemeProvider';
import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { formatNumber } from '../../../src/i18n';
import { formatEditableNumber } from '../../../src/i18n/editableNumber';
import { ChoiceChips, MealPicker } from '../../../src/features/eat/eatLayout';
import { foodName, snapshot, MEALS, type MealKey, type Food } from '../../../src/features/eat/foodCatalog';
import { foodById, logFood } from '../../../src/features/eat/diaryRepository';

export default function PortionPicker() {
  const params = useLocalSearchParams<{ id: string; meal?: MealKey; day?: string }>();
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const [food, setFood] = useState<Food | null>(null);
  const [grams, setGrams] = useState('100');
  const [portionKey, setPortionKey] = useState('g');
  const [meal, setMeal] = useState<MealKey>(MEALS.includes(params.meal as MealKey) ? params.meal! : 'lunch');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    void foodById(params.id).then(result => {
      if (!alive) return;
      if (result.ok) {
        setFood(result.value);
        setGrams(formatEditableNumber(result.value?.portions[0]?.grams ?? 100, 'grams'));
      } else setError(true);
    });
    return () => { alive = false; };
  }, [params.id]);
  const amount = Number(grams);
  const valid = Number.isFinite(amount) && amount > 0 && amount <= 2000;
  const nutrition = useMemo(() => food && valid ? snapshot(food, amount) : null, [food, valid, amount]);
  async function save() {
    if (!food || !valid || busy) return;
    setBusy(true);
    const result = await logFood(food, amount, meal, params.day);
    if (result.ok) router.replace({ pathname: '/(tabs)/eat', params: { undo: result.value.id } });
    else { setError(true); setBusy(false); }
  }
  return <Screen embedded scroll={false}>
    <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{
      gap: theme.layout.cardGap, paddingTop: theme.space[4], paddingBottom: theme.space[8],
    }}>
      <Header mode="inline" title={food ? foodName(food, language) : t('eatI.portion')} onBack={() => router.back()} />
      {food && <>
        <Card>
          {food.source === 'egypt' ? <Chip kind="estimate" label={t('eatI.recipeEstimate')} /> :
            <Chip kind={food.source === 'custom' ? 'phone' : 'measured'}
              label={food.source === 'custom' ? t('eatI.myFood') : t('eatI.usda')} />}
          <Typography tone="secondary">{t('eatI.chooseUnit')}</Typography>
          <ChoiceChips label={t('eatI.chooseUnit')} value={portionKey} onChange={next => {
            if (next === 'g') { setPortionKey('g'); setGrams('100'); return; }
            const portion = food.portions.find(item => item.labelEn === next);
            if (!portion) return;
            setPortionKey(portion.labelEn);
            setGrams(formatEditableNumber(portion.grams, 'grams'));
          }} options={[
            { value: 'g', label: t('eatI.gramUnit') },
            ...food.portions.map(item => ({
              value: item.labelEn,
              label: language === 'ar' ? (item.labelAr ?? item.labelEn) : item.labelEn,
            })),
          ]} />
          <Field label={t('eatI.gramsLabel')} value={grams} keyboardType="decimal-pad"
            onChangeText={value => { setGrams(value); setPortionKey('g'); }} />
          <Typography tone="secondary" size="secondary">{t('eatI.storedGrams')}</Typography>
          {amount > 2000 && <Typography tone="secondary">{t('eatI.bigPortion')}</Typography>}
        </Card>
        <Card title={t('eatI.nutrition')}>
          <Typography size="title">{nutrition ? t('eatI.kcal', { count: formatNumber(language, nutrition.kcal) }) : '—'}</Typography>
          {nutrition && <Typography tone="secondary">{t('eatI.macroAmounts', {
            p: nutrition.protein === null ? '—' : formatNumber(language, nutrition.protein, { maximumFractionDigits: 1 }),
            c: nutrition.carbs === null ? '—' : formatNumber(language, nutrition.carbs, { maximumFractionDigits: 1 }),
            f: nutrition.fat === null ? '—' : formatNumber(language, nutrition.fat, { maximumFractionDigits: 1 }),
          })}</Typography>}
        </Card>
        <MealPicker value={meal} onChange={setMeal} />
        <View style={{ alignItems: 'stretch' }}>
          <Button label={t('eatI.addTo', { meal: t(`eatI.${meal}`) })} variant="primary" fullWidth
            disabled={busy || !valid} onPress={() => void save()} />
        </View>
      </>}
      {error && <Typography tone="secondary">{t('eatI.error')}</Typography>}
    </ScrollView>
  </Screen>;
}
