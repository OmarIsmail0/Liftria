import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useTheme } from '../../design/ThemeProvider';
import { Typography } from '../../design/primitives';
import { useLanguage } from '../../i18n/LanguageProvider';
import { heartChartLabel, heartChartNote, noHeartText, noStepsText, stepsAxisText, stepsChartLabel,
  stepsSourceTitle } from './chartCopy';
import type { HeartSample, HourlySeries } from './presentation';

/** Read-only chart: each provider gets its own plot, never a blended sum. */
export function StepsChart({ series, period }: { series: HourlySeries[]; period: 'day' | 'week' }) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const highest = Math.max(1, ...series.flatMap(v => v.values));
  if (!series.length) return <Typography tone="secondary">{noStepsText(language)}</Typography>;
  return <View style={{ gap: theme.space[4] }}>
    {series.map(source => <View key={source.origin} style={{ gap: theme.space[2] }}
      accessible accessibilityRole="image"
      accessibilityLabel={stepsChartLabel(language, source.label, period,
        source.values.reduce((sum, value) => sum + value, 0))}>
      <Typography size="small" bold>{stepsSourceTitle(language, source.label)}</Typography>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end',
        minHeight: 112, gap: theme.space[1] }}>
        {source.values.map((value, hour) =>
          <View key={hour} style={{ flex: 1, minWidth: 1,
            height: Math.max(2, Math.round(value / highest * 108)),
            backgroundColor: theme.color.domain.health, opacity: value === 0 ? 0.15 : 0.95,
            borderRadius: theme.radius.sm }} />)}
      </View>
      <Typography tone="secondary" size="small">{stepsAxisText(language, period, source.values.length)}</Typography>
    </View>)}
  </View>;
}

export function HeartRateChart({ samples }: { samples: HeartSample[] }) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const [width, setWidth] = useState(300);
  if (!samples.length) return <Typography tone="secondary">{noHeartText(language)}</Typography>;
  const earliest = Date.parse(samples[0]!.time);
  const latest = Date.parse(samples[samples.length - 1]!.time);
  const min = Math.min(...samples.map(p => p.bpm)) - 4;
  const max = Math.max(...samples.map(p => p.bpm)) + 4;
  const plotWidth = Math.max(1, width);
  return <View onLayout={e => setWidth(e.nativeEvent.layout.width)}
    style={{ minHeight: 154, gap: theme.space[2] }}
    accessible accessibilityRole="image"
    accessibilityLabel={heartChartLabel(language, samples.length, Math.round(min + 4), Math.round(max - 4))}>
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
    <Typography tone="secondary" size="small">{heartChartNote(language)}</Typography>
  </View>;
}
