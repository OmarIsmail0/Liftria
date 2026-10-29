import { Children, cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeProvider';
import { fontFamilyFor } from '../fonts';
import { useLanguage } from '../../i18n/LanguageProvider';
import { chevronPointsLeft } from '../../i18n/layout';
import { ChevronIcon } from './TabIcon';
import { AmbientBackdrop, AuroraCardDecoration, cardOuterGlow } from './VisualEffects';
import type { CardRim } from './contracts';
import { useEnterAnimation, usePressScale } from './Motion';

export type TypographySize = 'display' | 'title' | 'head' | 'metric-xl' | 'metric-l' |
  'metric-m' | 'body' | 'small' | 'label' | 'button';

export function Typography({ children, tone = 'primary', size = 'body', bold = false, lines }: {
  children: ReactNode; tone?: 'primary' | 'secondary' | 'tertiary'; size?: TypographySize; bold?: boolean;
  /** Cap the line count; the last line ends with an ellipsis. */
  lines?: number;
}) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const face = size === 'display' ? theme.type.display : size === 'title' ? theme.type.title :
    size === 'head' ? theme.type.head : size === 'metric-xl' ? theme.type.metric.xl :
    size === 'metric-l' ? theme.type.metric.l : size === 'metric-m' ? theme.type.metric.m :
    size === 'small' ? theme.type.small : size === 'label' ? theme.type.label :
    size === 'button' ? theme.type.button : bold ? theme.type.body.strong : theme.type.body;
  const metric = size === 'metric-xl' || size === 'metric-l' || size === 'metric-m';
  const arabic = language === 'ar';
  return <Text allowFontScaling numberOfLines={lines} ellipsizeMode="tail"
    textBreakStrategy="balanced" lineBreakStrategyIOS="standard" style={{
    fontFamily: fontFamilyFor(face.face, face.weight, arabic), fontSize: face.size, lineHeight: face.line,
    fontVariant: metric ? ['tabular-nums'] : undefined,
    // Letter spacing breaks Arabic letter joining.
    letterSpacing: size === 'label' && !arabic ? theme.type.label.letterSpacingEm * theme.type.label.size : undefined,
    textTransform: size === 'label' ? 'uppercase' : undefined,
    color: theme.color.text[tone], flexShrink: 1, textAlign: 'auto',
  }}>{children}</Text>;
}

/** Fixed ambient background; no expensive live blur or animated glows. */
export function Screen({ children, scroll = true, padded = true, embedded = false }: {
  children: ReactNode; scroll?: boolean; padded?: boolean; embedded?: boolean;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const layout: ViewStyle = { flex: 1, paddingTop: insets.top, paddingBottom: embedded ? 0 : insets.bottom };
  const padding = padded ? theme.layout.gutter : 0;
  return <View style={[layout, { backgroundColor: embedded ? 'transparent' : theme.background }]}>
    {!embedded && theme.effectiveStyle === 'aurora' && <AmbientBackdrop theme={theme} />}
    {scroll
      ? <ScrollView contentContainerStyle={{ paddingHorizontal: padding, paddingVertical: theme.space[4], gap: theme.layout.cardGap }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      : <View style={{ flex: 1, paddingHorizontal: padding }}>{children}</View>}
  </View>;
}

export function Header({ title, subtitle, onBack, right }: {
  title: string; subtitle?: string; onBack?: () => void; right?: ReactNode;
}) {
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const press = usePressScale();
  const solid = theme.effectiveStyle === 'solid';
  // A 40dp filled disc inside the 48dp touch target. Solid (high contrast) keeps a 3:1 outline.
  const back = onBack && <Pressable onPress={onBack} onPressIn={press.onPressIn} onPressOut={press.onPressOut}
    accessibilityRole="button" accessibilityLabel={t('common.back')}
    style={{ width: theme.size.touch.min, height: theme.size.touch.min, justifyContent: 'center', alignItems: 'center',
      marginStart: -theme.space[1] }}>
    {({ pressed }) => <Animated.View style={[{ width: theme.space[10], height: theme.space[10],
      borderRadius: theme.radius.pill, justifyContent: 'center', alignItems: 'center',
      backgroundColor: theme.mode === 'light' && !solid
        ? (pressed ? theme.color.bg.raised : theme.glass.card)
        : (pressed ? theme.surface.hairline : theme.surface.control),
      borderWidth: theme.size.border.thin,
      borderColor: solid ? theme.controlOutline : theme.surface.hairline,
      boxShadow: theme.mode === 'light' && !solid ? theme.elevation.thumb : undefined }, press.style]}>
      <ChevronIcon left={chevronPointsLeft('back', isRTL)} color={theme.color.text.primary}
        size={theme.space[5]} strokeWidth={2.2} />
    </Animated.View>}
  </Pressable>;
  // At most two lines with an ellipsis, at full size.
  const titles = <View style={{ flex: 1, minWidth: 0, gap: theme.space[1] }}>
    <Typography size="title" lines={2}>{title}</Typography>
    {subtitle && <Typography tone="secondary" size="small" lines={2}>{subtitle}</Typography>}
  </View>;
  const row = { flexDirection: 'row', alignItems: 'center', gap: theme.space[3], minHeight: theme.size.touch.primary } as const;
  // Back and actions together leave the title too narrow ("Supers/et"), so the title gets
  // its own full-width line under them.
  if (back && right) return <View style={{ gap: theme.space[2] }}>
    <View style={row}>{back}<View style={{ flex: 1 }} />{right}</View>
    <View style={{ flexDirection: 'row' }}>{titles}</View>
  </View>;
  return <View style={row}>{back}{titles}{right}</View>;
}

export function Card({ children, rim = 'none', title, flat = false }: {
  children: ReactNode; rim?: CardRim; title?: string; flat?: boolean;
}) {
  const { theme } = useTheme();
  const aurora = theme.effectiveStyle === 'aurora';
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const entering = useEnterAnimation();
  const border = rim === 'none' ? theme.color.border.subtle : theme.color.domain[rim];
  return <Animated.View entering={entering} style={{ borderRadius: theme.radius.lg, ...cardOuterGlow(theme, rim, flat) }}>
    <View onLayout={event => {
      const { width, height } = event.nativeEvent.layout;
      setFrame(previous => previous.width === width && previous.height === height
        ? previous : { width, height });
    }} style={{
      backgroundColor: theme.cardFill, borderRadius: theme.radius.lg,
      borderWidth: aurora ? 0 : theme.size.border.thin,
      borderColor: border, overflow: 'hidden',
      padding: theme.space[4], gap: theme.space[3],
      ...(!aurora && !flat ? { elevation: theme.size.border.thin } : {}),
    }}>
      {aurora && <AuroraCardDecoration theme={theme} width={frame.width} height={frame.height} />}
      {title && <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[2] }}>
        {rim !== 'none' && <View style={{ width: theme.space[2], height: theme.space[2],
          borderRadius: theme.radius.pill, backgroundColor: border }} />}
        <Typography size="head">{title}</Typography>
      </View>}
      {withoutTrailingDivider(children)}
    </View>
  </Animated.View>;
}

