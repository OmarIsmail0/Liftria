import * as ImageManipulator from 'expo-image-manipulator';
import { sanitizeProgressPhoto } from '../progressPhotoFile';
import { PROGRESS_PHOTO_JPEG_QUALITY, PROGRESS_PHOTO_LONG_EDGE } from '../progressPhotos';

const resize = jest.fn();
const saveAsync = jest.fn(async () => ({
  uri: 'file:///cache/progress.jpg', width: 1080, height: 810, base64: 'AQIDBA==',
}));
const renderAsync = jest.fn(async () => ({ saveAsync }));
const manipulate = jest.fn(() => ({ resize, renderAsync }));

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: jest.fn() },
  SaveFormat: { JPEG: 'jpeg' },
}));

beforeEach(() => {
  jest.clearAllMocks();
  (ImageManipulator.ImageManipulator.manipulate as jest.Mock).mockImplementation(manipulate);
});

test('downscales the long edge to 1080 and re-encodes JPEG at quality 0.7', async () => {
  const result = await sanitizeProgressPhoto({ uri: 'file:///original.jpg', width: 4032, height: 3024 });
  expect(manipulate).toHaveBeenCalledWith('file:///original.jpg');
  expect(resize).toHaveBeenCalledWith({ width: PROGRESS_PHOTO_LONG_EDGE });
  expect(renderAsync).toHaveBeenCalledTimes(1);
  expect(saveAsync).toHaveBeenCalledWith({
    compress: PROGRESS_PHOTO_JPEG_QUALITY, format: 'jpeg', base64: true,
  });
  expect(result).toEqual({
    uri: 'file:///cache/progress.jpg', width: 1080, height: 810, base64: 'AQIDBA==', mimeType: 'image/jpeg',
  });
});

test('a portrait photo scales its height and a small photo is still re-encoded', async () => {
  saveAsync.mockResolvedValueOnce({ uri: 'file:///cache/tall.jpg', width: 810, height: 1080, base64: 'QQ==' });
  await sanitizeProgressPhoto({ uri: 'file:///tall.png', width: 3000, height: 4000 });
  expect(resize).toHaveBeenCalledWith({ height: 1080 });

  resize.mockClear();
  saveAsync.mockResolvedValueOnce({ uri: 'file:///cache/small.jpg', width: 640, height: 480, base64: 'QQ==' });
  await sanitizeProgressPhoto({ uri: 'file:///small.png', width: 640, height: 480 });
  expect(resize).not.toHaveBeenCalled();
  expect(saveAsync).toHaveBeenCalledWith({ compress: 0.7, format: 'jpeg', base64: true });
});

test('rejects a remote image and a result larger than 1080', async () => {
  await expect(sanitizeProgressPhoto({ uri: 'https://example.com/image.jpg', width: 100, height: 100 })).rejects.toThrow();
  expect(manipulate).not.toHaveBeenCalled();
  saveAsync.mockResolvedValueOnce({ uri: 'file:///cache/big.jpg', width: 1081, height: 800, base64: 'QQ==' });
  await expect(sanitizeProgressPhoto({ uri: 'file:///original.jpg', width: 4000, height: 3000 })).rejects.toThrow();
});
