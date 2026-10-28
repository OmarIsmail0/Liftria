import { Directory, File, Paths } from 'expo-file-system';
import { clearLocalHealthCache, deleteLocalDatabase, localStorageCounts } from '../../services/database';
import { deleteKey } from '../../services/secure-storage';
import { clearImportDraft } from '../import/importDraft';

export function canDeleteEverything(text: string): boolean { return text === 'DELETE'; }

export async function clearHealthCacheOnPhone(): Promise<{ ok: boolean; message: string }> {
  const cleared = await clearLocalHealthCache();
  if (!cleared.ok) return {ok:false,message:'Could not clear the cached Health Connect records.'};
  return {ok:true,message:'Health cache cleared. Liftria can re-read Health Connect next time.'};
}

/** Cache folders where expo-image-picker and expo-image-manipulator write the Hiku photo
 * copies (the camera capture and the re-encoded JPEG), and expo-document-picker the copy of
 * a picked backup or import file. Each flow deletes its copy, but it stays if the app closes
 * mid-flow. The modules recreate the folder on their next use. */
export const TEMPORARY_FILE_FOLDERS = ['ImagePicker', 'ImageManipulator', 'DocumentPicker'] as const;
export type ExportKind = 'backup' | 'workouts' | 'diary';
/** Name of the export copy written to the cache root for the share sheet. */
export function exportFileName(kind: ExportKind, date: Date = new Date()): string {
  return `liftria-${kind}-${date.toISOString().slice(0, 10)}.${kind === 'backup' ? 'json' : 'csv'}`;
}
export function isExportFileName(name: string): boolean {
  return /^liftria-(?:backup-\d{4}-\d{2}-\d{2}\.json|(?:workouts|diary)-\d{4}-\d{2}-\d{2}\.csv)$/.test(name);
}
export async function deleteTemporaryFiles(): Promise<boolean> {
  try {
    for (const name of TEMPORARY_FILE_FOLDERS) {
      const folder = new Directory(Paths.cache, name);
      if (folder.exists) folder.delete();
    }
    for (const entry of Paths.cache.list())
      if (entry instanceof File && isExportFileName(entry.name)) entry.delete();
    return true;
  } catch {
    return false;
  }
}

export type DeleteLocalOutcome =
  | {ok:true}
  | {ok:false;stage:'database'|'key'|'files';message:string};
export type DeletionOps = {
  removeDatabase: typeof deleteLocalDatabase;
  removeKey: typeof deleteKey;
  removeTemporaryFiles: typeof deleteTemporaryFiles;
};
export const deletionOps: DeletionOps = {
  removeDatabase: deleteLocalDatabase, removeKey: deleteKey, removeTemporaryFiles: deleteTemporaryFiles,
};
/** Only v2 SQLite and SecureStore contain user-managed data in Phase 2. No app-created document files exist. */
export function deletionIncludesAppFiles(): boolean { return false; }
export function formatLocalDatabaseSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Size unavailable';
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Database first, Android Keystore key second, temporary files last. Never claim success after partial failure. */
export async function deleteEverythingOnPhone(confirmation:string, ops: DeletionOps = deletionOps): Promise<DeleteLocalOutcome> {
  if (!canDeleteEverything(confirmation)) return {ok:false,stage:'database',message:'Type DELETE to confirm.'};
  const database = await ops.removeDatabase();
  if (!database.ok) return {ok:false,stage:'database',
    message:'Could not delete the Liftria database. Your key was not changed. Try again.'};
  const key = await ops.removeKey();
  if (key.status !== 'missing') return {ok:false,stage:'key',
    message:'Local database was deleted, but the saved API key could not be removed. Retry deletion from Settings.'};
  if (!(await ops.removeTemporaryFiles())) return {ok:false,stage:'files',
    message:'Your data and API key were deleted, but some temporary files could not be removed. Try again.'};
  clearImportDraft();
  return {ok:true};
}

export async function healthRecordCount():Promise<number|null> {
  const counts = await localStorageCounts();
  return counts.ok ? counts.value.healthSamples + counts.value.healthAggregates : null;
}
