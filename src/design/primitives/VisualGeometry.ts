/** Geometry shared with SVG primitives; these helpers are platform-free and unit-testable. */
export const ambientGlows = [
  { key: 'train', cx: 12, cy: 6, rx: 55, ry: 32 },
  { key: 'hiku', cx: 98, cy: 32, rx: 60, ry: 34 },
  { key: 'health', cx: 2, cy: 72, rx: 60, ry: 34 },
  { key: 'eat', cx: 92, cy: 96, rx: 55, ry: 30 },
] as const;

export const cardRimStops = [0, 0.3, 0.55, 1] as const;

/** All RGB values come from the theme. */
export function withOpacity(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  return 'rgba(' + parseInt(clean.slice(0, 2), 16) + ',' +
    parseInt(clean.slice(2, 4), 16) + ',' + parseInt(clean.slice(4, 6), 16) +
    ',' + alpha + ')';
}

export function ringGeometry(size: number, stroke: number, progress: number) {
  const radius = size / 2 - stroke / 2 - stroke;
  const circumference = 2 * Math.PI * radius;
  return { radius, circumference, offset: circumference * (1 - Math.min(1, Math.max(0, progress))) };
}
