import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
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
            height: value > 0 ? Math.max(2, Math.round(value / highest * 108)) : 0,
            backgroundColor: theme.color.accent,
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
  const plot = samples.map((point, i) => {
    const time = Date.parse(point.time);
    const x = 8 + (plotWidth - 16) * (latest === earliest ? 0.5 : (time - earliest) / (latest - earliest));
    const y = 8 + 108 * (1 - (point.bpm - min) / Math.max(1, max - min));
    return { key: point.origin + ':' + point.time + ':' + i, x, y };
  });
  const line = plot.map((point, i) => (i === 0 ? 'M' : 'L') + point.x + ' ' + point.y).join(' ');
  return <View onLayout={e => setWidth(e.nativeEvent.layout.width)}
    style={{ minHeight: 154, gap: theme.space[2] }}
    accessible accessibilityRole="image"
    accessibilityLabel={heartChartLabel(language, samples.length, Math.round(min + 4), Math.round(max - 4))}>
    <Svg width={plotWidth} height={126} viewBox={`0 0 ${plotWidth} 126`}>
      {[1, 2, 3].map(step => {
        const y = 8 + 108 * step / 3;
        return <Line key={step} x1={4} y1={y} x2={plotWidth - 4} y2={y}
          stroke={theme.color.border.subtle} strokeWidth={1} />;
      })}
      {plot.length > 1 && <Path d={line} fill="none" stroke={theme.color.accent}
        strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
      {plot.map(point => <Circle key={point.key} cx={point.x} cy={point.y}
        r={3.5} fill={theme.color.accent} />)}
    </Svg>
    <Typography tone="secondary" size="small">{heartChartNote(language)}</Typography>
  </View>;
}
