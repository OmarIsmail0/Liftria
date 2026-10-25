import { isSessionRestNotification } from '../restAlerts';
import { suggestionForSlot, workoutNumbers, type ActiveWorkout } from '../workoutData';

describe('persisted rest notifications',()=>{
  test('match only this session, surviving any lost JS notification ref',()=>{
    expect(isSessionRestNotification({kind:'liftria-rest',sessionId:'A',setId:'s'},'A')).toBe(true);
    expect(isSessionRestNotification({kind:'liftria-rest',sessionId:'B'},'A')).toBe(false);
    expect(isSessionRestNotification({kind:'other',sessionId:'A'},'A')).toBe(false);
    expect(isSessionRestNotification(undefined,'A')).toBe(false);
  });
});
describe('suggestions never log',()=>{
  const previous=[{position:0,side:null,weight:70,reps:8},
    {position:1,side:null,weight:70,reps:8}];
  test('per-slot value and progression only when every set reached upper reps',()=>{
    expect(suggestionForSlot(previous,1,null,8,2,2.5)).toEqual({weight:72.5,reps:8,progressed:true});
    expect(suggestionForSlot(previous,1,null,10,2,2.5)).toEqual({weight:70,reps:8,progressed:false});
    expect(suggestionForSlot(previous,5,null,8,2,2.5)).toBeNull();
    expect(suggestionForSlot(previous.slice(0,1),0,null,8,2,2.5)?.progressed).toBe(false);
  });
  test('no completed sets means no set is created',()=>{
    const view:ActiveWorkout={id:'s',title:'New',templateId:null,startedAt:'2026-10-25T00:00:00Z',
      endedAt:null,notes:null,state:'in-progress',sets:[],
      exercises:[{id:'e',exerciseId:'e',name:'Bench',type:'weighted',unilateral:false,
        position:0,targetSets:2,repMin:6,repMax:8,restSec:120}]};
    const suggestion=suggestionForSlot(previous,0,null,8,2,2.5);
    expect(suggestion?.weight).toBe(72.5);
    expect(view.sets).toHaveLength(0);
    expect(workoutNumbers(view)).toEqual({sets:0,volume:0,pending:2});
  });
});
