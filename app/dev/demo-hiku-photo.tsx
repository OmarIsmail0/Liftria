import {router,useLocalSearchParams} from 'expo-router';
import {useEffect,useRef,useState} from 'react';
import {Button,Card,Header,Screen,Typography} from '../../src/design/primitives';
import {bundledFoods,snapshot,type Food} from '../../src/features/eat/foodCatalog';
import {resolveHikuItem,type HikuItem} from '../../src/features/hiku/mealSchema';
import {setHikuDraft} from '../../src/features/hiku/draft';
import {DEFAULT_HIKU_MODEL} from '../../src/features/hiku/models';
import {DemoPhotoIllustration} from '../../src/features/hiku/DemoPhotoIllustration';
/** Explicit, offline visual preview with bundled sample illustration and real
 * Egyptian food-pack values. Save is disabled by demo=true in HK-4. */
export default function DemoHikuPhoto(){
 const {auto}=useLocalSearchParams<{auto?:string}>();
 const once=useRef(false),[error,setError]=useState<string|null>(null);
 function open(){
  const foods=bundledFoods(),ids=['egypt:koshari','egypt:baladi-bread'];
  const pick=ids.map(id=>foods.find(food=>food.id===id));
  if(pick.some(food=>!food)){setError('Egyptian food pack is missing');return;}
  const items=pick.map(value=>{
   const food=value as Food,grams=food.portions[0]?.grams??100;
   const n=snapshot(food,grams);
   if(n.protein===null||n.carbs===null||n.fat===null)throw Error('Pack macros incomplete');
   const item:HikuItem={name_en:food.name,name_ar:food.nameAr??food.name,grams,
    kcal:n.kcal,protein:n.protein,carbs:n.carbs,fat:n.fat,confidence:'check'};
   return resolveHikuItem(item);
  });
  const meal={meal_name:'Demo · Egyptian meal photo',items:items.map(i=>i.original)};
  setHikuDraft({kind:'photo',description:'Developer image illustration — no network call',
   meal,items,requestId:'demo-photo-no-request',model:DEFAULT_HIKU_MODEL,
   costUsd:null,inputTokens:0,outputTokens:0,demo:true});
  router.replace('/(tabs)/hiku/review');
 }
 useEffect(()=>{
  if(auto!=='1'||once.current)return;
  once.current=true;void Promise.resolve().then(open);
 },[auto]);
 return <Screen>
  <Header title="Hiku photo Beta demo" onBack={()=>router.back()}/>
  <Card rim="hiku" title="Bundled sample illustration">
   <DemoPhotoIllustration/>
   <Typography tone="secondary">Local, illustrated meal preview with real Egyptian
    pack nutrition values. No request or image is sent; Save remains disabled.</Typography>
   <Button label="Open safe Beta review" onPress={open}/>
   {error&&<Typography>{error}</Typography>}
  </Card>
 </Screen>;
}
