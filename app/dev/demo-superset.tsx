import {router,useLocalSearchParams} from 'expo-router';
import {useEffect,useRef,useState} from 'react';
import {Button,Card,Header,Screen,Sheet,Typography} from '../../src/design/primitives';
import {useLanguage} from '../../src/i18n/LanguageProvider';
import {ensureExercisePack,listExercises} from '../../src/services/database/exerciseLibrary';
import {appendExerciseToActiveSession} from '../../src/services/database/gymRepositories';
import {readInProgressWorkout,startManualWorkout,completeWorkout,updateActiveSuperset,
 type ActiveWorkout} from '../../src/features/train/workoutData';
/** Explicit emulator-only fixture: finish empty demo sessions, but never
 * auto-finish a real workout or a demo with logged sets. */
export default function DemoSuperset(){
 const {t}=useLanguage(),{auto}=useLocalSearchParams<{auto?:string}>();
 const started=useRef(false),[busy,setBusy]=useState(false),[error,setError]=useState(false);
 const [existing,setExisting]=useState<ActiveWorkout|null>(null);
 async function createDemo(){
  const pack=await ensureExercisePack(),all=await listExercises();
  if(!pack.ok||!all.ok){setError(true);return;}
  const examples=all.value.filter(e=>e.type==='weighted'&&e.source==='pack').slice(0,3);
  if(examples.length<3){setError(true);return;}
  const session=await startManualWorkout('Demo · Superset screenshot');
  if(!session.ok){setError(true);return;}
  for(const item of examples){
   const result=await appendExerciseToActiveSession(item.id);
   if(!result.ok||!result.value){setError(true);return;}
  }
  const group=await updateActiveSuperset(session.value,0,3);
  if(!group.ok||!group.value){setError(true);return;}
  router.replace({pathname:'/(tabs)/train/active',params:{id:session.value}});
 }
 async function begin(){
  if(busy)return;setBusy(true);setError(false);
  try{
   const open=await readInProgressWorkout();
   if(!open.ok){setError(true);return;}
   if(open.value){
    // Automated screenshots may close an empty labeled demo, not a real session.
    const emptyDemo=open.value.sets.length===0&&
     (open.value.title==='Demo · Upper A'||open.value.title==='Demo · Superset screenshot');
    if(emptyDemo){
     const finished=await completeWorkout(open.value.id,null);
     if(!finished.ok||!finished.value){setError(true);return;}
    }else{setExisting(open.value);return;}
   }
   await createDemo();
  }catch{setError(true);}finally{setBusy(false);}
 }
 async function finishAndBegin(){
  if(!existing||busy)return;
  setBusy(true);setError(false);
  try{
   const finished=await completeWorkout(existing.id,null);
   if(!finished.ok||!finished.value){setError(true);return;}
   setExisting(null);
   await createDemo();
  }catch{setError(true);}finally{setBusy(false);}
 }
 useEffect(()=>{
  if(auto!=='1'||started.current)return;
  started.current=true;void Promise.resolve().then(begin);
 },[auto]);
 return <Screen>
   <Header title={t('gymParity.demoSuperset')} onBack={()=>router.back()}/>
   <Card rim="train">
    <Typography tone="secondary">{t('gymParity.warmupDisclaimer')}</Typography>
    {error&&<Typography tone="secondary">{t('gymParity.demoError')}</Typography>}
    <Button label={t('gymParity.demoSuperset')} disabled={busy} onPress={()=>void begin()}/>
   </Card>
   <Sheet visible={existing!==null} title={t('preview.alreadyActive')}
     description={t('gymParity.demoConflict',{name:existing?.title??t('preview.workout')})}
     onClose={()=>setExisting(null)}>
     <Button label={t('preview.resume',{name:existing?.title??t('preview.workout')})}
       variant="train" fullWidth onPress={()=>{
        if(existing)router.replace({pathname:'/(tabs)/train/active',params:{id:existing.id}});
       }}/>
     <Button label={t('gymParity.finishAndStart')} variant="secondary"
       disabled={busy} fullWidth onPress={()=>void finishAndBegin()}/>
     <Button label={t('preview.keep')} variant="ghost" fullWidth
       onPress={()=>setExisting(null)}/>
   </Sheet>
 </Screen>;
}
