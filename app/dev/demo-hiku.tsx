import {router,useLocalSearchParams} from 'expo-router';
import {useEffect,useRef,useState} from 'react';
import {Button,Card,Header,Screen,Typography} from '../../src/design/primitives';
import {bundledFoods,snapshot,type Food} from '../../src/features/eat/foodCatalog';
import {resolveHikuItem,type HikuItem} from '../../src/features/hiku/mealSchema';
import {setHikuDraft} from '../../src/features/hiku/draft';
import {DEFAULT_HIKU_MODEL} from '../../src/features/hiku/models';
/** Screenshot-only review preview; never calls Anthropic or writes to the diary. */
export default function DemoHiku(){
 const {auto}=useLocalSearchParams<{auto?:string}>();
 const once=useRef(false),[error,setError]=useState<string|null>(null);
 function open(){
  const foods=bundledFoods(),ids=['egypt:koshari','egypt:baladi-bread'];
  const pick=ids.map(id=>foods.find(f=>f.id===id));
  if(pick.some(food=>!food)){setError('The Egyptian food pack is missing.');return;}
  const items=pick.map((value,i)=>{
   const food=value as Food,grams=food.portions[0]?.grams??100;
   const nutrition=snapshot(food,grams);
   const item:HikuItem={name_en:food.name,name_ar:food.nameAr??food.name,grams,
    kcal:nutrition.kcal,protein:nutrition.protein??0,
    carbs:nutrition.carbs??0,fat:nutrition.fat??0,confidence:'check'};
   return resolveHikuItem(item);
  });
  const meal={meal_name:'Demo · Egyptian food pack',items:items.map(item=>item.original)};
  setHikuDraft({description:'Developer demo — no API request',meal,items,
   requestId:'demo-no-request',model:DEFAULT_HIKU_MODEL,
   costUsd:null,inputTokens:0,outputTokens:0,demo:true});
  router.replace('/(tabs)/hiku/review');
 }
 useEffect(()=>{
  if(auto!=='1'||once.current)return;
  once.current=true;void Promise.resolve().then(open);
 },[auto]);
 return <Screen>
  <Header title="Hiku review demo" onBack={()=>router.back()}/>
  <Card rim="hiku" title="Screenshot fixture">
   <Typography tone="secondary">Displays Egyptian pack nutrition in the Hiku review layout.
    Clearly marked as a developer demo, never sent to Anthropic or saved to the diary.</Typography>
   <Button label="Open safe review preview" onPress={open}/>
   {error&&<Typography>{error}</Typography>}
  </Card>
 </Screen>;
}
