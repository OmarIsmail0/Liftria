import {nutritionTrend,weightTrend,sourceCounts} from '../trendMath';
import type {DiaryEntry} from '../../eat/diaryRepository';
const make=(day:string,kcal:number,p:number|null=10):DiaryEntry=>({
 id:day+':'+kcal,day,meal:'breakfast',foodId:null,name:'fixture',
 grams:null,kcal,protein:p,carbs:p,fat:p,source:p===null?'quick':'search',
 createdAt:day+'T12:00:00Z',editedAt:day+'T12:00:00Z'});
test('nutrition includes only logged days before today and preserves gaps',()=>{
 const r=nutritionTrend([make('2026-10-23',1200,20),make('2026-10-25',1400,30),
   make('2026-10-26',9999,50)],'2026-10-26',4,25);
 expect(r.days.map(d=>[d.day,d.kcal])).toEqual([
   ['2026-10-22',null],['2026-10-23',1200],
   ['2026-10-24',null],['2026-10-25',1400]]);
 expect(r.loggedDays).toBe(2);expect(r.avgKcal).toBe(1300);
 expect(r.proteinMetDays).toBe(1);expect(r.avgProtein).toBe(25);
});
test('quick add counts calories but cannot be counted as zero protein',()=>{
 const r=nutritionTrend([make('2026-10-25',300,null),make('2026-10-24',200,12)],
   '2026-10-26',2,10);
 expect(r.loggedDays).toBe(2);expect(r.avgKcal).toBe(250);
 expect(r.avgProtein).toBe(12);expect(r.completeMacroDays).toBe(1);
 expect(r.days[1]?.proteinGoal).toBe('unknown');
 expect(nutritionTrend([],'2026-10-26',7,25).avgKcal).toBeNull();
});
test('daily weight EMA uses 0.25 smoothing and no implied zero on gaps',()=>{
 const r=weightTrend([
  {id:'1',at:'2026-10-18T12:00:00Z',kg:80,source:'liftria'},
  {id:'2',at:'2026-10-19T12:00:00Z',kg:78,source:'liftria'},
  {id:'3',at:'2026-10-19T13:00:00Z',kg:80,source:'health-connect'},
  {id:'4',at:'2026-10-26T12:00:00Z',kg:77,source:'liftria'},
 ],'2026-10-18','2026-10-26');
 expect(r.points.map(p=>p.trend)).toEqual([80,79.75,79.0625]);
 expect(r.points[1]?.kg).toBe(79);
 expect(r.change).toBeCloseTo(-0.6875,5);
 expect(sourceCounts(r.points.flatMap(p=>p.entries))).toEqual({local:3,health:1});
});
test('single point has no claimed week-on-week change',()=>{
 const r=weightTrend([{id:'1',at:'2026-10-26T12:00:00Z',kg:78.4,source:'liftria'}],
 '2026-10-01','2026-10-26');
 expect(r.latest?.trend).toBe(78.4);expect(r.change).toBeNull();
});
