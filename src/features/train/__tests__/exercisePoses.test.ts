import { buildPose, POSE_KEYS, rotatePoint } from '../exercisePoses';

const numbers = (box: string) => box.split(' ').map(Number);

describe('exercise poses', () => {
  it('rotates about a centre', () => {
    const [x, y] = rotatePoint([10, 0], [0, 0], 90);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(10);
  });

  it.each(POSE_KEYS)('%s builds a figure with a highlighted muscle', key => {
    const pose = buildPose(key);
    expect(pose.primitives.length).toBeGreaterThan(40);
    expect(pose.primitives.some(p => p.kind === 'path' && p.role === 'p')).toBe(true);
    for (const box of [pose.viewBox, pose.thumbViewBox]) {
      const values = numbers(box);
      expect(values).toHaveLength(4);
      expect(values.every(Number.isFinite)).toBe(true);
      expect(values[2]).toBeGreaterThan(0);
      expect(values[3]).toBeGreaterThan(0);
    }
    const [, , w, h] = numbers(pose.thumbViewBox);
    expect(w).toBe(h);
    expect(JSON.stringify(pose.primitives)).not.toContain('NaN');
  });

  it('uses the exercise muscles when given', () => {
    const pose = buildPose('lateralRaise', { primary: ['trapezius'], secondary: [] });
    const roles = new Set(pose.primitives.filter(p => p.kind === 'path' && p.role !== 'm').map(p => p.role));
    expect([...roles]).toEqual(['p']);
  });
});
