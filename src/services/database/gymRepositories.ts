import { dbOperation, type DbResult } from './index';
import { newGymId } from './exerciseLibrary';
import { calculateRecords, type ExerciseRecord, type RecordObservation, type SetKind, type SetSide } from './gymMath';

export type TemplateExerciseInput = {
  exerciseId: string; targetSets: number; repMin: number; repMax: number;
  restSec: number | null; notes: string | null;
};
export type TemplateInput = { name: string; restSec: number; notes: string | null; exercises: TemplateExerciseInput[] };
export type Template = TemplateInput & { id: string };
export type Plan = { id: string; name: string; type: 'weekly' | 'rotation';
  schedule: Record<string,string | null> | string[]; nextIndex: number; active: boolean };
export type Session = {
  id: string; title: string; templateId: string | null;
  source: 'manual' | 'imported-file'; importer: string | null; importBatchId: string | null;
  startedAt: string; endedAt: string | null; editedAt: string | null;
  notes: string | null; state: 'in-progress' | 'finished';
};
export type SessionExercise = { id: string; sessionId: string; exerciseId: string; position: number };
export type SessionSet = {
  id: string; sessionExerciseId: string; position: number; kind: SetKind;
  side: SetSide; weight: number; reps: number; loggedAt: string; restDeadline: string | null;
};
type SessionRow = {
  id: string; title: string; template_id: string | null; source: Session['source'];
  importer: string | null; import_batch_id: string | null;
  started_at: string; ended_at: string | null; edited_at: string | null;
  notes: string | null; state: Session['state'];
};
const asSession = (s: SessionRow): Session => ({
  id:s.id,title:s.title,templateId:s.template_id,source:s.source,
  importer:s.importer,importBatchId:s.import_batch_id,startedAt:s.started_at,
  endedAt:s.ended_at,editedAt:s.edited_at,notes:s.notes,state:s.state,
});
const safeInt = (value: number, min: number, max: number): boolean =>
  Number.isInteger(value) && value >= min && value <= max;

