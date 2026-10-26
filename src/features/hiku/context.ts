import {readDiaryDay} from '../eat/diaryRepository';
import {getCurrentTarget} from '../../services/database/targets';
import {listSessions} from '../../services/database/gymRepositories';
import {isLocalDate} from '../train/weekPlan';
export type HikuContext={today?:string;training?:string};
/** Reads stay on the phone; only explicitly selected values are inserted
 * into the preview and then sent in exactly that form. */
export async function readAvailableHikuContext():
 Promise<{today:string;training:string}|null>{
 const [diary,target,training]=await Promise.all([
  readDiaryDay(),getCurrentTarget(),listSessions(100)]);
 if(!diary.ok||!target.ok||!training.ok)return null;
 const eaten=diary.value.reduce((sum,e)=>sum+e.kcal,0);
 const today=diary.value.length>0?
  'Food logged today: '+eaten+' kcal eaten'+(target.value?', target '+target.value.kcal+' kcal':''):
  'No food logged today'+(target.value?', target '+target.value.kcal+' kcal':'');
 const workout=training.value.find(s=>s.state==='finished'&&isLocalDate(s.startedAt,new Date()))
  ??training.value.find(s=>s.state==='in-progress'&&isLocalDate(s.startedAt,new Date()));
 return {today,training:workout?'Training today: '+workout.title:
  'No workout recorded today'};
}
export function contextForSend(available:{today:string;training:string},
 today:boolean,training:boolean):HikuContext{
 return {today:today?available.today:undefined,training:training?available.training:undefined};
}
