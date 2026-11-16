import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeProvider';
import { useLanguage } from '../../i18n/LanguageProvider';
import { TabIcon } from './TabIcon';
import { capsuleTabs, type CapsuleTab } from './contracts';

/** Standard labelled bar. A row mirrors in Arabic. The safe-area inset stays below the labels. */
export function TabBar({ active, onSelect }: {
  active: CapsuleTab; onSelect: (tab: CapsuleTab) => void;
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  return <View accessibilityRole="tablist" style={{
    flexDirection: 'row', alignItems: 'stretch',
    backgroundColor: theme.color.bg.surface,
    borderTopWidth: theme.size.border.thin, borderTopColor: theme.color.border.subtle,
    paddingTop: theme.space[2], paddingHorizontal: theme.space[1],
    paddingBottom: Math.max(insets.bottom, theme.space[3]),
  }}>
    {capsuleTabs.map(tab => {
      const selected = tab.key === active;
      const label = t(`nav.${tab.key}`);
      const color = selected ? theme.color.accent : theme.color.text.tertiary;
      return <Pressable key={tab.key} onPress={() => onSelect(tab.key)}
        accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }}
        style={({ pressed }) => ({
          flex: 1, minHeight: theme.size.touch.min, alignItems: 'center', justifyContent: 'center',
          gap: theme.space[1], opacity: pressed ? 0.6 : 1,
        })}>
        <TabIcon name={tab.key} color={color} size={theme.space[6]} strokeWidth={theme.size.iconStroke} />
        <Text allowFontScaling numberOfLines={1} style={{
          color, fontSize: theme.type.caption.size, lineHeight: theme.type.caption.line,
          fontWeight: selected ? '700' : '500', textAlign: 'center',
        }}>{label}</Text>
      </Pressable>;
    })}
  </View>;
}
