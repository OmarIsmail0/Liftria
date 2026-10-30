import { MUSCLES, type Muscle } from '../../services/database/gymTypes';
import { setVolume } from '../../services/database/gymMath';
import type { StrengthObservation } from '../../services/database/historyRepository';
import { formatNumber, pluralForm, translate, type AppLanguage, type TranslationKey } from '../../i18n';

export const RECOVERY={
  primaryCredit:1,secondaryCredit:0.5,
  thresholdsHours:[24,48,72] as const,
  factors:[1,0.5,0.25,0] as const,
  higherScore:4,someScore:1,volumeWindowHours:168,untrainedHours:240,
} as const;
export type RecoveryBand='higher'|'some'|'ready';
export type MuscleRecovery={
  muscle:Muscle;score:number;weeklyCredit:number;recentCredit:number;lastCredit:string|null;
  lastPrimary:string|null;band:RecoveryBand;untrained:boolean;
};
export function decayByHours(age:number):number{
  if(age<0||!Number.isFinite(age))return 0;
  if(age<RECOVERY.thresholdsHours[0])return 1;
  if(age<RECOVERY.thresholdsHours[1])return 0.5;
  if(age<RECOVERY.thresholdsHours[2])return 0.25;
  return 0;
}
export function bandForScore(score:number):RecoveryBand{
  return score>=RECOVERY.higherScore?'higher':score>=RECOVERY.someScore?'some':'ready';
}
export function volumeBand(credit:number):'none'|'low'|'medium'|'high'{
  return credit>=12?'high':credit>=6?'medium':credit>0?'low':'none';
}
/** One unilateral L/R pair is one completed set; a single logged side is incomplete. */
export function completedLogicalSets(rows:StrengthObservation[]):StrengthObservation[]{
  const pairs=new Map<string,StrengthObservation[]>();
  for(const row of rows){
    if(row.kind!=='working'||row.reps<=0)continue;
    const key=row.sessionExerciseId+':'+row.position;
    pairs.set(key,[...(pairs.get(key)??[]),row]);
  }
  const result:StrengthObservation[]=[];
  for(const pair of pairs.values()){
    const first=pair[0];if(!first)continue;
    if(!first.unilateral){result.push(...pair);continue;}
    // Imports have no L/R sides; a null-side row represents a whole ordinary set.
    if(pair.some(r=>r.side===null)){result.push(...pair.filter(r=>r.side===null));continue;}
    if(pair.some(r=>r.side==='L')&&pair.some(r=>r.side==='R')){
      // A pair gets one muscle credit; later timestamp is the completion time.
      result.push([...pair].sort((a,b)=>b.loggedAt.localeCompare(a.loggedAt))[0]!);
    }
  }
  return result;
}
export function calculateMuscleRecovery(rows:StrengthObservation[],now:Date):MuscleRecovery[]{
  const data=new Map<Muscle,MuscleRecovery>(MUSCLES.map(m=>[m,{
    muscle:m,score:0,weeklyCredit:0,recentCredit:0,lastCredit:null,lastPrimary:null,band:'ready',untrained:true,
  }]));
  for(const row of completedLogicalSets(rows)){
    const at=Date.parse(row.loggedAt);
    if(!Number.isFinite(at))continue;
    const age=(now.valueOf()-at)/3600000;
    if(age<0)continue;
    const add=(muscle:Muscle,credit:number,primary:boolean)=>{
      const target=data.get(muscle);if(!target)return;
      const iso=row.loggedAt;
      if(!target.lastCredit||target.lastCredit<iso)target.lastCredit=iso;
      if(primary&&(!target.lastPrimary||target.lastPrimary<iso))target.lastPrimary=iso;
      target.score+=credit*decayByHours(age);
      if(age<RECOVERY.thresholdsHours[2])target.recentCredit+=credit;
      if(age<RECOVERY.volumeWindowHours)target.weeklyCredit+=credit;
    };
    for(const muscle of row.primary)add(muscle,RECOVERY.primaryCredit,true);
    for(const muscle of row.secondary.filter(m=>!row.primary.includes(m)))add(muscle,RECOVERY.secondaryCredit,false);
  }
  for(const rec of data.values()){
    rec.band=bandForScore(rec.score);
    rec.untrained=!rec.lastPrimary||
      (now.valueOf()-Date.parse(rec.lastPrimary))/3600000>=RECOVERY.untrainedHours;
  }
  return [...data.values()];
}
export type StrengthWeek={label:string;start:Date;end:Date;volume:number;logged:boolean};
export function strengthWeeks(rows:StrengthObservation[],now:Date,count=8):StrengthWeek[]{
  const sunday=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  sunday.setDate(sunday.getDate()-sunday.getDay());
  return Array.from({length:count},(_,i)=>{
    const start=new Date(sunday);start.setDate(sunday.getDate()-(count-1-i)*7);
    const end=new Date(start);end.setDate(start.getDate()+7);
    const selected=rows.filter(r=>{const when=Date.parse(r.loggedAt);
      return when>=start.valueOf()&&when<end.valueOf();});
    const grouped=completedLogicalSets(selected);
    const completedKeys=new Set(grouped.map(s=>s.sessionExerciseId+':'+s.position));
    // Volume uses every side of a complete unilateral pair exactly as TR-8 does.
    // Dumbbell pair sides are each half of the per-hand ×2 contribution.
    const volume=selected.filter(s=>completedKeys.has(s.sessionExerciseId+':'+s.position))
      .reduce((sum,s)=>sum+setVolume(s.type,s)*
        (s.unilateral&&s.side!==null&&s.type==='dumbbell'?0.5:1),0);
    return {label:start.toLocaleDateString(undefined,{month:'short',day:'numeric'}),
      start,end,volume,logged:grouped.length>0};
  });
}
export function strengthWindowSummary(weeks:StrengthWeek[],rangeWeeks=4){
  const recent=weeks.slice(-rangeWeeks),prior=weeks.slice(-rangeWeeks*2,-rangeWeeks);
  const total=recent.reduce((n,w)=>n+w.volume,0);
  const previous=prior.reduce((n,w)=>n+w.volume,0);
  return {total,previous,changePct:previous>0?(total-previous)/previous*100:null};
}
export function relativeTrainingDay(iso:string|null,now:Date,language:AppLanguage='en'):string{
  if(!iso)return translate(language,'recovery.notTrained');
  const d=new Date(iso);
  const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const trained=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  const diff=Math.round((today.valueOf()-trained.valueOf())/86400000);
  return diff<=0?translate(language,'recovery.today'):diff===1?translate(language,'recovery.yesterday'):
    translate(language,(`recovery.daysAgo.${pluralForm(language,diff)}`) as TranslationKey,{count:diff});
}

