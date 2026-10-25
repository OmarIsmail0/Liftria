import { dbOperation, type DbResult } from '../../services/database';
import { newGymId } from '../../services/database/exerciseLibrary';
import { setVolume } from '../../services/database/gymMath';
import type { ExerciseType } from '../../services/database/gymTypes';
import { restDeadline } from './restClock';
import { cancelSessionRestAlerts } from './restAlerts';

export type ActiveExercise = {
  id:string; exerciseId:string; name:string; type:ExerciseType; unilateral:boolean;
  position:number; targetSets:number; repMin:number; repMax:number; restSec:number;
};
export type ActiveSet = {
  id:string; sessionExerciseId:string; position:number; side:'L'|'R'|null;
  weight:number; reps:number; kind:'working'|'warm-up';
  loggedAt:string; restDeadline:string|null;
};
export type ActiveWorkout = {
  id:string; title:string; templateId:string|null; startedAt:string;
  endedAt:string|null; state:'in-progress'|'finished'; notes:string|null;
  exercises:ActiveExercise[]; sets:ActiveSet[];
};
type WorkoutRow = {id:string;title:string;template_id:string|null;started_at:string;
  ended_at:string|null;state:ActiveWorkout['state'];notes:string|null};
type ExerciseRow = {id:string;exercise_id:string;name:string;type:ExerciseType;
  unilateral:number;position:number;target_sets:number|null;rep_min:number|null;
  rep_max:number|null;rest_sec:number|null;default_rest:number|null};
type SetRow = {id:string;session_exercise_id:string;position:number;side:'L'|'R'|null;
  weight:number;reps:number;kind:'working'|'warm-up';logged_at:string;rest_deadline:string|null};

const asWorkout = (row:WorkoutRow,exercises:ExerciseRow[],sets:SetRow[]):ActiveWorkout => ({
  id:row.id,title:row.title,templateId:row.template_id,startedAt:row.started_at,
  endedAt:row.ended_at,state:row.state,notes:row.notes,
  exercises:exercises.map(e=>({
    id:e.id,exerciseId:e.exercise_id,name:e.name,type:e.type,unilateral:e.unilateral===1,
    position:e.position,targetSets:e.target_sets??3,repMin:e.rep_min??8,repMax:e.rep_max??12,
    restSec:e.rest_sec??e.default_rest??120,
  })),
  sets:sets.map(s=>({
    id:s.id,sessionExerciseId:s.session_exercise_id,position:s.position,side:s.side,
    weight:s.weight,reps:s.reps,kind:s.kind,loggedAt:s.logged_at,restDeadline:s.rest_deadline,
  })),
});

export async function readWorkout(id:string):Promise<DbResult<ActiveWorkout|null>> {
  return dbOperation(async db=>{
    const session=await db.getFirstAsync<WorkoutRow>('SELECT * FROM sessions WHERE id=?',[id]);
    if(!session)return null;
    const exercises=await db.getAllAsync<ExerciseRow>(
      'SELECT se.id,se.exercise_id,e.name,e.type,e.unilateral,se.position,'+
      'te.target_sets,te.rep_min,te.rep_max,te.rest_sec,t.rest_sec AS default_rest '+
      'FROM session_exercises se JOIN exercises e ON e.id=se.exercise_id '+
      'JOIN sessions s ON s.id=se.session_id '+
      'LEFT JOIN templates t ON t.id=s.template_id '+
      'LEFT JOIN template_exercises te ON te.template_id=s.template_id AND te.position=se.position '+
      'WHERE se.session_id=? ORDER BY se.position',[id]);
    const sets=await db.getAllAsync<SetRow>(
      'SELECT st.* FROM sets st JOIN session_exercises se ON se.id=st.session_exercise_id '+
      'WHERE se.session_id=? ORDER BY se.position,st.position,st.side',[id]);
    return asWorkout(session,exercises,sets);
  });
}
export async function readInProgressWorkout():Promise<DbResult<ActiveWorkout|null>> {
  const row=await dbOperation(async db=>db.getFirstAsync<{id:string}>(
    "SELECT id FROM sessions WHERE state='in-progress' ORDER BY started_at DESC LIMIT 1"));
  if(!row.ok)return row;
  if(!row.value)return {ok:true,value:null};
  return readWorkout(row.value.id);
}
/** Start is transactional; never create a workout on preview render. */
export async function startManualWorkout(title:string, templateId:string|null=null):Promise<DbResult<string>> {
  if(!title.trim()) return {ok:false,error:{code:'db-error',message:'Name required'}};
  return dbOperation(async db=>{
    let resultId='';
    await db.withExclusiveTransactionAsync(async tx=>{
      const active=await tx.getFirstAsync<{id:string}>(
        "SELECT id FROM sessions WHERE state='in-progress' ORDER BY started_at DESC LIMIT 1");
      if(active)throw new Error('Existing in-progress workout must be resumed or discarded explicitly.');
      const id=newGymId(),now=new Date().toISOString();
      await tx.runAsync('INSERT INTO sessions (id,title,template_id,source,started_at,state) '+
        "VALUES(?,?,?,'manual',?,'in-progress')",[id,title.trim(),templateId,now]);
      if(templateId){
        const refs=await tx.getAllAsync<{exercise_id:string;position:number}>(
          'SELECT exercise_id,position FROM template_exercises WHERE template_id=? ORDER BY position',[templateId]);
        for(const ref of refs)await tx.runAsync(
          'INSERT INTO session_exercises(id,session_id,exercise_id,position) VALUES (?,?,?,?)',
          [newGymId(),id,ref.exercise_id,ref.position]);
      }
      resultId=id;
    });
    return resultId;
  });
}
export type SetInput={sessionId:string;sessionExerciseId:string;position:number;
  side:'L'|'R'|null;kind:'working'|'warm-up';weight:number;reps:number;restSec:number};
