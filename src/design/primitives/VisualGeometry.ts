/** Geometry shared with SVG primitives; these helpers are platform-free and unit-testable. */
export const ambientGlows = [
  { key: 'train', cx: 12, cy: 6, rx: 55, ry: 32 },
  { key: 'hiku', cx: 98, cy: 32, rx: 60, ry: 34 },
  { key: 'health', cx: 2, cy: 72, rx: 60, ry: 34 },
  { key: 'eat', cx: 92, cy: 96, rx: 55, ry: 30 },
] as const;

export const cardRimStops = [0, 0.3, 0.55, 1] as const;

/**
 * react-native-svg drops the alpha of an rgba() stopColor on Android, so a token like
 * rgba(255,255,255,0.10) would draw as opaque white. Split it into an opaque color and an opacity
 * so a gradient stop gets the token's real transparency (multiply it into stopOpacity).
 */
export function splitColor(value: string): { color: string; opacity: number } {
  const match = /^rgba?\(([^)]+)\)$/.exec(value.trim());
  if (!match || match[1] === undefined) return { color: value, opacity: 1 };
  const [r, g, b, a] = match[1].split(',').map(part => Number(part.trim()));
  if ([r, g, b].some(channel => channel === undefined || !Number.isFinite(channel))) return { color: value, opacity: 1 };
  return { color: 'rgb(' + r + ',' + g + ',' + b + ')', opacity: a === undefined || !Number.isFinite(a) ? 1 : a };
}

/** Props for an SVG <Stop> that keep the token's own alpha, scaled by the stop's opacity. */
export function stopProps(value: string, stopOpacity = 1): { stopColor: string; stopOpacity: number } {
  const { color, opacity } = splitColor(value);
  return { stopColor: color, stopOpacity: opacity * stopOpacity };
}

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

/**
 * End points of a CSS `linear-gradient(<angle>deg, …)` over a w×h box, in user-space pixels.
 * CSS measures the angle from "to top", clockwise, and sizes the gradient line so its ends touch
 * the box's corners; objectBoundingBox percentages instead stretch with the box's aspect ratio,
 * which turns the design's 140° rim into a left-to-right fade on wide cards.
 */
export function cssLinearGradient(angleDeg: number, width: number, height: number) {
  const radians = (angleDeg * Math.PI) / 180;
  const dx = Math.sin(radians), dy = -Math.cos(radians);
  const half = (Math.abs(width * dx) + Math.abs(height * dy)) / 2;
  const cx = width / 2, cy = height / 2;
  return { x1: cx - dx * half, y1: cy - dy * half, x2: cx + dx * half, y2: cy + dy * half };
}
