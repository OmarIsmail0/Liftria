import { captureProgressPhoto, saveCapturedPhoto, type CaptureDeps, type PickedSelection } from '../progressPhotoCapture';
import type { CleanProgressPhoto } from '../progressPhotoFile';

const clean: CleanProgressPhoto = {
  uri: 'file:///cache/ImageManipulator/out.jpg', width: 1080, height: 720, base64: 'AQID', mimeType: 'image/jpeg',
};

function deps(over: Partial<CaptureDeps> = {}): CaptureDeps {
  const library: PickedSelection = { canceled: false, asset: { uri: 'file:///gallery/keep.jpg', width: 4000, height: 3000 } };
  return {
    requestCameraPermission: jest.fn(async () => ({ granted: true })),
    launchCamera: jest.fn(async () => ({ canceled: false, asset: { uri: 'file:///cache/ImagePicker/shot.jpg', width: 4000, height: 3000 } })),
    launchLibrary: jest.fn(async () => library),
    sanitize: jest.fn(async () => clean),
    deleteFile: jest.fn(),
    isOwnCacheFile: uri => uri.startsWith('file:///cache/'),
    ...over,
  };
}

test('a refused camera never opens the camera and nothing is saved', async () => {
  const used = deps({ requestCameraPermission: jest.fn(async () => ({ granted: false })) });
  const captured = await captureProgressPhoto(true, used);
  const save = jest.fn();
  expect(captured.kind).toBe('denied');
  expect(used.launchCamera).not.toHaveBeenCalled();
  expect(used.sanitize).not.toHaveBeenCalled();
  expect(await saveCapturedPhoto(captured, save)).toBe(false);
  expect(save).not.toHaveBeenCalled();
});

test('cancelling the picker saves nothing and does not resize', async () => {
  const used = deps({ launchLibrary: jest.fn(async () => ({ canceled: true, asset: null })) });
  const captured = await captureProgressPhoto(false, used);
  const save = jest.fn();
  expect(captured.kind).toBe('cancelled');
  expect(used.requestCameraPermission).not.toHaveBeenCalled();
  expect(used.sanitize).not.toHaveBeenCalled();
  expect(await saveCapturedPhoto(captured, save)).toBe(false);
  expect(save).not.toHaveBeenCalled();
});

test('the gallery does not ask for the camera and a gallery original is not deleted', async () => {
  const used = deps();
  const captured = await captureProgressPhoto(false, used);
  const save = jest.fn(async () => undefined);
  expect(captured.kind).toBe('ready');
  expect(used.requestCameraPermission).not.toHaveBeenCalled();
  expect(used.launchCamera).not.toHaveBeenCalled();
  expect(used.deleteFile).not.toHaveBeenCalled();
  expect(await saveCapturedPhoto(captured, save)).toBe(true);
  expect(save).toHaveBeenCalledWith(clean);
});

test('a camera capture deletes only the temporary source, not the sanitized JPEG', async () => {
  const used = deps();
  const captured = await captureProgressPhoto(true, used);
  expect(captured.kind).toBe('ready');
  expect(used.requestCameraPermission).toHaveBeenCalledTimes(1);
  expect(used.deleteFile).toHaveBeenCalledWith('file:///cache/ImagePicker/shot.jpg');
  expect(used.deleteFile).not.toHaveBeenCalledWith(clean.uri);
});
