import {toKg,fromKg,type WeightUnit} from './workoutUnits';
import type {ExerciseType} from '../../services/database/gymTypes';

export type PlateRow={weight:number;count:number};
export type PlateResult={unit:WeightUnit;bar:number;target:number;actual:number;
  perSide:PlateRow[];exact:boolean;belowBar:boolean};
/** Standard competition/gym plates. Small change plates are opt-in. */
export const platesFor=(unit:WeightUnit,small:boolean):readonly number[]=>
 unit==='kg'?(small?[25,20,15,10,5,2.5,1.25,0.5,0.25]:
                    [25,20,15,10,5,2.5,1.25]):
             (small?[45,35,25,10,5,2.5,1.25,0.5]:
                    [45,35,25,10,5,2.5]);

/** Greedy never claims an impossible load. All arithmetic uses quarter-pound
 * or quarter-kilogram integers so no floating point phantom plate appears. */
export function calculatePlates(target:number,bar:number,unit:WeightUnit,small=false):PlateResult{
 if(!Number.isFinite(target)||target<0||!Number.isFinite(bar)||bar<=0||bar>100)
  throw new Error('Invalid plate or bar input');
 const scale=100;
 let side=Math.max(0,Math.floor((target-bar)/2*scale+1e-7));
 const perSide:PlateRow[]=[];
 for(const weight of platesFor(unit,small)){
  const amount=Math.round(weight*scale);
  const count=Math.floor(side/amount);
  if(count>0){perSide.push({weight,count});side-=count*amount;}
 }
 const actual=Math.round((bar+2*perSide.reduce((sum,p)=>sum+p.weight*p.count,0))*100)/100;
 return {unit,bar,target,actual,perSide,exact:Math.abs(target-actual)<0.001,
  belowBar:target<bar};
}
export type WarmupRow={label:'bar'|'40'|'60'|'80';fraction:number;
 weightKg:number;reps:number;actual:number;plates:PlateRow[]};
/** Suggested only. Caller must explicitly log each warm-up set. */
export function suggestedWarmups(targetKg:number,barUnit:number,unit:WeightUnit,
 small=false):WarmupRow[]{
 if(!Number.isFinite(targetKg)||targetKg<=0||!Number.isFinite(barUnit)||barUnit<=0)return [];
 const target=fromKg(targetKg,unit);
 if(target<=barUnit)return [];
 const candidates=([
  {label:'bar' as const,fraction:0,reps:10,requested:barUnit},
  {label:'40' as const,fraction:0.4,reps:5,requested:target*0.4},
  {label:'60' as const,fraction:0.6,reps:3,requested:target*0.6},
  {label:'80' as const,fraction:0.8,reps:1,requested:target*0.8},
 ]).map(row=>{
  const v=calculatePlates(Math.max(barUnit,row.requested),barUnit,unit,small);
  return {label:row.label,fraction:row.fraction,weightKg:toKg(v.actual,unit),
   actual:v.actual,plates:v.perSide,reps:row.reps};
 });
 return candidates.filter((row,i)=>i===0||row.actual!==candidates[i-1]?.actual);
}

/** Only free barbell loads use the bar-plus-plates calculator. */
export function isPlateLoadedBarbell(type:ExerciseType,equipment:string|null|undefined):boolean{
 return type==='weighted'&&/\bbarbell\b/i.test(equipment??'');
}

/** Dumbbells and machines get rounded percentages, never a fictional bar/plate breakdown. */
export function suggestedUnplatedWarmups(targetKg:number,unit:WeightUnit,stepUnit:number):
 Array<{weightKg:number;actual:number;reps:number}>{
 if(!Number.isFinite(targetKg)||targetKg<=0||!Number.isFinite(stepUnit)||stepUnit<=0)return [];
 const target=fromKg(targetKg,unit);
 const candidates=[{fraction:0.4,reps:5},{fraction:0.6,reps:3},{fraction:0.8,reps:1}]
  .map(({fraction,reps})=>{
   const actual=Number((Math.floor(target*fraction/stepUnit+1e-7)*stepUnit).toFixed(2));
   return {weightKg:toKg(actual,unit),actual,reps};
  }).filter(row=>row.actual>0);
 return candidates.filter((row,i)=>i===0||row.actual!==candidates[i-1]?.actual);
}
