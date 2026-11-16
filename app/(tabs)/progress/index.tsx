import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { bidiIsolate, formatNumber, pluralForm, weightUnitLabel, type TranslationKey } from '../../../src/i18n';
import { exerciseName } from '../../../src/i18n/exerciseNames';
import {
  Button, Card, EmptyState, Header, ListGroup, ListRow, Screen, SegmentedControl, Typography,
} from '../../../src/design/primitives';
import { dayOffset, localDay } from '../../../src/features/eat/foodCatalog';
import { readDiaryRange, type DiaryEntry } from '../../../src/features/eat/diaryRepository';
import { healthCopy } from '../../../src/features/health/deviceHealth';
import { listAllMeasurements } from '../../../src/features/progress/measurementRepository';
import {
  formatMeasurement, lengthUnitForWeight, summarizeMeasurements, type BodyMeasurement,
} from '../../../src/features/progress/measurements';
import { progressPhotoUsage } from '../../../src/features/progress/progressPhotoRepository';
import { WeightGraph } from '../../../src/features/progress/TrendCharts';
import {
  nutritionTrend, rangeDays, weightTrend, type RangeKey, type WeightPoint,
} from '../../../src/features/progress/trendMath';
import { cachedHealthWeights, listLocalWeights, type LocalWeight } from '../../../src/features/progress/weightRepository';
import { readStrengthObservations, type StrengthObservation } from '../../../src/services/database/historyRepository';
import { getTypedSetting } from '../../../src/services/database/settings';
import { fromKg, type WeightUnit } from '../../../src/features/train/workoutUnits';