/** Row copy describes logged set credit, not physiological recovery. */
export function recoveryRowText(row:MuscleRecovery,mode:'recent'|'volume'|'untrained',now:Date,
  language:AppLanguage='en'):string {
  const counted=(value:number)=>{
    const rounded=Number(value.toFixed(1));
    return translate(language,rounded===1?'recovery.oneSet':'recovery.sets',{count:formatNumber(language,rounded)});
  };
  const inSentence=(text:string)=>language==='en'?text.toLowerCase():text;
  const day=(iso:string|null)=>inSentence(relativeTrainingDay(iso,now,language));
  if(mode==='recent'){
    const load=translate(language,row.band==='higher'?'recovery.high':row.band==='some'?'recovery.some':'recovery.ready');
    return translate(language,'recovery.rowRecent',{sets:counted(row.recentCredit),day:day(row.lastCredit),load});
  }
  if(mode==='volume')return translate(language,'recovery.rowVolume',{sets:counted(row.weeklyCredit),day:day(row.lastCredit)});
  if(!row.lastPrimary)return row.lastCredit?
    translate(language,'recovery.helper',{day:language==='en'?day(row.lastCredit).replace(/^trained /,'').replace(/^last trained /,''):
      relativeTrainingDay(row.lastCredit,now,language)}):
    translate(language,'recovery.notTrained');
  return relativeTrainingDay(row.lastPrimary,now,language);
}
