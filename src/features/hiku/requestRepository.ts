import {dbOperation,type DbResult} from '../../services/database';
import {newGymId} from '../../services/database/exerciseLibrary';
import type {MealKey} from '../eat/foodCatalog';
import {bundledFoods,localDay,snapshot} from '../eat/foodCatalog';
import {resolveHikuItem,type HikuReviewedItem,type HikuMeal} from './mealSchema';
import {HIKU_PRICE_VERSION,type HikuModelId} from './models';

export async function startHikuRequest(model:HikuModelId,kind:'text'|'photo')
 :Promise<DbResult<string>>{
 return dbOperation(async db=>{
  const id=newGymId();
  await db.runAsync(\`INSERT INTO hiku_requests(id,kind,created_at,model,status,price_table_version)
   VALUES(?,?,?,?,?,?)\`,[id,kind,new Date().toISOString(),model,'started',HIKU_PRICE_VERSION]);
  return id;
 });
}
export async function finishHikuRequest(id:string,status:string,
 inputTokens:number|null,outputTokens:number|null,cost:number|null):Promise<DbResult<void>>{
 return dbOperation(async db=>{
  await db.runAsync(\`UPDATE hiku_requests SET status=?,input_tokens=?,output_tokens=?,
   est_cost_usd=? WHERE id=?\`,[status,inputTokens,outputTokens,cost,id]);
 });
}
export type RequestUsage={id:string;kind:'text'|'photo';createdAt:string;model:string;
 status:string;inputTokens:number|null;outputTokens:number|null;costUsd:number|null};
export async function listHikuUsage(limit=100):Promise<DbResult<RequestUsage[]>>{
 return dbOperation(async db=>{
  const rows=await db.getAllAsync<{id:string;kind:'text'|'photo';created_at:string;
   model:string;status:string;input_tokens:number|null;output_tokens:number|null;est_cost_usd:number|null}>(
   'SELECT * FROM hiku_requests ORDER BY created_at DESC,id DESC LIMIT ?',[Math.max(1,Math.min(500,limit))]);
  return rows.map(row=>({id:row.id,kind:row.kind,createdAt:row.created_at,model:row.model,
   status:row.status,inputTokens:row.input_tokens,outputTokens:row.output_tokens,costUsd:row.est_cost_usd}));
 });
}
/** Called only by an explicit HK-4 Save button, never by request completion.
 * Preserves per-item original estimate JSON; all items commit atomically. */
export async function saveHikuReviewed(meal:HikuMeal,items:readonly HikuReviewedItem[],
 requestId:string,day=localDay(new Date()),bucket:MealKey='dinner'):Promise<DbResult<number>>{
 return dbOperation(async db=>{
  if(items.length===0||items.length>25)throw new Error('No estimate items selected');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw new Error('Invalid date');
  const pack=bundledFoods();
  const validated=items.map(item=>{
   const p=resolveHikuItem(item.original,pack);
   if(item.grams<=0||!Number.isFinite(item.grams)||item.grams>2000)throw new Error('Invalid grams');
   if(!Number.isFinite(item.kcal)||item.kcal<0||
      ![item.protein,item.carbs,item.fat].every(v=>Number.isFinite(v)&&v>=0))
    throw new Error('Invalid nutrition');
   if(item.foodId!==null&&(!p.foodId||item.foodId!==p.foodId))throw new Error('Unknown pack link');
   if(item.foodId){
    const source=pack.find(f=>f.id===item.foodId);
    if(!source)throw new Error('Missing pack food');
    const n=snapshot(source,item.grams);
    return {...item,kcal:n.kcal,protein:n.protein,carbs:n.carbs,fat:n.fat};
   }
   return item;
  });
  const now=new Date().toISOString();
  await db.withExclusiveTransactionAsync(async tx=>{
   const request=await tx.getFirstAsync<{id:string}>(
    'SELECT id FROM hiku_requests WHERE id=?',[requestId]);
   if(!request)throw new Error('Request not found');
   for(const item of validated){
    if(item.foodId){
     const food=pack.find(f=>f.id===item.foodId)!;
     await tx.runAsync(\`INSERT OR IGNORE INTO foods(id,name_en,name_ar,aliases,source,estimate,
      kcal,protein,carbs,fat,fiber,retired) VALUES(?,?,?,?,?,?,?,?,?,?,?,0)\`,
      [food.id,food.name,food.nameAr,JSON.stringify(food.aliases),food.source,1,
       food.kcal,food.protein,food.carbs,food.fat,food.fiber]);
    }
    await tx.runAsync(\`INSERT INTO diary_entries(id,day,meal,food_id,name_snapshot,grams,
     kcal,protein,carbs,fat,source,hiku_request_id,original_json,created_at,edited_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)\`,
     [newGymId(),day,bucket,item.foodId,item.nameDisplay,item.grams,
      item.kcal,item.protein,item.carbs,item.fat,'hiku-estimate',requestId,
      JSON.stringify({meal:meal.meal_name,item:item.original}),now,now]);
   }
   await tx.runAsync("UPDATE hiku_requests SET status='saved' WHERE id=?",[requestId]);
  });
  return validated.length;
 });
}
