import { parseImportCsv } from '../importCsv';
import { canImportPlan, createImportPlan, resolveImportMappings, mappingKey, type ImportContext } from '../importPlanning';
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
