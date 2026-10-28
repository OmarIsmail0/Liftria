import {router,useLocalSearchParams} from 'expo-router';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Button,Card,Header,Screen,Typography} from '../../src/design/primitives';
import {bundledFoods,dayOffset,localDay,type Food} from '../../src/features/eat/foodCatalog';
import {readDiaryDay,logFood} from '../../src/features/eat/diaryRepository';
import {listLocalWeights,saveWeight} from '../../src/features/progress/weightRepository';

/** Hidden opt-in screenshot fixture. Nothing is inserted during ordinary app use.
 * The food values are from real source rows, and synthetic body weights carry
 * an unmistakable "Demo fixture" note in the visible Body screen. */
export default function DemoTrends(){
 const {auto,view}=useLocalSearchParams<{auto?:string;view?:'nutrition'|'body'}>();
 const once=useRef(false);const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
 const create=useCallback(async()=>{
  if(busy)return;
  setBusy(true);setError(null);
  const today=localDay(new Date()),foods=bundledFoods();
  const choose=(id:string):Food|null=>foods.find(f=>f.id===id)??null;
  const foodsToSeed=[
   {day:dayOffset(today,-1),id:'egypt:koshari',meal:'lunch' as const},
   {day:dayOffset(today,-3),id:'egypt:baladi-bread',meal:'breakfast' as const},
   {day:dayOffset(today,-5),id:'egypt:koshari',meal:'dinner' as const},
  ];
  for(const seed of foodsToSeed){
   const food=choose(seed.id);
   if(!food){setError('Missing Egyptian pack food '+seed.id);setBusy(false);return;}
   const existing=await readDiaryDay(seed.day);
   if(!existing.ok){setError('Local diary could not be read.');setBusy(false);return;}
   const grams=food.portions[0]?.grams??100;
   if(existing.value.some(e=>e.foodId===food.id&&e.meal===seed.meal&&e.grams===grams))continue;
   if(!(await logFood(food,grams,seed.meal,seed.day)).ok){
    setError('Could not add an authentic food-pack row.');setBusy(false);return;
   }
  }
  const weights=await listLocalWeights();
  if(!weights.ok){setError('Local weight log could not be read.');setBusy(false);return;}
  const examples=[{daysAgo:15,kg:79.7},{daysAgo:8,kg:79.0},{daysAgo:1,kg:78.4}];
  for(const w of examples){
   const date=dayOffset(today,-w.daysAgo),tag='Demo fixture · screenshot weight · '+date;
   if(weights.value.some(row=>row.note===tag))continue;
   const [y,m,d]=date.split('-').map(Number);
   const at=new Date(y??2026,(m??1)-1,d??1,12,0,0);
   if(!(await saveWeight(w.kg,at.toISOString(),tag)).ok){
    setError('Could not add a clearly labeled demo weight.');setBusy(false);return;
   }
  }
  router.replace(view==='nutrition'?'/(tabs)/progress/nutrition':'/(tabs)/progress/body');
 },[busy,view]);
 useEffect(()=>{
  if(auto!=='1'||once.current)return;
  once.current=true;void Promise.resolve().then(create);
 // Only the explicit developer auto flag creates screenshot fixtures.
 },[auto,create]);
 return <Screen>
  <Header title="Demo trends" onBack={()=>router.back()}/>
  <Card rim="health" title="Developer screenshot data">
   <Typography tone="secondary">Adds three real USDA-derived Egyptian food portions to
   earlier days, plus three clearly labeled synthetic demo weights. Data remains local;
   nothing is sent anywhere. Never use these samples as personal measurements.</Typography>
   <Button label={busy?'Opening…':'Create demo trends'} disabled={busy} onPress={()=>void create()}/>
   {error&&<Typography>{error}</Typography>}
  </Card>
 </Screen>;
}
