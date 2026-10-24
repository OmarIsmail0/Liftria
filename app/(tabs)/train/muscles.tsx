import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { BodyMap } from '../../../src/features/train/BodyMap';
import { Card, EmptyState, Header, ListRow, Screen, Typography } from '../../../src/design/primitives';
import { useTheme } from '../../../src/design/ThemeProvider';
import { MUSCLES, titleMuscle, type Exercise, type Muscle } from '../../../src/services/database/gymTypes';
import { ensureExercisePack, listExercises, searchExercises } from '../../../src/services/database/exerciseLibrary';

export default function MuscleBrowser(){
  const {theme}=useTheme();
  const [selected,setSelected]=useState<Muscle>('chest');
  const [all,setAll]=useState<Exercise[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  useFocusEffect(useCallback(()=>{
    let mounted=true;
    void (async()=>{
      const p=await ensureExercisePack();
      const rows=p.ok?await listExercises():null;
      if(mounted){
        if(rows?.ok)setAll(rows.value);else setError(true);
        setLoading(false);
      }
    })();
    return()=>{mounted=false;};
  },[]));
  const rows=useMemo(()=>searchExercises(all,'',selected),[all,selected]);
  return <Screen embedded scroll={false}>
    <ScrollView contentContainerStyle={{paddingVertical:theme.space[3],gap:theme.layout.cardGap}}>
      <Header title="Muscles" subtitle="TR-5 · Tap a region or a named chip" onBack={()=>router.back()}/>
      <Card rim="train">
        <BodyMap selected={selected} primary={[selected]} onSelect={setSelected}/>
      </Card>
      <Card title={titleMuscle(selected)+' · '+rows.length+' exercises'}>
        <Typography tone="secondary" size="small">Showing exercises with this muscle as primary or secondary.</Typography>
        {loading&&<ActivityIndicator color={theme.color.domain.train}/>}
        {error&&<Typography>Could not load the local library.</Typography>}
        {!loading&&!error&&rows.length===0&&<EmptyState title="No exercises yet"
          description="Create an exercise with this muscle to see it here."/>}
        {rows.slice(0,50).map(e=><ListRow key={e.id} title={e.name}
          detail={(e.equipment??'Not specified')+' · '+(e.primaryMuscles.includes(selected)?'Primary':'Secondary')}
          onPress={()=>router.push({pathname:'/(tabs)/train/exercise/[id]',params:{id:e.id}})}/>)}
        {rows.length>50&&<Typography tone="secondary">Showing 50 of {rows.length}. Browse all in Search.</Typography>}
      </Card>
      <Typography tone="tertiary" size="small">{MUSCLES.length} mapped regions, from the bundled free-exercise-db categories.</Typography>
    </ScrollView>
  </Screen>;
}