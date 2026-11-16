import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Typography } from '../../design/primitives';
import { ChevronIcon } from '../../design/primitives/TabIcon';
import { useTheme } from '../../design/ThemeProvider';
import { chevronPointsLeft } from '../../i18n/layout';
import { useLanguage } from '../../i18n/LanguageProvider';

/**
 * A list row that can take a long press. The shared ListRow only handles a tap,
 * and Train uses a hold for routine options and for deleting a history row.
 */
export function PressRow({
  title, detail, value, onPress, onLongPress, longPressLabel, trailing, divider = true,
}: {
  title: string;
  detail?: string;
  value?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  longPressLabel?: string;
  trailing?: ReactNode;
  divider?: boolean;
}) {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  const spoken = [title, detail, value].filter(Boolean).join('. ');
  const hold = 'longpress';
  return <View style={{
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: divider ? 1 : 0, borderBottomColor: theme.color.border.subtle,
  }}>
    <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={500}
      disabled={!onPress && !onLongPress}
      accessibilityRole={onPress || onLongPress ? 'button' : undefined}
      accessibilityLabel={spoken}
      accessibilityHint={longPressLabel}
      accessibilityActions={onLongPress && longPressLabel ? [{ name: hold, label: longPressLabel }] : undefined}
      onAccessibilityAction={event => {
        if (event.nativeEvent.actionName === hold) onLongPress?.();
      }}
      style={({ pressed }) => ({
        flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: theme.space[3],
        paddingVertical: theme.space[2], paddingHorizontal: theme.space[4],
        backgroundColor: pressed ? theme.surface.pressed : 'transparent',
      })}>
      <View style={{ flex: 1, gap: theme.space[1] }}>
        <Typography bold>{title}</Typography>
        {detail ? <Typography tone="secondary" size="secondary">{detail}</Typography> : null}
      </View>
      {value ? <Typography tone="secondary" size="secondary">{value}</Typography> : null}
      {onPress ? <ChevronIcon left={chevronPointsLeft('forward', isRTL)}
        color={theme.color.text.tertiary} size={theme.space[4]} strokeWidth={theme.size.iconStroke} /> : null}
    </Pressable>
    {trailing}
  </View>;
}
