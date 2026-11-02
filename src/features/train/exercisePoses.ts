/**
 * Exercise figures: the body-map body (react-native-body-highlighter 3.2.0, MIT) reposed
 * for one exercise. Only front and back views: side-view lifts keep the muscle thumbnail.
 *
 * buildPose() returns plain drawing primitives in the body map's coordinates (0..1448).
 * The renderer maps each role to a theme colour; nothing here depends on React.
 */
import { bodyBack } from 'react-native-body-highlighter/dist/assets/bodyBack';
import { bodyFront } from 'react-native-body-highlighter/dist/assets/bodyFront';

export type PoseView = 'front' | 'back';
/** m = muscle, p = primary, s = secondary, skin = limb fill under muscles, eq/eqd = equipment light/dark. */
export type PoseRole = 'm' | 'p' | 's' | 'skin' | 'eq' | 'eqd';
export type PosePrimitive =
  | { kind: 'path'; d: string; role: PoseRole; transform?: string }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; width: number; role: PoseRole }
  | { kind: 'circle'; cx: number; cy: number; r: number; role: PoseRole }
  | { kind: 'rect'; x: number; y: number; width: number; height: number; rx: number; role: PoseRole };
export type BuiltPose = {
  view: PoseView;
  /** Whole figure, for the exercise screen. */
  viewBox: string;
  /** Square crop for list thumbnails. */
  thumbViewBox: string;
  primitives: PosePrimitive[];
};
type Point = [number, number];
type Hands = { L: Point; R: Point; LW: Point; RW: Point };
type PoseSpec = {
  view: PoseView;
  /** Body-map slugs drawn in the primary and secondary colours. */
  primary: string[];
  secondary: string[];
  /** Shoulder rotation and elbow rotation in degrees, mirrored for the right arm. */
  shoulder: number;
  elbow: number;
  legs: boolean;
  viewBox: string;
  thumbViewBox: string;
  behind?: (h: Hands) => PosePrimitive[];
  seat?: PosePrimitive[];
  front?: (h: Hands) => PosePrimitive[];
};

type BodyPart = { slug?: string; path?: { left?: string[]; right?: string[]; common?: string[] } };
const BODY: Record<PoseView, readonly BodyPart[]> = { front: bodyFront as BodyPart[], back: bodyBack as BodyPart[] };
const CENTER: Record<PoseView, number> = { front: 364, back: 1084 };
/** Shoulder, elbow, wrist and hand of the body's left arm in the standing body map. */
const ARM: Record<PoseView, { S: Point; E: Point; W: Point; H: Point }> = {
  back: { S: [950, 350], E: [915, 525], W: [865, 690], H: [822, 754] },
  front: { S: [240, 350], E: [200, 505], W: [150, 690], H: [105, 755] },
};
const TRUNK: Record<PoseView, string[]> = {
  back: ['neck', 'trapezius', 'deltoids', 'upper-back', 'lower-back', 'gluteal', 'head', 'hair'],
  front: ['neck', 'trapezius', 'deltoids', 'chest', 'abs', 'obliques', 'head', 'hair'],
};
const LEGS: Record<PoseView, string[]> = {
  back: ['adductors', 'hamstring', 'calves', 'ankles', 'feet'],
  front: ['adductors', 'quadriceps', 'knees', 'tibialis', 'calves', 'ankles', 'feet'],
};
const UPPER_ARM: Record<PoseView, string[]> = { back: ['triceps'], front: ['biceps', 'triceps'] };

export function rotatePoint(p: Point, c: Point, degrees: number): Point {
  const r = degrees * Math.PI / 180, dx = p[0] - c[0], dy = p[1] - c[1];
  return [c[0] + dx * Math.cos(r) - dy * Math.sin(r), c[1] + dx * Math.sin(r) + dy * Math.cos(r)];
}
const round = (n: number) => Math.round(n * 10) / 10;
const rect = (x: number, y: number, width: number, height: number, rx: number, role: PoseRole): PosePrimitive =>
  ({ kind: 'rect', x: round(x), y: round(y), width: round(width), height: round(height), rx, role });
const line = (a: Point, b: Point, width: number, role: PoseRole): PosePrimitive =>
  ({ kind: 'line', x1: round(a[0]), y1: round(a[1]), x2: round(b[0]), y2: round(b[1]), width, role });
