import { opaqueStackOptions, stackPushAnimation } from '../stackTransition';

const { readFileSync } = jest.requireActual('fs') as {
  readFileSync: (file: string, encoding: 'utf8') => string;
};
const { join } = jest.requireActual('path') as {
  join: (...parts: string[]) => string;
};

test('Android slides in from the right, and Arabic mirrors that to the left', () => {
  expect(stackPushAnimation(false, 'android')).toBe('slide_from_right');
  expect(stackPushAnimation(true, 'android')).toBe('slide_from_left');
});

test('iPhone keeps the platform slide, which already mirrors', () => {
  expect(stackPushAnimation(false, 'ios')).toBe('default');
  expect(stackPushAnimation(true, 'ios')).toBe('default');
});

test('the sliding card uses the theme color, never a transparent fade', () => {
  expect(opaqueStackOptions('#06070C', false, 'android')).toEqual({
    headerShown: false,
    animation: 'slide_from_right',
    contentStyle: { backgroundColor: '#06070C' },
  });
  expect(opaqueStackOptions('#EEF0F7', true, 'android').animation).toBe('slide_from_left');
  expect(opaqueStackOptions('#0F1216', false, 'ios').animation).toBe('default');
});

test('train, eat, progress, hiku, settings and import use the opaque slide', () => {
  const files = [
    'app/(tabs)/train/_layout.tsx',
    'app/(tabs)/eat/_layout.tsx',
    'app/(tabs)/progress/_layout.tsx',
    'app/(tabs)/hiku/_layout.tsx',
    'app/settings/_layout.tsx',
    'app/import/_layout.tsx',
  ];
  for (const file of files) {
    const source = readFileSync(join(process.cwd(), file), 'utf8');
    expect(source).toContain('OpaqueStack');
    expect(source).not.toContain('transparent');
  }
});

test('the root navigator stays transparent so dark mode does not flash grey', () => {
  const root = readFileSync(join(process.cwd(), 'app/_layout.tsx'), 'utf8');
  expect(root).toContain("background: 'transparent'");
  expect(root).toContain('OpaqueStack');
  expect(root).not.toContain("contentStyle: { backgroundColor: 'transparent' }");
  expect(root).not.toContain('contentStyle:{backgroundColor:\'transparent\'}');
});
