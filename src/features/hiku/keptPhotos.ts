import {dbOperation,type DbResult} from '../../services/database';

/** Photo JPEGs only live under this existing app_settings prefix, which is
 * included in JSON backups and removed by Delete All. GLOB uses a literal
 * prefix; no user-supplied wildcard or substring may select other settings. */
const PHOTO_KEY_GLOB='hiku.photo.*';
export type KeptPhotoUsage={count:number;bytes:number};
/** Stored text is JSON with ASCII base64; LENGTH(value) approximates database
 * space actually occupied, including base64 overhead and the small JSON wrapper. */
export async function keptPhotoUsage():Promise<DbResult<KeptPhotoUsage>>{
 return dbOperation(async db=>{
  const row=await db.getFirstAsync<{count:number;bytes:number}>(
   `SELECT COUNT(*) AS count,COALESCE(SUM(LENGTH(value)),0) AS bytes
    FROM app_settings WHERE key GLOB ?`,[PHOTO_KEY_GLOB]);
  return {count:row?.count??0,bytes:row?.bytes??0};
 });
}
/** Explicitly confirmed in Hiku Settings; keeps every unrelated preference,
 * other Hiku data and the request/cost history intact. */
export async function deleteKeptPhotos():Promise<DbResult<void>>{
 return dbOperation(async db=>{
  await db.runAsync('DELETE FROM app_settings WHERE key GLOB ?',[PHOTO_KEY_GLOB]);
 });
}
