import {router,useLocalSearchParams} from 'expo-router';
import {useEffect,useRef,useState} from 'react';
import {Button,Card,Header,Screen,Typography} from '../../src/design/primitives';
import {bundledFoods,dayOffset,localDay,snapshot,type Food} from '../../src/features/eat/foodCatalog';
import {logFood,readDiaryDay,readDiaryRange} from '../../src/features/eat/diaryRepository';
import {saveWeight,listLocalWeights,cachedHealthWeights} from '../../src/features/progress/weightRepository';
import {adaptiveExpenditure,checkinWeek,proposedCalories} from '../../src/features/progress/adaptiveExpenditure';
import {getProfile,saveProfile} from '../../src/services/database/profile';
import {addTarget,getCurrentTarget} from '../../src/services/database/targets';
import {readWeeklyCheckin,ensureWeeklyCheckin} from '../../src/features/progress/adaptiveCheckins';
import {dbOperation,setSetting} from '../../src/services/database';

const MARK='Demo fixture · adaptive · ';
const DEMO_PROFILE='Demo adaptive fixture';
const KEY='demo.adaptive.';
/** Explicit opt-in screenshot fixture, never invoked in ordinary app flows.
 * All food calories come from real Egypt pack rows. Every inserted diary and
 * weight entry is tagged; Clear removes only those fixtures, not user logs. */
