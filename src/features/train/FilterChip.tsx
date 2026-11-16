import { Pressable, Text } from 'react-native';
import { useTheme } from '../../design/ThemeProvider';

/** A round filter. Selected uses the accent tint; the shared Chip is for provenance only. */
export function FilterChip({ label, selected, onPress, accessibilityLabel }: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const { theme } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label}
    accessibilityState={{ selected }} onPress={onPress}
    style={({ pressed }) => ({
      minHeight: theme.size.touch.min, paddingHorizontal: theme.space[3],
      borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center',
      backgroundColor: selected ? theme.color.tint.accent : theme.color.bg.raised,
      opacity: pressed ? 0.7 : 1,
    })}>
    <Text allowFontScaling style={{
      color: selected ? theme.color.accent : theme.color.text.primary,
      fontSize: theme.type.secondary.size, lineHeight: theme.type.secondary.line, fontWeight: '600',
    }}>{label}</Text>
  </Pressable>;
}
