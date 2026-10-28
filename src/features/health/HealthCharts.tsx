import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useTheme } from '../../design/ThemeProvider';
import { Typography } from '../../design/primitives';
import { bidiIsolate, formatNumber, pluralForm, type AppLanguage, type TranslationKey } from '../../i18n';
import { useLanguage } from '../../i18n/LanguageProvider';
import type { HeartSample, HourlySeries } from './presentation';

type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

function chartSource(t: Translate, label: string): string {
  if (label === 'Phone') return t('healthMetric.sourcePhone');
  if (label === 'Unknown source') return t('healthMetric.sourceUnknown');
  if (label === 'Samsung Health') return t('healthChart.samsung');
  return label;
}

function countKey(language: AppLanguage, base: string, count: number): TranslationKey {
  return `${base}.${pluralForm(language, count)}` as TranslationKey;
}

/** Read-only chart: each provider gets its own plot, never a blended sum. */
export function StepsChart({ series, period }: { series: HourlySeries[]; period: 'day' | 'week' }) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const highest = Math.max(1, ...series.flatMap(v => v.values));
  if (!series.length) return <Typography tone="secondary">{t('healthChart.noSteps')}</Typography>;
  return <View style={{ gap: theme.space[4] }}>
    {series.map(source => {
      const total = source.values.reduce((sum, value) => sum + value, 0);
      const sourceName = chartSource(t, source.label);
      return <View key={source.origin} style={{ gap: theme.space[2] }}
      accessible accessibilityRole="image"
      accessibilityLabel={t(countKey(language, period === 'day' ? 'healthChart.stepsHourly' : 'healthChart.stepsDaily', total), {
        source: sourceName, count: total,
      })}>
      <Typography size="small" bold>{t('healthChart.separate', { source: sourceName })}</Typography>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end',
        minHeight: 112, gap: theme.space[1] }}>
        {source.values.map((value, hour) =>
          <View key={hour} style={{ flex: 1, minWidth: 1,
            height: Math.max(2, Math.round(value / highest * 108)),
            backgroundColor: theme.color.domain.health, opacity: value === 0 ? 0.15 : 0.95,
            borderRadius: theme.radius.sm }} />)}
      </View>
      <Typography tone="secondary" size="small">{period === 'day'
        ? t('healthChart.dayAxis')
        : t(countKey(language, 'healthChart.weekAxis', 7), { count: 7 })}</Typography>
    </View>;
    })}
  </View>;
}

export function HeartRateChart({ samples }: { samples: HeartSample[] }) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const [width, setWidth] = useState(300);
  if (!samples.length) return <Typography tone="secondary">{t('healthChart.noHeart')}</Typography>;
  const earliest = Date.parse(samples[0]!.time);
  const latest = Date.parse(samples[samples.length - 1]!.time);
  const min = Math.min(...samples.map(p => p.bpm)) - 4;
  const max = Math.max(...samples.map(p => p.bpm)) + 4;
  const plotWidth = Math.max(1, width);
  return <View onLayout={e => setWidth(e.nativeEvent.layout.width)}
    style={{ minHeight: 154, gap: theme.space[2] }}
    accessible accessibilityRole="image"
    accessibilityLabel={t(countKey(language, 'healthChart.heartA11y', samples.length), {
      count: samples.length,
      min: bidiIsolate(language, formatNumber(language, Math.round(min + 4))),
      max: bidiIsolate(language, formatNumber(language, Math.round(max - 4))),
    })}>
    <Svg width={plotWidth} height={126} viewBox={`0 0 ${plotWidth} 126`}>
      <Line x1={4} y1={122} x2={plotWidth - 4} y2={122}
        stroke={theme.color.border.subtle} strokeWidth={1} />
      {samples.map((point, i) => {
        const time = Date.parse(point.time);
        const x = 8 + (plotWidth - 16) * (latest === earliest ? 0.5 : (time - earliest) / (latest - earliest));
        const y = 8 + 108 * (1 - (point.bpm - min) / Math.max(1, max - min));
        return <Circle key={point.origin + ':' + point.time + ':' + i} cx={x} cy={y}
          r={3.5} stroke={theme.color.domain.health}
          fill={theme.color.domain.health} />;
      })}
    </Svg>
    <Typography tone="secondary" size="small">{t('healthChart.heartCaption')}</Typography>
  </View>;
}
