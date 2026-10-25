/** Phase 3 PR F: completed workout history, transactional editing and Undo data. */
import { dbOperation, type DbResult } from './index';
import type { SQLiteBindValue } from 'expo-sqlite';
import { newGymId } from './exerciseLibrary';
import { calculateRecords, setVolume, type ExerciseRecord, type RecordObservation } from './gymMath';
import type { ExerciseType, Muscle } from './gymTypes';

export type HistorySession={id:string;title:string;startedAt:string;endedAt:string;notes:string|null;
  source:string;importer:string|null};
export type HistorySet={id:string;sessionExerciseId:string;position:number;kind:'working'|'warm-up';
  side:'L'|'R'|null;weight:number;reps:number;loggedAt:string;restDeadline:string|null};
export type HistoryExercise={id:string;exerciseId:string;name:string;type:ExerciseType;unilateral:boolean;
  position:number;primary:Muscle[];secondary:Muscle[];sets:HistorySet[]};
export type HistoryDetail={session:HistorySession;exercises:HistoryExercise[]};
type Snapshot={
  session:Record<string,unknown>;
  exercises:Record<string,unknown>[];
  sets:Record<string,unknown>[];
};
export type DeletedWorkout={id:string;title:string;snapshot:Snapshot};
export type SetEdit={id?:string;sessionExerciseId:string;position:number;kind:'working'|'warm-up';
  side:'L'|'R'|null;weight:number;reps:number};
