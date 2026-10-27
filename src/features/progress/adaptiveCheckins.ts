import {dbOperation,type DbResult} from '../../services/database';
import {targetSafety,type Goal} from '../onboarding/targetEstimate';
import {proposedMacros} from './adaptiveExpenditure';
import type {Target} from '../../services/database/targets';

export type CheckinStatus='pending'|'accepted'|'edited'|'dismissed';
export type WeeklyCheckin={
 week:string;createdAt:string;answeredAt:string|null;
 status:CheckinStatus;goal:Goal;estimatedBurn:number;proposedKcal:number;
 previousTargetId:number;chosenKcal:number|null;resultTargetId:number|null;
};
const keyFor=(week:string)=>'adaptive.checkin.'+week;
const validWeek=(week:string)=>/^\d{4}-\d{2}-\d{2}$/.test(week);
const decode=(text:string):WeeklyCheckin=>JSON.parse(text) as WeeklyCheckin;

/** App settings is already in the full SQLite backup and Delete All.
 * One durable, immutable offer per local Monday week; answered offers remain as history. */
export async function ensureWeeklyCheckin(week:string,goal:Goal,estimatedBurn:number,
 proposedKcal:number,currentTarget:Target):Promise<DbResult<WeeklyCheckin>>{
 return dbOperation(async db=>{
  if(!validWeek(week)||!Number.isFinite(estimatedBurn)||estimatedBurn<=0||
    !Number.isInteger(proposedKcal)||proposedKcal<1000)throw new Error('Invalid weekly estimate');
  let result:WeeklyCheckin|null=null;
  await db.withExclusiveTransactionAsync(async tx=>{
   const key=keyFor(week);
   const entry:WeeklyCheckin={
    week,createdAt:new Date().toISOString(),answeredAt:null,status:'pending',goal,
    estimatedBurn,proposedKcal,previousTargetId:currentTarget.id,
    chosenKcal:null,resultTargetId:null,
   };
   await tx.runAsync('INSERT OR IGNORE INTO app_settings (key,value) VALUES (?,?)',
     [key,JSON.stringify(entry)]);
   const row=await tx.getFirstAsync<{value:string}>('SELECT value FROM app_settings WHERE key=?',[key]);
   if(!row)throw new Error('Cannot read weekly check-in');
   result=decode(row.value);
  });
  if(!result)throw new Error('Missing check-in');
  return result as WeeklyCheckin;
 });
}
export async function readWeeklyCheckin(week:string):Promise<DbResult<WeeklyCheckin|null>>{
 return dbOperation(async db=>{
  if(!validWeek(week))throw new Error('Invalid week');
  const row=await db.getFirstAsync<{value:string}>('SELECT value FROM app_settings WHERE key=?',[keyFor(week)]);
  return row?decode(row.value):null;
 });
}
export async function listWeeklyCheckins(limit=52):Promise<DbResult<WeeklyCheckin[]>>{
 return dbOperation(async db=>{
  const rows=await db.getAllAsync<{value:string}>(
   "SELECT value FROM app_settings WHERE key LIKE 'adaptive.checkin.%' ORDER BY key DESC LIMIT ?",
   [Math.max(1,Math.min(limit,200))]);
  return rows.map(row=>decode(row.value));
 });
}
/** Dismiss changes only the audit record. Accept/edit atomically append a target
 * snapshot AND record the answer, gated by EA-6's hard floor and warning.
 * Reject if the target changed after this proposal was made. */
export async function answerWeeklyCheckin(week:string,action:'accept'|'edit'|'dismiss',
 kcal:number|null=null,acknowledgeWarning=false):Promise<DbResult<WeeklyCheckin>>{
 return dbOperation(async db=>{
  if(!validWeek(week))throw new Error('Invalid week');
  let updated:WeeklyCheckin|null=null;
  await db.withExclusiveTransactionAsync(async tx=>{
   const key=keyFor(week);
   const stored=await tx.getFirstAsync<{value:string}>('SELECT value FROM app_settings WHERE key=?',[key]);
   if(!stored)throw new Error('Check-in missing');
   const record=decode(stored.value);
   if(record.status!=='pending')throw new Error('Check-in already answered');
   let resultTargetId:number|null=null,chosenKcal:number|null=null;
   if(action!=='dismiss'){
    const next=action==='accept'?record.proposedKcal:kcal;
    if(next===null||!Number.isInteger(next)||next<1000||next>10000)throw new Error('Invalid target');
    const safety=targetSafety(next,record.estimatedBurn);
    if(safety.blocked||(safety.warning&&!acknowledgeWarning))throw new Error('Target safety confirmation required');
    const current=await tx.getFirstAsync<{
     id:number;protein_g:number;fat_g:number;
    }>('SELECT id,protein_g,fat_g FROM targets ORDER BY id DESC LIMIT 1');
    if(!current||current.id!==record.previousTargetId)
     throw new Error('Target changed after proposal; review current target');
    const macros=proposedMacros(next,current.protein_g,current.fat_g);
    const created=await tx.runAsync(
     'INSERT INTO targets (kcal,protein_g,fat_g,carbs_g,source,inputs_json,created_at) VALUES (?,?,?,?,?,?,?)',
     [macros.kcal,macros.proteinG,macros.fatG,macros.carbsG,'manual',null,new Date().toISOString()]);
    resultTargetId=created.lastInsertRowId;
    chosenKcal=next;
   }
   updated={...record,status:action==='dismiss'?'dismissed':action==='accept'?'accepted':'edited',
    chosenKcal,resultTargetId,answeredAt:new Date().toISOString()};
   await tx.runAsync('UPDATE app_settings SET value=? WHERE key=?',[JSON.stringify(updated),key]);
  });
  if(!updated)throw new Error('Check-in update failed');
  return updated as WeeklyCheckin;
 });
}
