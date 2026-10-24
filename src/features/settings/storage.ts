import { clearLocalHealthCache, deleteLocalDatabase, localStorageCounts } from '../../services/database';
import { deleteKey } from '../../services/secure-storage';

export function canDeleteEverything(text: string): boolean { return text === 'DELETE'; }

export async function clearHealthCacheOnPhone(): Promise<{ ok: boolean; message: string }> {
  const cleared = await clearLocalHealthCache();
  if (!cleared.ok) return {ok:false,message:'Could not clear the cached Health Connect records.'};
  return {ok:true,message:'Health cache cleared. Liftria can re-read Health Connect next time.'};
}

export type DeleteLocalOutcome =
  | {ok:true}
  | {ok:false;stage:'database'|'key';message:string};

/** Database first, Android Keystore key second. Never claim success after partial failure. */
export async function deleteEverythingOnPhone(confirmation:string): Promise<DeleteLocalOutcome> {
  if (!canDeleteEverything(confirmation)) return {ok:false,stage:'database',message:'Type DELETE to confirm.'};
  const database = await deleteLocalDatabase();
  if (!database.ok) return {ok:false,stage:'database',
    message:'Could not delete the Liftria database. Your key was not changed. Try again.'};
  const key = await deleteKey();
  if (key.status !== 'missing') return {ok:false,stage:'key',
    message:'Local database was deleted, but the saved API key could not be removed. Retry deletion from Settings.'};
  return {ok:true};
}

export async function healthRecordCount():Promise<number|null> {
  const counts = await localStorageCounts();
  return counts.ok ? counts.value.healthSamples + counts.value.healthAggregates : null;
}
