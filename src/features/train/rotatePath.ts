/**
 * Rotates SVG path data in place, so a reposed limb needs no `transform`
 * (react-native-svg on Android dropped the rotated arm paths in PR AT's screenshots).
 * Handles every command, absolute and relative, including compact arc flags ("01-.36").
 */
export type Rotation = { degrees: number; cx: number; cy: number };

type Matrix = [number, number, number, number, number, number]; // a b c d e f: x' = a x + c y + e
const multiply = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
function rotation({ degrees, cx, cy }: Rotation): Matrix {
  const r = degrees * Math.PI / 180, cos = Math.cos(r), sin = Math.sin(r);
  return [cos, sin, -sin, cos, cx - cos * cx + sin * cy, cy - sin * cx - cos * cy];
}
/** The same order as an SVG transform list: the first rotation is the outermost. */
export function composeRotations(rotations: readonly Rotation[]): { matrix: Matrix; degrees: number } {
  let matrix: Matrix = [1, 0, 0, 1, 0, 0];
  for (const step of rotations) matrix = multiply(matrix, rotation(step));
  return { matrix, degrees: rotations.reduce((sum, step) => sum + step.degrees, 0) };
}

const ARGS: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
const fmt = (n: number) => String(Math.round(n * 100) / 100);

function tokenize(d: string): (string | number)[] {
  const out: (string | number)[] = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])|([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g;
  // Arc flags may be written without separators, so arcs are read character by character below.
  let match: RegExpExecArray | null;
  let command = '';
  let argIndex = 0;
  let i = 0;
  while (i < d.length) {
    const ch = d[i] as string;
    if (/[\s,]/.test(ch)) { i += 1; continue; }
    if (/[MmLlHhVvCcSsQqTtAaZz]/.test(ch)) { out.push(ch); command = ch.toLowerCase(); argIndex = 0; i += 1; continue; }
    if (command === 'a' && (argIndex % 7 === 3 || argIndex % 7 === 4) && (ch === '0' || ch === '1')) {
      out.push(Number(ch)); argIndex += 1; i += 1; continue;
    }
    re.lastIndex = i;
    match = re.exec(d);
    if (!match || match.index !== i || match[2] === undefined) throw new Error('Bad path data at ' + i);
    out.push(Number(match[2])); argIndex += 1; i = re.lastIndex;
  }
  return out;
}

export function rotatePathData(d: string, rotations: readonly Rotation[]): string {
  if (rotations.length === 0) return d;
  const { matrix: m, degrees } = composeRotations(rotations);
  const point = (x: number, y: number) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]] as const;
  const vector = (x: number, y: number) => [m[0] * x + m[2] * y, m[1] * x + m[3] * y] as const;
  const tokens = tokenize(d);
  const parts: string[] = [];
  let cx = 0, cy = 0, sx = 0, sy = 0; // current point and subpath start, original coordinates
  let i = 0;
  let command = '';
  while (i < tokens.length) {
    const token = tokens[i];
    if (typeof token === 'string') { command = token; i += 1; if (command === 'z' || command === 'Z') { parts.push(command); cx = sx; cy = sy; } continue; }
    const lower = command.toLowerCase();
    const relative = command === lower;
    const n = ARGS[lower];
    if (!n) throw new Error('Arguments after ' + command);
    const args = tokens.slice(i, i + n).map(Number);
    i += n;
    const pts: string[] = [];
    const abs = (x: number, y: number) => relative ? [cx + x, cy + y] as const : [x, y] as const;
    const emitPoint = (x: number, y: number) => {
      if (relative) { const [vx, vy] = vector(x, y); pts.push(fmt(vx), fmt(vy)); }
      else { const [px, py] = point(x, y); pts.push(fmt(px), fmt(py)); }
    };
    let out = command;
    if (lower === 'm' && relative && parts.length === 0) {
      const [px, py] = point(args[0]!, args[1]!);
      parts.push('M' + fmt(px) + ' ' + fmt(py));
      cx = sx = args[0]!; cy = sy = args[1]!; command = 'l';
      continue;
    }
    if (lower === 'h' || lower === 'v') {
      const dx = lower === 'h' ? (relative ? args[0]! : args[0]! - cx) : 0;
      const dy = lower === 'v' ? (relative ? args[0]! : args[0]! - cy) : 0;
      out = relative ? 'l' : 'L';
      if (relative) emitPoint(dx, dy); else emitPoint(cx + dx, cy + dy);
      cx += dx; cy += dy;
    } else if (lower === 'a') {
      const [rx, ry, rot, large, sweep, x, y] = args as [number, number, number, number, number, number, number];
      pts.push(fmt(rx), fmt(ry), fmt(rot + degrees), String(large), String(sweep));
      emitPoint(x, y);
      [cx, cy] = abs(x, y);
    } else {
      for (let k = 0; k < n; k += 2) emitPoint(args[k]!, args[k + 1]!);
      [cx, cy] = abs(args[n - 2]!, args[n - 1]!);
      if (lower === 'm') { sx = cx; sy = cy; command = relative ? 'l' : 'L'; }
    }
    parts.push(out + pts.join(' '));
  }
  return parts.join(' ');
}
