import { router } from 'expo-router';
import { useState } from 'react';
import { Button, Card, Header, Screen, Typography } from '../../src/design/primitives';
import { ensureExercisePack } from '../../src/services/database/exerciseLibrary';
import { addSessionExercise } from '../../src/services/database/gymRepositories';
import { readInProgressWorkout, startManualWorkout } from '../../src/features/train/workoutData';

/** Hidden developer route. Writes a real empty session and zero logged sets. */
export default function DemoWorkoutScreen(){
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const create=async()=>{
    setBusy(true);
    const active=await readInProgressWorkout();
    if(!active.ok){setError('Could not read the active session.');setBusy(false);return;}
    if(active.value){router.replace({pathname:'/(tabs)/train/active',params:{id:active.value.id}});return;}
    const seeded=await ensureExercisePack();
    if(!seeded.ok){setError('Exercise pack unavailable.');setBusy(false);return;}
    const session=await startManualWorkout('Demo · Upper A');
    if(!session.ok){setError('Could not start demo session.');setBusy(false);return;}
    for(const [i,id] of ['Barbell_Bench_Press_-_Medium_Grip','Barbell_Shoulder_Press'].entries()){
      const added=await addSessionExercise(session.value,id,i);
      if(!added.ok){setError('Exercise setup incomplete; return to Train and discard demo.');setBusy(false);return;}
    }
    router.replace({pathname:'/(tabs)/train/active',params:{id:session.value}});
  };
  return <Screen>
    <Header title="Demo workout" onBack={()=>router.back()}/>
    <Card rim="train" title="Screenshot setup">
      <Typography tone="secondary">Creates an empty workout with Bench Press and Shoulder Press. No sets are logged. Resume your existing workout instead if one is in progress.</Typography>
      <Button label={busy?'Opening…':'Open demo active workout'} variant="train"
        disabled={busy} onPress={()=>void create()}/>
      {error&&<Typography>{error}</Typography>}
    </Card>
  </Screen>;
}
