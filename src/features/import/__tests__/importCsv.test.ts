import { ImportParseError, readCsv, parseImportCsv, sha256, fromImportWeight } from '../importCsv';
test('SHA-256 UTF-8 deterministic vectors; no Web Crypto dependency',()=>{
 expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
 expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
test('quoted comma, double quotes, quoted newline, BOM and semicolon',()=>{
 expect(readCsv('\uFEFFdate;exercise;weight;reps\n2026-10-01;"Bench; press";60;8').rows[0]?.[1]).toBe('Bench; press');
 expect(readCsv('a,b\n"two, words","say ""hi""\nnext"').rows).toEqual([['two, words','say "hi"\nnext']]);
});
const fixture=[
 ['hevy','title,start_time,end_time,exercise_title,set_index,set_type,weight_kg,reps,exercise_notes\n',
  'Upper,2026-10-20T10:00:00Z,2026-10-20T11:00:00Z,Barbell Bench Press,1,warmup,20,12,notes\nUpper,2026-10-20T10:00:00Z,2026-10-20T11:00:00Z,Barbell Bench Press,2,normal,60,8,note'],
 ['strong','Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Notes\n',
  '2026-10-20,Upper,60min,Bench Press,1,60,8,ok'],
 ['fitnotes','Date,Exercise,Weight (kgs),Reps\n','2026-10-20,Bench Press,60,8'],
 ['csv','date,exercise,weight_lbs,reps\n','2026-10-20,Bench Press,135,8'],
] as const;
test.each(fixture)('%s known columns parse without throwing', (source,header,row)=>{
 const result=parseImportCsv(source,'fixture.csv',header+row);
 expect(result.workouts).toHaveLength(1);expect(result.workouts[0]?.sets).toHaveLength(source==='hevy'?2:1);
 expect(result.needsUnit).toBe(source==='strong');
});
test('no unit is ever guessed, warm-up only when marked, per-dumbbell and 0 reps retained when typed',()=>{
 const x=parseImportCsv('strong','test.csv',
  'Date,Workout Name,Exercise Name,Weight,Reps,Notes\n2026-10-20,Push,Dumbbell Press,25,8,');
 expect(x.needsUnit).toBe(true);expect(x.workouts[0]?.sets[0]?.kind).toBe('working');
 const h=parseImportCsv('hevy','h.csv','title,start_time,exercise_title,weight_kg,reps,set_type\n' +
  'Upper,2026-10-20,Bench,20,,warmup');
 expect(h.workouts[0]?.sets[0]?.reps).toBe(0);
 expect(fromImportWeight(220.46226218,'lb')).toBeCloseTo(100,4);
});
test('invalid columns and invalid populated set fail rather than losing data',()=>{
 expect(()=>parseImportCsv('hevy','bad.csv','Date,Exercise,Weight,Reps\n2026-10-20,Bench,20,8'))
  .toThrow(ImportParseError);
 expect(()=>parseImportCsv('csv','bad.csv','date,exercise,weight,reps\n2026-10-20,Bench,abc,8'))
  .toThrow('Invalid set');
});
test('file with only headers is explicitly empty',()=>{
 expect(()=>parseImportCsv('fitnotes','empty.csv','Date,Exercise,Weight (kgs),Reps\n'))
  .toThrow('No workouts');
});

test('when an export has both kg and lb columns, take the populated one with its explicit unit',()=>{
 const r=parseImportCsv('hevy','both.csv','title,start_time,exercise_title,weight_kg,weight_lbs,reps\n'+
  'Push,2026-10-20,Bench,,135,8\nPush,2026-10-20,Bench,60,,8');
 expect(r.needsUnit).toBe(false);
 expect(r.workouts[0]?.sets.map(x=>x.unit)).toEqual(['lb','kg']);
 expect(r.workouts[0]?.sets.map(x=>x.weight)).toEqual([135,60]);
});

test('recognizes an explicitly unit-tagged weight (kg) column without guessing',()=>{
 const csv='date,exercise,weight (kg),reps\n2026-10-20,Bench Press,60,8';
 const parsed=parseImportCsv('csv','units.csv',csv);
 expect(parsed.needsUnit).toBe(false);
 expect(parsed.workouts[0]?.sets[0]?.unit).toBe('kg');
});
test('does not shift impossible date-only days silently or mask date parsing failures',()=>{
 const header='date,exercise,weight_kg,reps\n';
 for(const bad of ['2026-02-31','2026-13-01','2026-00-01','02/31/2026']){
  expect(()=>parseImportCsv('csv','invalid.csv',header+bad+',Bench Press,60,8'))
   .toThrow(ImportParseError);
 }
 const ok=parseImportCsv('csv','valid.csv',header+'2028-02-29,Bench Press,60,8');
 expect(ok.workouts).toHaveLength(1);
 expect(ok.workouts[0]?.localDay).toBe('2028-02-29');
});
