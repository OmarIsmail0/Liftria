import {dayOffset} from '../eat/foodCatalog';
import {weightTrend,type WeightPoint} from './trendMath';
import {goalFactors,type Goal} from '../onboarding/targetEstimate';

/** A complete past day with at least one food entry; absent days are NOT zero. */
export type IntakeDay={day:string;kcal:number};
export type BurnReadiness={ready:false;needHistory:number;needLogged:number;needWeighIns:number;
 loggedDays:number;weighIns:number;historyDays:number};
export type BurnEstimate={ready:true;estimatedBurn:number;averageIntake:number;
 trendChangeKg:number;elapsedDays:number;loggedDays:number;weighIns:number;historyDays:number;
 firstDay:string;lastDay:string};
export type BurnResult=BurnReadiness|BurnEstimate;
const dateMs=(day:string)=>Date.parse(day+'T00:00:00Z');
const elapsed=(first:string,last:string)=>(dateMs(last)-dateMs(first))/86400000;

/** Ordinary least-squares slope of daily mean weigh-ins, kg per calendar day.
 * Uses actual elapsed dates (missing weigh-in days aren't filled with zeros);
 * a single boundary measurement no longer entirely defines the weight change. */
export function weightSlope(rows:readonly {day:string;kg:number}[]):number|null{
 if(rows.length<2)return null;
 const start=dateMs(rows[0]!.day);
 const points=rows.map(row=>({x:(dateMs(row.day)-start)/86400000,y:row.kg}));
 if(points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return null;
 const meanX=points.reduce((total,p)=>total+p.x,0)/points.length;
 const meanY=points.reduce((total,p)=>total+p.y,0)/points.length;
 const denominator=points.reduce((total,p)=>total+(p.x-meanX)**2,0);
 if(denominator<=0)return null;
 return points.reduce((total,p)=>total+(p.x-meanX)*(p.y-meanY),0)/denominator;
}
/** No watch or Health Connect *calorie* records enter the estimate. Exclude
 * unfinished today and average only food logs between the first and last weigh-in.
 * Require 14 spanned calendar days, 4 distinct weigh-in days and 10 logged days
 * within that same span, all in the last 28 complete days. */
export function adaptiveExpenditure(intake:readonly IntakeDay[],weights:readonly WeightPoint[],today:string):BurnResult{
 const last=dayOffset(today,-1),first=dayOffset(last,-27);
 const points=weightTrend(weights,first,last).points;
 const weighIns=points.length; // Unique weigh-in dates, daily-means if multiple samples.
 const firstWeight=points[0]?.day,lastWeight=points.at(-1)?.day;
 const historyDays=firstWeight&&lastWeight?elapsed(firstWeight,lastWeight)+1:0;
 const byDay=new Map<string,number>();
 for(const row of intake){
  if(!firstWeight||!lastWeight||row.day<firstWeight||row.day>lastWeight||
   !Number.isFinite(row.kcal)||row.kcal<0)continue;
  byDay.set(row.day,(byDay.get(row.day)??0)+row.kcal);
 }
 const loggedDays=byDay.size;
 const missing={ready:false as const,needHistory:Math.max(0,14-historyDays),
  needLogged:Math.max(0,10-loggedDays),needWeighIns:Math.max(0,4-weighIns),
  historyDays,loggedDays,weighIns};
 if(missing.needHistory||missing.needLogged||missing.needWeighIns)return missing;
 const elapsedDays=elapsed(firstWeight!,lastWeight!);
 const slope=weightSlope(points);
 if(elapsedDays<=0||slope===null)return missing;
 const averageIntake=[...byDay.values()].reduce((sum,value)=>sum+value,0)/loggedDays;
 const trendChangeKg=slope*elapsedDays;
 const estimatedBurn=Math.round(averageIntake-slope*7700);
 // An inconsistent/incomplete diary may yield an implausible nonpositive result.
 // Never present it as an estimate or use it to propose a target.
 if(!Number.isFinite(estimatedBurn)||estimatedBurn<=0)return missing;
 return {ready:true,estimatedBurn,averageIntake,trendChangeKg,elapsedDays,
  loggedDays,weighIns,historyDays,firstDay:firstWeight!,lastDay:lastWeight!};
}
/** Monday-based local calendar week; changing the goal within a week does not create another offer. */
export function checkinWeek(day:string):string{
 const date=new Date(day+'T12:00:00Z');
 const weekday=date.getUTCDay();
 return dayOffset(day,-((weekday+6)%7));
}
/** A proposal is merely a number until the user explicitly accepts or edits it. */
export function proposedCalories(burn:number,goal:Goal):number{
 if(!Number.isFinite(burn)||burn<=0)throw new Error('Invalid estimated burn');
 return Math.max(1000,Math.round(burn*goalFactors[goal]/50)*50);
}
/** Preserve protein and fat where possible; recalibrate carbohydrates to the new calorie target. */
export function proposedMacros(kcal:number,proteinG:number,fatG:number){
 return {kcal,proteinG,fatG,
  carbsG:Math.max(0,Math.round((kcal-proteinG*4-fatG*9)/4/5)*5)};
}
