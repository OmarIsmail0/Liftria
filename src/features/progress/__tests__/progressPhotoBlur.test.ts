import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Image } from 'react-native';
import type { TranslationKey, TranslationParams } from '../../../i18n';
import { PROGRESS_PHOTO_BLUR, type ProgressPhotoFrame } from '../progressPhotos';
import { ProgressPhotosCard } from '../ProgressPhotos';

jest.mock('react-native-reanimated', () => {
  const { View: AnimatedView } = jest.requireActual('react-native') as typeof import('react-native');
  const identity = (value: unknown) => value;
  return {
    __esModule: true,
    default: { View: AnimatedView },
    Easing: { linear: identity, out: () => identity, in: () => identity, inOut: identity, cubic: identity, bezier: () => identity },
    useSharedValue: (value: unknown) => ({ get: () => value, set: () => undefined }),
    useAnimatedStyle: (factory: () => object) => factory(),
    withSpring: identity,
    withTiming: identity,
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('expo-router', () => {
  const ReactActual = jest.requireActual('react') as typeof import('react');
  return {
    router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false },
    useLocalSearchParams: () => ({}),
    useFocusEffect: (effect: () => void) => {
      ReactActual.useEffect(() => { effect(); }, [effect]);
    },
  };
});
jest.mock('../../../design/ThemeProvider', () => {
  const tokens = jest.requireActual('../../../design/tokens') as typeof import('../../../design/tokens');
  const theme = tokens.createTheme('dark', 'solid');
  return { useTheme: () => ({ theme, reduceMotion: true }) };
});
jest.mock('../../../i18n/LanguageProvider', () => ({
  useLanguage: () => {
    const i18n = jest.requireActual('../../../i18n') as typeof import('../../../i18n');
    return {
      language: 'en' as const,
      isRTL: false,
      t: (key: TranslationKey, params?: TranslationParams) => i18n.translate('en', key, params),
    };
  },
}));

const frame: ProgressPhotoFrame = {
  id: 'front-1',
  takenAt: '2026-10-20T12:00:00.000Z',
  pose: 'front',
  note: null,
  image: { kind: 'jpeg', base64: 'AQID' },
};

function renderCard(startRevealed: boolean) {
  let tree: TestRenderer.ReactTestRenderer | undefined;
  act(() => {
    tree = TestRenderer.create(React.createElement(ProgressPhotosCard, {
      preview: { frames: [frame], startRevealed },
    }));
  });
  if (!tree) throw new Error('Card did not render');
  return tree;
}

test('body thumbnails stay blurred until Show photos is tapped', () => {
  const tree = renderCard(false);
  const image = tree.root.findByType(Image);
  expect(image.props.blurRadius).toBe(PROGRESS_PHOTO_BLUR);
  expect(image.props.accessibilityLabel).toBe('Hidden progress photo');
  const labeled = tree.root.findAll(node => typeof node.props?.accessibilityLabel === 'string');
  const labels = labeled.map(node => String(node.props.accessibilityLabel));
  const show = labeled.find(node => node.props.accessibilityLabel === 'Show photos');
  if (!show) throw new Error('Show photos was not on screen: ' + labels.join(' | '));
  act(() => { show.props.onPress(); });
  expect(tree.root.findByType(Image).props.blurRadius).toBe(0);
  expect(tree.root.findByType(Image).props.accessibilityLabel).toBe('Front progress photo');
});

test('the progress photo demo draws illustrations and does not call the database', () => {
  const { readFileSync } = jest.requireActual('fs') as { readFileSync: (file: string, encoding: 'utf8') => string };
  const { join } = jest.requireActual('path') as { join: (...parts: string[]) => string };
  const demo = readFileSync(join(process.cwd(), 'app/dev/demo-progress-photos.tsx'), 'utf8');
  expect(demo).toContain('kind: \'drawing\'');
  expect(demo).not.toContain('progressPhotoRepository');
  expect(demo).not.toContain('addProgressPhoto');
  expect(demo).not.toContain('jpeg');
  expect(demo).not.toContain('.png');
  expect(demo).not.toContain('.jpg');
});

test('the privacy setting shows thumbnails without a tap', () => {
  const tree = renderCard(true);
  expect(tree.root.findByType(Image).props.blurRadius).toBe(0);
  expect(tree.root.findAll(node => node.props?.accessibilityLabel === 'Show photos')).toEqual([]);
});
