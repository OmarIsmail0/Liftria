import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeProvider';
import type { CardRim } from './contracts';

export function Typography({ children, tone = 'primary', size = 'body', bold = false }:{
  children: ReactNode; tone?: 'primary' | 'secondary' | 'tertiary'; size?: 'body'|'small'|'title'|'head'|'label'; bold?: boolean;
}) {
  const { theme } = useTheme();
  const face = size === 'small' ? theme.type.small : size === 'label' ? theme.type.label :
    size === 'title' ? theme.type.title : size === 'head' ? theme.type.head :
      bold ? theme.type.body.strong : theme.type.body;
  return <Text allowFontScaling style={{
    fontSize: face.size, lineHeight: face.line, fontWeight: face.weight as '400' | '600' | '700',
    color: theme.color.text[tone], flexShrink: 1, textAlign: 'auto',
  }}>{children}</Text>;
}

/** Fixed ambient background; no expensive live blur or animated glows. */
export function Screen({ children, scroll = true, padded = true }: {
  children: ReactNode; scroll?: boolean; padded?: boolean;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const layout: ViewStyle = { flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom };
  const padding = padded ? theme.layout.gutter : 0;
  return <View style={[layout, { backgroundColor: theme.background }]}>
    {theme.effectiveStyle === 'aurora' && <View pointerEvents="none" importantForAccessibility="no-hide-descendants"
      style={{ ...({ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0 } as ViewStyle), overflow: 'hidden' }}>
      <View style={{ position: 'absolute', width: theme.orbSize.today, height: theme.orbSize.today,
        borderRadius: theme.radius.pill, backgroundColor: theme.ambient.train, top: -theme.orbSize.compact / 2, start: -theme.orbSize.compact / 2 }} />
      <View style={{ position: 'absolute', width: theme.orbSize.today, height: theme.orbSize.today,
        borderRadius: theme.radius.pill, backgroundColor: theme.ambient.hiku, top: theme.space[10], end: -theme.orbSize.compact / 2 }} />
      <View style={{ position: 'absolute', width: theme.orbSize.today, height: theme.orbSize.today,
        borderRadius: theme.radius.pill, backgroundColor: theme.ambient.health, bottom: theme.space[8], start: -theme.orbSize.compact / 2 }} />
      <View style={{ position: 'absolute', width: theme.orbSize.today, height: theme.orbSize.today,
        borderRadius: theme.radius.pill, backgroundColor: theme.ambient.eat, bottom: -theme.orbSize.compact / 2, end: -theme.orbSize.compact / 2 }} />
    </View>}
    {scroll
      ? <ScrollView contentContainerStyle={{ paddingHorizontal: padding, paddingVertical: theme.space[4], gap: theme.layout.cardGap }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      : <View style={{ flex: 1, paddingHorizontal: padding }}>{children}</View>}
  </View>;
}

export function Header({ title, subtitle, onBack, right }: {
  title: string; subtitle?: string; onBack?: () => void; right?: ReactNode;
}) {
  const { theme } = useTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[3], minHeight: theme.size.touch.primary }}>
    {onBack && <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back"
      style={{ minWidth: theme.size.touch.min, minHeight: theme.size.touch.min, justifyContent: 'center', alignItems: 'center',
        borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.controlOutline }}>
      <Typography>‹</Typography>
    </Pressable>}
    <View style={{ flex: 1, gap: theme.space[1] }}>
      <Typography size="title">{title}</Typography>
      {subtitle && <Typography tone="secondary" size="small">{subtitle}</Typography>}
    </View>
    {right}
  </View>;
}

export function Card({ children, rim = 'none', title, flat = false }: {
  children: ReactNode; rim?: CardRim; title?: string; flat?: boolean;
}) {
  const { theme } = useTheme();
  const border = rim === 'none' ? (theme.effectiveStyle === 'aurora' ? theme.glass.border : theme.color.border.subtle) : theme.color.domain[rim];
  return <View style={{
    backgroundColor: theme.cardFill, borderColor: border,
    borderWidth: rim === 'none' ? 1 : 1.5, borderRadius: theme.radius.lg,
    padding: theme.space[4], gap: theme.space[3],
    ...(flat ? {} : { elevation: 1 }),
  }}>
    {title && <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[2] }}>
      {rim !== 'none' && <View style={{ width: theme.space[2], height: theme.space[2], borderRadius: theme.radius.pill, backgroundColor: border }} />}
      <Typography size="head">{title}</Typography>
    </View>}
    {children}
  </View>;
}

export function Banner({ title, message, variant = 'info' }: {
  title: string; message: string; variant?: 'offline'|'info'|'warning';
}) {
  const { theme } = useTheme();
  const tone = variant === 'warning' ? theme.color.status.warning : variant === 'offline' ? theme.color.text.tertiary : theme.color.domain.health;
  return <View accessibilityRole="alert" style={{
    minHeight: theme.size.touch.min, backgroundColor: theme.cardFill, borderColor: tone,
    borderWidth: 1, borderRadius: theme.radius.md, padding: theme.space[3],
    flexDirection: 'row', gap: theme.space[3], alignItems: 'flex-start',
  }}>
    <Text importantForAccessibility="no" style={{ color: tone, fontSize: theme.type.head.size }}>{variant === 'offline' ? '○' : variant === 'warning' ? '!' : 'i'}</Text>
    <View style={{ flex: 1, gap: theme.space[1] }}>
      <Typography bold>{title}</Typography><Typography size="small" tone="secondary">{message}</Typography>
    </View>
  </View>;
}

export function ListRow({ title, detail, onPress, suffix, accessibilityLabel }: {
  title: string; detail?: string; onPress?: () => void; suffix?: ReactNode; accessibilityLabel?: string;
}) {
  const { theme } = useTheme();
  return <Pressable onPress={onPress} disabled={!onPress} accessible={Boolean(onPress)}
    accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={accessibilityLabel ?? (detail ? `${title}. ${detail}` : title)}
    style={{ minHeight: theme.size.touch.workout, flexDirection: 'row', alignItems: 'center',
      gap: theme.space[3], borderBottomWidth: 1, borderColor: theme.color.border.subtle, paddingVertical: theme.space[2] }}>
    <View style={{ flex: 1, gap: theme.space[1] }}>
      <Typography bold>{title}</Typography>{detail && <Typography tone="secondary" size="small">{detail}</Typography>}
    </View>
    {suffix ?? (onPress ? <Typography tone="secondary">›</Typography> : null)}
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
  return <View accessibilityLabel="Loading" accessibilityRole="progressbar" style={{
    width, height: height ?? theme.size.touch.min, backgroundColor: theme.color.bg.raised,
    borderColor: theme.color.border.subtle, borderWidth: 1, borderRadius: theme.radius.md,
  }} />;
}
