import { Children, cloneElement, createContext, isValidElement, useContext, type ReactElement, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, Text, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeProvider';
import { useLanguage } from '../../i18n/LanguageProvider';
import { chevronPointsLeft } from '../../i18n/layout';
import { ChevronIcon } from './TabIcon';
import type { CardRim } from './contracts';
import { useEnterAnimation, usePressScale } from './Motion';

export type TypographySize = 'metric' | 'largeTitle' | 'title' | 'body' | 'secondary' | 'caption'
  | 'display' | 'head' | 'metric-xl' | 'metric-l' | 'metric-m' | 'small' | 'label' | 'button';

const ROLE = {
  metric: 'metric', largeTitle: 'largeTitle', title: 'title', body: 'body', secondary: 'secondary', caption: 'caption',
  display: 'largeTitle', head: 'title', 'metric-xl': 'metric', 'metric-l': 'title', 'metric-m': 'title',
  small: 'secondary', label: 'caption', button: 'button',
} as const;

type Role = typeof ROLE[TypographySize];

export function Typography({ children, tone = 'primary', size = 'body', bold = false, numeric = false, lines, header = false, maxScale }: {
  children: ReactNode; tone?: 'primary' | 'secondary' | 'tertiary'; size?: TypographySize; bold?: boolean;
  /** Fixed-width digits for values. Metric sizes already use them. */
  numeric?: boolean;
  /** Cap the line count; the last line ends with an ellipsis. */
  lines?: number;
  /** Announce as a heading to screen readers. */
  header?: boolean;
  /** Cap on system font scaling, only where a fixed table would break. Omit so text can grow. */
  maxScale?: number;
}) {
  const { theme } = useTheme();
  const role: Role = ROLE[size];
  const spec = role === 'metric' ? theme.type.metric.xl
    : role === 'largeTitle' ? theme.type.largeTitle
    : role === 'title' ? theme.type.title
    : role === 'secondary' ? theme.type.secondary
    : role === 'caption' ? theme.type.caption
    : role === 'button' ? theme.type.button
    : bold ? theme.type.body.strong : theme.type.body;
  const weight = bold && spec.weight === '400' ? '600' : spec.weight;
  const tabular = numeric || role === 'metric';
  return <Text allowFontScaling maxFontSizeMultiplier={maxScale} accessibilityRole={header ? 'header' : undefined}
    numberOfLines={lines} ellipsizeMode="tail"
    textBreakStrategy="balanced" lineBreakStrategyIOS="standard" style={{
    fontSize: spec.size, lineHeight: spec.line, fontWeight: weight,
    fontVariant: tabular ? ['tabular-nums'] : undefined,
    color: theme.color.text[tone], flexShrink: 1, textAlign: 'auto',
  }}>{children}</Text>;
}

/** Page background. Each screen paints it, so a push never shows the screen underneath. */
export function Screen({ children, scroll = true, padded = true, embedded = false, safeBottom = false }: {
  children: ReactNode; scroll?: boolean; padded?: boolean; embedded?: boolean; safeBottom?: boolean;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  // `embedded` skips the bottom inset because the tab bar already pads for the system bar.
  // `safeBottom` puts that inset back when the tab bar is hidden, on Android and iPhone.
  const layout: ViewStyle = { flex: 1, paddingTop: insets.top, paddingBottom: embedded && !safeBottom ? 0 : insets.bottom };
  const padding = padded ? theme.layout.gutter : 0;
  // One shared reading width: on a tablet or a phone in landscape content centres instead of stretching edge to edge.
  const column: ViewStyle = { width: '100%', maxWidth: theme.layout.maxContentWidth, alignSelf: 'center' };
  return <View style={[layout, { backgroundColor: theme.background }]}>
    {scroll
      ? <ScrollView automaticallyAdjustKeyboardInsets={Platform.OS==='ios'} contentContainerStyle={{ ...column, paddingHorizontal: padding, paddingVertical: theme.space[4], gap: theme.layout.cardGap }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      : <View style={{ ...column, flex: 1, paddingHorizontal: padding }}>{children}</View>}
  </View>;
}

export function Header({ title, subtitle, onBack, right, mode }: {
  title: string; subtitle?: string; onBack?: () => void; right?: ReactNode;
  /** Large titles for tab screens. Inline titles for pushed screens. Defaults from whether there is a back control. */
  mode?: 'large' | 'inline';
}) {
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const press = usePressScale();
  const resolved = mode ?? (onBack ? 'inline' : 'large');
  const back = onBack ? <Pressable onPress={onBack} onPressIn={press.onPressIn} onPressOut={press.onPressOut}
    accessibilityRole="button" accessibilityLabel={t('common.back')}
    style={{ width: theme.size.touch.min, height: theme.size.touch.min, justifyContent: 'center', alignItems: 'center',
      marginStart: -theme.space[2] }}>
    {({ pressed }) => <Animated.View style={[{ opacity: pressed ? 0.6 : 1 }, press.style]}>
      <ChevronIcon left={chevronPointsLeft('back', isRTL)} color={theme.color.text.primary}
        size={theme.space[6]} strokeWidth={theme.size.iconStroke} />
    </Animated.View>}
  </Pressable> : null;
  const secondary = subtitle
    ? <Typography tone="secondary" size="secondary" lines={2}>{subtitle}</Typography>
    : null;
  if (resolved === 'inline') {
    return <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[2], minHeight: theme.size.touch.min }}>
      {back}
      <View style={{ flex: 1, minWidth: 0, gap: theme.space[1] }}>
        <Text allowFontScaling accessibilityRole="header" numberOfLines={2} style={{
          color: theme.color.text.primary, fontSize: theme.type.body.size, lineHeight: theme.type.body.line, fontWeight: '600',
        }}>{title}</Text>
        {secondary}
      </View>
      {right}
    </View>;
  }
  return <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.space[3], minHeight: theme.size.touch.min }}>
    {back}
    <View style={{ flex: 1, minWidth: 0, gap: theme.space[1] }}>
      <Typography size="largeTitle" lines={2} header>{title}</Typography>
      {secondary}
    </View>
    {right}
  </View>;
}

