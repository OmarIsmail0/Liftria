import {router,useLocalSearchParams} from 'expo-router';
import {useEffect,useRef,useState} from 'react';
import {Button,Card,Header,Screen,Typography} from '../../src/design/primitives';
import {useLanguage} from '../../src/i18n/LanguageProvider';
import {ensureExercisePack,listExercises} from '../../src/services/database/exerciseLibrary';
import {appendExerciseToActiveSession} from '../../src/services/database/gymRepositories';
import {readInProgressWorkout,startManualWorkout,updateActiveSuperset}
 from '../../src/features/train/workoutData';
/** Explicit emulator-only workout fixture. Never overwrites or resumes a real
 * active workout; the owner can delete the labeled demo after screenshots. */
export default function DemoSuperset(){
 const {t}=useLanguage(),{auto}=useLocalSearchParams<{auto?:string}>();
 const started=useRef(false),[busy,setBusy]=useState(false),[error,setError]=useState(false);
 async function begin(){
  if(busy)return;setBusy(true);setError(false);
  const existing=await readInProgressWorkout();
  if(!existing.ok||existing.value){setError(true);setBusy(false);return;}
  const pack=await ensureExercisePack(),all=await listExercises();
  if(!pack.ok||!all.ok){setError(true);setBusy(false);return;}
  const examples=all.value.filter(e=>e.type==='weighted'&&e.source==='pack').slice(0,3);
  if(examples.length<3){setError(true);setBusy(false);return;}
  const session=await startManualWorkout('Demo · Superset screenshot');
  if(!session.ok){setError(true);setBusy(false);return;}
  for(const item of examples){
   const result=await appendExerciseToActiveSession(item.id);
   if(!result.ok||!result.value){setError(true);setBusy(false);return;}
  }
  const group=await updateActiveSuperset(session.value,0,3);
  setBusy(false);
  if(!group.ok||!group.value){setError(true);return;}
  router.replace({pathname:'/(tabs)/train/active',params:{id:session.value}});
 }
 useEffect(()=>{
  if(auto!=='1'||started.current)return;
  started.current=true;void Promise.resolve().then(begin);
 },[auto]);
 return <Screen>
   <Header title={t('gymParity.demoSuperset')} onBack={()=>router.back()}/>
   <Card rim="train">
    <Typography tone="secondary">{t('gymParity.warmupDisclaimer')}</Typography>
    {error&&<Typography tone="secondary">{t('active.loadError')}</Typography>}
    <Button label={t('gymParity.demoSuperset')} disabled={busy} onPress={()=>void begin()}/>
   </Card>
 </Screen>;
}
