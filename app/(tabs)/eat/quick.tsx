import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, Card, Chip, Field, Header, Screen, Typography } from '../../../src/design/primitives';
import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { MealPicker } from '../../../src/features/eat/eatLayout';
import { logQuick } from '../../../src/features/eat/diaryRepository';
import { MEALS, mealAtTime, type MealKey } from '../../../src/features/eat/foodCatalog';

export default function QuickCalories() {
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ day?: string; meal?: MealKey }>();
  const [meal, setMeal] = useState<MealKey>(MEALS.includes(params.meal as MealKey) ? params.meal! : mealAtTime(new Date()));
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const number = Number(kcal);
  const valid = kcal.trim() !== '' && Number.isFinite(number) && number > 0 && number <= 10000;
  async function save() {
    if (!valid || busy) return;
    setBusy(true);
    const result = await logQuick(number, meal, params.day, name.trim() || t('eatI.quick'));
    if (result.ok) router.replace({ pathname: '/(tabs)/eat', params: { undo: result.value.id } });
    else { setError(true); setBusy(false); }
  }
  return <Screen embedded>
    <Header mode="inline" title={t('eatI.quick')} onBack={() => router.back()} />
    <Card>
      <Chip kind="estimate" label={t('eatI.caloriesOnly')} />
      <Typography tone="secondary">{t('eatI.noMacroClaim')}</Typography>
      <Field label={t('eatI.nameOptional')} value={name} onChangeText={setName} />
      <Field label={t('eatI.calories')} keyboardType="decimal-pad" value={kcal} onChangeText={setKcal} />
    </Card>
    <MealPicker value={meal} onChange={setMeal} />
    {error && <Typography>{t('eatI.error')}</Typography>}
    <Button label={t('eatI.save')} disabled={!valid || busy} fullWidth onPress={() => void save()} />
  </Screen>;
}
