import type { ExerciseType } from '../../services/database/gymTypes';
export type WeightUnit='kg'|'lb';
const LB_PER_KG=2.2046226218;
export const fromKg=(kg:number,unit:WeightUnit):number=>
  unit==='kg'?kg:Math.round(kg*LB_PER_KG*100)/100;
export const toKg=(value:number,unit:WeightUnit):number=>
  unit==='kg'?value:Math.round(value/LB_PER_KG*100000)/100000;
export function workoutWeightStep(type:ExerciseType,unit:WeightUnit,smallPlates:boolean):number {
  if(smallPlates)return 1.25;
  if(unit==='lb')return toKg(5,'lb');
  return type==='dumbbell'?2:2.5;
}
export function displayWeight(weight:number,type:ExerciseType,unit:WeightUnit):string {
  const n=fromKg(weight,unit);
  const value=Number(n.toFixed(2)).toString();
  if(type==='bodyweight')return weight<=0?'BW':'+'+value+' '+unit;
  if(type==='assisted')return '−'+value+' '+unit;
  return value+' '+unit+(type==='dumbbell'?' each':'');
}
