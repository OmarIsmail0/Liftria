import { summarizeActiveMuscles } from '../activeMuscleLoad';
import type { ActiveWorkout } from '../workoutData';
import type { Exercise } from '../../../services/database/gymTypes';

const chest = { id:'bench',primaryMuscles:['chest'],secondaryMuscles:['triceps'] } as Exercise;
const makeWorkout = (sets:ActiveWorkout['sets'],unilateral=false):ActiveWorkout=>({
  id:'session', title:'Test', templateId:null, startedAt:'2026-10-21T10:00:00Z', endedAt:null,
  state:'in-progress',notes:null,
  exercises:[{id:'se1',exerciseId:'bench',name:'Bench',type:'weighted',unilateral,position:0,targetSets:3,
    repMin:8,repMax:12,restSec:120}],sets,
});
const set=(position:number,kind:'working'|'warm-up',side:'L'|'R'|null=null):ActiveWorkout['sets'][number]=>({
  id:position+':'+side+':'+kind,sessionExerciseId:'se1',position,kind,side,weight:50,reps:8,
  loggedAt:'2026-10-21T10:00:00Z',restDeadline:null,
});
test('no completed set gives no invented muscle credit',()=>{
  const value=summarizeActiveMuscles(makeWorkout([]),{bench:chest});
  expect(value.completedSets).toBe(0);
  expect(value.credit.chest).toBe(0);
});
test('warmups excluded; primary 1 and secondary 0.5 per completed set',()=>{
  const value=summarizeActiveMuscles(makeWorkout([set(0,'warm-up'),set(1,'working')]),{bench:chest});
  expect(value.completedSets).toBe(1);
  expect(value.credit.chest).toBe(1);
  expect(value.credit.triceps).toBe(0.5);
});
test('partial unilateral set excluded, full pair counted once',()=>{
  const value=summarizeActiveMuscles(makeWorkout([set(0,'working','L'),set(1,'working','L'),set(1,'working','R')],true),
    {bench:chest});
  expect(value.completedSets).toBe(1);
  expect(value.credit.chest).toBe(1);
});
