import { ImportParseError, readCsv, parseImportCsv, sha256, fromImportWeight, csvFileTypeError } from '../importCsv';
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
 for(const bad of ['2026-02-31','2026-02-31T09:00:00Z','2026-13-01','2026-00-01','02/31/2026']){
  expect(()=>parseImportCsv('csv','invalid.csv',header+bad+',Bench Press,60,8'))
   .toThrow(ImportParseError);
 }
 const ok=parseImportCsv('csv','valid.csv',header+'2028-02-29,Bench Press,60,8');
 expect(ok.workouts).toHaveLength(1);
 expect(ok.workouts[0]?.localDay).toBe('2028-02-29');
});

test('Hevy day named-month timestamp, comma and time are parsed as local wall time',()=>{
 const p=parseImportCsv('hevy','real-shape.csv',
  'title,start_time,end_time,exercise_title,weight_kg,reps\n'+
  'Upper,"26 Jan 2024, 07:34","26 Jan 2024, 08:35",Bench,60,8');
 expect(p.workouts[0]?.localDay).toBe('2024-01-26');
 expect(new Date(p.workouts[0]!.startedAt).getHours()).toBe(7);
 expect(new Date(p.workouts[0]!.startedAt).getMinutes()).toBe(34);
 expect(new Date(p.workouts[0]!.endedAt).getHours()).toBe(8);
});
test('ambiguous numeric calendar days are blocked, unambiguous D/M and M/D remain valid',()=>{
 const header='date,exercise,weight_kg,reps\n';
 for(const ambiguous of ['05/10/2026','10.05.2026'])
  expect(()=>parseImportCsv('csv','ambiguous.csv',header+ambiguous+',Bench,60,8'))
   .toThrow('Ambiguous workout date');
 const dmy=parseImportCsv('csv','dmy.csv',header+'25/10/2026,Bench,60,8');
 const mdy=parseImportCsv('csv','mdy.csv',header+'10/25/2026,Bench,60,8');
 expect(dmy.workouts[0]?.localDay).toBe('2026-10-25');
 expect(mdy.workouts[0]?.localDay).toBe('2026-10-25');
 expect(()=>parseImportCsv('hevy','bad.csv',
  'title,start_time,exercise_title,weight_kg,reps\nUpper,"31 Feb 2026, 07:34",Bench,60,8'))
  .toThrow('Invalid workout date');
});

test('Strong W in Set Order is a warm-up; D and F remain working sets',()=>{
 const rows='Date,Workout Name,Exercise Name,Set Order,Weight,Reps\n'+
  '2026-10-20,Push,Bench,W,20,12\n'+
  '2026-10-20,Push,Bench,D,60,8\n'+
  '2026-10-20,Push,Bench,F,50,10';
 const p=parseImportCsv('strong','strong.csv',rows);
 expect(p.workouts[0]?.sets.map(s=>s.kind)).toEqual(['warm-up','working','working']);
 expect(p.warmupMarked).toBe(true);
});
test('cardio or timed rows missing reps are counted and explicitly disclosed',()=>{
 const header='date,exercise,weight_kg,reps\n';
 const mixed=parseImportCsv('csv','mixed.csv',header+
  '2026-10-20,Run,0,\n2026-10-20,Bench,50,8\n2026-10-20,Cycle,0,');
 expect(mixed.nonStrengthRows).toBe(2);
 expect(mixed.ignored).toBe(2);
 expect(mixed.workouts[0]?.sets).toHaveLength(1);
 expect(()=>parseImportCsv('csv','cardio.csv',header+'2026-10-20,Run,0,'))
  .toThrow('1 cardio/timed rows');
});

/** Derived only from verified, sanitized Hevy export header and representative rows.
 * The owner's original export is private and must never be committed. */
test('verified Hevy 14-column CSV: dates, missing weight, cardio, set indexes, emoji and precision',()=>{
 const header='title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe\n';
 const rows=[
  'Day 2 Pull,"22 Oct 2026, 15:50","22 Oct 2026, 17:08",,Lat Pulldown (Cable),,,0,normal,13.61,12,,,',
  'Day 2 Pull,"22 Oct 2026, 15:50","22 Oct 2026, 17:08",,Lat Pulldown (Cable),,,2,dropset,18.14,12,,,',
  'Day 2 Pull,"22 Oct 2026, 15:50","22 Oct 2026, 17:08",,Incline Chest Press (Machine),,,3,normal,11.34,12,,,',
  'Day 3 Legs,"1 Oct 2025, 17:19","1 Oct 2025, 18:30",,Crunch (Machine),,,0,normal,,15,,,',
  'Day 3 Legs,"1 Oct 2025, 17:19","1 Oct 2025, 18:30",,Treadmill,,,0,normal,,,1.5,600,',
  'Afternoon workout 💪,"9 Feb 2026, 17:14","9 Feb 2026, 18:20",,Seated Calf Raise,,,1,failure,40,15,,,',
 ].join('\n');
 const result=parseImportCsv('hevy','hevy-sanitized-fixture.csv',header+rows);
 expect(result.columns).toHaveLength(14);
 expect(result.needsUnit).toBe(false);
 expect(result.workouts).toHaveLength(3);
 expect(result.workouts.find(w=>w.title==='Afternoon workout 💪')).toBeDefined();
 const pull=result.workouts.find(w=>w.title==='Day 2 Pull')!;
 expect(pull.localDay).toBe('2026-10-22');
 expect(pull.sets.map(s=>s.position)).toEqual([0,2,3]);
 expect(pull.sets.map(s=>s.weight)).toEqual([13.61,18.14,11.34]);
 expect(pull.sets.every(s=>s.kind==='working')).toBe(true);
 const legs=result.workouts.find(w=>w.title==='Day 3 Legs')!;
 expect(legs.sets).toHaveLength(1);
 expect(legs.sets[0]).toMatchObject({exercise:'Crunch (Machine)',weight:0,reps:15});
 expect(result.nonStrengthRows).toBe(1);
 expect(result.ignored).toBe(1);
 const later=parseImportCsv('hevy','precision.csv',header+
  'Upper,"22 Oct 2026, 15:50","22 Oct 2026, 17:08",,Bench,,,0,normal,9.07,8,,,');
 expect(later.workouts[0]?.sets[0]?.weight).toBe(9.07);
});
test('Hevy normal cardio without reps is excluded, even when duration is populated',()=>{
 const header='title,start_time,exercise_title,set_index,set_type,weight_kg,reps,distance_km,duration_seconds\n';
 const x=parseImportCsv('hevy','cardio.csv',header+
  'Test,"22 Oct 2026, 15:50",Walk,0,normal,,,1.2,600\n'+
  'Test,"22 Oct 2026, 15:50",Bench,1,normal,20,10,,');
 expect(x.nonStrengthRows).toBe(1);
 expect(x.workouts[0]?.sets).toHaveLength(1);
});

test('file type guard rejects XLSX copies and explains how to export a real Hevy CSV',()=>{
 expect(csvFileTypeError('hevy.xlsx','hevy')).toContain('without opening it in Excel');
 expect(csvFileTypeError('export.XLSX','csv')).toContain('CSV files only');
 expect(csvFileTypeError('export.csv','hevy')).toBeNull();
 expect(csvFileTypeError('EXPORT.CSV','hevy')).toBeNull();
});