/** True inside a grouped list: rows pad horizontally. Virtualized lists provide it per row. */
export const ListInset = createContext(false);

export function Card({ children, title, rim = 'none', flat = false }: {
  children: ReactNode; rim?: CardRim; title?: string; flat?: boolean;
}) {
  const { theme } = useTheme();
  const entering = useEnterAnimation();
  void rim;
  void flat;
  return <Animated.View entering={entering} style={{
    backgroundColor: theme.cardFill, borderRadius: theme.radius.md, overflow: 'hidden',
    padding: theme.space[4], gap: theme.space[3],
  }}>
    {title ? <Typography size="title" header>{title}</Typography> : null}
    {withoutTrailingDivider(children)}
  </Animated.View>;
}

/** A surface that clips a stack of rows. Rows inside it inset themselves. */
export function ListGroup({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  return <View style={{ backgroundColor: theme.color.bg.surface, borderRadius: theme.radius.md, overflow: 'hidden' }}>
    <ListInset.Provider value={true}>{withoutTrailingDivider(children)}</ListInset.Provider>
  </View>;
}

/** Dividers belong between rows; the container's own edge closes the last one. */
function withoutTrailingDivider(children: ReactNode): ReactNode {
  const items = Children.toArray(children);
  const lastIndex = items.length - 1;
  const last = items[lastIndex];
  if (!isValidElement(last) || last.type !== ListRow) return children;
  items[lastIndex] = cloneElement(last as ReactElement<{ divider?: boolean }>, { divider: false });
  return items;
}

export function SectionHeader({ title, actionLabel, onAction }: {
  title: string; actionLabel?: string; onAction?: () => void;
}) {
  const { theme } = useTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: theme.space[8], paddingHorizontal: theme.space[1], gap: theme.space[3] }}>
    <Text allowFontScaling accessibilityRole="header" style={{ flexShrink: 1, color: theme.color.text.secondary,
      fontSize: theme.type.secondary.size, lineHeight: theme.type.secondary.line, fontWeight: '600' }}>{title}</Text>
    {actionLabel && onAction ? <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction}
      style={{ minHeight: theme.size.touch.min, justifyContent: 'center', paddingHorizontal: theme.space[1] }}>
      <Text allowFontScaling style={{ color: theme.color.accent, fontSize: theme.type.secondary.size,
        lineHeight: theme.type.secondary.line, fontWeight: '600' }}>{actionLabel}</Text>
    </Pressable> : null}
  </View>;
}

