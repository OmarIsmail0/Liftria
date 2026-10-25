import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Button, Card, Field, Header, ListRow, Screen, Typography } from '../../../src/design/primitives';
import { ensureExercisePack, listExercises, searchExercises } from '../../../src/services/database/exerciseLibrary';
import { appendExerciseToActiveSession } from '../../../src/services/database/gymRepositories';
import { replaceActiveExercise } from '../../../src/features/train/workoutData';
import type { Exercise } from '../../../src/services/database/gymTypes';

export default function AddWorkoutExercise() {
  const {id,replaceId}=useLocalSearchParams<{id:string;replaceId?:string}>();
  const [query,setQuery]=useState('');
  const [all,setAll]=useState<Exercise[]>([]);
  const [error,setError]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  useFocusEffect(useCallback(()=>{
    let live=true;
    void (async()=>{
      const seeded=await ensureExercisePack();
      const exercises=seeded.ok?await listExercises():null;
      if(!live)return;
      if(exercises?.ok)setAll(exercises.value);
      else setError('Could not open the local exercise library.');
    })();
    return()=>{live=false;};
  },[]));
  const matches=useMemo(()=>searchExercises(all,query).slice(0,60),[all,query]);
  const add=async(exerciseId:string)=>{
    if(busy)return;
    setBusy(true);
    const saved=replaceId?await replaceActiveExercise(id,replaceId,exerciseId):
      await appendExerciseToActiveSession(exerciseId);
    if(saved.ok&&saved.value)router.replace({pathname:'/(tabs)/train/active',params:{id}});
    else{setError('Could not add this exercise.');setBusy(false);}
  };
  return <Screen embedded>
    <Header title={replaceId?'Replace exercise':'Add exercise'} onBack={()=>router.back()}/>
    <Card title="Your offline library">
      <Field label="Search exercises" value={query} onChangeText={setQuery}/>
      {matches.map(e=><ListRow key={e.id} title={e.name}
        detail={e.equipment??'Equipment not specified'} onPress={()=>void add(e.id)}/>)}
      {matches.length===0&&<Typography tone="secondary">No matches. Try another name.</Typography>}
    </Card>
    {error&&<Typography>{error}</Typography>}
    <Button label="Cancel" variant="secondary" disabled={busy} onPress={()=>router.back()}/>
  </Screen>;
}
