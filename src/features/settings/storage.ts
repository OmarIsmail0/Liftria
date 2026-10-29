import { bidiIsolate, translate, type AppLanguage } from '../../i18n';
import { Directory, File, Paths } from 'expo-file-system';
import { clearLocalHealthCache, deleteLocalDatabase, localStorageCounts } from '../../services/database';
import { deleteKey } from '../../services/secure-storage';
import { clearImportDraft } from '../import/importDraft';

export function canDeleteEverything(text: string): boolean { return text === 'DELETE'; }

export async function clearHealthCacheOnPhone(language: AppLanguage = 'en'): Promise<{ ok: boolean; message: string }> {
  const cleared = await clearLocalHealthCache();
  if (!cleared.ok) return {ok:false,message:translate(language,'dataStorage.cacheFailed')};
  return {ok:true,message:translate(language,'dataStorage.cacheCleared')};
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
export function formatLocalDatabaseSize(bytes: number, language: AppLanguage = 'en'): string {
  if (!Number.isFinite(bytes) || bytes < 0) return translate(language, 'dataStorage.sizeUnavailable');
  const megabytes = (bytes / (1024 * 1024)).toFixed(2);
  return language === 'ar'
    ? bidiIsolate(language, megabytes + '\u00A0' + translate(language, 'units.mb'))
    : `${megabytes} ${translate(language, 'units.mb')}`;
}

/** Database first, Android Keystore key second, temporary files last. Never claim success after partial failure. */
export async function deleteEverythingOnPhone(confirmation:string, ops: DeletionOps = deletionOps,
  language: AppLanguage = 'en'): Promise<DeleteLocalOutcome> {
  if (!canDeleteEverything(confirmation)) return {ok:false,stage:'database',message:translate(language,'dataStorage.typeDelete')};
  const database = await ops.removeDatabase();
  if (!database.ok) return {ok:false,stage:'database',
    message:translate(language,'dataStorage.deleteDatabaseFailed')};
  const key = await ops.removeKey();
  if (key.status !== 'missing') return {ok:false,stage:'key',
    message:translate(language,'dataStorage.deleteKeyFailed')};
  if (!(await ops.removeTemporaryFiles())) return {ok:false,stage:'files',
    message:translate(language,'dataStorage.deleteFilesFailed')};
  clearImportDraft();
  return {ok:true};
}

export async function healthRecordCount():Promise<number|null> {
  const counts = await localStorageCounts();
  return counts.ok ? counts.value.healthSamples + counts.value.healthAggregates : null;
}
