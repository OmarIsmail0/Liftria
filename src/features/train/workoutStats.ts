import { dbOperation, type DbResult } from '../../services/database';
import { readWorkout, workoutNumbers, type ActiveWorkout } from './workoutData';
/** Neutral comparison comes only from a completed session, never from planned sets. */
export async function previousCompletedWorkout(view:ActiveWorkout):Promise<DbResult<number|null>>{
  const found=await dbOperation(db=>db.getFirstAsync<{id:string}>(
    "SELECT id FROM sessions WHERE state='finished' AND id<>? "+
    "AND ((? IS NOT NULL AND template_id=?) OR (? IS NULL AND title=?)) "+
    "ORDER BY started_at DESC LIMIT 1",
    [view.id,view.templateId,view.templateId,view.templateId,view.title]));
  if(!found.ok)return found;
  if(!found.value)return {ok:true,value:null};
  const previous=await readWorkout(found.value.id);
  return previous.ok?{ok:true,value:previous.value?workoutNumbers(previous.value).volume:null}:previous;
}
