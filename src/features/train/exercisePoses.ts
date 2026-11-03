/**
 * Exercise figures: the body-map body (react-native-body-highlighter 3.2.0, MIT) reposed
 * for one exercise. Only front and back views: side-view lifts keep the muscle thumbnail.
 *
 * buildPose() returns plain drawing primitives in the body map's coordinates (0..1448).
 * The renderer maps each role to a theme colour; nothing here depends on React.
 */
import { bodyBack } from 'react-native-body-highlighter/dist/assets/bodyBack';
import { bodyFront } from 'react-native-body-highlighter/dist/assets/bodyFront';
import { rotatePathData, type Rotation } from './rotatePath';

export type PoseView = 'front' | 'back';
/** m = muscle, p = primary, s = secondary, skin = limb fill under muscles, eq/eqd = equipment light/dark. */
export type PoseRole = 'm' | 'p' | 's' | 'skin' | 'eq' | 'eqd';
export type PosePrimitive =
  | { kind: 'path'; d: string; role: PoseRole }
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
type Hands = { L: Point; R: Point; LW: Point; RW: Point; LE: Point; RE: Point; LK: Point; RK: Point };
type PoseSpec = {
  view: PoseView;
  /** Body-map slugs drawn in the primary and secondary colours. */
  primary: string[];
  secondary: string[];
  /** Shoulder rotation and elbow rotation in degrees, mirrored for the right arm. */
  shoulder: number;
  elbow: number;
  legs: boolean;
  /** Hip rotation in degrees for the whole leg, mirrored for the right leg (positive spreads the legs). */
  hip?: number;
  /** A different shoulder and elbow rotation for the right arm (curls show one arm up, one down). */
  rightArm?: { shoulder: number; elbow: number };
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
/** Hip joint and knee of the body's left leg in the standing body map. */
const LEG: Record<PoseView, { HIP: Point; K: Point }> = {
  back: { HIP: [1025, 700], K: [1010, 1000] },
  front: { HIP: [300, 660], K: [296, 1000] },
};

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
  shoulderPressMachine: {
    view: 'front', primary: ['deltoids'], secondary: ['triceps', 'trapezius'], shoulder: 82, elbow: 78, legs: false,
    viewBox: '21 -37 685 838', thumbViewBox: '-55 -37 838 838',
    behind: () => [rect(250, 250, 228, 520, 40, 'eq')],
    seat: [rect(200, 700, 328, 50, 16, 'eq')],
    front: h => [rect(h.L[0] - 14, h.L[1] - 70, 28, 140, 12, 'eqd'), rect(h.R[0] - 14, h.R[1] - 70, 28, 140, 12, 'eqd')],
  },
  lateralRaiseMachine: {
    view: 'front', primary: ['deltoids'], secondary: ['trapezius'], shoulder: 70, elbow: -4, legs: false,
    viewBox: '-263 50 1254 766', thumbViewBox: '-26 30 780 780',
    behind: () => [rect(250, 250, 228, 520, 40, 'eq')],
    seat: [rect(200, 700, 328, 50, 16, 'eq')],
    front: h => [rect(h.LE[0] - 40, h.LE[1] - 50, 80, 36, 14, 'eqd'), rect(h.RE[0] - 40, h.RE[1] - 50, 80, 36, 14, 'eqd')],
  },
  chestPressMachine: {
    view: 'front', primary: ['chest'], secondary: ['triceps', 'deltoids'], shoulder: 45, elbow: -150, legs: false,
    viewBox: '72 70 585 727', thumbViewBox: '0 70 727 727',
    behind: () => [rect(250, 250, 228, 520, 40, 'eq')],
    seat: [rect(200, 700, 328, 50, 16, 'eq')],
    front: h => [rect(h.L[0] - 14, h.L[1] - 60, 28, 120, 12, 'eqd'), rect(h.R[0] - 14, h.R[1] - 60, 28, 120, 12, 'eqd')],
  },
  pecDeck: {
    view: 'front', primary: ['chest'], secondary: ['deltoids'], shoulder: 80, elbow: 84, legs: false,
    viewBox: '5 1 718 798', thumbViewBox: '-35 1 798 798',
    behind: h => [rect(250, 250, 228, 520, 40, 'eq'),
      rect(h.LE[0] - 46, h.L[1] - 40, 40, h.LE[1] - h.L[1] + 70, 16, 'eq'), rect(h.RE[0] + 6, h.R[1] - 40, 40, h.RE[1] - h.R[1] + 70, 16, 'eq')],
    seat: [rect(200, 700, 328, 50, 16, 'eq')],
  },
  tricepsPushdown: {
    view: 'back', primary: ['triceps'], secondary: ['forearm'], shoulder: -10, elbow: 22, legs: true,
    viewBox: '724 -56 721 1451', thumbViewBox: '721 -29 726 726',
    behind: h => [line([1084, 20], [1084, 520], 5, 'eqd'), { kind: 'circle', cx: 1084, cy: 20, r: 22, role: 'eqd' },
      line([1084, 520], h.L, 10, 'eqd'), line([1084, 520], h.R, 10, 'eqd')],
  },
  bicepCurl: {
    view: 'front', primary: ['biceps'], secondary: ['forearm'], shoulder: -8, elbow: -4, legs: true,
    rightArm: { shoulder: -14, elbow: 150 },
    viewBox: '101 47 615 1344', thumbViewBox: '73 72 672 672',
    front: h => [...dumbbellUpright(h.L), ...dumbbellLevel(h.R)],
  },
  hipAdduction: {
    view: 'front', primary: ['adductors'], secondary: ['quadriceps'], shoulder: -6, elbow: -4, legs: true, hip: 14,
    viewBox: '37 48 654 1320', thumbViewBox: '34 585 660 660',
    behind: () => [rect(170, 600, 388, 70, 24, 'eq')],
    front: h => [rect(h.LK[0] + 38, h.LK[1] - 70, 36, 140, 14, 'eqd'), rect(h.RK[0] - 74, h.RK[1] - 70, 36, 140, 14, 'eqd')],
  },
  hipAbduction: {
    view: 'back', primary: ['gluteal'], secondary: ['hamstring'], shoulder: -6, elbow: -4, legs: true, hip: 14,
    viewBox: '764 48 641 1323', thumbViewBox: '753 586 661 661',
    behind: () => [rect(890, 640, 388, 70, 24, 'eq')],
    front: h => [rect(h.LK[0] - 78, h.LK[1] - 70, 36, 140, 14, 'eqd'), rect(h.RK[0] + 42, h.RK[1] - 70, 36, 140, 14, 'eqd')],
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
  const paths = (slugs: readonly string[], side: 'left' | 'right' | 'common', rotations: readonly Rotation[] = []): PosePrimitive[] =>
    slugs.flatMap(slug => partPaths(spec.view, slug, side).map(d =>
      ({ kind: 'path' as const, d: rotatePathData(d, rotations), role: role(slug) })));
  const cx = CENTER[spec.view], joints = ARM[spec.view];
  const arm = (side: 'left' | 'right') => {
    const mirror = side === 'right', sign = mirror ? -1 : 1;
    const at = (p: Point): Point => mirror ? [2 * cx - p[0], p[1]] : p;
    const S = at(joints.S), E = at(joints.E), W = at(joints.W), H = at(joints.H);
    const angles = mirror && spec.rightArm ? spec.rightArm : spec;
    const a1 = sign * angles.shoulder, a2 = sign * angles.elbow;
    const elbow = rotatePoint(E, S, a1);
    const wrist = rotatePoint(rotatePoint(W, E, a2), S, a1);
    const hand = rotatePoint(rotatePoint(H, E, a2), S, a1);
    const upper: Rotation[] = [{ degrees: a1, cx: S[0], cy: S[1] }];
    const lower: Rotation[] = [...upper, { degrees: a2, cx: E[0], cy: E[1] }];
    const primitives: PosePrimitive[] = [
      line(S, elbow, 66, 'skin'), line(elbow, wrist, 54, 'skin'),
      ...paths(UPPER_ARM[spec.view], side, upper), ...paths(['forearm'], side, lower),
      { kind: 'circle', cx: round(hand[0]), cy: round(hand[1]), r: 30, role: 'skin' },
    ];
    return { primitives, hand, wrist, elbow };
  };
  const left = arm('left'), right = arm('right');
  const hip = spec.hip ?? 0;
  const legJoints = (side: 'left' | 'right') => {
    const mirror = side === 'right', sign = mirror ? -1 : 1;
    const at = (p: Point): Point => mirror ? [2 * cx - p[0], p[1]] : p;
    const HIP = at(LEG[spec.view].HIP);
    return { rotations: hip ? [{ degrees: sign * hip, cx: HIP[0], cy: HIP[1] }] : [], knee: rotatePoint(at(LEG[spec.view].K), HIP, sign * hip) };
  };
  const leftLeg = legJoints('left'), rightLeg = legJoints('right');
  const hands: Hands = { L: left.hand, R: right.hand, LW: left.wrist, RW: right.wrist, LE: left.elbow, RE: right.elbow,
    LK: leftLeg.knee, RK: rightLeg.knee };
  const sides = ['left', 'right', 'common'] as const;
  const primitives: PosePrimitive[] = [
    ...(spec.behind?.(hands) ?? []),
    ...sides.flatMap(side => paths(TRUNK[spec.view], side)),
    ...(spec.legs ? [...paths(LEGS[spec.view], 'left', leftLeg.rotations), ...paths(LEGS[spec.view], 'right', rightLeg.rotations),
      ...paths(LEGS[spec.view], 'common')] : []),
    ...(spec.seat ?? []),
    ...left.primitives, ...right.primitives,
    ...(spec.front?.(hands) ?? []),
  ];
  return { view: spec.view, viewBox: spec.viewBox, thumbViewBox: spec.thumbViewBox, primitives };
}
