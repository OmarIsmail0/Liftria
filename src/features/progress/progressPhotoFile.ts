import * as ImageManipulator from 'expo-image-manipulator';
import {
  PROGRESS_PHOTO_JPEG_QUALITY, PROGRESS_PHOTO_LONG_EDGE, PROGRESS_PHOTO_MAX_BASE64, resizeForProgressPhoto,
} from './progressPhotos';

/** The re-encoded JPEG is the only bytes kept. saveAsync writes a new file and drops EXIF. */
export type CleanProgressPhoto = {
  uri: string;
  width: number;
  height: number;
  base64: string;
  mimeType: 'image/jpeg';
};

export async function sanitizeProgressPhoto(
  asset: { uri: string; width: number; height: number },
): Promise<CleanProgressPhoto> {
  if (!asset.uri.startsWith('file://')) throw new Error('Photo is not a local file');
  const size = resizeForProgressPhoto(asset.width, asset.height);
  const context = ImageManipulator.ImageManipulator.manipulate(asset.uri);
  if (Object.keys(size).length) context.resize(size);
  const image = await context.renderAsync();
  const resized = await image.saveAsync({
    compress: PROGRESS_PHOTO_JPEG_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });
  const width = Math.round(resized.width);
  const height = Math.round(resized.height);
  if (!resized.base64 || !resized.uri || !resized.uri.startsWith('file://')
    || width < 1 || height < 1 || width > PROGRESS_PHOTO_LONG_EDGE || height > PROGRESS_PHOTO_LONG_EDGE
    || resized.base64.length > PROGRESS_PHOTO_MAX_BASE64) {
    throw new Error('Could not sanitize photo');
  }
  return { uri: resized.uri, width, height, base64: resized.base64, mimeType: 'image/jpeg' };
}
