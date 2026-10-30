type Entry = { name: string; isDirectory: () => boolean };
const { readdirSync, readFileSync } = jest.requireActual('fs') as {
  readdirSync: (dir: string, options: { withFileTypes: true }) => Entry[];
  readFileSync: (file: string, encoding: 'utf8') => string;
};
const { join } = jest.requireActual('path') as { join: (...parts: string[]) => string };

/** A bare beforeRemove listener does not stop the native iOS swipe-back in a native stack;
 * only usePreventRemove sets preventNativeDismiss. Unsaved-change guards must use the hook. */
function bareBeforeRemoveListeners(source: string): number {
  return (source.match(/addListener\(\s*['"]beforeRemove['"]/g) ?? []).length;
}

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sources(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

test('the checker finds a bare beforeRemove listener', () => {
  expect(bareBeforeRemoveListeners("navigation.addListener('beforeRemove', e => e.preventDefault())")).toBe(1);
  expect(bareBeforeRemoveListeners('usePreventRemove(dirty, ({ data }) => show(data.action))')).toBe(0);
});

test('screens guard unsaved changes with usePreventRemove, not a bare beforeRemove listener', () => {
  const offenders = [...sources(join(process.cwd(), 'app')), ...sources(join(process.cwd(), 'src'))]
    .filter(path => bareBeforeRemoveListeners(readFileSync(path, 'utf8')) > 0);
  expect(offenders).toEqual([]);
});
