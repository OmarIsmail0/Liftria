import {adaptiveExpenditure,weightSlope,proposedCalories,proposedMacros,checkinWeek} from '../adaptiveExpenditure';
import {dayOffset} from '../../eat/foodCatalog';
import type {WeightPoint} from '../trendMath';
const TODAY='2026-10-27';
const diary=(days:number[],kcal:number)=>days.map(i=>({day:dayOffset(TODAY,-i),kcal}));
const weights=(entries:Array<[number,number]>):WeightPoint[]=>
 entries.map(([days,kg],index)=>({id:String(index),at:dayOffset(TODAY,-days)+'T12:00:00Z',kg,source:'liftria'}));

test('plateau over 14+ days estimates average logged intake, not zero for gaps',()=>{
 const days=[1,2,3,4,5,7,8,9,10,12,14,17];
 const result=adaptiveExpenditure(diary(days,2300),weights([[22,80],[17,80],[9,80],[1,80]]),TODAY);
 expect(result.ready).toBe(true);
 if(result.ready){expect(result.estimatedBurn).toBe(2300);expect(result.loggedDays).toBe(12);
  expect(result.trendChangeKg).toBe(0);expect(result.elapsedDays).toBe(21);}
});
test('daily-mean least-squares slope uses elapsed days even with missing weigh-ins',()=>{
 const samples=weights([[22,80],[17,79.8],[9,79.4],[1,79]]);
 const slope=weightSlope(samples.map(v=>({day:v.at.slice(0,10),kg:v.kg})));
 expect(slope).not.toBeNull();
 const result=adaptiveExpenditure(diary([1,2,3,4,5,6,8,9,10,11,12],2000),samples,TODAY);
 expect(result.ready).toBe(true);
 if(result.ready){
  expect(result.estimatedBurn).toBe(Math.round(2000-slope!*7700));
  expect(result.trendChangeKg).toBeCloseTo(slope!*21,9);
  expect(result.estimatedBurn).toBeGreaterThan(2000);
 }
});
test('missing days, weigh-ins and history never show numeric estimate',()=>{
 const noData=adaptiveExpenditure([],[],TODAY);
 expect(noData).toMatchObject({ready:false,needLogged:10,needWeighIns:4,needHistory:14});
 const short=adaptiveExpenditure(diary([1,2,3,4,5,6,7,8,9,10],2000),
   weights([[12,80],[10,80],[8,80],[1,80]]),TODAY);
 expect(short).toMatchObject({ready:false,needHistory:2,needLogged:0,needWeighIns:0});
 const few=adaptiveExpenditure(diary([1,2,3],1800),
   weights([[20,80],[1,80],[1,80]]),TODAY);
 expect(few).toMatchObject({ready:false,needWeighIns:2,needLogged:7});
});
test('today is incomplete and duplicate weigh-ins on one date count once',()=>{
 const result=adaptiveExpenditure(diary([0,1,2,3,4,5,6,7,8,9],2000),
   weights([[25,80],[25,80.2],[2,80],[1,80]]),TODAY);
 expect(result).toMatchObject({ready:false,needLogged:1,needWeighIns:1});
});
test('weekly goal proposals and macros are pure, never auto-saved',()=>{
 expect(checkinWeek('2026-10-27')).toBe('2026-10-26');
 expect(checkinWeek('2026-11-01')).toBe('2026-10-26');
 expect(proposedCalories(2400,'lose')).toBe(2050);
 expect(proposedCalories(2400,'maintain')).toBe(2400);
 expect(proposedCalories(2400,'build')).toBe(2650);
 expect(proposedCalories(1050,'lose')).toBe(1000);
 expect(proposedMacros(2000,140,60)).toEqual({kcal:2000,proteinG:140,fatG:60,carbsG:225});
});

const dailyWeights=(firstNoise=0,lastNoise=0):WeightPoint[]=>weights(
 Array.from({length:28},(_,i)=>[28-i,80+(i===0?firstNoise:i===27?lastNoise:0)] as [number,number]));
test('least-squares slope holds steady weight near 2500 with noisy first or last reading',()=>{
 const intake=diary(Array.from({length:28},(_,i)=>i+1),2500);
 for(const noise of [-1,0,1]){
  for(const edge of ['first','last'] as const){
   const rows=edge==='first'?dailyWeights(noise,0):dailyWeights(0,noise);
   const result=adaptiveExpenditure(intake,rows,TODAY);
   expect(result.ready).toBe(true);
   if(result.ready)expect(Math.abs(result.estimatedBurn-2500)).toBeLessThanOrEqual(60);
  }
 }
});
test('linear weight loss of 0.5 kg per week adds approximately 550 kcal to average intake',()=>{
 const rows=weights(Array.from({length:28},(_,i)=>
  [28-i,80-i*0.5/7] as [number,number]));
 const result=adaptiveExpenditure(diary(Array.from({length:28},(_,i)=>i+1),2000),rows,TODAY);
 expect(result.ready).toBe(true);
 if(result.ready){
  expect(result.estimatedBurn).toBe(2550);
  expect(result.trendChangeKg).toBeCloseTo(-27*0.5/7,8);
 }
});
test('intake logs outside the first-to-last weigh-in dates do not count or bias burn',()=>{
 const rows=weights([[20,80],[15,80],[10,80],[5,80]]);
 const inside=[5,6,7,8,9,10,11,12,13,14,15,16];
 const result=adaptiveExpenditure([...diary(inside,2200),...diary([25,24,23,3,2,1],9000)],rows,TODAY);
 expect(result.ready).toBe(true);
 if(result.ready){expect(result.loggedDays).toBe(inside.length);expect(result.averageIntake).toBe(2200);
  expect(result.estimatedBurn).toBe(2200);}
 const missing=adaptiveExpenditure([...diary(inside.slice(0,9),2200),...diary([25,24,23,3],2000)],rows,TODAY);
 expect(missing).toMatchObject({ready:false,needLogged:1,loggedDays:9});
});
test('distinct readings on one weigh-in day are averaged before calculating a slope',()=>{
 const rows=weights([[22,80],[22,82],[15,81],[9,81],[1,81]]);
 const result=adaptiveExpenditure(diary(Array.from({length:22},(_,i)=>i+1),2500),rows,TODAY);
 expect(result.ready).toBe(true);
 if(result.ready){expect(result.weighIns).toBe(4);expect(result.estimatedBurn).toBe(2500);}
});