export function StatBlock({ value, label }: { value: string; label: string }) {
  const { theme } = useTheme();
  return <View style={{ alignItems: 'center', gap: theme.space[1] }}>
    <Text allowFontScaling style={{ color: theme.color.text.primary, fontSize: theme.type.title.size,
      lineHeight: theme.type.title.line, fontWeight: theme.type.title.weight, fontVariant: ['tabular-nums'],
      textAlign: 'center' }}>{value}</Text>
    <Typography size="caption" tone="secondary">{label}</Typography>
  </View>;
}

/** An 8 dp track. `progress` is a fraction from 0 to 1. */
export function ProgressBar({ progress, label }: { progress: number; label?: string }) {
  const { theme } = useTheme();
  const amount = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  return <View accessibilityRole="progressbar" accessibilityLabel={label}
    accessibilityValue={{ min: 0, max: 100, now: Math.round(amount * 100) }}
    style={{ height: 8, borderRadius: 4, backgroundColor: theme.color.bg.raised, overflow: 'hidden' }}>
    <View style={{ width: `${amount * 100}%`, height: 8, borderRadius: 4, backgroundColor: theme.color.accent }} />
  </View>;
}

export function Banner({ title, message, variant = 'info' }: {
  title: string; message: string; variant?: 'offline'|'info'|'warning';
}) {
  const { theme } = useTheme();
  const tone = variant === 'warning' ? theme.color.status.warning
    : variant === 'offline' ? theme.color.text.tertiary : theme.color.accent;
  return <View accessibilityRole="alert" style={{
    minHeight: theme.size.touch.min, backgroundColor: theme.color.bg.raised, borderRadius: theme.radius.md,
    padding: theme.space[3], flexDirection: 'row', gap: theme.space[3], alignItems: 'flex-start',
  }}>
    <Text importantForAccessibility="no" style={{ color: tone, fontSize: theme.type.body.size, fontWeight: '600' }}>{variant === 'offline' ? '○' : variant === 'warning' ? '!' : 'i'}</Text>
    <View style={{ flex: 1, gap: theme.space[1] }}>
      <Typography bold>{title}</Typography><Typography size="secondary" tone="secondary">{message}</Typography>
    </View>
  </View>;
}

export function ListRow({ title, detail, value, onPress, suffix, leading, accessibilityLabel, divider = true }: {
  title: string; detail?: string; value?: string; onPress?: () => void; suffix?: ReactNode; leading?: ReactNode;
  accessibilityLabel?: string; divider?: boolean;
}) {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  const inset = useContext(ListInset);
  const spoken = [title, detail, value].filter(Boolean).join('. ');
  return <Pressable onPress={onPress} disabled={!onPress} accessible={Boolean(onPress)}
    accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={accessibilityLabel ?? spoken}
    style={({ pressed }) => ({ minHeight: 52, flexDirection: 'row', alignItems: 'center',
      gap: theme.space[3], borderBottomWidth: divider ? 1 : 0, borderColor: theme.color.border.subtle,
      paddingVertical: theme.space[2], paddingHorizontal: inset ? theme.space[4] : 0,
      backgroundColor: pressed ? theme.surface.pressed : 'transparent' })}>
    {leading}
    <View style={{ flex: 1, gap: theme.space[1] }}>
      <Typography bold>{title}</Typography>{detail ? <Typography tone="secondary" size="secondary">{detail}</Typography> : null}
    </View>
    {value ? <Typography tone="secondary" size="secondary">{value}</Typography> : null}
    {suffix ?? (onPress ? <ChevronIcon left={chevronPointsLeft('forward', isRTL)}
      color={theme.color.text.tertiary} size={theme.space[4]} strokeWidth={theme.size.iconStroke} /> : null)}
  </Pressable>;
}

export function EmptyState({ title, description, action }: {
  title: string; description: string; action?: ReactNode;
}) {
  const { theme } = useTheme();
  return <View style={{ alignItems: 'center', gap: theme.space[2], paddingVertical: theme.space[4] }}>
    <Typography size="title">{title}</Typography>
    <Typography tone="secondary" size="secondary">{description}</Typography>
    {action}
  </View>;
}

export function Skeleton({ height, width = '100%' }: { height?: number; width?: ViewStyle['width'] }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  return <View accessibilityLabel={t('common.loading')} accessibilityRole="progressbar" style={{
    width, height: height ?? theme.size.touch.min, backgroundColor: theme.color.bg.raised,
    borderRadius: theme.radius.md,
  }} />;
}