/** Dumbbell held upright (arms down or out) or level (arms overhead). */
const dumbbellUpright = ([x, y]: Point): PosePrimitive[] => [
  rect(x - 9, y - 60, 18, 120, 6, 'eqd'), rect(x - 30, y - 72, 60, 26, 8, 'eqd'), rect(x - 30, y + 46, 60, 26, 8, 'eqd')];
const dumbbellLevel = ([x, y]: Point): PosePrimitive[] => [
  rect(x - 60, y - 9, 120, 18, 6, 'eqd'), rect(x - 72, y - 30, 26, 60, 8, 'eqd'), rect(x + 46, y - 30, 26, 60, 8, 'eqd')];
const barBetween = (h: Hands, overhang: number, thickness = 18): PosePrimitive =>
  rect(h.L[0] - overhang, h.L[1] - thickness / 2, h.R[0] - h.L[0] + overhang * 2, thickness, thickness / 2, 'eqd');

const POSES = {
  latPulldown: {
    view: 'back', primary: ['upper-back'], secondary: ['deltoids', 'forearm', 'triceps'], shoulder: 35, elbow: 120, legs: false,
    viewBox: '701 1 766 1011', thumbViewBox: '692 9 784 784',
    behind: h => [line([1084, 60], [1084, h.L[1]], 5, 'eqd'), { kind: 'circle', cx: 1084, cy: 60, r: 22, role: 'eqd' }],
    seat: [rect(930, 770, 308, 44, 14, 'eq'), rect(1068, 814, 32, 160, 0, 'eq')],
    front: h => [barBetween(h, 70)],
  },
  pullUp: {
    view: 'back', primary: ['upper-back'], secondary: ['forearm', 'deltoids'], shoulder: 148, elbow: 8, legs: true,
    viewBox: '731 -151 705 1550', thumbViewBox: '696 -123 775 775',
    front: h => [barBetween(h, 90, 20)],
  },
  shoulderPressDumbbell: {
    view: 'front', primary: ['deltoids'], secondary: ['triceps', 'trapezius'], shoulder: 82, elbow: 78, legs: false,
    viewBox: '-24 5 775 794', thumbViewBox: '-33 5 794 794',
    behind: () => [rect(250, 250, 228, 520, 40, 'eq')],
    seat: [rect(200, 700, 328, 50, 16, 'eq')],
    front: h => [...dumbbellLevel(h.L), ...dumbbellLevel(h.R)],
  },
  lateralRaise: {
    view: 'front', primary: ['deltoids'], secondary: ['trapezius'], shoulder: 70, elbow: -4, legs: true,
    viewBox: '-266 47 1260 1344', thumbViewBox: '-12 69 752 752',
    front: h => [...dumbbellUpright(h.L), ...dumbbellUpright(h.R)],
  },
  rearDeltFly: {
    view: 'back', primary: ['deltoids'], secondary: ['upper-back', 'trapezius'], shoulder: 70, elbow: -4, legs: true,
    viewBox: '298 38 1571 1361', thumbViewBox: '613 62 943 943',
    behind: h => [line(h.L, [h.R[0] + 170, h.R[1] - 10], 5, 'eqd'), line(h.R, [h.L[0] - 170, h.L[1] - 10], 5, 'eqd')],
  },
  cableFly: {
    view: 'front', primary: ['chest'], secondary: ['deltoids', 'biceps'], shoulder: 52, elbow: 12, legs: true,
    viewBox: '-378 5 1484 1410', thumbViewBox: '-81 27 890 890',
    behind: h => [rect(h.L[0] - 150, 60, 34, 1300, 10, 'eq'), rect(h.R[0] + 116, 60, 34, 1300, 10, 'eq'),
      line(h.L, [h.L[0] - 133, 140], 5, 'eqd'), line(h.R, [h.R[0] + 133, 140], 5, 'eqd')],
  },
  shrugDumbbell: {
    view: 'back', primary: ['trapezius'], secondary: ['forearm'], shoulder: -6, elbow: -4, legs: true,
    viewBox: '802 47 564 1345', thumbViewBox: '748 72 672 672',
    front: h => [...dumbbellUpright(h.L), ...dumbbellUpright(h.R)],
  },
  uprightRow: {
    view: 'front', primary: ['deltoids'], secondary: ['trapezius', 'biceps', 'forearm'], shoulder: 62, elbow: 150, legs: true,
    viewBox: '27 47 675 1344', thumbViewBox: '28 72 672 672',
    front: h => [barBetween(h, 50)],
  },
  overheadTricepsExtension: {
    view: 'back', primary: ['triceps'], secondary: ['forearm'], shoulder: 168, elbow: 150, legs: true,
    viewBox: '852 47 466 1345', thumbViewBox: '748 72 672 672',
    front: h => dumbbellLevel([(h.L[0] + h.R[0]) / 2, (h.L[1] + h.R[1]) / 2]),
  },
  calfRaise: {
    view: 'back', primary: ['calves'], secondary: ['hamstring'], shoulder: -6, elbow: -4, legs: true,
    viewBox: '800 45 567 1388', thumbViewBox: '737 714 694 694',
    front: () => [rect(930, 1338, 308, 44, 10, 'eq')],
  },
} satisfies Record<string, PoseSpec>;

