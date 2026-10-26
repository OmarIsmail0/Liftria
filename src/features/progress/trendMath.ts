import { dayOffset, localDay } from '../eat/foodCatalog';
import { summarizeEntries, type DiaryEntry } from '../eat/diaryRepository';

export type RangeKey='4w'|'3m'|'1y';
export const rangeDays=(range:RangeKey)=>range==='4w'?28:range==='3m'?90:365;
export type NutritionDay={day:string;logged:boolean;kcal:number|null;
  protein:number|null;carbs:number|null;fat:number|null;completeMacros:boolean;
  proteinGoal:'met'|'below'|'unknown'|'unlogged'};
export type NutritionTrend={days:NutritionDay[];loggedDays:number;
  avgKcal:number|null;avgProtein:number|null;avgCarbs:number|null;avgFat:number|null;
  completeMacroDays:number;proteinMetDays:number};
/** Today is unfinished and must not distort daily trend averages. */
export function nutritionTrend(entries:readonly DiaryEntry[],today:string,period:number,proteinTarget:number|null):NutritionTrend{
  const byDay=new Map<string,DiaryEntry[]>();
  for(const entry of entries){const list=byDay.get(entry.day)??[];list.push(entry);byDay.set(entry.day,list);}
  const days=Array.from({length:period},(_,index)=>{
    const day=dayOffset(today,index-period);
    const items=byDay.get(day)??[],s=summarizeEntries(items);
    const completeMacros=s.logged&&items.every(e=>e.protein!==null&&e.carbs!==null&&e.fat!==null);
    const proteinGoal:NutritionDay['proteinGoal']=!s.logged?'unlogged':
      !completeMacros||proteinTarget===null?'unknown':
      (s.protein??0)>=proteinTarget?'met':'below';
    return {day,logged:s.logged,kcal:s.logged?s.kcal:null,
      protein:completeMacros?s.protein:null,carbs:completeMacros?s.carbs:null,
      fat:completeMacros?s.fat:null,completeMacros,proteinGoal};
  });
  const logged=days.filter(d=>d.logged),withMacros=logged.filter(d=>d.completeMacros);
  const avg=(values:(number|null)[])=>values.length?
    values.reduce<number>((sum,v)=>sum+(v??0),0)/values.length:null;
  return {days,loggedDays:logged.length,avgKcal:avg(logged.map(d=>d.kcal)),
    avgProtein:avg(withMacros.map(d=>d.protein)),
    avgCarbs:avg(withMacros.map(d=>d.carbs)),
    avgFat:avg(withMacros.map(d=>d.fat)),
    completeMacroDays:withMacros.length,
    proteinMetDays:logged.filter(d=>d.proteinGoal==='met').length};
}
export type WeightPoint={id:string;at:string;kg:number;source:'liftria'|'health-connect';origin?:string};
export type WeightTrendPoint={day:string;kg:number;trend:number;entries:WeightPoint[]};
export type WeightTrend={points:WeightTrendPoint[];latest:WeightTrendPoint|null;
  change:number|null;startDay:string;endDay:string};
/** Daily observed mean, then EMA with alpha = 2/(7+1). Missing days never count as zeros. */
export function weightTrend(rows:readonly WeightPoint[],first:string,last:string):WeightTrend{
  const bucket=new Map<string,WeightPoint[]>();
  for(const row of rows){
    const date=new Date(row.at);
    if(!Number.isFinite(row.kg)||row.kg<=0||!Number.isFinite(date.getTime()))continue;
    const day=localDay(date);
    if(day<first||day>last)continue;
    const list=bucket.get(day)??[];list.push(row);bucket.set(day,list);
  }
  let previous:number|null=null;
  const points=[...bucket].sort(([a],[b])=>a.localeCompare(b)).map(([day,entries])=>{
    const kg=entries.reduce((sum,row)=>sum+row.kg,0)/entries.length;
    const trend=previous===null?kg:previous+(kg-previous)*0.25;
    previous=trend;
    return {day,kg,trend,entries};
  });
  const latest=points.at(-1)??null;
  const past=latest?points.filter(p=>p.day<=dayOffset(latest.day,-7)).at(-1)??null:null;
  return {points,latest,change:latest&&past?latest.trend-past.trend:null,startDay:first,endDay:last};
}
/** The two sources share a chart but HC is never editable or copied to the profile. */
export function sourceCounts(rows:readonly WeightPoint[]):{local:number;health:number}{
  return {local:rows.filter(r=>r.source==='liftria').length,
    health:rows.filter(r=>r.source==='health-connect').length};
}
