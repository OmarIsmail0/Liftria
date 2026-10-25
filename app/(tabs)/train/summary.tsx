import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Button, Card, Chip, Field, Header, ListRow, Screen, Sheet, Typography } from '../../../src/design/primitives';
import { completeWorkout, discardInProgressWorkout, readWorkout, workoutNumbers,
  type ActiveWorkout } from '../../../src/features/train/workoutData';
import { elapsedLabel } from '../../../src/features/train/restClock';

export default function WorkoutSummaryScreen() {
  const {id}=useLocalSearchParams<{id:string}>();
  const [workout,setWorkout]=useState<ActiveWorkout|null>(null);
  const [notes,setNotes]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [discard,setDiscard]=useState(false);
  useFocusEffect(useCallback(()=>{
    let live=true;
    void readWorkout(id).then(result=>{
      if(!live)return;
      if(result.ok&&result.value){setWorkout(result.value);setNotes(result.value.notes??'');}
    });
    return()=>{live=false};
  },[id]));
  const save=async()=>{
    if(!workout||busy)return;setBusy(true);
    const result=await completeWorkout(workout.id,notes.trim()||null);
    if(result.ok&&result.value)router.replace('/(tabs)/train');
    else {setError('Could not save the workout. It is still in progress.');setBusy(false);}
  };
  const discardNow=async()=>{
    if(!workout||busy)return;setBusy(true);
    const result=await discardInProgressWorkout(workout.id);
    if(result.ok&&result.value)router.replace('/(tabs)/train');
    else{setError('Could not discard workout.');setBusy(false);}
  };
  if(!workout)return <Screen embedded>
    <Header title="Finish workout" onBack={()=>router.back()}/>
    <Typography>Loading saved sets…</Typography>
  </Screen>;
  const stats=workoutNumbers(workout);
  return <Screen embedded>
    <Header title="Workout summary" subtitle={workout.title} onBack={()=>router.back()}/>
    <Card rim="train" title="Nice work">
      <ListRow title="Duration" detail={elapsedLabel(workout.startedAt)}/>
      <ListRow title="Working sets" detail={String(stats.sets)}/>
      <ListRow title="Volume" detail={Math.round(stats.volume)+' kg · training load, not a score'}/>
      <Typography tone="secondary">{stats.pending?stats.pending+
        ' planned sets were untouched and will not be saved.':'Every planned working set was logged.'}</Typography>
    </Card>
    <Card title="Records">
      <Typography tone="secondary">Records are recalculated from logged working sets after saving.</Typography>
      <Typography tone="secondary">No comparison is shown before the workout is saved.</Typography>
    </Card>
    <Card title="Wearable measurements">
      <ListRow title="Heart rate" suffix={<Chip kind="pending" label="Pending"/>}
        detail="No verified watch workout source yet"/>
      <ListRow title="Calories" suffix={<Chip kind="pending" label="Pending"/>}
        detail="Not estimated from sets"/>
    </Card>
    <Card title="Workout notes">
      <Field label="Notes (optional)" value={notes} onChangeText={setNotes} multiline/>
    </Card>
    {error&&<Typography>{error}</Typography>}
    <Button label={busy?'Saving…':'Save workout'} size="xl" variant="train"
      fullWidth disabled={busy} onPress={()=>void save()}/>
    <Button label="Back to workout" variant="secondary" fullWidth
      disabled={busy} onPress={()=>router.back()}/>
    <Button label="Discard workout" variant="danger" disabled={busy}
      onPress={()=>setDiscard(true)}/>
    <Sheet visible={discard} destructive title="Discard this workout?"
      description={stats.sets+' logged working sets will be deleted. This cannot be undone.'}
      onClose={()=>setDiscard(false)}>
      <Button label="Keep training" fullWidth onPress={()=>setDiscard(false)}/>
      <Button label="Discard workout" variant="danger" fullWidth disabled={busy}
        onPress={()=>void discardNow()}/>
    </Sheet>
  </Screen>;
}
