import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Header, ListRow, Screen, Sheet, Typography } from '../../design/primitives';
import { useTheme } from '../../design/ThemeProvider';
import { listPlans, listSessions, listTemplates, type Plan, type Session, type Template } from '../../services/database/gymRepositories';
import { readInProgressWorkout, discardInProgressWorkout, workoutNumbers,
  type ActiveWorkout } from './workoutData';
import { weekDays, scheduledTemplate, isLocalDate } from './weekPlan';
import { elapsedLabel } from './restClock';

export default function TrainHome() {
  const {theme}=useTheme();
  const [active,setActive]=useState<ActiveWorkout|null>(null);
  const [templates,setTemplates]=useState<Template[]>([]);
  const [plans,setPlans]=useState<Plan[]>([]);
  const [sessions,setSessions]=useState<Session[]>([]);
  const [discard,setDiscard]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  const refresh=useCallback(async()=>{
    const [a,ts,ps,ss]=await Promise.all([
      readInProgressWorkout(),listTemplates(),listPlans(),listSessions(40),
    ]);
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
        </View>}
      </Card>}
    <Card title="Explore">
      <View style={{flexDirection:'row',gap:theme.space[2],flexWrap:'wrap'}}>
        <Button label="Templates & plans" variant="secondary" onPress={()=>router.push('/(tabs)/train/plans')}/>
        <Button label="Exercises" variant="secondary" onPress={()=>router.push('/(tabs)/train/library')}/>
        <Button label="Muscles" variant="secondary" onPress={()=>router.push('/(tabs)/train/muscles')}/>
      </View>
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
    <Card title="Recent workouts">
      {logged.length===0?<Typography tone="secondary">No completed workouts yet.</Typography>:
        logged.slice(0,4).map(s=><ListRow key={s.id} title={s.title}
          detail={new Date(s.startedAt).toLocaleDateString()}/>)}
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
