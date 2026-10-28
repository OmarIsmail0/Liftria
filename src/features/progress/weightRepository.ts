import {dbOperation,listCachedHealth,type DbResult} from '../../services/database';
import {Platform} from 'react-native';
import {newGymId} from '../../services/database/exerciseLibrary';
import type {WeightPoint} from './trendMath';

export type LocalWeight=WeightPoint & {source:'liftria';note:string|null};
type Row={id:string;measured_at:string;kg:number;note:string|null;source:'liftria'};
const convert=(r:Row):LocalWeight=>({id:r.id,at:r.measured_at,kg:r.kg,note:r.note,source:'liftria'});
export function validateWeight(kg:number,at:string):boolean{
 const d=new Date(at);
 return Number.isFinite(kg)&&kg>0&&kg<=500&&Number.isFinite(d.getTime())&&d.getTime()<=Date.now()+86400000;
}
export function weightNeedsConfirmation(kg:number):boolean{return kg<20||kg>300;}
export async function listLocalWeights(limit=500):Promise<DbResult<LocalWeight[]>>{
 return dbOperation(async db=>(await db.getAllAsync<Row>(
  'SELECT id,measured_at,kg,note,source FROM weights ORDER BY measured_at DESC,id DESC LIMIT ?',
  [Math.max(1,Math.min(1000,Math.trunc(limit)||1))])).map(convert));
}
export async function saveWeight(kg:number,at:string,note:string|null,id?:string):Promise<DbResult<LocalWeight>>{
 return dbOperation(async db=>{
  if(!validateWeight(kg,at))throw new Error('Invalid weight or date');
  if(note!==null&&note.length>400)throw new Error('Note too long');
  const clean=note?.trim()||null;
  if(id){
    const row=await db.getFirstAsync<Row>('SELECT * FROM weights WHERE id=? AND source=?',[id,'liftria']);
    if(!row)throw new Error('Weight entry not found');
    await db.runAsync('UPDATE weights SET measured_at=?,kg=?,note=? WHERE id=? AND source=?',
      [at,kg,clean,id,'liftria']);
    return {id,at,kg,note:clean,source:'liftria'};
  }
  const next=newGymId();
  await db.runAsync('INSERT INTO weights (id,measured_at,kg,note,source) VALUES (?,?,?,?,?)',
   [next,at,kg,clean,'liftria']);
  return {id:next,at,kg,note:clean,source:'liftria'};
 });
}
export async function removeWeight(id:string):Promise<DbResult<LocalWeight|null>>{
 return dbOperation(async db=>{
  const row=await db.getFirstAsync<Row>('SELECT * FROM weights WHERE id=? AND source=?',[id,'liftria']);
  if(!row)return null;
  await db.runAsync('DELETE FROM weights WHERE id=? AND source=?',[id,'liftria']);
  return convert(row);
 });
}
/** Eight-second Undo reuses the ID; editing one row never touches Health Connect. */
export async function restoreWeight(weight:LocalWeight):Promise<DbResult<boolean>>{
 return dbOperation(async db=>{
  const result=await db.runAsync('INSERT OR IGNORE INTO weights (id,measured_at,kg,note,source) VALUES (?,?,?,?,?)',
   [weight.id,weight.at,weight.kg,weight.note,'liftria']);
  return result.changes>0;
 });
}
export async function cachedHealthWeights():Promise<DbResult<WeightPoint[]>>{
 // A restored Android backup must not appear as iPhone Apple Health readings.
 if(Platform.OS!=='android')return {ok:true,value:[]};
 const cache=await listCachedHealth(500);
 if(!cache.ok)return cache;
 const seen=new Set<string>(),values:WeightPoint[]=[];
 for(const row of cache.value){
  if(row.kind!=='instant'||row.metric!=='weight'||row.unit!=='kg'||
     !Number.isFinite(row.value)||row.value<=0)continue;
  const id=row.adapter+':'+row.recordId;
  if(seen.has(id))continue;seen.add(id);
  values.push({id,at:row.time,kg:row.value,source:'health-connect',origin:row.dataOrigin});
 }
 return {ok:true,value:values};
}
