import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/** A bare beforeRemove listener does not stop the native iOS swipe-back in a native stack;
 * only usePreventRemove sets preventNativeDismiss. Unsaved-change guards must use the hook. */
export function bareBeforeRemoveListeners(source: string): number {
  return (source.match(/addListener\(\s*['"]beforeRemove['"]/g) ?? []).length;
}

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sources(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

test('the checker finds a bare beforeRemove listener', () => {
  expect(bareBeforeRemoveListeners("navigation.addListener('beforeRemove', e => e.preventDefault())")).toBe(1);
  expect(bareBeforeRemoveListeners('usePreventRemove(dirty, ({ data }) => show(data.action))')).toBe(0);
});

test('screens guard unsaved changes with usePreventRemove, not a bare beforeRemove listener', () => {
  const root = join(__dirname, '..', '..', '..');
  const offenders = [...sources(join(root, 'app')), ...sources(join(root, 'src'))]
    .filter(path => bareBeforeRemoveListeners(readFileSync(path, 'utf8')) > 0);
  expect(offenders).toEqual([]);
});
