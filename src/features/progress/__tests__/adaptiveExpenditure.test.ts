import {adaptiveExpenditure,proposedCalories,proposedMacros,checkinWeek} from '../adaptiveExpenditure';
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
test('weight trend change adjusts daily burn using elapsed calendar days',()=>{
 const result=adaptiveExpenditure(diary([1,2,3,4,5,6,8,9,10,11,12],2000),
   weights([[22,80],[17,79.8],[9,79.4],[1,79]]),TODAY);
 expect(result.ready).toBe(true);
 if(result.ready){
  const lastTrend=80+(79.8-80)*.25;const next=lastTrend+(79.4-lastTrend)*.25;
  const final=next+(79-next)*.25;
  expect(result.estimatedBurn).toBe(Math.round(2000-(final-80)*7700/21));
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