function parseMuscles(s:string|null):Muscle[]{try{return JSON.parse(s??'[]') as Muscle[];}catch{return [];}}
export async function listCompletedWorkouts(limit=250):Promise<DbResult<HistorySession[]>>{
  return dbOperation(async db=>(await db.getAllAsync<{
    id:string;title:string;started_at:string;ended_at:string;notes:string|null;source:string;importer:string|null
  }>("SELECT id,title,started_at,ended_at,notes,source,importer FROM sessions "+
    "WHERE state='finished' ORDER BY started_at DESC LIMIT ?",[limit])).map(row=>({
      id:row.id,title:row.title,startedAt:row.started_at,endedAt:row.ended_at??row.started_at,
      notes:row.notes,source:row.source,importer:row.importer,
    })));
}
export async function readHistoryDetail(id:string):Promise<DbResult<HistoryDetail|null>>{
  return dbOperation(async db=>{
    const session=await db.getFirstAsync<{
      id:string;title:string;started_at:string;ended_at:string;notes:string|null;source:string;importer:string|null
    }>("SELECT id,title,started_at,ended_at,notes,source,importer FROM sessions "+
      "WHERE id=? AND state='finished'",[id]);
    if(!session)return null;
    const rows=await db.getAllAsync<{
      id:string;exercise_id:string;name:string;type:ExerciseType;unilateral:number;position:number;
      primary_muscles:string|null;secondary_muscles:string|null
    }>("SELECT se.*,e.name,e.type,e.unilateral,e.primary_muscles,e.secondary_muscles "+
      "FROM session_exercises se JOIN exercises e ON e.id=se.exercise_id "+
      "WHERE se.session_id=? ORDER BY se.position",[id]);
    const exercises:HistoryExercise[]=[];
    for(const e of rows){
      const sets=await db.getAllAsync<{
        id:string;session_exercise_id:string;position:number;kind:HistorySet['kind'];
        side:HistorySet['side'];weight:number;reps:number;logged_at:string;rest_deadline:string|null
      }>("SELECT * FROM sets WHERE session_exercise_id=? ORDER BY position,side",[e.id]);
      exercises.push({id:e.id,exerciseId:e.exercise_id,name:e.name,type:e.type,
        unilateral:e.unilateral===1,position:e.position,primary:parseMuscles(e.primary_muscles),
        secondary:parseMuscles(e.secondary_muscles),
        sets:sets.map(s=>({id:s.id,sessionExerciseId:s.session_exercise_id,position:s.position,
          kind:s.kind,side:s.side,weight:s.weight,reps:s.reps,loggedAt:s.logged_at,
          restDeadline:s.rest_deadline}))});
    }
    return {session:{id:session.id,title:session.title,startedAt:session.started_at,
      endedAt:session.ended_at??session.started_at,notes:session.notes,
      source:session.source,importer:session.importer},exercises};
  });
}
export function historyNumbers(detail:HistoryDetail):{sets:number;volume:number}{
  let sets=0,volume=0;
  for(const e of detail.exercises){
    const working=e.sets.filter(s=>s.kind==='working'&&s.reps>0);
    const byPosition=new Map<number,HistorySet[]>();
    for(const set of working)byPosition.set(set.position,[...(byPosition.get(set.position)??[]),set]);
    for(const pair of byPosition.values()){
      if(e.unilateral && !(pair.some(s=>s.side==='L')&&pair.some(s=>s.side==='R')))continue;
      sets++;
      for(const set of pair)volume+=setVolume(e.type,set)*
        (e.unilateral&&e.type==='dumbbell'?0.5:1);
    }
  }
  return {sets,volume};
}
/** All set replacements and notes update in one transaction; records are always derived from tables. */
export async function saveFinishedWorkout(id:string,title:string,notes:string|null,
  edits:SetEdit[]):Promise<DbResult<boolean>>{
  if(!title.trim()||title.length>120 || edits.some(s=>!Number.isFinite(s.weight)||s.weight<0||
    !Number.isInteger(s.reps)||s.reps<1||s.reps>500||
    !Number.isInteger(s.position)||s.position<0||s.position>1000))return {
    ok:false,error:{code:'db-error',message:'Invalid workout edits.'}};
  return dbOperation(async db=>{
    let updated=false;
    await db.withExclusiveTransactionAsync(async tx=>{
      const session=await tx.getFirstAsync<{id:string;ended_at:string|null;started_at:string}>(
        "SELECT id,ended_at,started_at FROM sessions WHERE id=? AND state='finished'",[id]);
      if(!session)return;
      const rows=await tx.getAllAsync<{id:string}>('SELECT id FROM session_exercises WHERE session_id=?',[id]);
      const allowed=new Set(rows.map(x=>x.id));
      const earlier=await tx.getAllAsync<{id:string;logged_at:string}>(
        'SELECT st.id,st.logged_at FROM sets st JOIN session_exercises se '+
        'ON se.id=st.session_exercise_id WHERE se.session_id=?',[id]);
      const when=new Map(earlier.map(s=>[s.id,s.logged_at]));
      if(edits.some(e=>!allowed.has(e.sessionExerciseId)))throw new Error('Set from another workout');
      // A completed set must be explicitly present in edits; omitted rows are removed.
      await tx.runAsync('DELETE FROM sets WHERE session_exercise_id IN '+
        '(SELECT id FROM session_exercises WHERE session_id=?)',[id]);
      for(const e of edits)await tx.runAsync(
        'INSERT INTO sets(id,session_exercise_id,position,kind,side,weight,reps,logged_at,rest_deadline) '+
        'VALUES(?,?,?,?,?,?,?,?,NULL)',[
          e.id??newGymId(),e.sessionExerciseId,e.position,e.kind,e.side,e.weight,e.reps,
          e.id?when.get(e.id)??session.ended_at??session.started_at:
            session.ended_at??session.started_at,
        ]);
      await tx.runAsync('UPDATE sessions SET title=?,notes=?,edited_at=? WHERE id=?',
        [title.trim(),notes,new Date().toISOString(),id]);
      updated=true;
    });
    return updated;
  });
}
/** Delete immediately; return exact database rows for the 8-second in-screen Undo. */
export async function deleteFinishedWorkout(id:string):Promise<DbResult<DeletedWorkout|null>>{
  return dbOperation(async db=>{
    let deleted:DeletedWorkout|null=null;
    await db.withExclusiveTransactionAsync(async tx=>{
      const session=await tx.getFirstAsync<Record<string,unknown>>(
        "SELECT * FROM sessions WHERE id=? AND state='finished'",[id]);
      if(!session)return;
      const exercises=await tx.getAllAsync<Record<string,unknown>>(
        'SELECT * FROM session_exercises WHERE session_id=?',[id]);
      const sets=await tx.getAllAsync<Record<string,unknown>>(
        'SELECT st.* FROM sets st JOIN session_exercises se ON se.id=st.session_exercise_id '+
        'WHERE se.session_id=?',[id]);
      await tx.runAsync('DELETE FROM sets WHERE session_exercise_id IN '+
        '(SELECT id FROM session_exercises WHERE session_id=?)',[id]);
      await tx.runAsync('DELETE FROM session_exercises WHERE session_id=?',[id]);
      await tx.runAsync('DELETE FROM sessions WHERE id=?',[id]);
      deleted={id,title:String(session.title??'Workout'),snapshot:{session,exercises,sets}};
    });
    return deleted;
  });
}
async function insertObject(tx:{runAsync:(sql:string,args:SQLiteBindValue[])=>Promise<unknown>},
  table:'sessions'|'session_exercises'|'sets',row:Record<string,unknown>):Promise<void>{
  const keys=Object.keys(row);
  await tx.runAsync('INSERT INTO '+table+' ('+keys.join(',')+') VALUES ('+
    keys.map(()=>'?').join(',')+')',keys.map(k=>(row[k]??null) as SQLiteBindValue));
}
export async function undoFinishedWorkout(deleted:DeletedWorkout):Promise<DbResult<boolean>>{
  return dbOperation(async db=>{
    let restored=false;
    await db.withExclusiveTransactionAsync(async tx=>{
      const existing=await tx.getFirstAsync<{id:string}>('SELECT id FROM sessions WHERE id=?',[deleted.id]);
      if(existing)return;
      await insertObject(tx,'sessions',deleted.snapshot.session);
      for(const row of deleted.snapshot.exercises)await insertObject(tx,'session_exercises',row);
      for(const row of deleted.snapshot.sets)await insertObject(tx,'sets',row);
      restored=true;
    });
    return restored;
  });
}
/** Compare baseline records with a hypothetical deletion (no changes or writes yet). */
export async function recordsChangedIfDeleted(id:string):Promise<DbResult<string[]>>{
  return dbOperation(async db=>{
    const rows=await db.getAllAsync<{
      exercise_id:string;type:ExerciseType;session_id:string;ended_at:string;
      kind:'working'|'warm-up';side:'L'|'R'|null;weight:number;reps:number
    }>("SELECT se.exercise_id,e.type,s.id AS session_id,s.ended_at,st.kind,st.side,st.weight,st.reps "+
      "FROM sets st JOIN session_exercises se ON se.id=st.session_exercise_id "+
      "JOIN exercises e ON e.id=se.exercise_id JOIN sessions s ON s.id=se.session_id "+
      "WHERE s.state='finished' AND st.kind='working' AND st.reps>0");
    const cast=(items:typeof rows):RecordObservation[]=>items.map(row=>({
      exerciseId:row.exercise_id,type:row.type,sessionId:row.session_id,
      endedAt:row.ended_at,kind:row.kind,side:row.side,weight:row.weight,reps:row.reps,
    }));
    const before=calculateRecords(cast(rows)),after=calculateRecords(cast(rows.filter(x=>x.session_id!==id)));
    const changed:string[]=[];
    for(const previous of before){
      const next=after.find(row=>row.exerciseId===previous.exerciseId&&row.side===previous.side);
      const fields=['heaviest','lowestAssistance','maxReps','maxRepsAtWeight',
        'bestEstimatedOneRepMax','bestSessionVolume'] as const;
      if(fields.some(k=>previous[k]!==next?.[k]))changed.push(previous.exerciseId);
    }
    const names=await db.getAllAsync<{id:string;name:string}>('SELECT id,name FROM exercises');
    return [...new Set(changed)].map(e=>names.find(x=>x.id===e)?.name??e);
  });
}
export type StrengthObservation={sessionId:string;exerciseId:string;name:string;type:ExerciseType;
  endedAt:string;weight:number;reps:number;kind:'working'|'warm-up';side:'L'|'R'|null;
  position:number;sessionExerciseId:string;unilateral:boolean;
  primary:Muscle[];secondary:Muscle[];loggedAt:string};
