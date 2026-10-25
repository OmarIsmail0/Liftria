import { bandForScore, calculateMuscleRecovery, decayByHours,
  strengthWeeks, volumeBand, RECOVERY } from '../recoveryMath';
import type { StrengthObservation } from '../../../services/database/historyRepository';
const NOW=new Date('2026-10-21T09:41:00.000Z');
let i=0;
function row(age:number,primary:StrengthObservation['primary'],
  secondary:StrengthObservation['secondary']=[],kind:StrengthObservation['kind']='working'):StrengthObservation{
  const id='se'+(++i);
  return {sessionId:'s',sessionExerciseId:id,exerciseId:id,name:id,type:'weighted',
    endedAt:'2026-10-21T09:41:00Z',loggedAt:new Date(NOW.valueOf()-age*3600000).toISOString(),
    weight:50,reps:8,kind,side:null,position:0,unilateral:false,primary,secondary};
}
test('strict boundaries at exactly 24/48/72 hours and exact band scores 1 and 4',()=>{
  expect([0,23.999,24,47.999,48,71.999,72].map(decayByHours))
    .toEqual([1,1,0.5,0.5,0.25,0.25,0]);
  expect(bandForScore(0.999)).toBe('ready');
  expect(bandForScore(1)).toBe('some');
  expect(bandForScore(3.999)).toBe('some');
  expect(bandForScore(4)).toBe('higher');
  expect([0,0.5,5.5,6,11.5,12].map(volumeBand))
    .toEqual(['none','low','low','medium','medium','high']);
  expect(RECOVERY.untrainedHours).toBe(240);
});
test('spec worked example Oct 20 Lower A: quads 7, glutes 8, hamstrings 8',()=>{
  const inputs=[
    ...Array.from({length:4},()=>row(15,['quadriceps'],['glutes','hamstrings','lower back'])),
    ...Array.from({length:3},()=>row(15,['hamstrings'],['glutes','lower back'])),
    ...Array.from({length:3},()=>row(15,['quadriceps'],['glutes','hamstrings'])),
    ...Array.from({length:3},()=>row(15,['glutes'],['hamstrings'])),
    ...Array.from({length:3},()=>row(15,['calves'])),
    ...Array.from({length:2},()=>row(15,['abdominals'])),
    ...Array.from({length:2},()=>row(15,['quadriceps'],['glutes'],'warm-up')),
  ];
  const result=calculateMuscleRecovery(inputs,NOW),lookup=(m:string)=>result.find(x=>x.muscle===m)!;
  expect(lookup('quadriceps').score).toBe(7);
  expect(lookup('glutes').score).toBe(8);
  expect(lookup('hamstrings').score).toBe(8);
  expect(lookup('lower back').score).toBe(3.5);
  expect(lookup('calves').score).toBe(3);
  expect(lookup('abdominals').score).toBe(2);
  expect(lookup('glutes').band).toBe('higher');
  expect(lookup('chest').band).toBe('ready');
});
test('worked example Sat Oct 18 upper B 0.25 bucket',()=>{
  const inputs=[
    ...Array.from({length:3},()=>row(71,['chest'],['shoulders','triceps'])),
    ...Array.from({length:4},()=>row(71,['lats'],['biceps','middle back'])),
    ...Array.from({length:4},()=>row(71,['shoulders'],['triceps'])),
    ...Array.from({length:4},()=>row(71,['middle back'],['shoulders','biceps','lats'])),
    ...Array.from({length:3},()=>row(71,['biceps'],['forearms'])),
    ...Array.from({length:3},()=>row(71,['triceps'])),
  ];
  const x=calculateMuscleRecovery(inputs,NOW);const score=(m:string)=>x.find(r=>r.muscle===m)!.score;
  expect(score('chest')).toBe(0.75);expect(score('shoulders')).toBe(1.875);
  expect(score('biceps')).toBe(1.75);expect(score('triceps')).toBe(1.625);
  expect(score('lats')).toBe(1.5);expect(score('middle back')).toBe(1.5);
  expect(score('forearms')).toBe(0.375);
});
test('unilateral pair once; partial pair, warmup, future sets excluded',()=>{
  const onlyL={...row(0,['chest']),unilateral:true,side:'L' as const};
  const paired={...onlyL,side:'R' as const};
  const incomplete=calculateMuscleRecovery([onlyL],NOW);
  expect(incomplete.find(x=>x.muscle==='chest')?.score).toBe(0);
  const done=calculateMuscleRecovery([onlyL,paired,row(0,['chest'],[],'warm-up'),row(-1,['chest'])],NOW);
  expect(done.find(x=>x.muscle==='chest')?.score).toBe(1);
});
test('untrained boundary exactly 240h and secondary-only does not count as direct',()=>{
  const at=calculateMuscleRecovery([row(240,['traps']),row(0,['chest'],['lower back'])],NOW);
  expect(at.find(x=>x.muscle==='traps')?.untrained).toBe(true);
  expect(at.find(x=>x.muscle==='lower back')?.untrained).toBe(true);
  expect(at.find(x=>x.muscle==='chest')?.untrained).toBe(false);
});
test('weekly chart uses actual sets, not missing-day zero observations',()=>{
  const weeks=strengthWeeks([row(1,['chest'])],NOW,8);
  expect(weeks).toHaveLength(8);
  expect(weeks.filter(x=>x.logged)).toHaveLength(1);
  expect(weeks.filter(x=>!x.logged)).toHaveLength(7);
});

test('weekly unilateral volume equals active/session totals, including different L and R weights',()=>{
  const l={...row(1,['shoulders']),sessionExerciseId:'pair',type:'weighted' as const,
    unilateral:true,side:'L' as const,weight:30,reps:8};
  const right={...l,side:'R' as const,weight:40};
  const dbL={...row(1,['shoulders']),sessionExerciseId:'dumbbellPair',type:'dumbbell' as const,
    unilateral:true,side:'L' as const,weight:20,reps:8};
  const dbR={...dbL,side:'R' as const};
  const partial={...row(1,['shoulders']),sessionExerciseId:'incomplete',unilateral:true,
    side:'L' as const,weight:900,reps:8};
  const weeks=strengthWeeks([l,right,dbL,dbR,partial],NOW);
  expect(weeks.at(-1)?.volume).toBe(30*8+40*8+2*20*8);
});
