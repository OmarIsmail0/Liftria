import {dbOperation,type DbResult} from '../../services/database';
import {newGymId} from '../../services/database/exerciseLibrary';
import {bundledFoods,searchFoods,snapshot,localDay,MEALS,type Food,type FoodSource,type MealKey,
  type Nutrition} from './foodCatalog';

export type DiaryEntry={
  id:string;day:string;meal:MealKey;foodId:string|null;name:string;grams:number|null;
  kcal:number;protein:number|null;carbs:number|null;fat:number|null;
  fiber?:number|null;sugar?:number|null;sodium?:number|null;
  source:'search'|'quick'|'hiku-estimate'|'repeat';createdAt:string;editedAt:string;
};
type EntryRow={id:string;day:string;meal:MealKey;food_id:string|null;
  name_snapshot:string;grams:number|null;kcal:number;protein:number|null;
  carbs:number|null;fat:number|null;fiber:number|null;sugar:number|null;sodium:number|null;
  source:DiaryEntry['source'];created_at:string;edited_at:string};
const decodeEntry=(row:EntryRow):DiaryEntry=>({
  id:row.id,day:row.day,meal:row.meal,foodId:row.food_id,name:row.name_snapshot,
  grams:row.grams,kcal:row.kcal,protein:row.protein,carbs:row.carbs,fat:row.fat,
  fiber:row.fiber??null,sugar:row.sugar??null,sodium:row.sodium??null,
  source:row.source,createdAt:row.created_at,editedAt:row.edited_at,
});
export type DaySummary={logged:boolean;count:number;completeMacroItems:number;kcal:number;protein:number|null;
  carbs:number|null;fat:number|null;fiber:number|null;sugar:number|null;sodium:number|null;
  byMeal:Record<MealKey,{count:number;kcal:number}>};
