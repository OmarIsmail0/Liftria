import { bundledExercises, normalizedName, searchExercises } from '../../services/database/exerciseLibrary';
import { calculateRecords, type ExerciseRecord, type RecordObservation } from '../../services/database/gymMath';
import type { Exercise } from '../../services/database/gymTypes';
import { fromImportWeight, type ParsedImport, type ParsedWorkout, type WeightUnit } from './importCsv';

export type ImportChoice=string|'custom';
export type ImportContext={
  exercises:Exercise[];days:string[];importedHashes:string[];
  remembered:Record<string,ImportChoice>;
  observations:RecordObservation[];
};
export type ImportMapping={name:string;count:number;status:'exact'|'remembered'|'suggested'|'custom';
  resolvedId:string|null;suggestedId:string|null;suggestedName:string|null};
export type ImportPlan={parsed:ParsedImport;workouts:ParsedWorkout[];
  skippedDays:string[];hashDuplicate:boolean;missingUnit:boolean;unit:WeightUnit|null;
  mappings:ImportMapping[];customCount:number;setCount:number;warmupCount:number;
  changes:{exerciseName:string;before:string;after:string}[]};
export function mappingKey(source:string,name:string):string{
 return 'import.match.'+source+'.'+normalizedName(name);
}
export function resolveImportMappings(parsed:ParsedImport,context:ImportContext,
 decisions:Record<string,ImportChoice>={}):ImportMapping[]{
 const all=[...context.exercises,...bundledExercises()]
  .filter(e=>!e.retired);
 const unique=new Map<string,number>();
 for(const workout of parsed.workouts)for(const set of workout.sets){
  unique.set(set.exercise,(unique.get(set.exercise)??0)+1);
 }
 return [...unique].map(([name,count])=>{
  const exact=all.find(e=>normalizedName(e.name)===normalizedName(name)||
   e.aliases.some(a=>normalizedName(a)===normalizedName(name)));
  const explicit=decisions[name];
  const remembered=context.remembered[mappingKey(parsed.source,name)];
  const chosen=explicit??(exact?exact.id:remembered);
  const found=all.find(e=>e.id===chosen);
  if(found)return {name,count,status:exact&&chosen===exact.id?'exact':'remembered',
   resolvedId:found.id,suggestedId:null,suggestedName:null};
  if(chosen==='custom')return {name,count,status:'custom',
    resolvedId:null,suggestedId:null,suggestedName:null};
  const candidate=searchExercises([...all],name)[0];
  return {name,count,status:candidate?'suggested':'custom',resolvedId:null,
   suggestedId:candidate?.id??null,suggestedName:candidate?.name??null};
 });
}
export function createImportPlan(parsed:ParsedImport,context:ImportContext,
 unit:WeightUnit|null,decisions:Record<string,ImportChoice>={}):ImportPlan{
 const hashes=new Set(context.importedHashes);
 const hashDuplicate=hashes.has(parsed.fileHash);
 const skipSet=new Set(context.days);
 const workouts=hashDuplicate?[]:parsed.workouts.filter(w=>!skipSet.has(w.localDay));
 const skippedDays=parsed.workouts.filter(w=>hashDuplicate||skipSet.has(w.localDay))
  .map(w=>w.localDay);
 const mappings=resolveImportMappings({...parsed,workouts},context,decisions);
 const setCount=workouts.reduce((n,w)=>n+w.sets.length,0);
 const warmupCount=workouts.reduce((n,w)=>n+w.sets.filter(s=>s.kind==='warm-up').length,0);
 const missingUnit=workouts.some(w=>w.sets.some(s=>!s.unit&&!unit));
 const existing=calculateRecords(context.observations);
 const exerciseName=new Map(mappings.map(m=>[m.name,m]));
 const newObs:RecordObservation[]=[];
 for(const workout of workouts)for(const set of workout.sets){
  const map=exerciseName.get(set.exercise);if(!map)continue;
  const effectiveUnit=set.unit??unit;
  if(!effectiveUnit)continue;
  newObs.push({exerciseId:map.resolvedId??'import-custom:'+normalizedName(set.exercise),
   type:context.exercises.find(e=>e.id===map.resolvedId)?.type??'weighted',
   sessionId:workout.key,endedAt:workout.endedAt,kind:set.kind,side:null,
   weight:fromImportWeight(set.weight,effectiveUnit),reps:set.reps});
 }
 const nowRecords=calculateRecords([...context.observations,...newObs]);
 const changes=nowRecords.filter(next=>{
  const prev=existing.find(old=>old.exerciseId===next.exerciseId&&old.side===next.side);
  return !prev||next.heaviest!==prev.heaviest||next.lowestAssistance!==prev.lowestAssistance||
   next.maxReps!==prev.maxReps||next.bestEstimatedOneRepMax!==prev.bestEstimatedOneRepMax;
 }).map(next=>{
  const old=existing.find(r=>r.exerciseId===next.exerciseId&&r.side===next.side);
  const from=old?.heaviest??old?.lowestAssistance;
  const to=next.heaviest??next.lowestAssistance;
  const exerciseName=mappings.find(m=>(m.resolvedId??'import-custom:'+normalizedName(m.name))===next.exerciseId)?.name
   ??next.exerciseId;
  return {exerciseName,before:from===null||from===undefined?'First record':from.toFixed(1)+' kg',
   after:to===null?'Repetitions record':to.toFixed(1)+' kg'};
 });
 return {parsed,workouts,skippedDays,hashDuplicate,missingUnit,unit,mappings,
  customCount:mappings.filter(m=>m.resolvedId===null).length,setCount,warmupCount,changes};
}
export function canImportPlan(plan:ImportPlan):boolean{
 return plan.workouts.length>0&&!plan.missingUnit&&!plan.hashDuplicate;
}