export function validateSet(input:SetInput):string|null {
  if(!Number.isFinite(input.weight)||input.weight<0||input.weight>10000)return 'Enter a valid weight.';
  if(!Number.isInteger(input.reps)||input.reps<1||input.reps>500)return 'Add reps first.';
  if(!Number.isInteger(input.position)||input.position<0||input.position>1000 ||
    !Number.isFinite(input.restSec)||input.restSec<0||input.restSec>3600)return 'Invalid set settings.';
  return null;
}
/** A set is persisted only on explicit Log set; repeated taps cannot create duplicates. */
export async function logWorkoutSet(input:SetInput):Promise<DbResult<ActiveSet>> {
  const error=validateSet(input);
  if(error)return {ok:false,error:{code:'db-error',message:error}};
  return dbOperation(async db=>{
    let logged:ActiveSet|null=null;
    await db.withExclusiveTransactionAsync(async tx=>{
      const allowed=await tx.getFirstAsync<{id:string}>(
        'SELECT se.id FROM session_exercises se JOIN sessions s ON s.id=se.session_id '+
        "WHERE se.id=? AND s.id=? AND s.state='in-progress'",[input.sessionExerciseId,input.sessionId]);
      if(!allowed)throw new Error('Session finished or exercise missing');
      const prior=await tx.getFirstAsync<SetRow>(
        'SELECT * FROM sets WHERE session_exercise_id=? AND position=? '+
        'AND ((side IS NULL AND ? IS NULL) OR side=?) LIMIT 1',
        [input.sessionExerciseId,input.position,input.side,input.side]);
      if(prior){logged={id:prior.id,sessionExerciseId:prior.session_exercise_id,
        position:prior.position,side:prior.side,kind:prior.kind,weight:prior.weight,reps:prior.reps,
        loggedAt:prior.logged_at,restDeadline:prior.rest_deadline};return;}
      const id=newGymId(),now=new Date().toISOString();
      const deadline=input.restSec>0?restDeadline(now,input.restSec):null;
      await tx.runAsync('INSERT INTO sets '+
        '(id,session_exercise_id,position,kind,side,weight,reps,logged_at,rest_deadline) '+
        'VALUES (?,?,?,?,?,?,?,?,?)',
        [id,input.sessionExerciseId,input.position,input.kind,input.side,input.weight,input.reps,now,deadline]);
      logged={id,sessionExerciseId:input.sessionExerciseId,position:input.position,
        side:input.side,kind:input.kind,weight:input.weight,reps:input.reps,
        loggedAt:now,restDeadline:deadline};
    });
    if(!logged)throw new Error('Set was not logged');
    return logged as ActiveSet;
  });
}
export async function removeLoggedSet(setId:string,sessionId:string):Promise<DbResult<boolean>> {
  return dbOperation(async db=>(await db.runAsync(
    'DELETE FROM sets WHERE id=? AND session_exercise_id IN '+
    '(SELECT se.id FROM session_exercises se JOIN sessions s ON s.id=se.session_id '+
    "WHERE s.id=? AND s.state='in-progress')",[setId,sessionId])).changes>0);
}
export async function editLoggedSet(setId:string,sessionId:string,weight:number,reps:number):Promise<DbResult<boolean>> {
  if(!Number.isFinite(weight)||weight<0||!Number.isInteger(reps)||reps<1)return {
    ok:false,error:{code:'db-error',message:'Invalid set values'}};
  return dbOperation(async db=>(await db.runAsync(
    'UPDATE sets SET weight=?,reps=? WHERE id=? AND session_exercise_id IN '+
    '(SELECT se.id FROM session_exercises se JOIN sessions s ON s.id=se.session_id '+
    "WHERE s.id=? AND s.state='in-progress')",[weight,reps,setId,sessionId])).changes>0);
}
export async function updateRestDeadline(setId:string,sessionId:string,deadline:string|null):Promise<DbResult<boolean>> {
  return dbOperation(async db=>(await db.runAsync(
    'UPDATE sets SET rest_deadline=? WHERE id=? AND session_exercise_id IN '+
    '(SELECT se.id FROM session_exercises se JOIN sessions s ON s.id=se.session_id '+
    "WHERE s.id=? AND s.state='in-progress')",[deadline,setId,sessionId])).changes>0);
}
/** Finishing never writes untouched suggested sets. Rotation advances only after finish. */
export async function completeWorkout(id:string,notes:string|null):Promise<DbResult<boolean>> {
  try{await cancelSessionRestAlerts(id);}catch{return {ok:false,error:{code:'db-error',message:'Could not cancel rest alerts. Retry finish.'}};}
  return dbOperation(async db=>{
    let updated=false;
    await db.withExclusiveTransactionAsync(async tx=>{
      const s=await tx.getFirstAsync<{template_id:string|null}>(
        "SELECT template_id FROM sessions WHERE id=? AND state='in-progress'",[id]);
      if(!s)return;
      updated=(await tx.runAsync(
        "UPDATE sessions SET state='finished',ended_at=?,notes=? WHERE id=? AND state='in-progress'",
        [new Date().toISOString(),notes,id])).changes>0;
      if(updated&&s.template_id){
        const plans=await tx.getAllAsync<{id:string;next_index:number;schedule_json:string}>(
          "SELECT id,next_index,schedule_json FROM plans WHERE type='rotation' AND active=1");
        for(const plan of plans){
          const sequence=JSON.parse(plan.schedule_json) as unknown;
          if(Array.isArray(sequence)&&sequence.length>0&&
            sequence[plan.next_index%sequence.length]===s.template_id){
            await tx.runAsync('UPDATE plans SET next_index=next_index+1 WHERE id=?',[plan.id]);
          }
        }
      }
    });
    return updated;
  });
}
/** Discard is exposed only from home / finish summary, with an explicit confirmation. */
export async function discardInProgressWorkout(id:string):Promise<DbResult<boolean>> {
  try{await cancelSessionRestAlerts(id);}catch{return {ok:false,error:{code:'db-error',message:'Could not cancel rest alerts. Retry discard.'}};}
  return dbOperation(async db=>{
    let removed=false;
    await db.withExclusiveTransactionAsync(async tx=>{
      const active=await tx.getFirstAsync<{id:string}>(
        "SELECT id FROM sessions WHERE id=? AND state='in-progress'",[id]);
      if(!active)return;
      await tx.runAsync('DELETE FROM sets WHERE session_exercise_id IN '+
        '(SELECT id FROM session_exercises WHERE session_id=?)',[id]);
      await tx.runAsync('DELETE FROM session_exercises WHERE session_id=?',[id]);
      removed=(await tx.runAsync('DELETE FROM sessions WHERE id=?',[id])).changes>0;
    });
    return removed;
  });
}
export function workoutNumbers(view:ActiveWorkout):{sets:number;volume:number;pending:number} {
  const working=view.sets.filter(s=>s.kind==='working'&&s.reps>0);
  let completed=0,volume=0,planned=0;
  for(const e of view.exercises){
    planned+=e.targetSets;
    const logged=working.filter(s=>s.sessionExerciseId===e.id);
    for(const set of logged)volume+=setVolume(e.type,set)*
      (e.unilateral&&e.type==='dumbbell'?0.5:1);
    for(let position=0;position<e.targetSets;position++){
      const at=logged.filter(s=>s.position===position);
      if(e.unilateral?at.some(s=>s.side==='L')&&at.some(s=>s.side==='R'):
        at.some(s=>s.side===null))completed++;
    }
  }
  return {sets:completed,volume,pending:Math.max(0,planned-completed)};
}
