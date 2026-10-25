import { clearLocalHealthCache, deleteLocalDatabase, localStorageCounts } from '../../services/database';
import { deleteKey } from '../../services/secure-storage';
import { clearImportDraft } from '../import/importDraft';

export function canDeleteEverything(text: string): boolean { return text === 'DELETE'; }

export async function clearHealthCacheOnPhone(): Promise<{ ok: boolean; message: string }> {
  const cleared = await clearLocalHealthCache();
  if (!cleared.ok) return {ok:false,message:'Could not clear the cached Health Connect records.'};
  return {ok:true,message:'Health cache cleared. Liftria can re-read Health Connect next time.'};
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
export function formatLocalDatabaseSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Size unavailable';
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Database first, Android Keystore key second. Never claim success after partial failure. */
export async function deleteEverythingOnPhone(confirmation:string, ops: DeletionOps = deletionOps): Promise<DeleteLocalOutcome> {
  if (!canDeleteEverything(confirmation)) return {ok:false,stage:'database',message:'Type DELETE to confirm.'};
  const database = await ops.removeDatabase();
  if (!database.ok) return {ok:false,stage:'database',
    message:'Could not delete the Liftria database. Your key was not changed. Try again.'};
  const key = await ops.removeKey();
  if (key.status !== 'missing') return {ok:false,stage:'key',
    message:'Local database was deleted, but the saved API key could not be removed. Retry deletion from Settings.'};
  clearImportDraft();
  return {ok:true};
}

export async function healthRecordCount():Promise<number|null> {
  const counts = await localStorageCounts();
  return counts.ok ? counts.value.healthSamples + counts.value.healthAggregates : null;
}
