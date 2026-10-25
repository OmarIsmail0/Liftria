import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { BodyMap } from '../../../src/features/train/BodyMap';
import { startManualWorkout, readInProgressWorkout, discardInProgressWorkout, type ActiveWorkout } from '../../../src/features/train/workoutData';
import { Button, Card, Header, ListRow, Screen, Sheet, Typography } from '../../../src/design/primitives';
import { listTemplates, exerciseSessions, type Template } from '../../../src/services/database/gymRepositories';
import { getExercise } from '../../../src/services/database/exerciseLibrary';
import type { Exercise, Muscle } from '../../../src/services/database/gymTypes';

export default function WorkoutPreview() {
  const {templateId}=useLocalSearchParams<{templateId?:string}>();
  const [template,setTemplate]=useState<Template|null>(null);
  const [lookup,setLookup]=useState<Record<string,Exercise>>({});
  const [last,setLast]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [existing,setExisting]=useState<ActiveWorkout|null>(null);
  useFocusEffect(useCallback(()=>{
    let live=true;
    void (async()=>{
      const templates=await listTemplates();
      const found=templates.ok?templates.value.find(t=>t.id===templateId)??null:null;
      if(!live)return;
      setTemplate(found);
      if(found){
        const exercises=await Promise.all(found.exercises.map(e=>getExercise(e.exerciseId)));
        const sessions=await Promise.all(found.exercises.map(e=>exerciseSessions(e.exerciseId,1)));
        if(!live)return;
        setLookup(Object.fromEntries(found.exercises.flatMap((e,i)=>{
          const foundExercise=exercises[i];
          return foundExercise?.ok&&foundExercise.value?[[e.exerciseId,foundExercise.value]]:[];
        })));
        setLast(Object.fromEntries(found.exercises.flatMap((e,i)=>{
          const foundSessions=sessions[i];
          return foundSessions?.ok&&foundSessions.value[0]?
            [[e.exerciseId,foundSessions.value[0].startedAt]]:[];
        })));
      }
    })();
    return()=>{live=false;};
  },[templateId]));
  const create=async()=>{
    setBusy(true);
    const started=await startManualWorkout(template?.name??'Empty workout',templateId??null);
    if(started.ok)router.replace({pathname:'/(tabs)/train/active',params:{id:started.value}});
    else {setError('Could not start workout. Try again.');setBusy(false);}
  };
  const begin=async()=>{
    if(busy)return;
    const session=await readInProgressWorkout();
    if(!session.ok){setError('Could not check the active workout. Retry.');return;}
    if(session.value){setExisting(session.value);return;}
    await create();
  };
  const replaceExisting=async()=>{
    if(!existing)return;
    setBusy(true);
    const removed=await discardInProgressWorkout(existing.id);
    if(!removed.ok||!removed.value){setError('Could not discard the previous workout.');setBusy(false);return;}
    setExisting(null);
    await create();
  };
  const muscles=[...new Set((template?.exercises??[]).flatMap(e=>lookup[e.exerciseId]?.primaryMuscles??[]))] as Muscle[];
  return <Screen embedded>
    <Header title={template?.name??'Empty workout'} subtitle="Review before starting" onBack={()=>router.back()}/>
    <Card rim="train">
      {muscles.length>0&&<BodyMap primary={muscles}/>}
      <Typography tone="secondary">{template?template.exercises.length+' exercises · '+template.restSec+' sec default rest':
        'No exercises yet. You can add them after starting.'}</Typography>
    </Card>
    <Card title="Up next">
      {template?template.exercises.map((e,i)=><ListRow key={i}
        title={lookup[e.exerciseId]?.name??'Exercise'}
        detail={e.targetSets+' sets · '+e.repMin+'–'+e.repMax+' reps'+
          (last[e.exerciseId]?' · last '+new Date(last[e.exerciseId] ?? '').toLocaleDateString():' · no previous workout')}/>):
        <Typography tone="secondary">Start empty, then add exercises from the library.</Typography>}
    </Card>
    {error&&<Typography>{error}</Typography>}
    <View style={{gap:8}}>
      <Button label={busy?'Starting…':'Start workout'} size="xl" variant="train"
        fullWidth disabled={busy} onPress={()=>void begin()}/>
      <Typography tone="secondary" size="small">Nothing is logged until you tap Log set.</Typography>
    </View>
    <Sheet visible={existing!==null} title="Workout already in progress"
      description={'You have '+(existing?.title??'a workout')+' in progress. Resume it, or discard it and start '+(template?.name??'Empty workout')+'?'}
      onClose={()=>setExisting(null)}>
      <Button label={'Resume '+(existing?.title??'workout')} variant="train" fullWidth
        onPress={()=>{if(existing)router.replace({pathname:'/(tabs)/train/active',params:{id:existing.id}});}}/>
      <Button label="Keep current workout" variant="secondary" fullWidth onPress={()=>setExisting(null)}/>
      <Button label={'Discard and start '+(template?.name??'empty workout')} variant="danger" fullWidth
        disabled={busy} onPress={()=>void replaceExisting()}/>
    </Sheet>
  </Screen>;
}
