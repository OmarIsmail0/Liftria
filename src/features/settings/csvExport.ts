import {dbOperation,type DbResult} from '../../services/database';
type Cell=string|number|null|undefined;
const escaped=(cell:Cell):string=>{
 let value=cell==null?'':String(cell);
 // Spreadsheet formula injection: user-entered names must never execute formulas.
 if(/^[\s]*[=+@\-\t\r]/.test(value)&&typeof cell==='string')value="'"+value;
 return '"'+value.replace(/"/g,'""')+'"';
};
export function csvRows(rows:readonly Cell[][]):string{
 return rows.map(row=>row.map(escaped).join(',')).join('\r\n')+'\r\n';
}
export async function workoutCsv():Promise<DbResult<string>>{
 return dbOperation(async db=>{
  const rows=await db.getAllAsync<{
   session_id:string;title:string;started_at:string;ended_at:string|null;state:string;
   exercise_name:string|null;position:number|null;kind:string|null;side:string|null;
   weight:number|null;reps:number|null;rpe:number|null;rir:number|null;note:string|null;
  }>(`SELECT s.id AS session_id,s.title,s.started_at,s.ended_at,s.state,
     e.name AS exercise_name,st.position,st.kind,st.side,st.weight,st.reps,st.rpe,st.rir,se.note
     FROM sessions s LEFT JOIN session_exercises se ON se.session_id=s.id
     LEFT JOIN exercises e ON e.id=se.exercise_id
     LEFT JOIN sets st ON st.session_exercise_id=se.id
     ORDER BY s.started_at,se.position,st.position,st.side`);
  return csvRows([['Session ID','Workout','Started','Finished','State','Exercise',
   'Set','Kind','Side','Weight kg','Reps','RPE','RIR','Note'],...rows.map(r=>
   [r.session_id,r.title,r.started_at,r.ended_at,r.state,r.exercise_name,
    r.position,r.kind,r.side,r.weight,r.reps,r.rpe,r.rir,r.note])]);
 });
}
export async function measurementsCsv():Promise<DbResult<string>>{
 return dbOperation(async db=>{
  const rows=await db.getAllAsync<{
   measured_at:string;site:string;cm:number;note:string|null;source:string;
  }>('SELECT measured_at,site,cm,note,source FROM body_measurements ORDER BY measured_at,site,id');
  return csvRows([['Measured at','Site','Centimeters','Note','Source'],...rows.map(r=>
   [r.measured_at,r.site,r.cm,r.note,r.source])]);
 });
}
export async function diaryCsv():Promise<DbResult<string>>{
 return dbOperation(async db=>{
  const rows=await db.getAllAsync<{
   day:string;meal:string;name_snapshot:string;grams:number|null;kcal:number;
   protein:number|null;carbs:number|null;fat:number|null;fiber:number|null;
   sugar:number|null;sodium:number|null;source:string;
  }>('SELECT day,meal,name_snapshot,grams,kcal,protein,carbs,fat,fiber,sugar,sodium,source '+
    'FROM diary_entries ORDER BY day,created_at,id');
  return csvRows([['Day','Meal','Food','Grams','Calories','Protein g','Carbs g',
    'Fat g','Fiber g','Sugar g','Sodium mg','Source'],...rows.map(r=>
    [r.day,r.meal,r.name_snapshot,r.grams,r.kcal,r.protein,r.carbs,r.fat,
     r.fiber,r.sugar,r.sodium,r.source])]);
 });
}
