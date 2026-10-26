import {z} from 'zod';
import {bundledFoods,normalizeFoodSearch,snapshot,type Food} from '../eat/foodCatalog';

export const hikuItemSchema=z.object({
 name_en:z.string().trim().min(1).max(120),
 name_ar:z.string().trim().min(1).max(120),
 grams:z.number().finite().positive().max(2000),
 kcal:z.number().finite().nonnegative().max(20000),
 protein:z.number().finite().nonnegative().max(2000),
 carbs:z.number().finite().nonnegative().max(2000),
 fat:z.number().finite().nonnegative().max(2000),
 confidence:z.enum(['sure','check']),
}).strict();
export const hikuMealSchema=z.object({
 meal_name:z.string().trim().min(1).max(120),
 items:z.array(hikuItemSchema).min(1).max(25),
}).strict();
export type HikuMeal=z.infer<typeof hikuMealSchema>;
export type HikuItem=HikuMeal['items'][number];

/** A strict subset accepted by the API's JSON Schema grammar; Zod enforces
 * ranges locally. Never substitute defaults for invalid/missing estimates. */
const itemProps={
 name_en:{type:'string'},name_ar:{type:'string'},grams:{type:'number'},
 kcal:{type:'number'},protein:{type:'number'},carbs:{type:'number'},
 fat:{type:'number'},confidence:{type:'string',enum:['sure','check']},
} as const;
export const hikuJsonSchema={
 type:'object',additionalProperties:false,
 properties:{
  meal_name:{type:'string'},
  items:{type:'array',items:{
   type:'object',additionalProperties:false,properties:itemProps,
   required:Object.keys(itemProps),
  }},
 },
 required:['meal_name','items'],
} as const;
export type HikuReviewedItem=HikuItem & {
 foodId:string|null;provenance:'egypt-pack'|'hiku-estimate';
 original:HikuItem;nameDisplay:string;
};
/** When exact Egyptian aliases match, the bundled food pack wins. Hiku values
 * remain in original_json only; shown/logged nutrition is pack-based. */
export function resolveHikuItem(item:HikuItem,foods:readonly Food[]=bundledFoods()):HikuReviewedItem{
 const normalized=[item.name_en,item.name_ar].map(normalizeFoodSearch);
 const food=foods.find(food=>food.source==='egypt'&&
  [food.name,food.nameAr??'',...food.aliases]
   .some(name=>normalized.includes(normalizeFoodSearch(name))));
 if(!food)return {...item,foodId:null,provenance:'hiku-estimate',original:{...item},
   nameDisplay:item.name_en};
 const portion=snapshot(food,item.grams);
 if(portion.protein===null||portion.carbs===null||portion.fat===null)
  throw new Error('Egypt food pack missing macros');
 return {...item,foodId:food.id,provenance:'egypt-pack',nameDisplay:food.name,
  kcal:portion.kcal,protein:portion.protein,carbs:portion.carbs,fat:portion.fat,
  original:{...item}};
}
export function parseHikuBody(raw:unknown):
 {ok:true;meal:HikuMeal}|{ok:false;reason:'truncated'|'refusal'|'invalid'}{
 if(!raw||typeof raw!=='object')return {ok:false,reason:'invalid'};
 const body=raw as Record<string,unknown>;
 if(body.stop_reason==='max_tokens'||body.stop_reason==='model_context_window_exceeded')
  return {ok:false,reason:'truncated'};
 if(body.stop_reason==='refusal')return {ok:false,reason:'refusal'};
 if(body.stop_reason!=='end_turn'||!Array.isArray(body.content))
  return {ok:false,reason:'invalid'};
 const text=body.content.find((v:unknown)=>v&&typeof v==='object'&&
  (v as Record<string,unknown>).type==='text') as {text?:unknown}|undefined;
 if(typeof text?.text!=='string')return {ok:false,reason:'invalid'};
 try{
  const parsed=hikuMealSchema.safeParse(JSON.parse(text.text));
  return parsed.success?{ok:true,meal:parsed.data}:{ok:false,reason:'invalid'};
 }catch{return {ok:false,reason:'invalid'};}
}
