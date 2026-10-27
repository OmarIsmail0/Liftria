import {dbOperation,type DbResult} from '../../services/database';
import {localDay} from './foodCatalog';

export type WaterLog={day:string;glasses:number;glassMl:number;loggedAt:string};
const validDay=(day:string)=>/^\d{4}-\d{2}-\d{2}$/.test(day);
/** null means no water entry. Zero means explicitly logged zero, not missing. */
export function nextGlasses(previous:number|null,delta:-1|1):number|null{
 if(previous===null&&delta<0)return null;
 return Math.max(0,Math.min(200,(previous??0)+delta));
}
export async function readWater(day=localDay(new Date())):Promise<DbResult<WaterLog|null>>{
 return dbOperation(async db=>{
  if(!validDay(day))throw new Error('Invalid water date');
  const found=await db.getFirstAsync<{day:string;glasses:number;glass_ml:number;logged_at:string}>(
   'SELECT day,glasses,glass_ml,logged_at FROM water_logs WHERE day=?',[day]);
  return found?{day:found.day,glasses:found.glasses,glassMl:found.glass_ml,loggedAt:found.logged_at}:null;
 });
}
/** Atomic updates ensure rapid taps never lose increments. Saving one count and its glass
 * size snapshots the historical volume even if the user's preferred glass size changes. */
export async function adjustWater(day:string,delta:-1|1,glassMl:number):Promise<DbResult<WaterLog|null>>{
 return dbOperation(async db=>{
  if(!validDay(day)||!Number.isInteger(glassMl)||glassMl<50||glassMl>1000)
   throw new Error('Invalid water input');
  let result:WaterLog|null=null;
  await db.withExclusiveTransactionAsync(async tx=>{
   const before=await tx.getFirstAsync<{glasses:number;glass_ml:number}>(
    'SELECT glasses,glass_ml FROM water_logs WHERE day=?',[day]);
   const count=nextGlasses(before?.glasses??null,delta);
   if(count===null)return;
   const loggedAt=new Date().toISOString();
   await tx.runAsync('INSERT INTO water_logs(day,glasses,glass_ml,logged_at) VALUES (?,?,?,?) '+
    'ON CONFLICT(day) DO UPDATE SET glasses=excluded.glasses,glass_ml=excluded.glass_ml,logged_at=excluded.logged_at',
    [day,count,glassMl,loggedAt]);
   result={day,glasses:count,glassMl,loggedAt};
  });
  return result;
 });
}
