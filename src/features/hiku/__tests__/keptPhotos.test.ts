import {keptPhotoUsage,deleteKeptPhotos} from '../keptPhotos';
import {dbOperation} from '../../../services/database';
const rows=new Map<string,string>();
const mockDb={
 getFirstAsync:jest.fn(async(_sql:string,args:unknown[])=>{
  expect(args).toEqual(['hiku.photo.*']);
  const selected=[...rows].filter(([key])=>key.startsWith('hiku.photo.'));
  return {count:selected.length,bytes:selected.reduce((sum,[,value])=>sum+value.length,0)};
 }),
 runAsync:jest.fn(async(sql:string,args:unknown[])=>{
  expect(sql).toBe('DELETE FROM app_settings WHERE key GLOB ?');
  expect(args).toEqual(['hiku.photo.*']);
  for(const key of [...rows.keys()])if(key.startsWith('hiku.photo.'))rows.delete(key);
  return {changes:1,lastInsertRowId:0};
 }),
};
jest.mock('../../../services/database',()=>({
 dbOperation:jest.fn(async(callback:(db:typeof mockDb)=>Promise<unknown>)=>{
  try{return {ok:true,value:await callback(mockDb)}}
  catch{return {ok:false,error:{code:'db-error',message:'failed'}}}
 }),
}));
beforeEach(()=>{rows.clear();jest.clearAllMocks();});
test('counts only retained-photo values and approximate storage bytes',async()=>{
 rows.set('hiku.photo.one','{"base64":"AQID"}');
 rows.set('hiku.photo.two','{"base64":"abcd"}');
 rows.set('hiku.keepPhotos','true');
 rows.set('hiku.model','"claude-haiku-5-5"');
 expect(await keptPhotoUsage()).toEqual({ok:true,value:{count:2,bytes:34}});
 expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
  expect.stringContaining('FROM app_settings WHERE key GLOB ?'),['hiku.photo.*']);
});
test('delete kept photos removes only hiku.photo.* and leaves unrelated preferences/history',async()=>{
 rows.set('hiku.photo.1','AAA');
 rows.set('hiku.photo.2','BBB');
 rows.set('hiku.keepPhotos','true');
 rows.set('hiku.photoDraft','keep');
 rows.set('adaptive.checkin.week','answer');
 expect(await deleteKeptPhotos()).toEqual({ok:true,value:undefined});
 expect([...rows]).toEqual([
  ['hiku.keepPhotos','true'],['hiku.photoDraft','keep'],['adaptive.checkin.week','answer'],
 ]);
 expect(await keptPhotoUsage()).toMatchObject({ok:true,value:{count:0,bytes:0}});
 expect(dbOperation).toHaveBeenCalled();
});
