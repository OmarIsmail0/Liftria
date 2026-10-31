import type { CleanProgressPhoto } from './progressPhotoFile';

export type PickedAsset = { uri: string; width: number; height: number };
export type PickedSelection = { canceled: boolean; asset: PickedAsset | null };

export type CaptureDeps = {
  requestCameraPermission: () => Promise<{ granted: boolean }>;
  launchCamera: () => Promise<PickedSelection>;
  launchLibrary: () => Promise<PickedSelection>;
  sanitize: (asset: PickedAsset) => Promise<CleanProgressPhoto>;
  deleteFile: (uri: string) => void;
  isOwnCacheFile: (uri: string) => boolean;
};

export type CaptureResult =
  | { kind: 'ready'; photo: CleanProgressPhoto }
  | { kind: 'denied' }
  | { kind: 'cancelled' }
  | { kind: 'image-error' };

function discardSource(camera: boolean, uri: string, deps: CaptureDeps) {
  if (!camera && !deps.isOwnCacheFile(uri)) return;
  try { deps.deleteFile(uri); } catch { /* The picker may already have removed it. */ }
}

/** Camera permission is requested only for Take a photo. A cancel or a refusal returns no photo. */
export async function captureProgressPhoto(camera: boolean, deps: CaptureDeps): Promise<CaptureResult> {
  try {
    if (camera) {
      const permission = await deps.requestCameraPermission();
      if (!permission.granted) return { kind: 'denied' };
    }
    const selection = camera ? await deps.launchCamera() : await deps.launchLibrary();
    if (selection.canceled || !selection.asset) return { kind: 'cancelled' };
    const sourceUri = selection.asset.uri;
    try {
      const photo = await deps.sanitize(selection.asset);
      return { kind: 'ready', photo };
    } finally {
      discardSource(camera, sourceUri, deps);
    }
  } catch {
    return { kind: 'image-error' };
  }
}

/** Writes nothing unless capture returned a sanitized photo. */
export async function saveCapturedPhoto(
  captured: CaptureResult,
  save: (photo: CleanProgressPhoto) => Promise<void>,
): Promise<boolean> {
  if (captured.kind !== 'ready') return false;
  await save(captured.photo);
  return true;
}
