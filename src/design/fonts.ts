/** Named static TTF faces: Android must not rely on fontWeight or variable axes. */
export const bundledFonts = {
  'ArchivoSemiExpanded-Bold': require('../../assets/fonts/ArchivoSemiExpanded-Bold.ttf'),
  'ArchivoSemiExpanded-ExtraBold': require('../../assets/fonts/ArchivoSemiExpanded-ExtraBold.ttf'),
  'Figtree-Regular': require('../../assets/fonts/Figtree-Regular.ttf'),
  'Figtree-SemiBold': require('../../assets/fonts/Figtree-SemiBold.ttf'),
  'Figtree-Bold': require('../../assets/fonts/Figtree-Bold.ttf'),
  'IBMPlexSansArabic-Regular': require('../../assets/fonts/IBMPlexSansArabic-Regular.ttf'),
  'IBMPlexSansArabic-SemiBold': require('../../assets/fonts/IBMPlexSansArabic-SemiBold.ttf'),
  'IBMPlexSansArabic-Bold': require('../../assets/fonts/IBMPlexSansArabic-Bold.ttf'),
};

export function fontFamilyFor(face: 'Archivo' | 'Figtree', weight: string, arabic = false): string {
  if (arabic) return weight === '700' || weight === '800'
    ? 'IBMPlexSansArabic-Bold' : weight === '600'
      ? 'IBMPlexSansArabic-SemiBold' : 'IBMPlexSansArabic-Regular';
  if (face === 'Archivo') return weight === '800' ? 'ArchivoSemiExpanded-ExtraBold' : 'ArchivoSemiExpanded-Bold';
  if (weight === '700' || weight === '800') return 'Figtree-Bold';
  return weight === '600' ? 'Figtree-SemiBold' : 'Figtree-Regular';
}
