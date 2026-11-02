import { rotatePathData } from '../rotatePath';

const nums = (d: string) => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

describe('rotatePathData', () => {
  it('rotates absolute points about a centre', () => {
    expect(nums(rotatePathData('M10 0 L20 0', [{ degrees: 90, cx: 0, cy: 0 }]))).toEqual([0, 10, 0, 20]);
  });
  it('rotates relative moves and lines as vectors', () => {
    expect(nums(rotatePathData('M0 0 l10 0', [{ degrees: 90, cx: 5, cy: 5 }]))).toEqual([10, 0, 0, 10]);
  });
  it('turns H and V into lines and keeps Z', () => {
    const d = rotatePathData('M0 0 H10 V10 Z', [{ degrees: 90, cx: 0, cy: 0 }]);
    expect(d).toMatch(/^M0 0 L0 10 L-10 10 Z$/);
  });
  it('reads compact arc flags and adds the angle to the arc rotation', () => {
    const d = rotatePathData('M0 0a.62.61 25.9 01-.36-1.03', [{ degrees: 10, cx: 0, cy: 0 }]);
    const [, , rx, ry, rot, large, sweep] = nums(d);
    expect([rx, ry, rot, large, sweep]).toEqual([0.62, 0.61, 35.9, 0, 1]);
  });
  it('treats a leading relative move as absolute', () => {
    expect(nums(rotatePathData('m10 0', [{ degrees: 90, cx: 0, cy: 0 }]))).toEqual([0, 10]);
  });
});
