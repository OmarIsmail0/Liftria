import { memo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { LiftriaTheme } from '../tokens';
import type { CardRim } from './contracts';

/** Percentages in the prototype are relative to screen width/height. */
export const ambientGlows = [
  { key: 'train', cx: 12, cy: 6, rx: 55, ry: 32 },
  { key: 'hiku', cx: 98, cy: 32, rx: 60, ry: 34 },
  { key: 'health', cx: 2, cy: 72, rx: 60, ry: 34 },
  { key: 'eat', cx: 92, cy: 96, rx: 55, ry: 30 },
] as const;

/** All RGB values come from the theme. No raw hard-coded shadow colors. */
export function withOpacity(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  return 'rgba(' + parseInt(clean.slice(0, 2), 16) + ',' +
    parseInt(clean.slice(2, 4), 16) + ',' + parseInt(clean.slice(4, 6), 16) +
    ',' + alpha + ')';
}

export const AmbientBackdrop = memo(function AmbientBackdrop({ theme }: { theme: LiftriaTheme }) {
  return <Svg pointerEvents="none" importantForAccessibility="no-hide-descendants"
    style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
    <Defs>
      {ambientGlows.map(glow => <RadialGradient key={glow.key} id={'ambient-' + glow.key}
        cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
        <Stop offset="0%" stopColor={theme.ambient[glow.key]} stopOpacity={1} />
        <Stop offset={(theme.visual.ambientFade * 100) + '%'} stopColor={theme.ambient[glow.key]} stopOpacity={0} />
        <Stop offset="100%" stopColor={theme.ambient[glow.key]} stopOpacity={0} />
      </RadialGradient>)}
    </Defs>
    <Rect width="100" height="100" fill={theme.aurora.base} />
    {ambientGlows.map(glow => <Ellipse key={glow.key} cx={glow.cx} cy={glow.cy}
      rx={glow.rx} ry={glow.ry} fill={'url(#ambient-' + glow.key + ')'} />)}
  </Svg>;
});

export function cardOuterGlow(theme: LiftriaTheme, rim: CardRim, flat: boolean): ViewStyle {
  if (theme.effectiveStyle !== 'aurora' || rim === 'none' || flat) return {};
  // RN 0.86 New Architecture boxShadow; no live blur or workflow changes.
  return { boxShadow: '0px 0px ' + theme.visual.cardGlowBlur + 'px ' +
    withOpacity(theme.color.domain[rim], theme.rim.glow) };
}

/** Sheen and 1.2dp gradient rim. Measured dimensions keep the rounded stroke inside bounds. */
export function AuroraCardDecoration({ theme, rim, width, height }: {
  theme: LiftriaTheme; rim: CardRim; width: number; height: number;
}) {
  if (width <= 0 || height <= 0) return null;
  const edge = theme.size.border.rim;
  const edgeColor = rim === 'none' ? theme.glass.border : theme.color.domain[rim];
  return <Svg pointerEvents="none" importantForAccessibility="no-hide-descendants"
    style={StyleSheet.absoluteFill} width={width} height={height}>
    <Defs>
      <LinearGradient id="card-sheen" x1="63%" y1="0%" x2="37%" y2="100%">
        <Stop offset="0%" stopColor={theme.glass.highlight} />
        <Stop offset="45%" stopColor={theme.glass.highlight} stopOpacity={0} />
        <Stop offset="100%" stopColor={theme.glass.highlight} stopOpacity={0} />
      </LinearGradient>
      <LinearGradient id="card-rim" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor={edgeColor} stopOpacity={1} />
        <Stop offset="30%" stopColor={edgeColor} stopOpacity={theme.rim.strength} />
        <Stop offset="55%" stopColor={edgeColor} stopOpacity={0} />
        <Stop offset="100%" stopColor={edgeColor} stopOpacity={0.08} />
      </LinearGradient>
    </Defs>
    <Rect width={width} height={height} rx={theme.radius.lg} fill="url(#card-sheen)" />
    <Rect x={edge / 2} y={edge / 2} width={Math.max(0, width - edge)}
      height={Math.max(0, height - edge)} rx={theme.radius.lg - edge / 2}
      fill="none" strokeWidth={edge} stroke="url(#card-rim)" />
  </Svg>;
}

/** The sole gradient button; SVG works on SDK 57 / RN 0.86. */
export function TrainGradient({ theme }: { theme: LiftriaTheme }) {
  return <Svg pointerEvents="none" importantForAccessibility="no-hide-descendants"
    style={StyleSheet.absoluteFill} width="100%" height="100%">
    <Defs>
      <LinearGradient id="train-button" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor={theme.color.domain.train} />
        <Stop offset="100%" stopColor={theme.train.gradEnd} />
      </LinearGradient>
    </Defs>
    <Rect width="100%" height="100%" rx={theme.radius.pill} fill="url(#train-button)" />
  </Svg>;
}

export function ringGeometry(size: number, stroke: number, progress: number) {
  const radius = size / 2 - stroke / 2 - stroke;
  const circumference = 2 * Math.PI * radius;
  return { radius, circumference, offset: circumference * (1 - Math.min(1, Math.max(0, progress))) };
}

/** A radial sphere, highlight and ONE continuous progress arc (no tick segments). */
export function OrbArtwork({ theme, size, progress }: {
  theme: LiftriaTheme; size: number; progress: number | null;
}) {
  const empty = progress === null;
  const diameter = size - theme.space[10];
  const half = diameter / 2;
  const center = size / 2;
  const arc = ringGeometry(size, theme.orbSize.ringStroke, progress ?? 0);
  const sphereShadow: ViewStyle = empty ? {} : {
    boxShadow: [
      { offsetX: 0, offsetY: 0, blurRadius: theme.visual.orbGlowInnerBlur, spreadDistance: 0,
        color: withOpacity(theme.orb[2], 0.45) },
      { offsetX: 0, offsetY: 0, blurRadius: theme.visual.orbGlowOuterBlur, spreadDistance: 0,
        color: withOpacity(theme.orb[3], 0.35) },
    ],
  };
  return <View pointerEvents="none" importantForAccessibility="no-hide-descendants"
    style={{ position: 'absolute', width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={[{ width: diameter, height: diameter, borderRadius: theme.radius.pill }, sphereShadow]}>
      <Svg width={diameter} height={diameter}>
        <Defs>
          <RadialGradient id="sphere" cx="50%" cy="62%" rx="65%" ry="65%" fx="50%" fy="62%">
            <Stop offset="0%" stopColor={theme.orb[1]} />
            <Stop offset="46%" stopColor={theme.orb[2]} />
            <Stop offset="100%" stopColor={theme.orb[3]} />
          </RadialGradient>
          <RadialGradient id="orb-highlight" cx="34%" cy="28%" rx="50%" ry="50%" fx="34%" fy="28%">
            <Stop offset="0%" stopColor={theme.orb.highlight} stopOpacity={theme.visual.orbHighlightOpacity} />
            <Stop offset={(theme.visual.orbHighlightFade * 100) + '%'}
              stopColor={theme.orb.highlight} stopOpacity={0} />
            <Stop offset="100%" stopColor={theme.orb.highlight} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={half} cy={half} r={half - (empty ? theme.size.border.thin : 0)}
          fill={empty ? theme.glass.card : 'url(#sphere)'}
          stroke={empty ? theme.glass.border : 'none'} strokeWidth={empty ? theme.size.border.thin : 0} />
        <Circle cx={half} cy={half} r={half} fill="url(#orb-highlight)" />
      </Svg>
    </View>
    {!empty && <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      <Circle cx={center} cy={center} r={arc.radius} stroke={theme.color.track}
        strokeWidth={theme.orbSize.ringStroke} fill="none" />
      <Circle cx={center} cy={center} r={arc.radius} stroke={theme.color.domain.eat}
        strokeWidth={theme.orbSize.ringStroke} fill="none" strokeLinecap="round"
        strokeDasharray={arc.circumference + ' ' + arc.circumference}
        strokeDashoffset={arc.offset} transform={'rotate(-90 ' + center + ' ' + center + ')'} />
    </Svg>}
  </View>;
}
