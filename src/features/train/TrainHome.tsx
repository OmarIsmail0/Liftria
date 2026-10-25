import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Header, ListRow, Screen, Sheet, Typography } from '../../design/primitives';
import { useTheme } from '../../design/ThemeProvider';
import { listPlans, listSessions, listTemplates, saveTemplate, type Plan, type Session, type Template } from '../../services/database/gymRepositories';
import { readInProgressWorkout, discardInProgressWorkout, workoutNumbers,
  type ActiveWorkout } from './workoutData';
import { weekDays, scheduledTemplate, isLocalDate } from './weekPlan';
import { elapsedLabel } from './restClock';
import { ensureExercisePack } from '../../services/database/exerciseLibrary';
import { readStrengthObservations } from '../../services/database/historyRepository';
import { calculateMuscleRecovery, relativeTrainingDay, type MuscleRecovery } from './recoveryMath';

export default function TrainHome() {
  const {theme}=useTheme();
  const [active,setActive]=useState<ActiveWorkout|null>(null);
  const [templates,setTemplates]=useState<Template[]>([]);
  const [plans,setPlans]=useState<Plan[]>([]);
  const [sessions,setSessions]=useState<Session[]>([]);
  const [discard,setDiscard]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  const [muscles,setMuscles]=useState<MuscleRecovery[]>([]);
  const [starterBusy,setStarterBusy]=useState(false);
  const [starterMessage,setStarterMessage]=useState<string|null>(null);
  const starter=async(name:'Upper A'|'Lower B')=>{
    if(starterBusy)return;
    setStarterBusy(true);
    const seeded=await ensureExercisePack();
    const exerciseIds=name==='Upper A'?
      ['Barbell_Bench_Press_-_Medium_Grip','Barbell_Shoulder_Press']:
      ['Barbell_Squat','Barbell_Deadlift'];
    if(seeded.ok){
      const saved=await saveTemplate({name,restSec:120,notes:null,
        exercises:exerciseIds.map(exerciseId=>({exerciseId,targetSets:3,
          repMin:6,repMax:10,restSec:null,notes:null}))});
      if(saved.ok){await refresh();router.push({pathname:'/(tabs)/train/preview',
        params:{templateId:saved.value}});}
      else setStarterMessage('Could not save starter template.');
    }else setStarterMessage('The offline exercise library is unavailable.');
    setStarterBusy(false);
  };
  const refresh=useCallback(async()=>{
    const [a,ts,ps,ss,ms]=await Promise.all([
      readInProgressWorkout(),listTemplates(),listPlans(),listSessions(40),readStrengthObservations(),
    ]);
    if(ms.ok)setMuscles(calculateMuscleRecovery(ms.value,new Date()));
    setError(!a.ok||!ts.ok||!ps.ok||!ss.ok);
    if(a.ok)setActive(a.value);
    if(ts.ok)setTemplates(ts.value);
    if(ps.ok)setPlans(ps.value);
    if(ss.ok)setSessions(ss.value);
    setLoading(false);
  },[]);
  useFocusEffect(useCallback(()=>{void refresh();},[refresh]));
  const today=new Date();
  const plan=plans.find(p=>p.active)??null;
  const planned=scheduledTemplate(plan,templates,today);
  const logged=sessions.filter(s=>s.state==='finished');
  const resume=()=>{if(active)router.push({pathname:'/(tabs)/train/active',params:{id:active.id}});};
  const deleteActive=async()=>{
    if(!active)return;
    const result=await discardInProgressWorkout(active.id);
    setDiscard(false);
    if(result.ok&&result.value)await refresh();
  };
  const stats=active?workoutNumbers(active):null;
  return <Screen embedded>
    <Header title="Train" subtitle="Your workouts, on this phone" right={
      <Button label="Search" variant="secondary" onPress={()=>router.push('/(tabs)/train/library')}/>}/>
    {loading?<Typography tone="secondary">Loading your workouts…</Typography>:
      error?<Card><Typography>Could not load your workouts. Your saved data stays on this phone.</Typography>
        <Button label="Retry" onPress={()=>void refresh()}/></Card>:
      <Card rim="train" title={active?'Workout in progress':planned?'Up next · '+planned.name:'Start training'}>
        {active?<View style={{gap:theme.space[2]}}>
          <Typography>{active.title} · {elapsedLabel(active.startedAt)} · {stats?.sets??0} sets logged</Typography>
          <Button label="Resume workout" size="xl" variant="train" fullWidth onPress={resume}/>
          <Button label="Discard workout" variant="danger" onPress={()=>setDiscard(true)}/>
        </View>:planned?<View style={{gap:theme.space[2]}}>
          <Typography tone="secondary">Your active plan suggests {planned.name}. You can train on any day.</Typography>
          <Button label="Preview workout" variant="train" fullWidth
            onPress={()=>router.push({pathname:'/(tabs)/train/preview',params:{templateId:planned.id}})}/>
          <Button label="Edit template" variant="secondary"
            onPress={()=>router.push({pathname:'/(tabs)/train/template',params:{id:planned.id}})}/>
        </View>:<View style={{gap:theme.space[2]}}>
          <Typography tone="secondary">Start without a plan, or build a repeatable template.</Typography>
          <Button label="Start empty workout" variant="train" fullWidth
            onPress={()=>router.push('/(tabs)/train/preview')}/>
          <Button label="Build a template" variant="secondary" fullWidth
            onPress={()=>router.push('/(tabs)/train/template')}/>
          {templates.length===0&&<View style={{gap:theme.space[2]}}>
            <Typography tone="secondary" size="small">Starter templates · saved only if you choose one</Typography>
            <Button label="Create Upper A starter" variant="secondary" disabled={starterBusy}
              fullWidth onPress={()=>void starter('Upper A')}/>
            <Button label="Create Lower B starter" variant="secondary" disabled={starterBusy}
              fullWidth onPress={()=>void starter('Lower B')}/>
            {starterMessage&&<Typography>{starterMessage}</Typography>}
          </View>}
        </View>}
      </Card>}
    <Card title="Explore">
      <View style={{flexDirection:'row',gap:theme.space[2],flexWrap:'wrap'}}>
        <Button label="Templates & plans" variant="secondary" onPress={()=>router.push('/(tabs)/train/plans')}/>
        <Button label="Exercises" variant="secondary" onPress={()=>router.push('/(tabs)/train/library')}/>
        <Button label="Muscles" variant="secondary" onPress={()=>router.push('/(tabs)/train/muscles')}/>
      </View>
    </Card>
    <Card title="Muscles" rim="train">
      {muscles.every(m=>m.lastCredit===null)?
        <Typography tone="secondary">Finish a workout to see your recently trained muscles.</Typography>:
        <Typography tone="secondary">{muscles.filter(m=>m.band==='higher').sort((a,b)=>b.score-a.score)
          .slice(0,3).map(m=>m.muscle).join(', ')||'Your recent sessions'} · trained recently.
          {muscles.some(m=>m.band==='ready')?' Other regions are ready.':''}</Typography>}
      <Typography tone="tertiary" size="small">Estimate from logged working sets only. It does not measure recovery.</Typography>
      <Button label="Open muscle map" variant="secondary" onPress={()=>router.push('/(tabs)/train/recovery')}/>
    </Card>
    <Card title="This week">
      <View style={{flexDirection:'row',justifyContent:'space-between',flexWrap:'wrap',gap:theme.space[1]}}>
        {weekDays(today).map(day=>{
          const done=logged.some(s=>isLocalDate(s.startedAt,day.date));
          const next=scheduledTemplate(plan,templates,day.date);
          const label=done?'Done':next?.name??'Rest';
          return <View key={day.label} accessible accessibilityLabel={day.label+', '+label+
            (day.today?', today':'')} style={{minWidth:40,minHeight:60,alignItems:'center',
            justifyContent:'center',padding:theme.space[1],borderRadius:theme.radius.md,
            borderColor:day.today?theme.color.domain.train:theme.color.border.subtle,
            borderWidth:day.today?2:1}}>
            <Typography size="small">{day.label}</Typography>
            <Typography tone="secondary" size="small">{done?'✓':day.today?'Today':next?'●':'—'}</Typography>
          </View>;
        })}
      </View>
      <Typography tone="secondary" size="small">Check marks mean completed workouts. Planned days are suggestions, not requirements.</Typography>
    </Card>
    <Card title="Training history">
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:theme.space[2]}}>
        <Button label="History" variant="secondary" onPress={()=>router.push('/(tabs)/train/history')}/>
        <Button label="Records" variant="secondary" onPress={()=>router.push('/(tabs)/train/records')}/>
        <Button label="Strength trends" variant="secondary" onPress={()=>router.push('/(tabs)/progress/strength')}/>
      </View>
    </Card>
    <Card title="Recent workouts">
      {logged.length===0?<Typography tone="secondary">No completed workouts yet.</Typography>:
        logged.slice(0,4).map(s=><ListRow key={s.id} title={s.title}
          detail={new Date(s.startedAt).toLocaleDateString()}
          onPress={()=>router.push({pathname:'/(tabs)/train/session',params:{id:s.id}})}/>)}
    </Card>
    <Typography tone="tertiary" size="small">Training works offline and does not need a watch.</Typography>
    <Sheet visible={discard} title="Discard the active workout?" destructive
      description={(stats?.sets??0)+' logged working sets will be removed. No undo.'
      } onClose={()=>setDiscard(false)}>
      <Button label="Keep training" fullWidth onPress={()=>setDiscard(false)}/>
      <Button label="Discard workout" variant="danger" fullWidth onPress={()=>void deleteActive()}/>
    </Sheet>
  </Screen>;
}
