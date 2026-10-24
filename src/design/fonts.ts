/** Named static TTF faces: Android must not rely on fontWeight or variable axes. */
export const bundledFonts = {
  'ArchivoSemiExpanded-Bold': require('../../assets/fonts/ArchivoSemiExpanded-Bold.ttf'),
  'ArchivoSemiExpanded-ExtraBold': require('../../assets/fonts/ArchivoSemiExpanded-ExtraBold.ttf'),
  'Figtree-Regular': require('../../assets/fonts/Figtree-Regular.ttf'),
  'Figtree-SemiBold': require('../../assets/fonts/Figtree-SemiBold.ttf'),
  'Figtree-Bold': require('../../assets/fonts/Figtree-Bold.ttf'),
};

export function fontFamilyFor(face: 'Archivo' | 'Figtree', weight: string): string {
  if (face === 'Archivo') return weight === '800' ? 'ArchivoSemiExpanded-ExtraBold' : 'ArchivoSemiExpanded-Bold';
  if (weight === '700' || weight === '800') return 'Figtree-Bold';
  return weight === '600' ? 'Figtree-SemiBold' : 'Figtree-Regular';
}