export function summarizeEntries(entries:readonly DiaryEntry[]):DaySummary{
  const byMeal=Object.fromEntries(MEALS.map(meal=>[meal,{count:0,kcal:0}])) as DaySummary['byMeal'];
  let kcal=0;let protein=0,carbs=0,fat=0,completeMacroItems=0,hasProtein=false,hasCarbs=false,hasFat=false;
  for(const entry of entries){
    kcal+=entry.kcal;
    if(entry.protein!==null&&entry.carbs!==null&&entry.fat!==null)completeMacroItems++;
    byMeal[entry.meal].count++;byMeal[entry.meal].kcal+=entry.kcal;
    if(entry.protein!==null){protein+=entry.protein;hasProtein=true;}
    if(entry.carbs!==null){carbs+=entry.carbs;hasCarbs=true;}
    if(entry.fat!==null){fat+=entry.fat;hasFat=true;}
  }
  const complete=(field:'fiber'|'sugar'|'sodium'):number|null=>
    entries.length>0&&entries.every(e=>e[field]!=null&&Number.isFinite(e[field]))?
     entries.reduce((sum,e)=>sum+(e[field]??0),0):null;
  return {logged:entries.length>0,count:entries.length,completeMacroItems,kcal,
    protein:hasProtein?protein:null,carbs:hasCarbs?carbs:null,fat:hasFat?fat:null,
    fiber:complete('fiber'),sugar:complete('sugar'),sodium:complete('sodium'),byMeal};
}
export async function readDiaryDay(day=localDay(new Date())):Promise<DbResult<DiaryEntry[]>>{
  return dbOperation(async db=>(await db.getAllAsync<EntryRow>(
    'SELECT * FROM diary_entries WHERE day=? ORDER BY created_at,id',[day])).map(decodeEntry));
}
export async function readDiaryRange(first:string,last:string):Promise<DbResult<DiaryEntry[]>>{
  return dbOperation(async db=>(await db.getAllAsync<EntryRow>(
    'SELECT * FROM diary_entries WHERE day>=? AND day<=? ORDER BY day,created_at,id',
    [first,last])).map(decodeEntry));
}
const INSERT=`INSERT INTO diary_entries
  (id,day,meal,food_id,name_snapshot,grams,kcal,protein,carbs,fat,source,
   hiku_request_id,original_json,created_at,edited_at,fiber,sugar,sodium) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
function values(entry:DiaryEntry): (string|number|null)[]{
  return [entry.id,entry.day,entry.meal,entry.foodId,entry.name,entry.grams,entry.kcal,
    entry.protein,entry.carbs,entry.fat,entry.source,null,null,entry.createdAt,entry.editedAt,
    entry.fiber??null,entry.sugar??null,entry.sodium??null];
}
function createEntry(food:Food|null,grams:number|null,nutrition:Nutrition,meal:MealKey,
  day:string,name:string,source:DiaryEntry['source']):DiaryEntry{
  const now=new Date().toISOString();
  return {id:newGymId(),day,meal,foodId:food?.id??null,name,grams,
    ...nutrition,source,createdAt:now,editedAt:now};
}
async function upsertFood(db:Awaited<ReturnType<typeof import('../../services/database').initializeDatabase>>,
  food:Food):Promise<void>{
  await db.runAsync(`INSERT OR IGNORE INTO foods
    (id,name_en,name_ar,aliases,source,estimate,kcal,protein,carbs,fat,fiber,sugar,sodium,retired)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0)`,
    [food.id,food.name,food.nameAr,JSON.stringify(food.aliases),food.source,
      food.estimate?1:0,food.kcal,food.protein,food.carbs,food.fat,food.fiber,food.sugar??null,food.sodium??null]);
  for(const portion of food.portions){
    await db.runAsync(`INSERT OR IGNORE INTO food_portions
      (food_id,label_en,label_ar,grams) VALUES (?,?,?,?)`,
      [food.id,portion.labelEn,portion.labelAr,portion.grams]);
  }
}
export async function logFood(food:Food,grams:number,meal:MealKey,day=localDay(new Date()))
  :Promise<DbResult<DiaryEntry>>{
  return dbOperation(async db=>{
    const nutrition=snapshot(food,grams);
    const entry=createEntry(food,grams,nutrition,meal,day,food.name,'search');
    await db.withExclusiveTransactionAsync(async tx=>{
      await upsertFood(tx,food);
      await tx.runAsync(INSERT,values(entry));
    });
    return entry;
  });
}
export async function logQuick(kcal:number,meal:MealKey,day=localDay(new Date()),name:string)
  :Promise<DbResult<DiaryEntry>>{
  return dbOperation(async db=>{
    if(!Number.isFinite(kcal)||kcal<=0||kcal>10000)throw new Error('Invalid quick add');
    const entry=createEntry(null,null,{kcal:Math.round(kcal),protein:null,carbs:null,fat:null},meal,day,name,'quick');
    await db.runAsync(INSERT,values(entry));
    return entry;
  });
}
export async function deleteEntry(id:string):Promise<DbResult<number>>{
  return dbOperation(async db=>(await db.runAsync('DELETE FROM diary_entries WHERE id=?',[id])).changes);
}
export async function moveEntry(id:string,meal:MealKey):Promise<DbResult<number>>{
  return dbOperation(async db=>(await db.runAsync(
    'UPDATE diary_entries SET meal=?,edited_at=? WHERE id=?',[meal,new Date().toISOString(),id])).changes);
}
export async function updateEntryGrams(id:string,food:Food,grams:number):Promise<DbResult<number>>{
  return dbOperation(async db=>{
    const v=snapshot(food,grams);
    const entry=await db.getFirstAsync<{food_id:string|null}>('SELECT food_id FROM diary_entries WHERE id=?',[id]);
    if(entry?.food_id!==food.id)throw new Error('Mismatched entry food');
    const changed=await db.runAsync(`UPDATE diary_entries
      SET grams=?,kcal=?,protein=?,carbs=?,fat=?,fiber=?,sugar=?,sodium=?,edited_at=? WHERE id=?`,
      [grams,v.kcal,v.protein,v.carbs,v.fat,v.fiber??null,v.sugar??null,v.sodium??null,new Date().toISOString(),id]);
    return changed.changes;
  });
}
/** Repeat logging copies the original stored snapshot, not a pack that may have changed. */
export async function copyMeal(fromDay:string,toDay:string,meal:MealKey)
  :Promise<DbResult<number>>{
  return copyEntries(fromDay,toDay,meal);
}
export async function copyDay(fromDay:string,toDay:string):Promise<DbResult<number>>{
  return copyEntries(fromDay,toDay,null);
}
async function copyEntries(fromDay:string,toDay:string,meal:MealKey|null):Promise<DbResult<number>>{
  return dbOperation(async db=>{
    if(fromDay===toDay)throw new Error('Cannot duplicate same day');
    const rows=await db.getAllAsync<EntryRow>(
      'SELECT * FROM diary_entries WHERE day=?'+(meal?' AND meal=?':'')+' ORDER BY created_at,id',
      meal?[fromDay,meal]:[fromDay]);
    await db.withExclusiveTransactionAsync(async tx=>{
      for(const row of rows){
        const entry:DiaryEntry={...decodeEntry(row),id:newGymId(),day:toDay,
          createdAt:new Date().toISOString(),editedAt:new Date().toISOString(),source:'repeat'};
        await tx.runAsync(INSERT,values(entry));
      }
    });
    return rows.length;
  });
}
export async function removeMeal(day:string,meal:MealKey):Promise<DbResult<DiaryEntry[]>>{
  return dbOperation(async db=>{
    const rows=(await db.getAllAsync<EntryRow>(
      'SELECT * FROM diary_entries WHERE day=? AND meal=?',[day,meal])).map(decodeEntry);
    await db.runAsync('DELETE FROM diary_entries WHERE day=? AND meal=?',[day,meal]);
    return rows;
  });
}
export async function restoreEntries(entries:DiaryEntry[]):Promise<DbResult<void>>{
  return dbOperation(async db=>{
    await db.withExclusiveTransactionAsync(async tx=>{
      for(const entry of entries)await tx.runAsync('INSERT OR IGNORE INTO diary_entries '+
        '(id,day,meal,food_id,name_snapshot,grams,kcal,protein,carbs,fat,source,'+
        'hiku_request_id,original_json,created_at,edited_at,fiber,sugar,sodium) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',values(entry));
    });
  });
}
export async function createMyFood(input:Omit<Food,'id'|'source'|'estimate'>):Promise<DbResult<Food>>{
  return dbOperation(async db=>{
    if(!input.name.trim() || input.name.length>90 || input.kcal<0 ||
      [input.kcal,input.protein,input.carbs,input.fat,input.fiber,input.sugar,input.sodium].some(v=>v!=null&&!Number.isFinite(v)))throw new Error('Invalid food');
    const food:Food={...input,id:newGymId(),source:'custom',estimate:false};
    await db.withExclusiveTransactionAsync(async tx=>{await upsertFood(tx,food);});
    return food;
  });
}
export async function readLocalFoods():Promise<DbResult<Food[]>>{
  return dbOperation(async db=>{
    const rows=await db.getAllAsync<{id:string;name_en:string;name_ar:string|null;aliases:string;
      source:FoodSource;estimate:number;kcal:number;protein:number|null;carbs:number|null;fat:number|null;fiber:number|null;
      sugar:number|null;sodium:number|null}>(
      "SELECT * FROM foods WHERE source IN ('custom','hiku') AND retired=0 ORDER BY name_en");
    return Promise.all(rows.map(async row=>({
      id:row.id,name:row.name_en,nameAr:row.name_ar,aliases:JSON.parse(row.aliases) as string[],
      source:row.source,estimate:row.estimate===1,kcal:row.kcal,protein:row.protein,
      carbs:row.carbs,fat:row.fat,fiber:row.fiber,sugar:row.sugar??null,sodium:row.sodium??null,
      portions:(await db.getAllAsync<{label_en:string;label_ar:string|null;grams:number}>(
        'SELECT label_en,label_ar,grams FROM food_portions WHERE food_id=?',[row.id]))
        .map(p=>({labelEn:p.label_en,labelAr:p.label_ar,grams:p.grams})),
    })));
  });
}
export async function foodById(id:string):Promise<DbResult<Food|null>>{
  const bundled=bundledFoods().find(f=>f.id===id);
  if(bundled)return {ok:true,value:bundled};
  const local=await readLocalFoods();
  return local.ok?{ok:true,value:local.value.find(f=>f.id===id)??null}:local;
}
export async function searchAllFoods(query:string,limit=40):Promise<DbResult<Food[]>>{
  const local=await readLocalFoods();
  return local.ok?{ok:true,value:searchFoods([...bundledFoods(),...local.value],query,limit)}:local;
}
/** Reuse the actual last logged grams rather than always the pack's first portion. */
export async function lastLoggedGrams(food:Food):Promise<DbResult<number>>{
  return dbOperation(async db=>{
    const row=await db.getFirstAsync<{grams:number|null}>(
      'SELECT grams FROM diary_entries WHERE food_id=? AND grams IS NOT NULL ORDER BY created_at DESC,id DESC LIMIT 1',
      [food.id]);
    const last=row?.grams;
    return last!==null&&last!==undefined&&Number.isFinite(last)&&last>0&&last<=2000?
      last:food.portions[0]?.grams??100;
  });
}
export async function listRecentFoods(meal?:MealKey,limit=20):Promise<DbResult<Food[]>>{
  return dbOperation(async db=>{
    const rows=await db.getAllAsync<{food_id:string}>(`SELECT food_id FROM diary_entries
      WHERE food_id IS NOT NULL GROUP BY food_id ORDER BY
      MAX(CASE WHEN meal=? THEN created_at ELSE '' END) DESC,MAX(created_at) DESC LIMIT ?`,
      [meal??'breakfast',limit]);
    const custom=await readLocalFoods();
    const all=[...bundledFoods(),...(custom.ok?custom.value:[])];
    return rows.flatMap(row=>{const food=all.find(f=>f.id===row.food_id);return food?[food]:[];});
  });
}
export async function toggleFavorite(food:Food):Promise<DbResult<boolean>>{
  return dbOperation(async db=>{
    const row=await db.getFirstAsync<{food_id:string}>('SELECT food_id FROM favorite_foods WHERE food_id=?',[food.id]);
    if(row){await db.runAsync('DELETE FROM favorite_foods WHERE food_id=?',[food.id]);return false;}
    await db.withExclusiveTransactionAsync(async tx=>{
      await upsertFood(tx,food);
      await tx.runAsync('INSERT INTO favorite_foods (food_id,created_at) VALUES (?,?)',[food.id,new Date().toISOString()]);
    });
    return true;
  });
}
export async function listFavoriteFoods():Promise<DbResult<Food[]>>{
  return dbOperation(async db=>{
    const rows=await db.getAllAsync<{food_id:string}>('SELECT food_id FROM favorite_foods ORDER BY created_at DESC');
    const custom=await readLocalFoods();
    const all=[...bundledFoods(),...(custom.ok?custom.value:[])];
    return rows.flatMap(row=>{const food=all.find(f=>f.id===row.food_id);return food?[food]:[];});
  });
}
export type SavedMeal={id:string;name:string;items:{foodId:string;grams:number}[]};
export async function listSavedMeals():Promise<DbResult<SavedMeal[]>>{
  return dbOperation(async db=>{
    const rows=await db.getAllAsync<{id:string;name:string}>('SELECT id,name FROM saved_meals ORDER BY created_at DESC');
    return Promise.all(rows.map(async row=>({
      id:row.id,name:row.name,items:(await db.getAllAsync<{food_id:string;grams:number}>(
        'SELECT food_id,grams FROM saved_meal_items WHERE meal_id=? ORDER BY position',[row.id]))
        .map(p=>({foodId:p.food_id,grams:p.grams})),
    })));
  });
}
export async function saveMeal(name:string,day:string,meal:MealKey):Promise<DbResult<number>>{
  return dbOperation(async db=>{
    if(!name.trim())throw new Error('Meal name required');
    const rows=await db.getAllAsync<EntryRow>(
      'SELECT * FROM diary_entries WHERE day=? AND meal=? AND food_id IS NOT NULL',[day,meal]);
    if(!rows.length)throw new Error('Nothing to save');
    const id=newGymId();
    await db.withExclusiveTransactionAsync(async tx=>{
      await tx.runAsync('INSERT INTO saved_meals(id,name,created_at) VALUES (?,?,?)',[id,name.trim(),new Date().toISOString()]);
      for(const [index,row] of rows.entries())if(row.food_id&&row.grams){
        await tx.runAsync('INSERT INTO saved_meal_items(id,meal_id,food_id,grams,position) VALUES (?,?,?,?,?)',
          [newGymId(),id,row.food_id,row.grams,index]);
      }
    });
    return rows.length;
  });
}
export async function logSavedMeal(saved:SavedMeal,meal:MealKey,day:string):Promise<DbResult<number>>{
  return dbOperation(async db=>{
    const local=await readLocalFoods();
    if(!local.ok)throw new Error('Local foods unavailable');
    const catalog=[...bundledFoods(),...local.value];
    const entries=saved.items.map(item=>{
      const food=catalog.find(f=>f.id===item.foodId);
      if(!food)throw new Error('Food unavailable');
      return createEntry(food,item.grams,snapshot(food,item.grams),meal,day,food.name,'repeat');
    });
    await db.withExclusiveTransactionAsync(async tx=>{
      for(const entry of entries)await tx.runAsync(INSERT,values(entry));
    });
    return entries.length;
  });
}
