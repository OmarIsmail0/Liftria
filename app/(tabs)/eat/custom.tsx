import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, Card, Field, Header, Screen, Sheet, Typography } from '../../../src/design/primitives';
import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { MealPicker } from '../../../src/features/eat/eatLayout';
import { macroMismatch, MEALS, mealAtTime, type MealKey } from '../../../src/features/eat/foodCatalog';
import { createMyFood, logFood } from '../../../src/features/eat/diaryRepository';

export default function CustomFood() {
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ meal?: MealKey; day?: string }>();
  const [meal, setMeal] = useState<MealKey>(MEALS.includes(params.meal as MealKey) ? params.meal! : mealAtTime(new Date()));
  const [name, setName] = useState('');
  const [grams, setGrams] = useState('100');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const values = [kcal, protein, carbs, fat].map(Number);
  const amount = Number(grams);
  const valid = name.trim().length > 0 && values.every(Number.isFinite) && values.every(n => n >= 0) &&
    [kcal, protein, carbs, fat].every(v => v.trim() !== '') && amount > 0 && amount <= 2000 && Number.isFinite(amount);
  const mismatch = valid && macroMismatch(values[0]!, values[1]!, values[2]!, values[3]!);
  async function save() {
    if (!valid || busy) return;
    if (mismatch && !confirm) { setConfirm(true); return; }
    setBusy(true);
    const food = await createMyFood({
      name: name.trim(), nameAr: null, aliases: [],
      kcal: values[0]!, protein: values[1]!, carbs: values[2]!, fat: values[3]!, fiber: null,
      portions: [{ labelEn: '100 g', labelAr: null, grams: 100 }],
    });
    if (food.ok) {
      const entry = await logFood(food.value, amount, meal, params.day);
      if (entry.ok) { router.replace({ pathname: '/(tabs)/eat', params: { undo: entry.value.id } }); return; }
    }
    setError(true); setBusy(false);
  }
  return <Screen embedded>
    <Header mode="inline" title={t('eatI.createFood')} onBack={() => router.back()} />
    <Card>
      <Field label={t('eatI.nameRequired')} value={name} onChangeText={setName} />
      <Typography tone="secondary">{t('eatI.per100Note')}</Typography>
      <Field label={t('eatI.calories')} value={kcal} onChangeText={setKcal} keyboardType="decimal-pad" />
      <Field label={t('eatI.protein')} value={protein} onChangeText={setProtein} keyboardType="decimal-pad" />
      <Field label={t('eatI.carbs')} value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" />
      <Field label={t('eatI.fat')} value={fat} onChangeText={setFat} keyboardType="decimal-pad" />
      <Field label={t('eatI.gramsLabel')} value={grams} onChangeText={setGrams} keyboardType="decimal-pad" />
      {amount > 2000 && <Typography tone="secondary">{t('eatI.bigPortion')}</Typography>}
      {mismatch && <Typography tone="secondary">{t('eatI.mismatch')}</Typography>}
      <MealPicker value={meal} onChange={setMeal} />
    </Card>
    {error && <Typography>{t('eatI.error')}</Typography>}
    <Button label={t('eatI.save')} disabled={!valid || busy} onPress={() => void save()} fullWidth />
    <Sheet visible={confirm} title={t('eatI.mismatchTitle')}
      description={t('eatI.mismatch')} onClose={() => setConfirm(false)}>
      <Button label={t('eatI.saveAnyway')} onPress={() => void save()} fullWidth />
    </Sheet>
  </Screen>;
}