export default function DemoAdaptive(){
 const {auto,state}=useLocalSearchParams<{auto?:string;state?:'early'|'ready'}>();
 const once=useRef(false),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
 async function seed(){
  if(busy)return;setBusy(true);setError(null);
  try{
   const today=localDay(new Date()),pack=bundledFoods();
   const koshari=pack.find(food=>food.id==='egypt:koshari');
   const bread=pack.find(food=>food.id==='egypt:baladi-bread');
   if(!koshari||!bread)throw Error('Bundled Egypt pack foods are missing');
   const menu:{food:Food;grams:number;meal:'lunch'|'breakfast'}[]=[
    {food:koshari,grams:500,meal:'lunch'},{food:bread,grams:220,meal:'breakfast'},
   ];
   // Local dates, not UTC midnight; each label makes fixture cleanup deterministic.
   for(let ago=27;ago>=1;ago--){
    const day=dayOffset(today,-ago),read=await readDiaryDay(day);
    if(!read.ok)throw Error('Could not read food diary');
    for(const item of menu){
     const name=MARK+'food · '+day+' · '+item.food.id;
     if(read.value.some(row=>row.name===name))continue;
     const logged=await logFood(item.food,item.grams,item.meal,day);
     if(!logged.ok)throw Error('Could not log pack-based demo food');
     const named=await dbOperation(async db=>{
      await db.runAsync('UPDATE diary_entries SET name_snapshot=? WHERE id=?',[name,logged.value.id]);
     });
     if(!named.ok)throw Error('Could not label demo food');
    }
   }
   const weights=await listLocalWeights();
   if(!weights.ok)throw Error('Could not read local weigh-ins');
   for(let ago=27;ago>=1;ago-=2){
    const day=dayOffset(today,-ago),note=MARK+'weight · '+day;
    if(weights.value.some(w=>w.note===note))continue;
    const [y,m,d]=day.split('-').map(Number);
    const at=new Date(y!,m!-1,d!,12,0,0).toISOString();
    // Clearly synthetic weight trajectory, never presented as personal data.
    const saved=await saveWeight(Math.round((80-(27-ago)*0.025)*100)/100,at,note);
    if(!saved.ok)throw Error('Could not save labeled demo weigh-in');
   }
   const profile=await getProfile();
   if(!profile.ok)throw Error('Could not read profile');
   if(!profile.value){
    const demo=await saveProfile({name:DEMO_PROFILE,goal:'maintain'});
    if(!demo.ok)throw Error('Could not create demo profile');
    await setSetting(KEY+'profile',DEMO_PROFILE);
   }else if(!profile.value.goal){
    throw Error('Set a profile goal first; the demo will not overwrite your profile');
   }
   let target=await getCurrentTarget();
   if(!target.ok)throw Error('Could not read current target');
   if(!target.value){
    const a=snapshot(koshari,500),b=snapshot(bread,220);
    if(a.protein===null||a.fat===null||a.carbs===null||
       b.protein===null||b.fat===null||b.carbs===null)
     throw Error('Pack data incomplete for a demo target');
    const added=await addTarget({kcal:Math.max(1000,a.kcal+b.kcal),
     proteinG:a.protein+b.protein,fatG:a.fat+b.fat,carbsG:a.carbs+b.carbs,
     source:'manual',inputs:null});
    if(!added.ok)throw Error('Could not create demo target');
    await setSetting(KEY+'target',String(added.value.id));
    target={ok:true,value:added.value};
   }
   const first=dayOffset(today,-27),last=dayOffset(today,-1);
   const [diary,local,health,existing]=await Promise.all([
    readDiaryRange(first,last),listLocalWeights(),cachedHealthWeights(),
    readWeeklyCheckin(checkinWeek(today))]);
   if(!diary.ok||!local.ok||!health.ok||!existing.ok||!target.value)
    throw Error('Could not read demo estimate inputs');
   const result=adaptiveExpenditure(diary.value.map(v=>({day:v.day,kcal:v.kcal})),
    [...local.value,...health.value],today);
   if(!result.ready)throw Error('Demo estimate not ready; check weight and diary fixture data');
   if(!existing.value){
    const current=await getProfile();
    const goal=current.ok?current.value?.goal:null;
    if(!goal)throw Error('No goal available for weekly proposal');
    const made=await ensureWeeklyCheckin(checkinWeek(today),goal,
     result.estimatedBurn,proposedCalories(result.estimatedBurn,goal),target.value);
    if(!made.ok)throw Error('Could not create weekly demo check-in');
    await setSetting(KEY+'week',made.value.week);
   }
   // A previously answered real check-in is never overwritten by a screenshot demo.
   router.replace({pathname:'/(tabs)/progress/nutrition',params:{demoAdaptive:'ready'}});
  }catch(e){setError(e instanceof Error?e.message:'Demo setup failed');}
  finally{setBusy(false);}
 }
 async function clear(){
  if(busy)return;setBusy(true);setError(null);
  const done=await dbOperation(async db=>{
   await db.withExclusiveTransactionAsync(async tx=>{
    await tx.runAsync('DELETE FROM diary_entries WHERE name_snapshot LIKE ?',[MARK+'food · %']);
    await tx.runAsync('DELETE FROM weights WHERE note LIKE ?',[MARK+'weight · %']);
    const marker=async (key:string)=>(await tx.getFirstAsync<{value:string}>(
     'SELECT value FROM app_settings WHERE key=?',[KEY+key]))?.value??null;
    const week=await marker('week');
    if(week){
     const checkin=await tx.getFirstAsync<{value:string}>(
      'SELECT value FROM app_settings WHERE key=?',['adaptive.checkin.'+week]);
     if(checkin){
      const parsed=JSON.parse(checkin.value) as {status:string};
      if(parsed.status==='pending')await tx.runAsync(
       'DELETE FROM app_settings WHERE key=?',['adaptive.checkin.'+week]);
     }
    }
    const id=await marker('target');
    if(id&&Number.isSafeInteger(Number(id))){
     await tx.runAsync('DELETE FROM targets WHERE id=? AND id=(SELECT MAX(id) FROM targets)',
      [Number(id)]);
    }
    if(await marker('profile')){
     await tx.runAsync('DELETE FROM profile WHERE id=1 AND name=?',[DEMO_PROFILE]);
    }
    await tx.runAsync("DELETE FROM app_settings WHERE key LIKE 'demo.adaptive.%'");
   });
  });
  if(!done.ok)setError('Could not clear demo rows; retry');
  else setError('Demo entries and eligible demo-only settings cleared');
  setBusy(false);
 }
 useEffect(()=>{
  if(auto!=='1'||once.current)return;
  once.current=true;
  void Promise.resolve().then(()=>{if(state==='early')
   router.replace({pathname:'/(tabs)/progress/nutrition',params:{demoAdaptive:'early'}});
   else void seed();});
 },[auto,state]);
 return <Screen>
  <Header title="Demo adaptive expenditure" onBack={()=>router.back()}/>
  <Card rim="eat" title="Developer screenshot fixture">
   <Typography tone="secondary">Opt-in local sample: 27 days of genuine Egypt-pack
    food portions, 14 synthetic and clearly labeled weigh-ins, and a weekly check-in.
    Demo data is not your personal data. No API calls. Real user targets and answered
    check-ins are never overwritten. Clear the fixture here when finished.</Typography>
   <Button label={busy?'Preparing…':'Seed and show ready estimate'} disabled={busy}
    onPress={()=>void seed()}/>
   <Button label="Show insufficient history (read-only)" variant="secondary"
    onPress={()=>router.push({pathname:'/(tabs)/progress/nutrition',params:{demoAdaptive:'early'}})}/>
   <Button label="Clear only adaptive demo rows" variant="secondary" disabled={busy}
    onPress={()=>void clear()}/>
   {error&&<Typography tone="secondary">{error}</Typography>}
  </Card>
 </Screen>;
}