export type PoseKey = keyof typeof POSES;
export const POSE_KEYS = Object.keys(POSES) as PoseKey[];

function partPaths(view: PoseView, slug: string, side: 'left' | 'right' | 'common'): string[] {
  return BODY[view].find(part => part.slug === slug)?.path?.[side] ?? [];
}

/** Drawing primitives for one pose. Highlights default to the pose's own muscles. */
export function buildPose(key: PoseKey, highlight?: { primary: readonly string[]; secondary: readonly string[] }): BuiltPose {
  const spec: PoseSpec = POSES[key];
  const primary = highlight?.primary ?? spec.primary, secondary = highlight?.secondary ?? spec.secondary;
  const role = (slug: string): PoseRole => primary.includes(slug) ? 'p' : secondary.includes(slug) ? 's' : 'm';
  const paths = (slugs: readonly string[], side: 'left' | 'right' | 'common', transform?: string): PosePrimitive[] =>
    slugs.flatMap(slug => partPaths(spec.view, slug, side).map(d =>
      transform ? { kind: 'path' as const, d, role: role(slug), transform } : { kind: 'path' as const, d, role: role(slug) }));
  const cx = CENTER[spec.view], joints = ARM[spec.view];
  const arm = (side: 'left' | 'right') => {
    const mirror = side === 'right', sign = mirror ? -1 : 1;
    const at = (p: Point): Point => mirror ? [2 * cx - p[0], p[1]] : p;
    const S = at(joints.S), E = at(joints.E), W = at(joints.W), H = at(joints.H);
    const a1 = sign * spec.shoulder, a2 = sign * spec.elbow;
    const elbow = rotatePoint(E, S, a1);
    const wrist = rotatePoint(rotatePoint(W, E, a2), S, a1);
    const hand = rotatePoint(rotatePoint(H, E, a2), S, a1);
    // i18n-stored-ids: an SVG transform, never shown as text.
    const upper = `rotate(${a1} ${S[0]} ${S[1]})`, lower = `${upper} rotate(${a2} ${E[0]} ${E[1]})`;
    const primitives: PosePrimitive[] = [
      line(S, elbow, 66, 'skin'), line(elbow, wrist, 54, 'skin'),
      ...paths(UPPER_ARM[spec.view], side, upper), ...paths(['forearm'], side, lower),
      { kind: 'circle', cx: round(hand[0]), cy: round(hand[1]), r: 30, role: 'skin' },
    ];
    return { primitives, hand, wrist };
  };
  const left = arm('left'), right = arm('right');
  const hands: Hands = { L: left.hand, R: right.hand, LW: left.wrist, RW: right.wrist };
  const sides = ['left', 'right', 'common'] as const;
  const primitives: PosePrimitive[] = [
    ...(spec.behind?.(hands) ?? []),
    ...sides.flatMap(side => paths(TRUNK[spec.view], side)),
    ...(spec.legs ? sides.flatMap(side => paths(LEGS[spec.view], side)) : []),
    ...(spec.seat ?? []),
    ...left.primitives, ...right.primitives,
    ...(spec.front?.(hands) ?? []),
  ];
  return { view: spec.view, viewBox: spec.viewBox, thumbViewBox: spec.thumbViewBox, primitives };
}
