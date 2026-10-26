import {DEFAULT_HIKU_MODEL,HIKU_MODELS,HIKU_PRICE_VERSION,estimateHikuCostUsd} from '../models';
import {hikuMealSchema,parseHikuBody,resolveHikuItem,type HikuItem} from '../mealSchema';
import type {Food} from '../../eat/foodCatalog';
test('model selection has two explicit values and token cost stays an estimate',()=>{
 expect(HIKU_MODELS.map(m=>m.id)).toEqual(['claude-haiku-5-5','claude-sonnet-5-5']);
 expect(DEFAULT_HIKU_MODEL).toBe('claude-haiku-5-5');
 expect(HIKU_PRICE_VERSION).toMatch(/^20\d\d-/);
 expect(estimateHikuCostUsd('claude-haiku-5-5',1000,1000)).toBeCloseTo(0.0006,8);
 expect(estimateHikuCostUsd('claude-sonnet-5-5',1000,1000)).toBeCloseTo(0.012,8);
 expect(estimateHikuCostUsd('claude-haiku-5-5',100001,1000)).toBeGreaterThan(0.05);
 expect(estimateHikuCostUsd('claude-haiku-5-5',-1,10)).toBeNull();
});
const item:HikuItem={name_en:'Koshari',name_ar:'كشري',grams:200,kcal:333,
 protein:10,carbs:45,fat:12,confidence:'check'};
test('strict schema requires meal and numeric macros; no guessed defaults',()=>{
 expect(hikuMealSchema.safeParse({meal_name:'Dinner',items:[item]}).success).toBe(true);
 expect(hikuMealSchema.safeParse({meal_name:'Dinner',items:[{...item,fat:undefined}]}).success).toBe(false);
 expect(hikuMealSchema.safeParse({meal_name:'Dinner',items:[{...item,grams:0}]}).success).toBe(false);
 expect(hikuMealSchema.safeParse({meal_name:'Dinner',items:[]}).success).toBe(false);
});
test('failed, cut-off and refused responses cannot be saved as valid estimates',()=>{
 const valid={stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({meal_name:'Dinner',items:[item]})}]};
 expect(parseHikuBody(valid)).toMatchObject({ok:true});
 expect(parseHikuBody({...valid,stop_reason:'max_tokens'})).toEqual({ok:false,reason:'truncated'});
 expect(parseHikuBody({...valid,stop_reason:'refusal'})).toEqual({ok:false,reason:'refusal'});
 expect(parseHikuBody({...valid,content:[{type:'text',text:'{}'}]})).toEqual({ok:false,reason:'invalid'});
});
test('exact Egyptian aliases use pack macros, keeping the unmodified Hiku result',()=>{
 const egypt:Food={id:'egypt:koshari',name:'Koshari',nameAr:'كشري',aliases:['koshary'],
  source:'egypt',estimate:true,kcal:150,protein:8,carbs:25,fat:2,fiber:null,portions:[]};
 const match=resolveHikuItem(item,[egypt]);
 expect(match).toMatchObject({foodId:'egypt:koshari',provenance:'egypt-pack',
  grams:200,kcal:300,protein:16,carbs:50,fat:4,original:{kcal:333}});
 const other=resolveHikuItem({...item,name_en:'Roasted egg',name_ar:'بيض'},[egypt]);
 expect(other).toMatchObject({foodId:null,provenance:'hiku-estimate',kcal:333});
});
