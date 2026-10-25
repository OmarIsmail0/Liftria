/** Atomic import persistence; never retains source CSV bytes or a file copy. */
import { dbOperation, type DbResult } from '../database';
import { newGymId, listExercises, bundledExercises } from '../database/exerciseLibrary';
import { readStrengthObservations } from '../database/historyRepository';
import type { RecordObservation } from '../database/gymMath';
import { fromImportWeight, localDayFromIso, type Importer } from './importCsv';
import { canImportPlan, mappingKey, type ImportContext, type ImportPlan } from './importPlanning';
const LAST_IMPORT='import.lastBatch';
export type ImportBatch={id:string;source:Importer;fileName:string|null;count:number;
 sets:number;skipped:number;createdExercises:string[];createdAt:string};
export type ImportOutcome={batchId:string;workouts:number;sets:number;skipped:number;custom:number};
export async function readImportContext():Promise<DbResult<ImportContext>>{
 const [library,observations]=await Promise.all([listExercises(true),readStrengthObservations()]);
 if(!library.ok||!observations.ok)return {ok:false,error:{code:'db-error',message:'Could not read import context.'}};
 return dbOperation(async db=>{
  const [sessions,batches,mappings]=await Promise.all([
   db.getAllAsync<{started_at:string}>('SELECT started_at FROM sessions'),
   db.getAllAsync<{file_hash:string}>('SELECT file_hash FROM import_batches'),
   db.getAllAsync<{key:string;value:string}>("SELECT key,value FROM app_settings WHERE key LIKE 'import.match.%'"),
  ]);
  const remembered:Record<string,string>={};
  for(const mapping of mappings)remembered[mapping.key]=mapping.value;
  const rows:RecordObservation[]=observations.value.map(s=>({
   exerciseId:s.exerciseId,type:s.type,sessionId:s.sessionId,endedAt:s.endedAt,
   kind:s.kind,side:s.side,weight:s.weight,reps:s.reps,
  }));
  return {exercises:library.value,days:[...new Set(sessions.map(s=>localDayFromIso(s.started_at)))],
   importedHashes:batches.map(b=>b.file_hash),remembered,observations:rows};
 });
}
export async function lastImportBatch():Promise<DbResult<ImportBatch|null>>{
 return dbOperation(async db=>{
  const current=await db.getFirstAsync<{value:string}>(
   'SELECT value FROM app_settings WHERE key=?',[LAST_IMPORT]);
  if(!current)return null;
  const b=await db.getFirstAsync<{id:string;importer:Importer;file_name:string|null;
   session_count:number;set_count:number;skipped_count:number;created_exercises:string;created_at:string}>(
   'SELECT * FROM import_batches WHERE id=?',[current.value]);
  if(!b)return null;
  return {id:b.id,source:b.importer,fileName:b.file_name,count:b.session_count,sets:b.set_count,
   skipped:b.skipped_count,createdExercises:JSON.parse(b.created_exercises) as string[],createdAt:b.created_at};
 });
}
/** Records, muscle map and history are derived live from the rows this transaction inserts. */
export async function commitImport(plan:ImportPlan):Promise<DbResult<ImportOutcome>>{
 if(!canImportPlan(plan))return {ok:false,error:{code:'db-error',message:'Import needs a nonempty valid plan and explicit units.'}};
 return dbOperation(async db=>{
  const id=newGymId(),made:string[]=[],when=new Date().toISOString();
  const map=new Map(plan.mappings.map(m=>[m.name,m]));
  let result:ImportOutcome|null=null;
  await db.withExclusiveTransactionAsync(async tx=>{
   const previous=await tx.getFirstAsync<{id:string}>(
    'SELECT id FROM import_batches WHERE file_hash=?',[plan.parsed.fileHash]);
   if(previous)throw new Error('This file was already imported');
   const present=await tx.getAllAsync<{started_at:string}>('SELECT started_at FROM sessions');
   const days=new Set(present.map(x=>localDayFromIso(x.started_at)));
   if(plan.workouts.some(w=>days.has(w.localDay)))throw new Error('Workouts changed since preview; refresh the import.');
   // The parent batch must exist before exercises can reference it (SQLite immediate FK).
   await tx.runAsync('INSERT INTO import_batches(id,file_hash,importer,file_name,session_count,'+
    'set_count,skipped_count,created_exercises,created_at) VALUES(?,?,?,?,?,?,?,?,?)',[
     id,plan.parsed.fileHash,plan.parsed.source,plan.parsed.fileName,
     plan.workouts.length,plan.setCount,plan.skippedDays.length,'[]',when,
    ]);
   const linked=new Map<string,string>();
   for(const mapping of plan.mappings){
    if(mapping.resolvedId){
     const found=await tx.getFirstAsync<{id:string}>('SELECT id FROM exercises WHERE id=?',[mapping.resolvedId]);
     if(!found){
      // The offline bundled pack may not have been installed before opening Import.
      // Seed only the specifically matched pack row *inside* this import transaction.
      const pack=bundledExercises().find(e=>e.id===mapping.resolvedId);
      if(!pack)throw new Error('Selected exercise no longer exists');
      await tx.runAsync('INSERT INTO exercises(id,name,aliases,equipment,type,unilateral,'+
       'primary_muscles,secondary_muscles,instructions,source,retired,pack_category) '+
       'VALUES(?,?,?,?,?,?,?,?,?,?,0,?)',[
        pack.id,pack.name,JSON.stringify(pack.aliases),pack.equipment,pack.type,
        pack.unilateral?1:0,JSON.stringify(pack.primaryMuscles),JSON.stringify(pack.secondaryMuscles),
        JSON.stringify(pack.instructions),'pack',pack.packCategory,
       ]);
     }
     linked.set(mapping.name,mapping.resolvedId);
    }else{
     const exerciseId=newGymId();
     await tx.runAsync('INSERT INTO exercises (id,name,aliases,equipment,type,unilateral,primary_muscles,'+
      "secondary_muscles,instructions,source,retired,pack_category,import_batch_id) VALUES (?,?,?,NULL,'weighted',0,'[]','[]','[]','import',0,NULL,?)",
      [exerciseId,mapping.name,'[]',id]);
     linked.set(mapping.name,exerciseId);made.push(exerciseId);
    }
   }
   await tx.runAsync('UPDATE import_batches SET created_exercises=? WHERE id=?',
    [JSON.stringify(made),id]);
   for(const workout of plan.workouts){
    const sessionId=newGymId();
    await tx.runAsync('INSERT INTO sessions(id,title,source,importer,import_batch_id,started_at,ended_at,notes,state) '+
     "VALUES(?,?,'imported-file',?,?,?,?,?,'finished')",[
      sessionId,workout.title,plan.parsed.source,id,workout.startedAt,workout.endedAt,
      workout.dateOnly?'Date-only export; sets timestamped at noon local.':null,
     ]);
    const exerciseIds=new Map<string,string>();let position=0;
    for(const set of workout.sets){
     const mapped=linked.get(set.exercise);
     if(!mapped||!map.has(set.exercise))throw new Error('Unmapped exercise; import rolled back');
     let seId=exerciseIds.get(set.exercise);
     if(!seId){seId=newGymId();exerciseIds.set(set.exercise,seId);
      await tx.runAsync('INSERT INTO session_exercises(id,session_id,exercise_id,position) VALUES(?,?,?,?)',
       [seId,sessionId,mapped,position++]);
     }
     const unit=set.unit??plan.unit;
     if(!unit)throw new Error('Missing unit: import rolled back');
     // Importer files do not carry L/R: null is an ordinary completed set for those sessions.
     await tx.runAsync('INSERT INTO sets(id,session_exercise_id,position,kind,side,weight,reps,logged_at,rest_deadline) '+
      'VALUES(?,?,?,?,NULL,?,?,?,NULL)',[
       newGymId(),seId,set.position,set.kind,fromImportWeight(set.weight,unit),set.reps,set.loggedAt,
      ]);
    }
   }
   for(const mapping of plan.mappings){
    // Only explicit choices are remembered; suggestions were never applied.
    await tx.runAsync('INSERT INTO app_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
     [mappingKey(plan.parsed.source,mapping.name),mapping.resolvedId??'custom']);
   }
   await tx.runAsync('INSERT INTO app_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    [LAST_IMPORT,id]);
   result={batchId:id,workouts:plan.workouts.length,sets:plan.setCount,skipped:plan.skippedDays.length,
    custom:made.length};
  });
  if(!result)throw new Error('No import');
  return result as ImportOutcome;
 });
}
export type UndoOutcome={sessions:number;sets:number;custom:number;keptCustom:number};
/** Latest batch only; removes import rows even if user edited them. */
export async function undoLastImport():Promise<DbResult<UndoOutcome|null>>{
 return dbOperation(async db=>{
  let removed:UndoOutcome|null=null;
  await db.withExclusiveTransactionAsync(async tx=>{
   const current=await tx.getFirstAsync<{value:string}>('SELECT value FROM app_settings WHERE key=?',[LAST_IMPORT]);
   if(!current)return;
   const batch=await tx.getFirstAsync<{id:string;created_exercises:string}>(
    'SELECT id,created_exercises FROM import_batches WHERE id=?',[current.value]);
   if(!batch)return;
   const rows=await tx.getAllAsync<{id:string}>('SELECT id FROM sessions WHERE import_batch_id=?',[batch.id]);
   const counter=await tx.getFirstAsync<{total:number}>(
    'SELECT COUNT(*) AS total FROM sets st JOIN session_exercises se ON se.id=st.session_exercise_id '+
    'JOIN sessions s ON s.id=se.session_id WHERE s.import_batch_id=?',[batch.id]);
   await tx.runAsync('DELETE FROM sets WHERE session_exercise_id IN '+
    '(SELECT se.id FROM session_exercises se JOIN sessions s ON s.id=se.session_id WHERE s.import_batch_id=?)',[batch.id]);
   await tx.runAsync('DELETE FROM session_exercises WHERE session_id IN '+
    '(SELECT id FROM sessions WHERE import_batch_id=?)',[batch.id]);
   await tx.runAsync('DELETE FROM sessions WHERE import_batch_id=?',[batch.id]);
   let deletedCustom=0,keptCustom=0;
   for(const id of JSON.parse(batch.created_exercises) as string[]){
    const used=await tx.getFirstAsync<{id:string}>(
     'SELECT id FROM session_exercises WHERE exercise_id=? UNION '+
     'SELECT id FROM template_exercises WHERE exercise_id=? LIMIT 1',[id,id]);
    if(used){keptCustom++;
     await tx.runAsync('UPDATE exercises SET import_batch_id=NULL WHERE id=?',[id]);
    }else{await tx.runAsync("DELETE FROM exercises WHERE id=? AND source='import' AND import_batch_id=?",[id,batch.id]);
     deletedCustom++;}
   }
   await tx.runAsync('DELETE FROM import_batches WHERE id=?',[batch.id]);
   await tx.runAsync('DELETE FROM app_settings WHERE key=?',[LAST_IMPORT]);
   removed={sessions:rows.length,sets:counter?.total??0,custom:deletedCustom,keptCustom};
  });
  return removed;
 });
}
