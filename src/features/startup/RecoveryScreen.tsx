import { useContext, useState } from 'react';
import { Pressable, ScrollView, Text, View, useColorScheme } from 'react-native';
import { SafeAreaInsetsContext, initialWindowMetrics } from 'react-native-safe-area-context';
import { createTheme, type LiftriaTheme } from '../../design/tokens';
import { resolveMode, useOptionalTheme } from '../../design/ThemeProvider';
import { buttonColors, buttonHeight } from '../../design/primitives/contracts';
import { systemLanguage, useOptionalLanguage } from '../../i18n/LanguageProvider';
import { translate, type TranslationKey } from '../../i18n';

export type RecoveryKind = 'failed' | 'newer' | 'crash';

const COPY: Record<RecoveryKind, { title: TranslationKey; body: TranslationKey }> = {
  failed: { title: 'appRecovery.failedTitle', body: 'appRecovery.failedBody' },
  newer: { title: 'appRecovery.newerTitle', body: 'appRecovery.newerBody' },
  crash: { title: 'appRecovery.crashTitle', body: 'appRecovery.crashBody' },
};

function RecoveryButton({ theme, label, variant, disabled, onPress }: {
  theme: LiftriaTheme; label: string; variant: 'primary' | 'neutral'; disabled?: boolean; onPress: () => void;
}) {
  const colors = buttonColors(theme, variant);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }}
    disabled={disabled} onPress={onPress} style={({ pressed }) => ({
      minHeight: buttonHeight(theme, 'md'), alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: theme.space[4], borderRadius: theme.radius.md,
      backgroundColor: pressed && variant === 'neutral' ? theme.surface.pressed : colors.bg,
      opacity: disabled ? 0.45 : 1,
    })}>
    <Text allowFontScaling style={{ color: colors.fg, fontWeight: '600', textAlign: 'center',
      fontSize: theme.type.button.size, lineHeight: theme.type.button.line }}>{label}</Text>
  </Pressable>;
}

/**
 * Full-screen, localized recovery for launch and render failures. It works with or
 * without the theme and language providers, because the root error boundary renders
 * in place of the layout that provides them.
 */
export function RecoveryScreen({ kind, onRetry, onHome }: {
  kind: RecoveryKind; onRetry?: () => void | Promise<void>; onHome?: () => void;
}) {
  const scheme = useColorScheme();
  const themed = useOptionalTheme();
  const languageContext = useOptionalLanguage();
  const insets = useContext(SafeAreaInsetsContext) ?? initialWindowMetrics?.insets ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const [busy, setBusy] = useState(false);
  const theme = themed?.theme ?? createTheme(resolveMode('system', scheme), 'solid');
  const language = languageContext?.language ?? systemLanguage();
  const t = (key: TranslationKey) => translate(language, key);
  const retry = async () => {
    if (!onRetry || busy) return;
    setBusy(true);
    try { await onRetry(); } catch { /* The screen stays; the user can try again. */ }
    finally { setBusy(false); }
  };
  return <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom }}>
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: theme.layout.gutter, gap: theme.space[4] }}>
      <View accessibilityRole="alert" style={{ gap: theme.space[2] }}>
        <Text allowFontScaling accessibilityRole="header" style={{ color: theme.color.text.primary,
          fontSize: theme.type.title.size, lineHeight: theme.type.title.line, fontWeight: theme.type.title.weight }}>
          {t(COPY[kind].title)}</Text>
        <Text allowFontScaling style={{ color: theme.color.text.secondary,
          fontSize: theme.type.body.size, lineHeight: theme.type.body.line }}>{t(COPY[kind].body)}</Text>
      </View>
      {onRetry && <RecoveryButton theme={theme} variant="primary" disabled={busy}
        label={busy ? t('common.loading') : t('common.retry')} onPress={() => void retry()} />}
      {onHome && <RecoveryButton theme={theme} variant="neutral" disabled={busy}
        label={t('appRecovery.home')} onPress={onHome} />}
    </ScrollView>
  </View>;
}
