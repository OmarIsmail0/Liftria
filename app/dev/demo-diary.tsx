import {router,useLocalSearchParams} from 'expo-router';
import {useEffect,useRef,useState} from 'react';
import {Button,Card,Header,Screen,Typography} from '../../src/design/primitives';
import {bundledFoods,localDay,type Food,type MealKey} from '../../src/features/eat/foodCatalog';
import {logFood,logQuick,readDiaryDay} from '../../src/features/eat/diaryRepository';

/** Hidden screenshot fixture; all nutrition comes from the bundled source packs.
 * Reopening only adds missing entries to today's actual local diary. */
export default function DemoDiary(){
 const {auto}=useLocalSearchParams<{auto?:string}>();
 const once=useRef(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
 const create=async()=>{
  if(busy)return;setBusy(true);setError(null);
  const today=localDay(new Date());
  const diary=await readDiaryDay(today);
  if(!diary.ok){setError('Could not read the local diary.');setBusy(false);return;}
  const pack=bundledFoods();
  const eggs=pack.find(row=>row.source==='usda'&&/^eggs?\b/i.test(row.name));
  const foods:{id:string;meal:MealKey}[]=[
   {id:'egypt:koshari',meal:'lunch'},
   {id:'egypt:baladi-bread',meal:'breakfast'},
  ];
  const seeded=diary.value.slice();
  async function addFood(food:Food,grams:number,meal:MealKey):Promise<boolean>{
   if(seeded.some(row=>row.foodId===food.id&&row.meal===meal&&row.grams===grams))return true;
   const result=await logFood(food,grams,meal,today);
   if(!result.ok)return false;
   seeded.push(result.value);return true;
  }
  if(!eggs){setError('The bundled USDA egg entry was not found.');setBusy(false);return;}
  for(const item of foods){
   const food=pack.find(f=>f.id===item.id);
   if(!food){setError('Bundled Egyptian food missing: '+item.id);setBusy(false);return;}
   if(!await addFood(food,food.portions[0]?.grams??100,item.meal)){
    setError('Could not write a food diary entry.');setBusy(false);return;
   }
  }
  if(!await addFood(eggs,eggs.portions[0]?.grams??100,'breakfast')){
   setError('Could not write the USDA egg.');setBusy(false);return;
  }
  // The calories-only test value is calculated from a real pack row, not invented.
  const snackName='Demo · Quick add from USDA egg value';
  if(!seeded.some(row=>row.meal==='snacks'&&row.source==='quick'&&row.name===snackName)){
   const quick=await logQuick(Math.max(1,Math.round(eggs.kcal)),'snacks',today,snackName);
   if(!quick.ok){setError('Could not write the demo quick add.');setBusy(false);return;}
  }
  router.replace('/(tabs)/eat');
 };
 useEffect(()=>{
  if(auto!=='1'||once.current)return;
  once.current=true;void Promise.resolve().then(create);
 // The explicit auto flag launches once per mount for emulator screenshot routes.
 },[auto]);
 return <Screen>
  <Header title="Demo diary" onBack={()=>router.back()}/>
  <Card rim="eat" title="Developer screenshot data">
   <Typography tone="secondary">Adds a real portion of Koshari, baladi bread,
   one USDA egg entry and a calories-only quick add from bundled nutrition.
   Existing entries are kept; opening again does not duplicate these fixtures.</Typography>
   <Button label={busy?'Opening…':'Log demo foods and open Eat'} disabled={busy}
    onPress={()=>void create()}/>
   {error&&<Typography>{error}</Typography>}
  </Card>
 </Screen>;
}