/** Dividers belong between rows; the card's own edge closes the last one. */
function withoutTrailingDivider(children: ReactNode): ReactNode {
  const items = Children.toArray(children);
  const lastIndex = items.length - 1;
  const last = items[lastIndex];
  if (!isValidElement(last) || last.type !== ListRow) return children;
  items[lastIndex] = cloneElement(last as ReactElement<{ divider?: boolean }>, { divider: false });
  return items;
}

export function Banner({ title, message, variant = 'info' }: {
  title: string; message: string; variant?: 'offline'|'info'|'warning';
}) {
  const { theme } = useTheme();
  const tone = variant === 'warning' ? theme.color.status.warning : variant === 'offline' ? theme.color.text.tertiary : theme.color.domain.health;
  return <View accessibilityRole="alert" style={{
    minHeight: theme.size.touch.min, backgroundColor: theme.cardFill, borderColor: tone,
    borderWidth: theme.size.border.thin, borderRadius: theme.radius.md, padding: theme.space[3],
    flexDirection: 'row', gap: theme.space[3], alignItems: 'flex-start',
  }}>
    <Text importantForAccessibility="no" style={{ color: tone, fontSize: theme.type.head.size, fontFamily: fontFamilyFor('Figtree', '700') }}>{variant === 'offline' ? '○' : variant === 'warning' ? '!' : 'i'}</Text>
    <View style={{ flex: 1, gap: theme.space[1] }}>
      <Typography bold>{title}</Typography><Typography size="small" tone="secondary">{message}</Typography>
    </View>
  </View>;
}

export function ListRow({ title, detail, onPress, suffix, leading, accessibilityLabel, divider = true }: {
  title: string; detail?: string; onPress?: () => void; suffix?: ReactNode; leading?: ReactNode; accessibilityLabel?: string;
  divider?: boolean;
}) {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  return <Pressable onPress={onPress} disabled={!onPress} accessible={Boolean(onPress)}
    accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={accessibilityLabel ?? (detail ? `${title}. ${detail}` : title)}
    style={({ pressed }) => ({ minHeight: theme.size.touch.workout, flexDirection: 'row', alignItems: 'center',
      gap: theme.space[3], borderBottomWidth: divider ? 1 : 0, borderColor: theme.surface.hairline, paddingVertical: theme.space[2],
      backgroundColor: pressed ? theme.surface.pressed : 'transparent' })}>
    {leading}
    <View style={{ flex: 1, gap: theme.space[1] }}>
      <Typography bold>{title}</Typography>{detail && <Typography tone="secondary" size="small">{detail}</Typography>}
    </View>
    {suffix ?? (onPress ? <ChevronIcon left={chevronPointsLeft('forward', isRTL)}
      color={theme.color.text.secondary} size={theme.space[4]} strokeWidth={theme.size.iconStroke} /> : null)}
  </Pressable>;
}

export function EmptyState({ title, description, action }: {
  title: string; description: string; action?: ReactNode;
}) {
  const { theme } = useTheme();
  return <View style={{ alignItems: 'center', gap: theme.space[3], paddingVertical: theme.space[6] }}>
    <Typography size="head">{title}</Typography>
    <Typography tone="secondary">{description}</Typography>
    {action}
  </View>;
}

export function Skeleton({ height, width = '100%' }: { height?: number; width?: ViewStyle['width'] }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  return <View accessibilityLabel={t('common.loading')} accessibilityRole="progressbar" style={{
    width, height: height ?? theme.size.touch.min, backgroundColor: theme.color.bg.raised,
    borderColor: theme.color.border.subtle, borderWidth: theme.size.border.thin, borderRadius: theme.radius.md,
  }} />;
}
