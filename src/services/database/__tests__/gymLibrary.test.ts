import { MUSCLES, regionKey } from '../gymTypes';
import { bundledExercises, normalizedName, packExercise, newGymId, searchExercises } from '../exerciseLibrary';
import { calculateRecords, estimatedOneRepMax, setVolume, workingSetCount } from '../gymMath';

test('bundled pack is complete with one-to-one mapping for exactly 17 regions', () => {
  const pack = bundledExercises();
  expect(pack).toHaveLength(876);
  expect(new Set(pack.map(e=>e.id)).size).toBe(876);
  const declared = new Set(MUSCLES);
  const categories = new Set(pack.flatMap(e=>[...e.primaryMuscles,...e.secondaryMuscles]));
  expect([...categories].sort()).toEqual([...declared].sort());
  expect(new Set(MUSCLES.map(regionKey)).size).toBe(17);
  expect(pack.every(e=>e.primaryMuscles.every(m=>declared.has(m)) &&
    e.secondaryMuscles.every(m=>declared.has(m)))).toBe(true);
  expect(pack.every(e=>e.source==='pack' && e.retired===false)).toBe(true);
});

test('built-in IDs remain unchanged; OHP alias and local typo/fuzzy searches', () => {
  const all = bundledExercises();
  const first = all[0]!;
  expect(packExercise({ id: first.id, name: first.name, equipment:first.equipment,
    category:'strength', primaryMuscles:first.primaryMuscles,
    secondaryMuscles:first.secondaryMuscles, instructions:[] }).id).toBe(first.id);
  expect(searchExercises(all,'OHP').length).toBeGreaterThan(0);
  expect(searchExercises(all,'squat').some(e=>normalizedName(e.name).includes('squat'))).toBe(true);
  expect(searchExercises(all,'sqaut').length).toBeGreaterThan(0);
  expect(searchExercises(all,'notarealexercisezzz')).toEqual([]);
});

test.each([
  ['Barbell_Bench_Press_-_Medium_Grip','weighted',false],
  ['Barbell_Curl','weighted',false],
  ['Arnold_Dumbbell_Press','dumbbell',false],
  ['One_Arm_Dumbbell_Bench_Press','dumbbell',true],
  ['Band_Assisted_Pull-Up','assisted',false],
  ['Single-Arm_Push-Up','bodyweight',true],
  ['Single_Leg_Glute_Bridge','bodyweight',true],
  ['Cable_One_Arm_Tricep_Extension','weighted',true],
  ['Extended_Range_One-Arm_Kettlebell_Floor_Press','dumbbell',true],
  ['Alternating_Kettlebell_Press','weighted',true],
  ['Alternating_Floor_Press','weighted',true],
] as const)('%s uses %s and unilateral=%s', (id,type,unilateral) => {
  const item = bundledExercises().find(exercise => exercise.id === id);
  expect(item).toBeDefined();
  expect(item).toMatchObject({ type, unilateral });
});

test.each([
  ['weighted',50,8,400,50*(1+8/30)],
  ['dumbbell',20,10,400,20*(1+10/30)],
  ['assisted',25,8,0,null],
  ['bodyweight',10,12,120,null],
] as const)('%s volume and estimate', (type,weight,reps,volume,estimate) => {
  const set = {weight,reps,kind:'working' as const,side:null};
  expect(setVolume(type,set)).toBe(volume);
  expect(estimatedOneRepMax(type,set)).toBe(estimate);
  expect(setVolume(type,{...set,kind:'warm-up'})).toBe(0);
  expect(estimatedOneRepMax(type,{...set,kind:'warm-up'})).toBeNull();
});
test('Epley is limited to 1–12 reps; unilateral sides counted once', () => {
  const set = {weight:60,reps:13,kind:'working' as const,side:null};
  expect(estimatedOneRepMax('weighted',set)).toBeNull();
  expect(workingSetCount([
    {...set,reps:8,side:'L',position:0,unilateral:true},
    {...set,reps:8,side:'R',position:0,unilateral:true},
    {...set,reps:8,side:null,position:1,unilateral:false},
    {...set,reps:8,side:null,position:2,unilateral:false,kind:'warm-up'},
  ])).toBe(2);
});
test('records rebuild correctly after edit, delete and import in same calculation', () => {
  const make = (sessionId:string, weight:number, reps:number) => ({
    exerciseId:'squat',side:null,kind:'working' as const,
    weight,reps,type:'weighted' as const,sessionId,endedAt:'2026-10-25T10:00:00Z',
  });
  const original=[make('manual',60,8),make('manual',70,5)];
  const edited=[make('manual',60,8),make('manual',80,5)];
  expect(calculateRecords(original)[0]?.heaviest).toBe(70);
  expect(calculateRecords(edited)[0]?.heaviest).toBe(80);
  expect(calculateRecords([])).toEqual([]);
  expect(calculateRecords([...original,make('file',90,3)])[0]?.heaviest).toBe(90);
});

test('newGymId works without the Web Crypto global (Hermes on Android)', () => {
  const original = globalThis.crypto;
  Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
  try {
    const ids = new Set(Array.from({ length: 500 }, () => newGymId()));
    expect(ids.size).toBe(500);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  } finally {
    Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true });
  }
});

test('record owner remains the first session with the absolute weight when later sessions tie',()=>{
 const rows=[
 {exerciseId:'press',side:null,kind:'working' as const,weight:60,reps:8,
  type:'weighted' as const,sessionId:'old',endedAt:'2026-10-20T08:00:00Z'},
 {exerciseId:'press',side:null,kind:'working' as const,weight:80,reps:8,
  type:'weighted' as const,sessionId:'winner',endedAt:'2026-10-21T08:00:00Z'},
 {exerciseId:'press',side:null,kind:'working' as const,weight:80,reps:8,
  type:'weighted' as const,sessionId:'tie',endedAt:'2026-10-22T08:00:00Z'},
 ];
 const record=calculateRecords(rows)[0]!;
 expect(record.heaviestSessionId).toBe('winner');
 expect(record.bestEstimatedOneRepMaxSessionId).toBe('winner');
 expect(calculateRecords(rows.filter(r=>r.sessionId!=='winner'))[0]?.heaviestSessionId).toBe('tie');
 const assist=calculateRecords(rows.map((r,i)=>({...r,exerciseId:'pull',type:'assisted' as const,
  weight:[25,15,15][i]!})))[0]!;
 expect(assist.lowestAssistanceSessionId).toBe('winner');
 expect(assist.heaviestSessionId).toBeNull();
});
