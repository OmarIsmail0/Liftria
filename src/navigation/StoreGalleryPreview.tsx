import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLanguage } from '../i18n/LanguageProvider';
import { useTheme } from '../design/ThemeProvider';
import { storeCaptureTarget } from './storeScreens';

/**
 * This developer-only route is a launchpad into REAL Liftria screens.
 * It never paints marketing-card layouts in place of product UI. The demo routes
 * explicitly seed local examples (not medical readings or API calls).
 * app/dev/_layout.tsx keeps it inaccessible in signed store releases.
 */
export default function StoreGalleryPreview() {
  const { panel, lang, appearance } = useLocalSearchParams<{
    panel?: string; lang?: string; appearance?: string;
  }>();
  const { language, setLanguage } = useLanguage();
  const { theme, setMode } = useTheme();
  const started = useRef(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const prepare = async () => {
      if (appearance === 'light' || appearance === 'dark') setMode(appearance);
      if ((lang === 'en' || lang === 'ar') && lang !== language) {
        const saved = await setLanguage(lang);
        if (!saved) { setError(true); return; }
      }
      router.replace(storeCaptureTarget(panel));
    };
    void prepare();
  }, [panel, lang, appearance, language, setLanguage, setMode]);
  return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: theme.background, padding: 24 }}>
    {error ? <Text style={{ color: theme.color.text.primary, textAlign: 'center' }}>
      Could not set the screenshot language. Please change language in Settings and retry.
    </Text> : <ActivityIndicator accessibilityLabel="Opening real Liftria demo screen"
      color={theme.color.text.primary} />}
  </View>;
}