export async function readStrengthObservations():Promise<DbResult<StrengthObservation[]>>{
  return dbOperation(async db=>(await db.getAllAsync<{
    session_id:string;exercise_id:string;name:string;type:ExerciseType;ended_at:string;
    weight:number;reps:number;kind:'working'|'warm-up';side:'L'|'R'|null;position:number;
    session_exercise_id:string;unilateral:number;primary_muscles:string|null;
    secondary_muscles:string|null;logged_at:string
  }>("SELECT s.id AS session_id,se.exercise_id,e.name,e.type,s.ended_at, "+
    "st.weight,st.reps,st.kind,st.side,st.position,st.session_exercise_id,e.unilateral, "+
    "e.primary_muscles,e.secondary_muscles,st.logged_at "+
    "FROM sets st JOIN session_exercises se ON se.id=st.session_exercise_id "+
    "JOIN exercises e ON e.id=se.exercise_id JOIN sessions s ON s.id=se.session_id "+
    "WHERE s.state='finished' AND st.kind='working' AND st.reps>0")).map(s=>({
      sessionId:s.session_id,exerciseId:s.exercise_id,name:s.name,type:s.type,
      endedAt:s.ended_at,weight:s.weight,reps:s.reps,kind:s.kind,side:s.side,
      position:s.position,sessionExerciseId:s.session_exercise_id,unilateral:s.unilateral===1,
      primary:parseMuscles(s.primary_muscles),secondary:parseMuscles(s.secondary_muscles),
      loggedAt:s.logged_at,
    })));
}
