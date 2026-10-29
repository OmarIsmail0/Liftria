import { Image, ScrollView, StatusBar, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createTheme } from '../design/tokens';
import { fontFamilyFor } from '../design/fonts';
import { isStorePanel, storePanels, type StoreLocale } from './storeScreens';

/** Preview only: never queries or mutates health, diary, workout, or Hiku data. */
export default function StoreGalleryPreview() {
  const { panel: requested, lang: language, appearance } = useLocalSearchParams<{
    panel?: string; lang?: string; appearance?: string;
  }>();
  const panel = isStorePanel(requested) ? requested : 'today';
  const lang: StoreLocale = language === 'ar' ? 'ar' : 'en';
  const isArabic = lang === 'ar';
  const mode = appearance === 'dark' ? 'dark' : 'light';
  const theme = createTheme(mode, 'aurora');
  const copy = storePanels[panel][lang];
  const accent = theme.color.domain[storePanels[panel].domain];
  const { height, width } = useWindowDimensions();
  const inset = useSafeAreaInsets();
  const titleFont = fontFamilyFor('Archivo', '800', isArabic);
  const regularFont = fontFamilyFor('Figtree', '400', isArabic);
  const strongFont = fontFamilyFor('Figtree', '700', isArabic);
  const direction = isArabic ? 'row-reverse' : 'row';
  const align = isArabic ? 'right' : 'left';
  const ink = theme.color.text.primary;
  const secondary = theme.color.text.secondary;
  const large = Math.min(40, Math.max(30, width * 0.082));
  const thin = { borderWidth: 1, borderColor: theme.surface.hairline };
  const labelStyle = { fontFamily: strongFont, color: accent, fontSize: 12, letterSpacing: isArabic ? 0 : 1.4, textAlign: align } as const;
  return <View style={{ flex: 1, backgroundColor: theme.background }}>
    <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
    <View pointerEvents="none" style={{ position: 'absolute', width: width * 0.92, height: width * 0.92,
      borderRadius: width, backgroundColor: accent, opacity: mode === 'dark' ? 0.10 : 0.07,
      top: height * 0.03, right: -width * 0.42 }} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{
      paddingTop: Math.max(inset.top, 24) + 12, paddingBottom: Math.max(inset.bottom, 24) + 14,
      paddingHorizontal: Math.min(28, Math.max(18, width * 0.06)),
      minHeight: height, justifyContent: 'space-between', gap: 24,
    }}>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: direction, alignItems: 'center', gap: 10 }}>
          <Image accessible={false} source={mode === 'dark'
            ? require('../../assets/brand/splash-dark.png')
            : require('../../assets/brand/splash-light.png')} style={{ width: 34, height: 34 }} />
          <Text style={{ color: ink, fontSize: 18, fontFamily: titleFont, textAlign: align }}>Liftria</Text>
        </View>
        <View style={{ alignItems: isArabic ? 'flex-end' : 'flex-start', marginTop: 20, gap: 12 }}>
          <View style={[thin, { borderRadius: 999, paddingVertical: 9, paddingHorizontal: 14,
            backgroundColor: theme.cardFill }]}>
            <Text style={labelStyle}>{copy.eyebrow}</Text>
          </View>
          <Text adjustsFontSizeToFit numberOfLines={3} style={{
            color: ink, fontFamily: titleFont, fontSize: large,
            lineHeight: large * 1.19, textAlign: align,
          }}>{copy.title}</Text>
          <Text style={{ color: secondary, fontFamily: regularFont, fontSize: 17,
            lineHeight: 26, textAlign: align }}>{copy.description}</Text>
        </View>
      </View>
      <View style={[thin, {
        borderRadius: theme.radius.lg, backgroundColor: theme.cardFill, overflow: 'hidden',
        padding: 20, gap: 16,
      }]}>
        <View style={{ flexDirection: direction, gap: 12, alignItems: 'center' }}>
          <View style={{ width: 38, height: 38, backgroundColor: accent,
            borderRadius: 14, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: 17, height: 17, borderWidth: 3,
              borderColor: theme.background, borderRadius: 6 }} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: ink, fontFamily: titleFont, fontSize: 21, textAlign: align }}>
              {copy.cardTitle}
            </Text>
            <Text style={{ color: secondary, fontFamily: regularFont, fontSize: 12,
              textAlign: align }}>{copy.cardDescription}</Text>
          </View>
        </View>
        {copy.rows.map(([heading,detail]) =>
          <View key={heading} style={[thin, { flexDirection: direction, alignItems: 'center',
            gap: 12, backgroundColor: theme.color.bg.surface, borderRadius: 14,
            paddingHorizontal: 13, paddingVertical: 15, minHeight: 76 }]}>
            <View style={{ width: 9, height: 9, borderRadius: 9, backgroundColor: accent }} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontFamily: strongFont, color: ink, fontSize: 16, textAlign: align }}>
                {heading}
              </Text>
              <Text style={{ fontFamily: regularFont, color: secondary, fontSize: 12,
                lineHeight: 18, textAlign: align }}>{detail}</Text>
            </View>
          </View>)}
      </View>
      <View style={{ gap: 9 }}>
        <View style={{ height: 3, width: 60, backgroundColor: accent,
          borderRadius: 999, alignSelf: isArabic ? 'flex-end' : 'flex-start' }} />
        <Text style={{ fontFamily: regularFont, color: secondary,
          fontSize: 13, lineHeight: 20, textAlign: align }}>{copy.footnote}</Text>
      </View>
    </ScrollView>
  </View>;
}
