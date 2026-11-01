import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, Header, Screen, Typography } from '../../src/design/primitives';
import { ensureExercisePack } from '../../src/services/database/exerciseLibrary';
import { addSessionExercise } from '../../src/services/database/gymRepositories';
import { logWorkoutSet, readInProgressWorkout, readWorkout, startManualWorkout } from '../../src/features/train/workoutData';

/** Hidden developer route. Writes a real empty session and zero logged sets. */
export default function DemoWorkoutScreen(){
  const {auto,state}=useLocalSearchParams<{auto?:string;state?:string}>();
  const started=useRef(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const showRest=useCallback(async(sessionId:string)=>{
    const loaded=await readWorkout(sessionId);
    const exercise=loaded.ok?loaded.value?.exercises[0]:undefined;
    if(!loaded.ok||!loaded.value||!exercise||loaded.value.sets.length>0)return;
    await logWorkoutSet({
      sessionId,sessionExerciseId:exercise.id,position:0,side:null,kind:'working',
      weight:80,reps:8,restSec:exercise.restSec||90,
    });
  },[]);
  const create=useCallback(async()=>{
    setBusy(true);
    const active=await readInProgressWorkout();
    if(!active.ok){setError('Could not read the active session.');setBusy(false);return;}
    if(active.value){
      if(state==='rest')await showRest(active.value.id);
      router.replace({pathname:'/(tabs)/train/active',
        params:auto==='1'?{id:active.value.id,auto:'1'}:{id:active.value.id}});return;}
    const seeded=await ensureExercisePack();
    if(!seeded.ok){setError('Exercise pack unavailable.');setBusy(false);return;}
    const session=await startManualWorkout('Demo · Upper A');
    if(!session.ok){setError('Could not start demo session.');setBusy(false);return;}
    for(const [i,id] of ['Barbell_Bench_Press_-_Medium_Grip','Barbell_Shoulder_Press'].entries()){
      const added=await addSessionExercise(session.value,id,i);
      if(!added.ok){setError('Exercise setup incomplete; return to Train and discard demo.');setBusy(false);return;}
    }
    if(state==='rest')await showRest(session.value);
    router.replace({pathname:'/(tabs)/train/active',
      params:auto==='1'?{id:session.value,auto:'1'}:{id:session.value}});
  },[auto,showRest,state]);
  // liftria://dev/demo-workout?auto=1 opens TR-8 without a tap, for the emulator visual check.
  useEffect(()=>{
    if(auto!=='1'||started.current)return;
    started.current=true;
    void Promise.resolve().then(create);
  },[auto,create]);
  return <Screen>
    <Header title="Demo workout" onBack={()=>router.back()}/>
    <Card rim="train" title="Screenshot setup">
      <Typography tone="secondary">Creates an empty workout with Bench Press and Shoulder Press. Add ?state=rest to log one set and show the rest bar. Resume your existing workout instead if one is in progress.</Typography>
      <Button label={busy?'Opening…':'Open demo active workout'} variant="train"
        disabled={busy} onPress={()=>void create()}/>
      {error&&<Typography>{error}</Typography>}
    </Card>
  </Screen>;
}
