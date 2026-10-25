import { parseImportCsv } from '../importCsv';
import { canImportPlan, createImportPlan, resolveImportMappings, mappingKey, keepAllAsOwn, type ImportContext } from '../importPlanning';
const csv='date,exercise,weight,reps\n2026-10-21,Bench Press,60,8\n2026-10-22,No Such Exercise ABC,35,7';
const parsed=parseImportCsv('csv','from.csv',csv);
const empty:ImportContext={days:[],importedHashes:[],remembered:{},exercises:[],observations:[]};
test('not guessing missing weight units; preview produces zero DB writes',()=>{
 const p=createImportPlan(parsed,empty,null);
 expect(p.missingUnit).toBe(true);expect(canImportPlan(p)).toBe(false);
 expect(canImportPlan(createImportPlan(parsed,empty,'kg'))).toBe(true);
});
test('all sessions on already existing days are skipped, duplicate file hash ignored',()=>{
 const p=createImportPlan(parsed,{...empty,days:['2026-10-21']},'kg');
 expect(p.workouts).toHaveLength(1);expect(p.skippedDays).toEqual(['2026-10-21']);
 const duplicate=createImportPlan(parsed,{...empty,importedHashes:[parsed.fileHash]},'kg');
 expect(duplicate.workouts).toHaveLength(0);expect(duplicate.hashDuplicate).toBe(true);
});
test('unmatched never silently uses a fuzzy suggestion; user selection or remembered match required',()=>{
 const a=resolveImportMappings(parsed,empty);
 const second=a.find(x=>x.name==='No Such Exercise ABC')!;
 expect(second.resolvedId).toBeNull();
 const match=resolveImportMappings(parsed,empty,{'No Such Exercise ABC':'Barbell_Squat'});
 expect(match.find(x=>x.name==='No Such Exercise ABC')?.resolvedId).toBe('Barbell_Squat');
 const remembered=resolveImportMappings(parsed,{...empty,remembered:{
  [mappingKey('csv','No Such Exercise ABC')]:'Barbell_Squat'}});
 expect(remembered.find(x=>x.name==='No Such Exercise ABC')?.resolvedId).toBe('Barbell_Squat');
 expect(resolveImportMappings(parsed,empty,{'No Such Exercise ABC':'custom'})
  .find(x=>x.name==='No Such Exercise ABC')?.resolvedId).toBeNull();
});

test('the preview respects preferred display unit while DB weights remain kg',()=>{
 const kilograms=createImportPlan(parsed,empty,'kg',{},'kg');
 const pounds=createImportPlan(parsed,empty,'kg',{},'lb');
 const kg=kilograms.changes.find(c=>c.exerciseName==='No Such Exercise ABC');
 const lb=pounds.changes.find(c=>c.exerciseName==='No Such Exercise ABC');
 expect(kg?.after).toContain('kg');
 expect(lb?.after).toContain('lb');
 expect(Number.parseFloat(lb!.after)).toBeCloseTo(35*2.2046226218,1);
 expect(kilograms.workouts).toEqual(pounds.workouts);
});

test('Hevy equipment suffix becomes a suggestion only, with no silent mapping',()=>{
 const hevy=parseImportCsv('hevy','h.csv',
  'title,start_time,exercise_title,weight_kg,reps\nUpper,"22 Oct 2026, 15:50",Barbell Bench Press (Machine),60,8');
 const automatic=resolveImportMappings(hevy,empty);
 const match=automatic[0]!;
 expect(match.status).toBe('suggested');
 expect(match.resolvedId).toBeNull();
 expect(match.suggestedId).toBeTruthy();
 const plan=createImportPlan(hevy,empty,null);
 const bulk=keepAllAsOwn(plan,{});
 expect(createImportPlan(hevy,empty,null,bulk).mappings).toEqual([
  expect.objectContaining({name:'Barbell Bench Press (Machine)',status:'custom',resolvedId:null})
 ]);
});

test('verified Hevy equipment suffixes match bundled Leg Press and Glute Kickback exactly',()=>{
 const hevy=parseImportCsv('hevy','sanitized.csv',
  'title,start_time,exercise_title,weight_kg,reps\n'+
  'Legs,"22 Oct 2026, 15:50",Leg Press (Machine),100,8\n'+
  'Legs,"22 Oct 2026, 15:50",Glute Kickback (Machine),30,8\n'+
  'Legs,"22 Oct 2026, 15:50",Squat (Machine),40,8');
 const mapped=resolveImportMappings(hevy,empty);
 expect(mapped.find(m=>m.name==='Leg Press (Machine)')).toMatchObject({
  status:'exact',resolvedId:'Leg_Press',suggestedId:null,
 });
 expect(mapped.find(m=>m.name==='Glute Kickback (Machine)')).toMatchObject({
  status:'exact',resolvedId:'Glute_Kickback',suggestedId:null,
 });
 // No exact Squat in the bundled pack; a poor suggestion is not applied.
 expect(mapped.find(m=>m.name==='Squat (Machine)')?.resolvedId).toBeNull();
 // The owner can override even an exact suffix match with a custom exercise.
 expect(resolveImportMappings(hevy,empty,{'Leg Press (Machine)':'custom'})
  .find(m=>m.name==='Leg Press (Machine)')).toMatchObject({
   status:'custom',resolvedId:null,
  });
});
