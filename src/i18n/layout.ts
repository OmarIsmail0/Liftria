/** React Native resolves start/end correctly; never mirror charts or body illustrations. */
export function logicalInsets(start: number, end: number) {
  return { paddingStart: start, paddingEnd: end };
}
/**
 * Which way a chevron points on screen. Drawn as an SVG, not '‹'/'›': those glyphs are
 * Bidi_Mirrored, so Android flips them again in RTL text and swapping them pointed back the
 * wrong way in Arabic (PR #17 screenshots).
 */
export function chevronPointsLeft(direction: 'back' | 'forward', layoutRTL: boolean): boolean {
  return direction === 'back' ? !layoutRTL : layoutRTL;
}
