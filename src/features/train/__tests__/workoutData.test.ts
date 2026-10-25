import { workoutNumbers, type ActiveWorkout } from '../workoutData';

test('unilateral working set counts once only after both sides and excludes warm-ups',()=>{
  const view:ActiveWorkout={
    id:'s',title:'Test',templateId:null,startedAt:'2026-10-25T10:00:00Z',
    endedAt:null,notes:null,state:'in-progress',
    exercises:[{id:'e',exerciseId:'x',name:'One arm',type:'dumbbell',
      unilateral:true,position:0,targetSets:2,repMin:8,repMax:12,restSec:120}],
    sets:[{id:'L',sessionExerciseId:'e',position:0,side:'L',
      kind:'working',weight:20,reps:10,loggedAt:'2026-10-25T10:01:00Z',restDeadline:null}],
  };
  expect(workoutNumbers(view)).toEqual({sets:0,pending:2,volume:200});
  view.sets.push({...view.sets[0]!,id:'R',side:'R'});
  expect(workoutNumbers(view)).toEqual({sets:1,pending:1,volume:400});
  view.sets.push({...view.sets[0]!,id:'warm',kind:'warm-up',position:100});
  expect(workoutNumbers(view)).toEqual({sets:1,pending:1,volume:400});
});
