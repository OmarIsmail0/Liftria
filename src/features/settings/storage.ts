import { bidiIsolate, translate, type AppLanguage } from '../../i18n';
import { clearLocalHealthCache, deleteLocalDatabase, localStorageCounts } from '../../services/database';
import { deleteKey } from '../../services/secure-storage';
import { clearImportDraft } from '../import/importDraft';

export function canDeleteEverything(text: string): boolean { return text === 'DELETE'; }

export async function clearHealthCacheOnPhone(language: AppLanguage = 'en'): Promise<{ ok: boolean; message: string }> {
  const cleared = await clearLocalHealthCache();
  if (!cleared.ok) return {ok:false,message:translate(language,'dataStorage.cacheFailed')};
  return {ok:true,message:translate(language,'dataStorage.cacheCleared')};
}

export type DeleteLocalOutcome =
  | {ok:true}
  | {ok:false;stage:'database'|'key';message:string};
export type DeletionOps = {
  removeDatabase: typeof deleteLocalDatabase;
  removeKey: typeof deleteKey;
};
export const deletionOps: DeletionOps = { removeDatabase: deleteLocalDatabase, removeKey: deleteKey };
/** Only v2 SQLite and SecureStore contain user-managed data in Phase 2. No app-created document files exist. */
export function deletionIncludesAppFiles(): boolean { return false; }
export function formatLocalDatabaseSize(bytes: number, language: AppLanguage = 'en'): string {
  if (!Number.isFinite(bytes) || bytes < 0) return translate(language, 'dataStorage.sizeUnavailable');
  const megabytes = (bytes / (1024 * 1024)).toFixed(2);
  return language === 'ar'
    ? bidiIsolate(language, megabytes + '\u00A0' + translate(language, 'units.mb'))
    : `${megabytes} ${translate(language, 'units.mb')}`;
}

/** Database first, Android Keystore key second. Never claim success after partial failure. */
export async function deleteEverythingOnPhone(confirmation:string, ops: DeletionOps = deletionOps,
  language: AppLanguage = 'en'): Promise<DeleteLocalOutcome> {
  if (!canDeleteEverything(confirmation)) return {ok:false,stage:'database',message:translate(language,'dataStorage.typeDelete')};
  const database = await ops.removeDatabase();
  if (!database.ok) return {ok:false,stage:'database',
    message:translate(language,'dataStorage.deleteDatabaseFailed')};
  const key = await ops.removeKey();
  if (key.status !== 'missing') return {ok:false,stage:'key',
    message:translate(language,'dataStorage.deleteKeyFailed')};
  clearImportDraft();
  return {ok:true};
}

export async function healthRecordCount():Promise<number|null> {
  const counts = await localStorageCounts();
  return counts.ok ? counts.value.healthSamples + counts.value.healthAggregates : null;
}
