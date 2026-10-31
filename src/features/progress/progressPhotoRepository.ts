import { dbOperation, type DbResult } from '../../services/database';
import { newGymId } from '../../services/database/exerciseLibrary';
import { cleanNote, measurementDateOk } from './measurements';
import {
  PROGRESS_PHOTO_LONG_EDGE, PROGRESS_PHOTO_MAX_BASE64, isPose,
  type Pose, type ProgressPhoto,
} from './progressPhotos';

type Row = {
  id: string;
  taken_at: string;
  pose: string;
  jpeg_base64: string;
  width: number;
  height: number;
  note: string | null;
  source: string;
};

const SELECT = 'SELECT id,taken_at,pose,jpeg_base64,width,height,note,source FROM progress_photos';

export type NewProgressPhoto = {
  takenAt: string;
  pose: Pose;
  jpegBase64: string;
  width: number;
  height: number;
  note: string | null;
};

export function validateProgressPhoto(input: NewProgressPhoto): boolean {
  return isPose(input.pose)
    && measurementDateOk(input.takenAt)
    && Number.isInteger(input.width) && input.width >= 1 && input.width <= PROGRESS_PHOTO_LONG_EDGE
    && Number.isInteger(input.height) && input.height >= 1 && input.height <= PROGRESS_PHOTO_LONG_EDGE
    && input.jpegBase64.length > 0 && input.jpegBase64.length <= PROGRESS_PHOTO_MAX_BASE64
    && (input.note === null || input.note.length <= 400);
}

function toPhoto(row: Row): ProgressPhoto {
  if (!isPose(row.pose) || row.source !== 'liftria') throw new Error('Invalid progress photo');
  return {
    id: row.id,
    takenAt: row.taken_at,
    pose: row.pose,
    jpegBase64: row.jpeg_base64,
    width: row.width,
    height: row.height,
    note: row.note,
    source: 'liftria',
  };
}

export async function listProgressPhotos(): Promise<DbResult<ProgressPhoto[]>> {
  return dbOperation(async db =>
    (await db.getAllAsync<Row>(SELECT + ' ORDER BY taken_at DESC,id DESC')).map(toPhoto));
}

export async function getProgressPhoto(id: string): Promise<DbResult<ProgressPhoto | null>> {
  return dbOperation(async db => {
    const row = await db.getFirstAsync<Row>(SELECT + ' WHERE id=? AND source=?', [id, 'liftria']);
    return row ? toPhoto(row) : null;
  });
}

export async function addProgressPhoto(input: NewProgressPhoto): Promise<DbResult<ProgressPhoto>> {
  return dbOperation(async db => {
    if (!validateProgressPhoto(input)) throw new Error('Invalid progress photo');
    const note = cleanNote(input.note);
    const id = newGymId();
    await db.runAsync(
      'INSERT INTO progress_photos (id,taken_at,pose,jpeg_base64,width,height,note,source) VALUES (?,?,?,?,?,?,?,?)',
      [id, input.takenAt, input.pose, input.jpegBase64, input.width, input.height, note, 'liftria'],
    );
    return {
      id, takenAt: input.takenAt, pose: input.pose, jpegBase64: input.jpegBase64,
      width: input.width, height: input.height, note, source: 'liftria',
    };
  });
}

export async function saveProgressPhotoNote(id: string, note: string | null): Promise<DbResult<ProgressPhoto>> {
  return dbOperation(async db => {
    if (note !== null && note.length > 400) throw new Error('Note too long');
    const existing = await db.getFirstAsync<Row>(SELECT + ' WHERE id=? AND source=?', [id, 'liftria']);
    if (!existing) throw new Error('Progress photo not found');
    const clean = cleanNote(note);
    await db.runAsync('UPDATE progress_photos SET note=? WHERE id=? AND source=?', [clean, id, 'liftria']);
    return { ...toPhoto(existing), note: clean };
  });
}

export async function removeProgressPhoto(id: string): Promise<DbResult<ProgressPhoto | null>> {
  return dbOperation(async db => {
    const existing = await db.getFirstAsync<Row>(SELECT + ' WHERE id=? AND source=?', [id, 'liftria']);
    if (!existing) return null;
    await db.runAsync('DELETE FROM progress_photos WHERE id=? AND source=?', [id, 'liftria']);
    return toPhoto(existing);
  });
}

export type ProgressPhotoUsage = { count: number; bytes: number };

export async function progressPhotoUsage(): Promise<DbResult<ProgressPhotoUsage>> {
  return dbOperation(async db => {
    const row = await db.getFirstAsync<{ count: number; bytes: number }>(
      'SELECT COUNT(*) AS count, COALESCE(SUM(LENGTH(jpeg_base64)),0) AS bytes FROM progress_photos',
    );
    return { count: row?.count ?? 0, bytes: row?.bytes ?? 0 };
  });
}
