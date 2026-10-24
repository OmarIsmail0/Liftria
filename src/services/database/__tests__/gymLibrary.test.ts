import { MUSCLES, regionKey } from '../gymTypes';
import { bundledExercises, normalizedName, packExercise, searchExercises } from '../exerciseLibrary';
import { calculateRecords, estimatedOneRepMax, setVolume, workingSetCount } from '../gymMath';
import type { Exercise } from '../gymTypes';

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
