import type {HikuMeal,HikuReviewedItem,HikuItem} from './mealSchema';
import type {HikuModelId} from './models';
export type HikuDraft={
 description:string;meal:HikuMeal;items:HikuReviewedItem[];requestId:string;
 model:HikuModelId;costUsd:number|null;inputTokens:number;outputTokens:number;demo?:boolean;
 kind?:'text'|'photo';
};
let active:HikuDraft|null=null;
let pendingDescription='';
export const getHikuDescription=()=>active?.description??pendingDescription;
export const rememberHikuDescription=(text:string)=>{pendingDescription=text;};
export const getHikuDraft=()=>active;
export const setHikuDraft=(value:HikuDraft)=>{active=value;};
export const clearHikuDraft=()=>{active=null;pendingDescription='';};

// Photo Beta requires explicit per-item confirmation before any diary write.
// Identity uses the immutable original item object, not array indices that shift.
export function photoReviewReady(items:readonly HikuReviewedItem[],confirmed:ReadonlySet<HikuItem>):boolean{
 return items.length>0&&items.every(item=>confirmed.has(item.original));
}
