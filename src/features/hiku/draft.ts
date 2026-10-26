import type {HikuMeal,HikuReviewedItem} from './mealSchema';
import type {HikuModelId} from './models';
export type HikuDraft={
 description:string;meal:HikuMeal;items:HikuReviewedItem[];requestId:string;
 model:HikuModelId;costUsd:number|null;inputTokens:number;outputTokens:number;
};
let active:HikuDraft|null=null;
export const getHikuDraft=()=>active;
export const setHikuDraft=(value:HikuDraft)=>{active=value;};
export const clearHikuDraft=()=>{active=null;};
