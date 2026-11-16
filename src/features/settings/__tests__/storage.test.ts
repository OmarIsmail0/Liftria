import { canDeleteEverything, deleteEverythingOnPhone, formatLocalDatabaseSize,
  deletionIncludesAppFiles, type DeletionOps } from '../storage';
import { DB_MIGRATIONS, isMissingDatabaseError } from '../../../services/database';
import { getImportDraft, setImportDraft } from '../../import/importDraft';
jest.mock('expo-notifications', () => ({ cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined), dismissAllNotificationsAsync: jest.fn(async () => undefined) }));

test('ST-6 confirmation requires the exact uppercase DELETE', () => {
  expect(canDeleteEverything('DELETE')).toBe(true);
  for(const text of ['delete',' DELETE','DELETE ','Delete','']) expect(canDeleteEverything(text)).toBe(false);
});
test('ST-6 delete retry after key failure still clears the key even when the database is already missing', async () => {
  const removeDatabase = jest.fn(async () => ({ok:true as const,value:undefined}));
  const removeKey = jest.fn().mockResolvedValueOnce({status:'storage-error'})
    .mockResolvedValueOnce({status:'missing'});
  const ops: DeletionOps = {removeDatabase,removeKey,removeTemporaryFiles:jest.fn(async () => true)};
  const first = await deleteEverythingOnPhone('DELETE', ops);
  expect(first).toMatchObject({ok:false,stage:'key'});
  expect(await deleteEverythingOnPhone('DELETE',ops)).toEqual({ok:true});
  expect(removeDatabase).toHaveBeenCalledTimes(2);
  expect(removeKey).toHaveBeenCalledTimes(2);
});
test('ST-6 missing-file errors are idempotent, unrelated I/O errors are not suppressed', () => {
  expect(isMissingDatabaseError(new Error('deleteDatabaseAsync: no such file'))).toBe(true);
  expect(isMissingDatabaseError(new Error('ENOENT'))).toBe(true);
  expect(isMissingDatabaseError(new Error('permission denied'))).toBe(false);
});
test('ST-6 reports actual SQLite size in MB, not illustrative storage', () => {
  expect(formatLocalDatabaseSize(6*1024*1024)).toBe('6.00 MB');
  expect(formatLocalDatabaseSize(Number.NaN)).toBe('Size unavailable');
  expect(deletionIncludesAppFiles()).toBe(false);
});

test('Delete all also clears transient IM-2 import draft; v3 imports live only in deleted DB',async()=>{
 const schema=DB_MIGRATIONS[2].sql;
 for(const table of ['import_batches','sessions','session_exercises','sets','exercises']){
  expect(schema).toContain('CREATE TABLE IF NOT EXISTS '+table);
 }
 setImportDraft({parsed:null,error:null,source:'csv',fileName:'temporary.csv'});
 const ops:DeletionOps={
  removeDatabase:jest.fn(async()=>({ok:true as const,value:undefined})),
  removeKey:jest.fn(async()=>({status:'missing' as const})),
  removeTemporaryFiles:jest.fn(async()=>true),
 };
 expect(await deleteEverythingOnPhone('DELETE',ops)).toEqual({ok:true});
 expect(getImportDraft()).toBeNull();
 expect(deletionIncludesAppFiles()).toBe(false);
});
test('Delete all reports leftover temporary files instead of claiming success, and a retry finishes',async()=>{
 const removeTemporaryFiles=jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
 const ops:DeletionOps={
  removeDatabase:jest.fn(async()=>({ok:true as const,value:undefined})),
  removeKey:jest.fn(async()=>({status:'missing' as const})),
  removeTemporaryFiles,
 };
 expect(await deleteEverythingOnPhone('DELETE',ops)).toMatchObject({ok:false,stage:'files'});
 expect(await deleteEverythingOnPhone('DELETE',ops)).toEqual({ok:true});
 expect(removeTemporaryFiles).toHaveBeenCalledTimes(2);
});
test('Delete all cancels notifications even when removing the key or temporary files fails',async()=>{
 const removeNotifications=jest.fn(async()=>undefined);
 const base={removeDatabase:jest.fn(async()=>({ok:true as const,value:undefined})),removeNotifications};
 const keyFails:DeletionOps={...base,removeKey:jest.fn(async()=>({status:'storage-error' as const})),
  removeTemporaryFiles:jest.fn(async()=>true)};
 expect(await deleteEverythingOnPhone('DELETE',keyFails)).toMatchObject({ok:false,stage:'key'});
 expect(removeNotifications).toHaveBeenCalledTimes(1);
 const filesFail:DeletionOps={...base,removeKey:jest.fn(async()=>({status:'missing' as const})),
  removeTemporaryFiles:jest.fn(async()=>false)};
 expect(await deleteEverythingOnPhone('DELETE',filesFail)).toMatchObject({ok:false,stage:'files'});
 expect(removeNotifications).toHaveBeenCalledTimes(2);
});
