import type { DeletedWorkout } from '../../services/database/historyRepository';
export const UNDO_WINDOW_MS=8000;
let pending:{item:DeletedWorkout;until:number}|null=null;
export function storeUndo(item:DeletedWorkout,at=Date.now()){pending={item,until:at+UNDO_WINDOW_MS};}
export function peekUndo(at=Date.now()):DeletedWorkout|null{
 if(!pending||at>=pending.until){pending=null;return null;}return pending.item;
}
export function takeUndo(at=Date.now()){const row=peekUndo(at);pending=null;return row;}
export function clearUndo(){pending=null;}
