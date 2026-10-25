/** React Native resolves start/end correctly; never mirror charts or body illustrations. */
export function logicalInsets(start: number, end: number) {
  return { paddingStart: start, paddingEnd: end };
}
export function directionalChevron(direction: 'back' | 'forward', layoutRTL: boolean): string {
  return direction === 'back' ? (layoutRTL ? '›' : '‹') : (layoutRTL ? '‹' : '›');
}