function validateTemplate(input: TemplateInput): void {
  if (!input.name.trim() || input.name.length > 100 || input.exercises.length === 0)
    throw new Error('A template needs a name and at least one exercise.');
  if (!safeInt(input.restSec,0,3600)) throw new Error('Invalid default rest.');
  for (const e of input.exercises) {
    if (!e.exerciseId || !safeInt(e.targetSets,1,20) ||
      !safeInt(e.repMin,1,100) || !safeInt(e.repMax,e.repMin,100) ||
      (e.restSec !== null && !safeInt(e.restSec,0,3600))) throw new Error('Invalid exercise targets.');
  }
}
export async function saveTemplate(input: TemplateInput, existingId?: string): Promise<DbResult<string>> {
  validateTemplate(input);
  return dbOperation(async db => {
    const id = existingId ?? newGymId();
    const now=new Date().toISOString();
    await db.withExclusiveTransactionAsync(async tx=>{
      await tx.runAsync('INSERT INTO templates(id,name,rest_sec,notes,created_at,updated_at) ' +
        'VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,' +
        'rest_sec=excluded.rest_sec,notes=excluded.notes,updated_at=excluded.updated_at',
      [id,input.name.trim(),input.restSec,input.notes,now,now]);
      await tx.runAsync('DELETE FROM template_exercises WHERE template_id=?',[id]);
      for (const [position,e] of input.exercises.entries()) {
        await tx.runAsync('INSERT INTO template_exercises '+
          '(id,template_id,exercise_id,position,target_sets,rep_min,rep_max,rest_sec,notes) '+
          'VALUES(?,?,?,?,?,?,?,?,?)',[newGymId(),id,e.exerciseId,position,e.targetSets,e.repMin,e.repMax,e.restSec,e.notes]);
      }
    });
    return id;
  });
}
export async function listTemplates(): Promise<DbResult<Template[]>> {
  return dbOperation(async db=>{
    const rows = await db.getAllAsync<{id:string;name:string;rest_sec:number;notes:string|null}>(
      'SELECT * FROM templates ORDER BY updated_at DESC');
    const result: Template[]=[];
    for(const row of rows){
      const exercises=await db.getAllAsync<{exercise_id:string;target_sets:number;rep_min:number;rep_max:number;rest_sec:number|null;notes:string|null}>(
        'SELECT * FROM template_exercises WHERE template_id=? ORDER BY position',[row.id]);
      result.push({id:row.id,name:row.name,restSec:row.rest_sec,notes:row.notes,
        exercises:exercises.map(e=>({exerciseId:e.exercise_id,targetSets:e.target_sets,
          repMin:e.rep_min,repMax:e.rep_max,restSec:e.rest_sec,notes:e.notes}))});
    }
    return result;
  });
}
export async function deleteTemplate(id:string): Promise<DbResult<boolean>> {
  return dbOperation(async db=>{
    let deleted=false;
    await db.withExclusiveTransactionAsync(async tx=>{
      // Session history keeps its copied exercise IDs and logged sets.
      await tx.runAsync('UPDATE sessions SET template_id=NULL WHERE template_id=?',[id]);
      await tx.runAsync('DELETE FROM template_exercises WHERE template_id=?',[id]);
      deleted=(await tx.runAsync('DELETE FROM templates WHERE id=?',[id])).changes>0;
    });
    return deleted;
  });
}
export async function savePlan(input: Omit<Plan,'id'>, id=newGymId()): Promise<DbResult<string>> {
  if(!input.name.trim() || !['weekly','rotation'].includes(input.type) ||
    !safeInt(input.nextIndex,0,10000)) throw new Error('Invalid plan.');
  return dbOperation(async db=>{
    await db.withExclusiveTransactionAsync(async tx=>{
      if(input.active) await tx.runAsync('UPDATE plans SET active=0');
      await tx.runAsync('INSERT INTO plans(id,name,type,schedule_json,next_index,active) VALUES(?,?,?,?,?,?) ' +
        'ON CONFLICT(id) DO UPDATE SET name=excluded.name,type=excluded.type,'+
        'schedule_json=excluded.schedule_json,next_index=excluded.next_index,active=excluded.active',
        [id,input.name.trim(),input.type,JSON.stringify(input.schedule),input.nextIndex,input.active?1:0]);
    });
    return id;
  });
}
export async function listPlans(): Promise<DbResult<Plan[]>> {
  return dbOperation(async db=>(await db.getAllAsync<{id:string;name:string;type:Plan['type'];schedule_json:string;next_index:number;active:number}>(
    'SELECT * FROM plans ORDER BY active DESC, name')).map(row=>({
      id:row.id,name:row.name,type:row.type,
      schedule:JSON.parse(row.schedule_json) as Plan['schedule'],
      nextIndex:row.next_index,active:row.active===1,
    })));
}
export async function createSession(title: string, templateId: string | null = null): Promise<DbResult<Session>> {
  if(!title.trim()) throw new Error('Session name required.');
  return dbOperation(async db=>{
    const session: Session = {id:newGymId(),title:title.trim(),templateId,source:'manual',
      importer:null,importBatchId:null,startedAt:new Date().toISOString(),endedAt:null,
      editedAt:null,notes:null,state:'in-progress'};
    await db.runAsync('INSERT INTO sessions '+
      '(id,title,template_id,source,importer,import_batch_id,started_at,ended_at,edited_at,notes,state) '+
      'VALUES(?,?,?,?,?,?,?,?,?,?,?)',[
        session.id,session.title,session.templateId,session.source,session.importer,
        session.importBatchId,session.startedAt,null,null,null,session.state,
      ]);
    return session;
  });
}
export async function getInProgressSession(): Promise<DbResult<Session | null>> {
  return dbOperation(async db=>{
    const row=await db.getFirstAsync<SessionRow>(
      "SELECT * FROM sessions WHERE state='in-progress' ORDER BY started_at DESC LIMIT 1");
    return row?asSession(row):null;
  });
}
export async function listSessions(limit=60): Promise<DbResult<Session[]>> {
  return dbOperation(async db=>(await db.getAllAsync<SessionRow>(
    'SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?',
    [Math.max(1,Math.min(limit,250))])).map(asSession));
}
export async function addSessionExercise(sessionId:string,exerciseId:string,position:number): Promise<DbResult<string>> {
  if(!safeInt(position,0,999)) throw new Error('Invalid exercise order.');
  return dbOperation(async db=>{
    const id=newGymId();
    await db.runAsync('INSERT INTO session_exercises(id,session_id,exercise_id,position) VALUES(?,?,?,?)',
      [id,sessionId,exerciseId,position]);
    return id;
  });
}
export async function logSessionSet(input: Omit<SessionSet,'id'|'loggedAt'>): Promise<DbResult<SessionSet>> {
  if(!safeInt(input.position,0,999) || !safeInt(input.reps,0,999) ||
    !Number.isFinite(input.weight) || input.weight<0) throw new Error('Invalid set.');
  return dbOperation(async db=>{
    const set:SessionSet={...input,id:newGymId(),loggedAt:new Date().toISOString()};
    await db.runAsync('INSERT INTO sets '+
      '(id,session_exercise_id,position,kind,side,weight,reps,logged_at,rest_deadline) '+
      'VALUES(?,?,?,?,?,?,?,?,?)',[
        set.id,set.sessionExerciseId,set.position,set.kind,set.side,
        set.weight,set.reps,set.loggedAt,set.restDeadline,
      ]);
    return set;
  });
}
export async function editSessionSet(id:string,input:Pick<SessionSet,'weight'|'reps'|'kind'|'side'>): Promise<DbResult<boolean>> {
  if(!Number.isFinite(input.weight)||input.weight<0||!safeInt(input.reps,0,999))
    throw new Error('Invalid set.');
  return dbOperation(async db=>(await db.runAsync(
    'UPDATE sets SET weight=?,reps=?,kind=?,side=? WHERE id=?',
    [input.weight,input.reps,input.kind,input.side,id])).changes>0);
}
export async function deleteSessionSet(id:string): Promise<DbResult<boolean>> {
  return dbOperation(async db=>(await db.runAsync('DELETE FROM sets WHERE id=?',[id])).changes>0);
}
export async function finishSession(id:string,notes:string|null): Promise<DbResult<boolean>> {
  return dbOperation(async db=>(await db.runAsync(
    "UPDATE sessions SET state='finished',ended_at=?,notes=? WHERE id=? AND state='in-progress'",
    [new Date().toISOString(),notes,id])).changes>0);
}
export async function editSession(id:string,title:string,notes:string|null): Promise<DbResult<boolean>> {
  return dbOperation(async db=>(await db.runAsync(
    'UPDATE sessions SET title=?,notes=?,edited_at=? WHERE id=?',
    [title,notes,new Date().toISOString(),id])).changes>0);
}
export async function deleteSession(id:string): Promise<DbResult<boolean>> {
  return dbOperation(async db=>{
    let deleted=false;
    await db.withExclusiveTransactionAsync(async tx=>{
      await tx.runAsync('DELETE FROM sets WHERE session_exercise_id IN '+
        '(SELECT id FROM session_exercises WHERE session_id=?)',[id]);
      await tx.runAsync('DELETE FROM session_exercises WHERE session_id=?',[id]);
      deleted=(await tx.runAsync('DELETE FROM sessions WHERE id=?',[id])).changes>0;
    });
    return deleted;
  });
}
export async function listSessionSets(sessionId:string): Promise<DbResult<SessionSet[]>> {
  return dbOperation(async db=>(await db.getAllAsync<{
    id:string;session_exercise_id:string;position:number;kind:SetKind;side:SetSide;
    weight:number;reps:number;logged_at:string;rest_deadline:string|null;
  }>('SELECT sets.* FROM sets JOIN session_exercises se ON sets.session_exercise_id=se.id '+
    'WHERE se.session_id=? ORDER BY se.position,sets.position',[sessionId])).map(row=>({
    id:row.id,sessionExerciseId:row.session_exercise_id,position:row.position,
    kind:row.kind,side:row.side,weight:row.weight,reps:row.reps,
    loggedAt:row.logged_at,restDeadline:row.rest_deadline,
  })));
}
/** Records are always derived from current logged rows, so edit/delete/import cannot leave stale cache. */
export async function readRecords(): Promise<DbResult<ExerciseRecord[]>> {
  return dbOperation(async db=>{
    const rows=await db.getAllAsync<{
      exercise_id:string;type:RecordObservation['type'];session_id:string;
      ended_at:string;kind:SetKind;side:SetSide;weight:number;reps:number;
    }>('SELECT se.exercise_id,e.type,se.session_id,COALESCE(s.ended_at,s.started_at) AS ended_at,'+
      'st.kind,st.side,st.weight,st.reps FROM sets st '+
      'JOIN session_exercises se ON se.id=st.session_exercise_id '+
      'JOIN sessions s ON s.id=se.session_id JOIN exercises e ON e.id=se.exercise_id '+
      'WHERE st.reps>0 AND s.state='finished');
    return calculateRecords(rows.map(row=>({
      exerciseId:row.exercise_id,type:row.type,sessionId:row.session_id,
      endedAt:row.ended_at,kind:row.kind,side:row.side,
      weight:row.weight,reps:row.reps,
    })));
  });
}
export async function recentExerciseIds(limit=8): Promise<DbResult<string[]>> {
  return dbOperation(async db=>(await db.getAllAsync<{exercise_id:string}>(
    'SELECT se.exercise_id FROM session_exercises se JOIN sessions s ON s.id=se.session_id ' +
      "WHERE s.state='finished' AND EXISTS (SELECT 1 FROM sets st " +
      "WHERE st.session_exercise_id=se.id AND st.kind='working' AND st.reps>0) " +
      'GROUP BY se.exercise_id ORDER BY MAX(s.started_at) DESC LIMIT ?',
    [limit])).map(row=>row.exercise_id));
}
export async function exerciseSessions(exerciseId:string,limit=15): Promise<DbResult<Session[]>> {
  return dbOperation(async db=>(await db.getAllAsync<SessionRow>(
    'SELECT DISTINCT s.* FROM sessions s JOIN session_exercises se ON se.session_id=s.id '+
    "WHERE se.exercise_id=? AND s.state='finished' " +
    "AND EXISTS (SELECT 1 FROM sets st WHERE st.session_exercise_id=se.id " +
    "AND st.kind='working' AND st.reps>0) ORDER BY s.started_at DESC LIMIT ?",
    [exerciseId,limit])).map(asSession));
}

/** Explicitly append to an existing workout; never create or auto-log suggested sets. */
export async function appendExerciseToActiveSession(exerciseId: string): Promise<DbResult<string | null>> {
  return dbOperation(async db => {
    let inserted: string | null = null;
    await db.withExclusiveTransactionAsync(async tx => {
      const active=await tx.getFirstAsync<{id:string}>(
        "SELECT id FROM sessions WHERE state='in-progress' ORDER BY started_at DESC LIMIT 1");
      if(!active)return;
      const position=await tx.getFirstAsync<{next_position:number}>(
        'SELECT COALESCE(MAX(position),-1)+1 AS next_position FROM session_exercises WHERE session_id=?',
        [active.id]);
      inserted=newGymId();
      await tx.runAsync('INSERT INTO session_exercises(id,session_id,exercise_id,position) VALUES(?,?,?,?)',
        [inserted,active.id,exerciseId,position?.next_position??0]);
    });
    return inserted;
  });
}
