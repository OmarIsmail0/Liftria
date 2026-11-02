/** One `rotate(angle cx cy)` step from an SVG transform list. */
const ROTATE_STEP = /rotate\(\s*-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?\s*\)/y;

/**
 * Split a transform that is only rotate() steps.
 * Pose art uses lists such as "rotate(a x y) rotate(b x y)". Returns null when
 * the string contains anything else, so the caller can pass that string through.
 */
export function rotateList(transform: string): readonly string[] | null {
  const steps: string[] = [];
  const pattern = new RegExp(ROTATE_STEP.source, 'y');
  let cursor = 0;
  while (cursor < transform.length) {
    while (cursor < transform.length && (transform[cursor] === ' ' || transform[cursor] === ',')) cursor += 1;
    if (cursor >= transform.length) break;
    pattern.lastIndex = cursor;
    const match = pattern.exec(transform);
    if (!match) return null;
    steps.push(match[0]);
    cursor = pattern.lastIndex;
  }
  return steps.length > 0 ? steps : null;
}
