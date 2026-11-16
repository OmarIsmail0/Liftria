import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Header, ListGroup, ListRow, Screen, SectionHeader, Typography } from '../../../src/design/primitives';
import { useTheme } from '../../../src/design/ThemeProvider';
import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { bidiIsolate, formatNumber } from '../../../src/i18n';
import { dayOffset, localDay } from '../../../src/features/eat/foodCatalog';
import { readDiaryRange, type DiaryEntry } from '../../../src/features/eat/diaryRepository';
import { getCurrentTarget, type Target } from '../../../src/services/database/targets';
import { getTypedSetting } from '../../../src/services/database/settings';
import { nutritionTrend } from '../../../src/features/progress/trendMath';
import { NutritionGraph } from '../../../src/features/progress/TrendCharts';

export default function NutritionHistory() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [target, setTarget] = useState<Target | null>(null);
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState(false);
  const today = localDay(new Date());
  const load = useCallback(async () => {
    const day = localDay(new Date());
    const [diary, goal, hide] = await Promise.all([
      readDiaryRange(dayOffset(day, -7), dayOffset(day, -1)), getCurrentTarget(), getTypedSetting('hideNumbers')]);
    if (diary.ok) setEntries(diary.value); else setError(true);
    if (goal.ok) setTarget(goal.value);
    if (hide.ok) setHidden(hide.value);
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const week = nutritionTrend(entries, today, 7, target?.proteinG ?? null);
  const total = week.loggedDays;
  const avg = week.avgKcal;
  const text = (value: number) => bidiIsolate(language, formatNumber(language, Math.round(value)));
  return <Screen embedded>
    <Header mode="inline" title={t('eatI.history')} onBack={() => router.back()} />
    <View style={{ gap: theme.space[2] }}>
      <SectionHeader title={t('eatI.week')} />
      {total === 0 ? <>
        <Typography tone="secondary">{t('eatI.historyEmpty')}</Typography>
        <Typography tone="secondary" size="secondary">{t('trend.diarySource')}</Typography>
      </> : <Card>
        <Typography size="title">{hidden ? t('trend.hidden') :
          avg === null ? t('eatI.historyEmpty') : t('eatI.average', { count: text(avg), days: total })}</Typography>
        <Typography tone="secondary" size="secondary">{t('trend.diarySource')}</Typography>
        <NutritionGraph trend={week} target={target?.kcal ?? null} hidden={hidden} />
      </Card>}
    </View>
    <ListGroup>
      {week.days.map(day => <ListRow key={day.day} title={bidiIsolate(language, day.day)}
        detail={!day.logged ? t('eatI.notLogged') : hidden ? t('trend.hidden') : undefined}
        value={day.logged && !hidden && day.kcal !== null ? t('eatI.kcal', { count: text(day.kcal) }) : undefined}
        onPress={() => router.push({ pathname: '/(tabs)/eat', params: { day: day.day } })} />)}
    </ListGroup>
    <Typography tone="secondary" size="secondary">{t('trend.gapsNote')}</Typography>
    {error && <Typography>{t('eatI.error')}</Typography>}
    <Button label={t('trend.openNutrition')} variant="plain" onPress={() => router.push('/(tabs)/progress/nutrition')} />
  </Screen>;
}
