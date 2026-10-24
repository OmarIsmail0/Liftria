import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useTheme } from '../../design/ThemeProvider';
import { Typography } from '../../design/primitives';
import type { HeartSample, HourlySeries } from './presentation';

/** Read-only chart: each provider gets its own plot, never a blended sum. */
export function StepsChart({ series, period }: { series: HourlySeries[]; period: 'day' | 'week' }) {
  const { theme } = useTheme();
  const highest = Math.max(1, ...series.flatMap(v => v.values));
  if (!series.length) return <Typography tone="secondary">No source-backed steps to plot.</Typography>;
  return <View style={{ gap: theme.space[4] }}>
    {series.map(source => <View key={source.origin} style={{ gap: theme.space[2] }}
      accessible accessibilityRole="image"
      accessibilityLabel={`${source.label}, ${period === 'day' ? 'hourly' : 'daily'} steps: ${source.values.reduce((sum, value) => sum + value, 0)} in charted intervals`}>
      <Typography size="small" bold>{source.label} · separate source</Typography>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end',
        minHeight: 112, gap: theme.space[1] }}>
        {source.values.map((value, hour) =>
          <View key={hour} style={{ flex: 1, minWidth: 1,
            height: Math.max(2, Math.round(value / highest * 108)),
            backgroundColor: theme.color.domain.health, opacity: value === 0 ? 0.15 : 0.95,
            borderRadius: theme.radius.sm }} />)}
      </View>
      <Typography tone="secondary" size="small">{period === 'day'
        ? 'Midnight · 6 AM · Noon · 6 PM · Midnight'
        : '7 days ago · Today'}</Typography>
    </View>)}
  </View>;
}

export function HeartRateChart({ samples }: { samples: HeartSample[] }) {
  const { theme } = useTheme();
  const [width, setWidth] = useState(300);
  if (!samples.length) return <Typography tone="secondary">No heart-rate samples to plot.</Typography>;
  const earliest = Date.parse(samples[0]!.time);
  const latest = Date.parse(samples[samples.length - 1]!.time);
  const min = Math.min(...samples.map(p => p.bpm)) - 4;
  const max = Math.max(...samples.map(p => p.bpm)) + 4;
  const plotWidth = Math.max(1, width);
  return <View onLayout={e => setWidth(e.nativeEvent.layout.width)}
    style={{ minHeight: 154, gap: theme.space[2] }}
    accessible accessibilityRole="image"
    accessibilityLabel={`${samples.length} heart-rate samples. Range ${Math.round(min + 4)} to ${Math.round(max - 4)} beats per minute. App origins do not verify devices.`}>
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
    <Typography tone="secondary" size="small">Samples, not an averaged resting heart rate. Device is unverified.</Typography>
  </View>;
}