export default function ProgressTab() {
  const { t, language } = useLanguage();
  const [range, setRange] = useState<RangeKey>('4w');
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [local, setLocal] = useState<LocalWeight[]>([]);
  const [health, setHealth] = useState<WeightPoint[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [photoCount, setPhotoCount] = useState(0);
  const [sets, setSets] = useState<StrengthObservation[]>([]);
  const [hidden, setHidden] = useState(false);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [error, setError] = useState(false);
  const today = localDay(new Date());
  const load = useCallback(async () => {
    const days = rangeDays(range);
    const [food, logged, cached, hide, unit, tapes, photos, strength] = await Promise.all([
      readDiaryRange(dayOffset(today, -days), dayOffset(today, -1)),
      listLocalWeights(), cachedHealthWeights(), getTypedSetting('hideNumbers'),
      getTypedSetting('units.weight'), listAllMeasurements(), progressPhotoUsage(),
      readStrengthObservations(),
    ]);
    if (food.ok) setEntries(food.value); else setError(true);
    if (logged.ok) setLocal(logged.value); else setError(true);
    if (cached.ok) setHealth(cached.value); else setError(true);
    if (hide.ok) setHidden(hide.value);
    if (unit.ok) setWeightUnit(unit.value);
    if (tapes.ok) setMeasurements(tapes.value); else setError(true);
    if (photos.ok) setPhotoCount(photos.value.count); else setError(true);
    if (strength.ok) setSets(strength.value); else setError(true);
  }, [range, today]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const days = rangeDays(range);
  const nutrition = nutritionTrend(entries, today, days, null);
  const weights: WeightPoint[] = [...local, ...health];
  const body = weightTrend(weights, dayOffset(today, 1 - days), today);
  const format = (value: number, digits = 0) => bidiIsolate(language, formatNumber(language, value, {
    maximumFractionDigits: digits, minimumFractionDigits: digits,
  }));
  const unitLabel = weightUnitLabel(language, weightUnit);
  const latestSet = sets.filter(row => row.weight > 0 && row.reps > 0)
    .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))[0];
  const strengthValue = latestSet
    ? hidden ? t('trend.hidden') : t('progress.latestSet', {
      weight: bidiIsolate(language, formatNumber(language, fromKg(latestSet.weight, weightUnit), {
        maximumFractionDigits: 1,
      })),
      unit: unitLabel,
      reps: format(latestSet.reps),
    })
    : undefined;
  const nutritionValue = nutrition.loggedDays === 0 || nutrition.avgKcal === null
    ? undefined
    : hidden ? t('trend.hidden') : t('progress.avgKcal', { count: format(nutrition.avgKcal) });
  const newestTape = summarizeMeasurements(measurements)
    .sort((a, b) => b.latest.measuredAt.localeCompare(a.latest.measuredAt))[0];
  const tapeUnit = lengthUnitForWeight(weightUnit);
  const tapeValue = newestTape
    ? hidden ? t('trend.hidden') : formatMeasurement(newestTape.latest.cm, tapeUnit, language)
    : undefined;
  const photoValue = photoCount > 0
    ? hidden ? t('trend.hidden')
      : t((`progressPhotos.count.${pluralForm(language, photoCount)}`) as TranslationKey, { count: photoCount })
    : undefined;
  const demoCount = local.filter(row => row.note?.startsWith('Demo fixture')).length;
  const openBody = () => router.push('/(tabs)/progress/body');
  return <Screen embedded>
    <Header mode="large" title={t('nav.progress')} />
    {error && <Typography tone="secondary">{t('eatI.error')}</Typography>}
    <SegmentedControl label={t('trend.range')} value={range} onChange={setRange}
      options={[
        { value: '4w', label: t('polish.range4w') },
        { value: '3m', label: t('polish.range3m') },
        { value: '1y', label: t('polish.range1y') },
      ]} />
    {weights.length === 0 ? <Card>
      <EmptyState title={t('progress.weight')} description={t(healthCopy('trend.empty'))}
        action={<Button label={t('trend.logWeight')} variant="tonal" onPress={openBody} />} />
    </Card> : <Card>
      <Typography tone="secondary" size="secondary">{t('progress.weight')}</Typography>
      {body.latest ? <Typography size="metric">{hidden ? t('trend.hidden') : t('trend.weightValue', {
        weight: format(fromKg(body.latest.trend, weightUnit), 1), unit: unitLabel,
      })}</Typography> : <Typography tone="secondary">{t('progress.weightRangeEmpty')}</Typography>}
      {body.change !== null && !hidden && <Typography tone="secondary" size="secondary">{t('trend.trendChange', {
        change: format(fromKg(body.change, weightUnit), 1), unit: unitLabel,
      })}</Typography>}
      {body.points.length > 0 && <WeightGraph trend={body} hidden={hidden} unit={weightUnit} simple />}
      <Typography tone="secondary" size="secondary">{t(healthCopy('trend.source'))}</Typography>
      {demoCount > 0 && <Typography tone="secondary" size="secondary">{t((`trend.demoDataWarning.${pluralForm(language, demoCount)}`) as TranslationKey, { count: demoCount })}</Typography>}
      <Button label={t('trend.openBody')} variant="plain" onPress={openBody} />
    </Card>}
    <ListGroup>
      <ListRow title={t('progress.strength')}
        detail={latestSet ? exerciseName(language, latestSet.exerciseId, latestSet.name) : undefined}
        value={strengthValue}
        onPress={() => router.push('/(tabs)/progress/strength')} />
      <ListRow title={t('progress.nutrition')} value={nutritionValue}
        onPress={() => router.push('/(tabs)/progress/nutrition')} />
      <ListRow title={t('measure.title')}
        detail={newestTape ? t((`measure.site.${newestTape.site}`) as TranslationKey) : undefined}
        value={tapeValue}
        onPress={openBody} />
      <ListRow title={t('progress.photos')} value={photoValue}
        onPress={() => router.push('/(tabs)/progress/photos')} />
      <ListRow title={t('progress.health')} detail={t(healthCopy('trend.chip'))}
        onPress={() => router.push('/(tabs)/progress/health')} />
    </ListGroup>
  </Screen>;
}
