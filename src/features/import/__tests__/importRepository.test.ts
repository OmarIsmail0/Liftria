import { parseImportCsv } from '../importCsv';
import { createImportPlan, type ImportContext } from '../importPlanning';
import { commitImport, lastImportBatch, undoLastImport } from '../importRepository';

/** Stateful SQL contract mock; production uses expo-sqlite exclusive transactions on device. */
type Row=Record<string,unknown>;
const mockInitial=()=>({batches:[] as Row[],exercises:[] as Row[],sessions:[] as Row[],
 sessionExercises:[] as Row[],sets:[] as Row[],settings:[] as Row[]});
let mockState=mockInitial(),mockCounter=0,mockFailSet=false;
const mockClone=()=>JSON.parse(JSON.stringify(mockState)) as typeof mockState;
const mockRun=jest.fn(async(sql:string,args:unknown[]=[])=>{
 const matches=(term:string)=>sql.includes(term);
 if(sql.startsWith('INSERT INTO import_batches')){
  mockState.batches.push({id:args[0],file_hash:args[1],importer:args[2],file_name:args[3],
   session_count:args[4],set_count:args[5],skipped_count:args[6],created_exercises:args[7],created_at:args[8]});
 }else if(sql.startsWith('UPDATE import_batches')){
  mockState.batches.find(x=>x.id===args[1])!.created_exercises=args[0];
 }else if(sql.startsWith('INSERT INTO exercises')){
  if(matches("'import'"))mockState.exercises.push({id:args[0],name:args[1],source:'import',import_batch_id:args[3]});
  else mockState.exercises.push({id:args[0],name:args[1],source:'pack',import_batch_id:null});
 }else if(sql.startsWith('INSERT INTO sessions')){
  mockState.sessions.push({id:args[0],title:args[1],source:'imported-file',importer:args[2],
   import_batch_id:args[3],started_at:args[4],ended_at:args[5],notes:args[6],state:'finished'});
 }else if(sql.startsWith('INSERT INTO session_exercises')){
  mockState.sessionExercises.push({id:args[0],session_id:args[1],exercise_id:args[2],position:args[3]});
 }else if(sql.startsWith('INSERT INTO sets')){
  if(mockFailSet)throw new Error('disk full');
  mockState.sets.push({id:args[0],session_exercise_id:args[1],position:args[2],kind:args[3],
   side:null,weight:args[4],reps:args[5],logged_at:args[6]});
 }else if(sql.startsWith('INSERT INTO app_settings')){
  const row=mockState.settings.find(x=>x.key===args[0]);if(row)row.value=args[1];
  else mockState.settings.push({key:args[0],value:args[1]});
 }else if(sql.startsWith('UPDATE exercises SET import_batch_id=NULL')){
  mockState.exercises.find(x=>x.id===args[0])!.import_batch_id=null;
 }else if(sql.startsWith('DELETE FROM sets')){
  const affected=new Set(mockState.sessionExercises.filter(e=>
   mockState.sessions.some(s=>s.id===e.session_id&&s.import_batch_id===args[0])).map(e=>e.id));
  mockState.sets=mockState.sets.filter(x=>!affected.has(x.session_exercise_id));
 }else if(sql.startsWith('DELETE FROM session_exercises')){
  const affected=new Set(mockState.sessions.filter(s=>s.import_batch_id===args[0]).map(s=>s.id));
  mockState.sessionExercises=mockState.sessionExercises.filter(x=>!affected.has(x.session_id));
 }else if(sql.startsWith('DELETE FROM sessions')){
  mockState.sessions=mockState.sessions.filter(x=>x.import_batch_id!==args[0]);
 }else if(sql.startsWith('DELETE FROM exercises')){
  mockState.exercises=mockState.exercises.filter(x=>x.id!==args[0]);
 }else if(sql.startsWith('DELETE FROM import_batches')){
  mockState.batches=mockState.batches.filter(x=>x.id!==args[0]);
 }else if(sql.startsWith('DELETE FROM app_settings')){
  mockState.settings=mockState.settings.filter(x=>x.key!==args[0]);
 }else throw new Error('Unhandled SQL mutation: '+sql);
 return {changes:1,lastInsertRowId:1};
});
const mockGetFirst=jest.fn(async(sql:string,args:unknown[]=[])=>{
 if(sql.includes('FROM import_batches WHERE file_hash'))return mockState.batches.find(x=>x.file_hash===args[0])??null;
 if(sql.includes('FROM import_batches WHERE id'))return mockState.batches.find(x=>x.id===args[0])??null;
 if(sql.includes('FROM exercises WHERE id'))return mockState.exercises.find(x=>x.id===args[0])??null;
 if(sql.includes('FROM app_settings WHERE key'))return mockState.settings.find(x=>x.key===args[0])??null;
 if(sql.includes('COUNT(*) AS total FROM sets')){
  const batch=String(args[0]),ses=new Set(mockState.sessions.filter(x=>x.import_batch_id===batch).map(x=>x.id));
  const ids=new Set(mockState.sessionExercises.filter(x=>ses.has(x.session_id)).map(x=>x.id));
  return {total:mockState.sets.filter(x=>ids.has(x.session_exercise_id)).length};
 }
 if(sql.startsWith('SELECT id FROM session_exercises WHERE exercise_id')){
  return mockState.sessionExercises.some(x=>x.exercise_id===args[0])?{id:'used'}:null;
 }
 throw new Error('Unhandled SQL query: '+sql);
});
const mockGetAll=jest.fn(async(sql:string,args:unknown[]=[])=>{
 if(sql==='SELECT started_at FROM sessions')return mockState.sessions.map(s=>({started_at:s.started_at}));
 if(sql==='SELECT id FROM sessions WHERE import_batch_id=?')
  return mockState.sessions.filter(s=>s.import_batch_id===args[0]).map(s=>({id:s.id}));
 throw new Error('Unhandled SQL query: '+sql);
});
const mockTx={getFirstAsync:mockGetFirst,getAllAsync:mockGetAll,runAsync:mockRun};
const mockDb={...mockTx,withExclusiveTransactionAsync:async(fn:(db:typeof mockTx)=>Promise<void>)=>{
 const prev=mockClone();try{await fn(mockTx);}catch(err){mockState=prev;throw err;}
}};
jest.mock('../../../services/database',()=>({
 dbOperation:async(action:(db:typeof mockDb)=>Promise<unknown>)=>{
  try{return {ok:true,value:await action(mockDb)};}
  catch{return {ok:false,error:{code:'db-error',message:'Local database operation failed.'}};}
 },
}));
jest.mock('../../../services/database/exerciseLibrary',()=>({
 newGymId:()=>('test-id-'+(++mockCounter)),
 listExercises:async()=>({ok:true,value:[]}),
 bundledExercises:()=>[],
 normalizedName:(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,''),
 searchExercises:()=>[],
}));
jest.mock('../../../services/database/historyRepository',()=>({
 readStrengthObservations:async()=>({ok:true,value:[]}),
}));
beforeEach(()=>{mockState=mockInitial();mockCounter=0;mockFailSet=false;});
const csv='date,exercise,weight_kg,reps\n2026-10-21,Demo Lift,60,8\n2026-10-22,Demo Lift,70,6';
const context:ImportContext={days:[],importedHashes:[],remembered:{},exercises:[],observations:[]};
test('one commit inserts provenance and a later identical hash adds nothing',async()=>{
 const p=createImportPlan(parseImportCsv('csv','demo.csv',csv),context,null);
 expect(p.setCount).toBe(2);
 const updates:number[]=[];
 const done=await commitImport(p,(n,total)=>{expect(total).toBe(2);updates.push(n);});
 expect(updates).toEqual([1,2]);
 expect(done).toMatchObject({ok:true,value:{workouts:2,sets:2,custom:1}});
 expect(mockState.sessions.every(s=>s.source==='imported-file'&&!!s.import_batch_id)).toBe(true);
 expect((await lastImportBatch()).ok).toBe(true);
 const previous=mockClone();
 expect((await commitImport(p)).ok).toBe(false);
 expect(mockState).toEqual(previous);
});
test('Undo removes exactly imported tables byte for byte and preserves manual pre-existing sessions',async()=>{
 mockState.sessions.push({id:'manual',state:'finished',source:'manual',import_batch_id:null,
  started_at:'2026-10-18T12:00:00Z',title:'My own'});
 mockState.exercises.push({id:'mycustom',name:'Private',source:'custom',import_batch_id:null});
 const before=mockClone(),p=createImportPlan(parseImportCsv('csv','demo.csv',csv),context,null);
 expect((await commitImport(p)).ok).toBe(true);
 const undo=await undoLastImport();
 expect(undo).toMatchObject({ok:true,value:{sessions:2,sets:2,custom:1}});
 const compare=(state:typeof mockState)=>({batches:state.batches,exercises:state.exercises,
  sessions:state.sessions,sessionExercises:state.sessionExercises,sets:state.sets});
 expect(compare(mockState)).toEqual(compare(before));
 expect((await lastImportBatch())).toEqual({ok:true,value:null});
 // Remembered mappings intentionally stay; these are specified to survive Undo.
 expect(mockState.settings.some(x=>String(x.key).startsWith('import.match.'))).toBe(true);
});
test('a write failure rolls all six tables back instead of partially importing',async()=>{
 mockFailSet=true;
 const before=mockClone(),plan=createImportPlan(parseImportCsv('csv','demo.csv',csv),context,null);
 expect((await commitImport(plan)).ok).toBe(false);
 expect(mockState).toEqual(before);
});
