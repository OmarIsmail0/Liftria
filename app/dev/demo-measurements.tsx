import { router } from 'expo-router';
import { ScrollView } from 'react-native';
import { useTheme } from '../../src/design/ThemeProvider';
import { Button, Card, Header, ListRow, Screen, Typography } from '../../src/design/primitives';
import { bidiIsolate, formatDate, type TranslationKey } from '../../src/i18n';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { dayOffset, localDay } from '../../src/features/eat/foodCatalog';
import { chartLabel, summaryDetail } from '../../src/features/progress/BodyMeasurements';
import { MeasurementGraph } from '../../src/features/progress/TrendCharts';
import {
  formatMeasurement, formatShownLength, fromCm, lengthUnitForWeight, summarizeMeasurements,
  type BodyMeasurement, type MeasurementSite,
} from '../../src/features/progress/measurements';

/** Screenshot URL: liftria://dev/demo-measurements?auto=1
 * These rows exist only in this screen. Opening it, with or without auto=1, writes nothing. */
function atDaysAgo(days: number): string {
  const day = dayOffset(localDay(new Date()), -days);
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year ?? 2026, (month ?? 1) - 1, date ?? 1, 12).toISOString();
}

function sample(site: MeasurementSite, cm: number, daysAgo: number, id: string): BodyMeasurement {
  return { id, site, cm, measuredAt: atDaysAgo(daysAgo), note: null, source: 'liftria' };
}

const SAMPLE: BodyMeasurement[] = [
  sample('waist', 86, 21, 'demo-waist-1'),
  sample('waist', 84.2, 14, 'demo-waist-2'),
  sample('waist', 83, 7, 'demo-waist-3'),
  sample('waist', 82.4, 1, 'demo-waist-4'),
  sample('hips', 98, 21, 'demo-hips-1'),
  sample('chest', 102, 14, 'demo-chest-1'),
  sample('chest', 101, 7, 'demo-chest-2'),
  sample('arm_right', 36.5, 7, 'demo-arm-1'),
];

function siteKey(site: MeasurementSite): TranslationKey {
  return `measure.site.${site}` as TranslationKey;
}

export default function DemoMeasurements() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const unit = lengthUnitForWeight('kg');
  const summaries = summarizeMeasurements(SAMPLE);
  const waist = SAMPLE.filter(row => row.site === 'waist')
    .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt));
  return <Screen scroll={false}>
    <ScrollView keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: theme.layout.cardGap, paddingVertical: theme.space[3] }}>
      <Header title={t('measure.demoTitle')} onBack={() => router.back()} />
      <Typography tone="secondary">{t('measure.demoNotice')}</Typography>
      <Card rim="health" title={t('measure.title')}>
        {summaries.map(item => <ListRow key={item.site} title={t(siteKey(item.site))}
          detail={summaryDetail(t, language, item, unit, false)}
          onPress={() => undefined} />)}
        <Button label={t('measure.add')} variant="secondary" onPress={() => undefined} />
      </Card>
      <Card rim="health" title={t(siteKey('waist'))}>
        <MeasurementGraph
          points={waist.map(row => ({ at: row.measuredAt, value: fromCm(row.cm, unit) }))}
          hidden={false}
          accessibilityLabel={chartLabel(t, language, waist.length, false)}
          valueLabel={value => formatShownLength(value, unit, language)} />
        {waist.map(row => <ListRow key={row.id}
          title={formatMeasurement(row.cm, unit, language)}
          detail={bidiIsolate(language, formatDate(language, new Date(row.measuredAt), {
            day: 'numeric', month: 'short', year: 'numeric',
          }))}
          onPress={() => undefined} />)}
      </Card>
    </ScrollView>
  </Screen>;
}
