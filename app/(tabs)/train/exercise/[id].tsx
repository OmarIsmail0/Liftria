import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { BodyMap } from '../../../../src/features/train/BodyMap';
import { Button, Card, Chip, EmptyState, Header, ListRow, Screen, Typography } from '../../../../src/design/primitives';
import { useTheme } from '../../../../src/design/ThemeProvider';
import { type Exercise } from '../../../../src/services/database/gymTypes';
import { ensureExercisePack, getExercise } from '../../../../src/services/database/exerciseLibrary';
import { exerciseSessions, readRecords } from '../../../../src/services/database/gymRepositories';
import type { ExerciseRecord } from '../../../../src/services/database/gymMath';

export default function ExerciseDetail(){
  const {id}=useLocalSearchParams<{id:string}>();
  const {theme}=useTheme();
  const [exercise,setExercise]=useState<Exercise|null>(null);
  const [records,setRecords]=useState<ExerciseRecord[]>([]);
  const [sessions,setSessions]=useState<{id:string;title:string;startedAt:string}[]>([]);
  const [loading,setLoading]=useState(true);
  useFocusEffect(useCallback(()=>{
    let live=true;
    void (async()=>{
      const loaded = await ensureExercisePack();
      if(!live)return;
      if(!loaded.ok){setLoading(false);return;}
      const [e,recent,pr]=await Promise.all([
        getExercise(id),exerciseSessions(id),readRecords(),
      ]);
      if(!live)return;
      setExercise(e.ok?e.value:null);
      setSessions(recent.ok?recent.value:[]);
      setRecords(pr.ok?pr.value.filter(record=>record.exerciseId===id):[]);
      setLoading(false);
    })();
    return()=>{live=false;};
  },[id]));
  if(loading)return <Screen embedded><Header title="Exercise" onBack={()=>router.back()}/><Typography>Loading exercise…</Typography></Screen>;
  if(!exercise)return <Screen embedded><Header title="Not found" onBack={()=>router.back()}/>
    <EmptyState title="Exercise unavailable" description="This exercise could not be found in your local library."/></Screen>;
  const highest=records.reduce<number|null>((n,r)=>r.heaviest!==null?Math.max(n??0,r.heaviest):n,null);
  const est=records.reduce<number|null>((n,r)=>r.bestEstimatedOneRepMax!==null?Math.max(n??0,r.bestEstimatedOneRepMax):n,null);
  const volume=records.reduce((n,r)=>Math.max(n,r.bestSessionVolume),0);
  return <Screen embedded scroll={false}>
    <ScrollView contentContainerStyle={{paddingVertical:theme.space[3],gap:theme.layout.cardGap}}>
      <Header title={exercise.name} subtitle={exercise.equipment??'Equipment not specified'}
        onBack={()=>router.back()}/>
      <Card rim="train">
        <BodyMap primary={exercise.primaryMuscles} secondary={exercise.secondaryMuscles}/>
        <Typography tone="secondary">{exercise.type==='dumbbell'?'Weight per hand':exercise.type==='assisted'?'Weight is assistance':exercise.type==='bodyweight'?'Body weight (or added weight)':'Total working weight'}{exercise.unilateral?' · Separate left/right sets':''}</Typography>
      </Card>
      <Card title="Add to a workout">
        <Button label="Add to a workout" variant="train" disabled onPress={()=>{}}/>
        <Typography tone="secondary" size="small">Start a workout first. Adding exercises will be available when workout tracking is ready.</Typography>
      </Card>
      <Card title="Your progress">
        {sessions.length===0?<EmptyState title="No workouts logged yet"
          description="Your best sets, records and trend chart start after you log your first session."/>:
        <View style={{gap:theme.space[2]}}>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:theme.space[4]}}>
            <View><Typography size="metric-m">{highest===null?'—':highest+' kg'}</Typography><Typography tone="secondary" size="small">Heaviest</Typography></View>
            <View><Typography size="metric-m">{volume?Math.round(volume)+' kg':'—'}</Typography><Typography tone="secondary" size="small">Best session volume</Typography></View>
            <View><Typography size="metric-m">{est===null?'—':Math.round(est)+' kg'}</Typography><Typography tone="secondary" size="small">Est. 1RM</Typography></View>
          </View>
          <Chip kind="estimate" label="Estimate"/>
          <Typography tone="secondary" size="small">Estimated 1RM uses Epley on 1–12-rep sets. A trend, not a test.</Typography>
          <Typography tone="secondary">{sessions.length===1?'One logged session · a chart needs two sessions.':sessions.length+' workouts logged · trend history will appear here.'}</Typography>
        </View>}
      </Card>
      <Card title="Recent sessions">
        {sessions.length===0?<Typography tone="secondary">No sessions for this exercise yet.</Typography>:
          sessions.slice(0,5).map(s=><ListRow key={s.id} title={s.title}
            detail={new Date(s.startedAt).toLocaleDateString()}/>)}
      </Card>
      <Card title="How to">
        {exercise.instructions.length?exercise.instructions.map((step,index)=>
          <View key={index} style={{flexDirection:'row',gap:theme.space[2]}}>
            <Typography tone="secondary">{index+1}.</Typography>
            <View style={{flex:1}}><Typography>{step}</Typography></View>
          </View>):<Typography tone="secondary">No instructions were provided for this exercise.</Typography>}
      </Card>
      {exercise.source==='pack'&&<Typography tone="tertiary" size="small">Instructions from free-exercise-db (Unlicense). No third-party images.</Typography>}
    </ScrollView>
  </Screen>;
}