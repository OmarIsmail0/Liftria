import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Header, ListRow, Screen, Sheet, Typography } from '../../design/primitives';
import { useTheme } from '../../design/ThemeProvider';
import { useLanguage } from '../../i18n/LanguageProvider';
import { muscleLabel } from '../../i18n/muscles';
import { listPlans, listSessions, listTemplates, saveTemplate, type Plan, type Session, type Template } from '../../services/database/gymRepositories';
import { readInProgressWorkout, discardInProgressWorkout, workoutNumbers,
  type ActiveWorkout } from './workoutData';
import { weekDays, scheduledTemplate, isLocalDate } from './weekPlan';
import { elapsedLabel } from './restClock';
import { ensureExercisePack } from '../../services/database/exerciseLibrary';
import { readStrengthObservations } from '../../services/database/historyRepository';
import { calculateMuscleRecovery, type MuscleRecovery } from './recoveryMath';

export default function TrainHome() {
  const {theme}=useTheme();
  const { t, language } = useLanguage();
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
      else setStarterMessage(t('train.starterError'));
    }else setStarterMessage(t('train.libraryError'));
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
    <Header title={t('nav.train')} subtitle={t('train.subtitle')} right={
      <Button label={t('train.search')} variant="secondary" onPress={()=>router.push('/(tabs)/train/library')}/>}/>
    {loading?<Typography tone="secondary">{t('train.loading')}</Typography>:
      error?<Card><Typography>{t('train.loadError')}</Typography>
        <Button label={t('train.retry')} onPress={()=>void refresh()}/></Card>:
      <Card rim="train" title={active?t('train.inProgress'):planned?t('train.upNext', { name: planned.name }):t('train.start')}>
        {active?<View style={{gap:theme.space[2]}}>
          <Typography>{active.title} · {elapsedLabel(active.startedAt)} · {t('train.setsLogged', { count: stats?.sets ?? 0 })}</Typography>
          <Button label={t('train.resume')} size="xl" variant="train" fullWidth onPress={resume}/>
          <Button label={t('train.discard')} variant="danger" onPress={()=>setDiscard(true)}/>
        </View>:planned?<View style={{gap:theme.space[2]}}>
          <Typography tone="secondary">{t('train.planned', { name: planned.name })}</Typography>
          <Button label={t('train.preview')} variant="train" fullWidth
            onPress={()=>router.push({pathname:'/(tabs)/train/preview',params:{templateId:planned.id}})}/>
          <Button label={t('train.editTemplate')} variant="secondary"
            onPress={()=>router.push({pathname:'/(tabs)/train/template',params:{id:planned.id}})}/>
        </View>:<View style={{gap:theme.space[2]}}>
          <Typography tone="secondary">{t('train.startWithoutPlan')}</Typography>
          <Button label={t('train.startEmpty')} variant="train" fullWidth
            onPress={()=>router.push('/(tabs)/train/preview')}/>
          <Button label={t('train.buildTemplate')} variant="secondary" fullWidth
            onPress={()=>router.push('/(tabs)/train/template')}/>
          {templates.length===0&&<View style={{gap:theme.space[2]}}>
            <Typography tone="secondary" size="small">{t('train.starterHint')}</Typography>
            <Button label={t('train.starterUpper')} variant="secondary" disabled={starterBusy}
              fullWidth onPress={()=>void starter('Upper A')}/>
            <Button label={t('train.starterLower')} variant="secondary" disabled={starterBusy}
              fullWidth onPress={()=>void starter('Lower B')}/>
            {starterMessage&&<Typography>{starterMessage}</Typography>}
          </View>}
        </View>}
      </Card>}
    {logged.length===0&&<Card title={t('train.importTitle')}>
      <Typography tone="secondary">{t('train.importDescription')}</Typography>
      <Button label={t('train.import')} variant="secondary" onPress={()=>router.push('/import')}/>
    </Card>}
    <Card title={t('train.explore')}>
      <View style={{flexDirection:'row',gap:theme.space[2],flexWrap:'wrap'}}>
        <Button label={t('train.templatesPlans')} variant="secondary" onPress={()=>router.push('/(tabs)/train/plans')}/>
        <Button label={t('train.exercises')} variant="secondary" onPress={()=>router.push('/(tabs)/train/library')}/>
        <Button label={t('train.muscles')} variant="secondary" onPress={()=>router.push('/(tabs)/train/muscles')}/>
      </View>
    </Card>
    <Card title={t('train.muscles')} rim="train">
      {muscles.every(m=>m.lastCredit===null)?
        <Typography tone="secondary">{t('train.noMuscles')}</Typography>:
        <Typography tone="secondary">{t('train.trainedRecently', { names: muscles.filter(m=>m.band==='higher').sort((a,b)=>b.score-a.score)
          .slice(0,3).map(m=>muscleLabel(language,m.muscle)).join(', ') || t('train.recentSessions') })}
          {muscles.some(m=>m.band==='ready')?' '+t('train.otherReady'):''}</Typography>}
      <Typography tone="tertiary" size="small">{t('train.recoveryEstimate')}</Typography>
      <Button label={t('train.openMuscles')} variant="secondary" onPress={()=>router.push('/(tabs)/train/recovery')}/>
    </Card>
    <Card title={t('train.week')}>
      <View style={{flexDirection:'row',justifyContent:'space-between',flexWrap:'wrap',gap:theme.space[1]}}>
        {weekDays(today).map(day=>{
          const done=logged.some(s=>isLocalDate(s.startedAt,day.date));
          const next=scheduledTemplate(plan,templates,day.date);
          const label=done?t('train.done'):next?.name??t('train.rest');
          return <View key={day.label} accessible accessibilityLabel={day.label+', '+label+
            (day.today?', '+t('train.todayA11y'):'')} style={{minWidth:40,minHeight:60,alignItems:'center',
            justifyContent:'center',padding:theme.space[1],borderRadius:theme.radius.md,
            borderColor:day.today?theme.color.domain.train:theme.color.border.subtle,
            borderWidth:day.today?2:1}}>
            <Typography size="small">{new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { weekday: 'short' }).format(day.date)}</Typography>
            <Typography tone="secondary" size="small">{done?'✓':day.today?t('nav.today'):next?'●':'—'}</Typography>
          </View>;
        })}
      </View>
      <Typography tone="secondary" size="small">{t('train.weekNote')}</Typography>
    </Card>
    <Card title={t('train.historyTitle')}>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:theme.space[2]}}>
        <Button label={t('train.history')} variant="secondary" onPress={()=>router.push('/(tabs)/train/history')}/>
        <Button label={t('train.records')} variant="secondary" onPress={()=>router.push('/(tabs)/train/records')}/>
        <Button label={t('progress.strengthTrends')} variant="secondary" onPress={()=>router.push('/(tabs)/progress/strength')}/>
      </View>
    </Card>
    <Card title={t('train.recent')}>
      {logged.length===0?<Typography tone="secondary">{t('train.noCompleted')}</Typography>:
        logged.slice(0,4).map(s=><ListRow key={s.id} title={s.title}
          detail={new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US').format(new Date(s.startedAt))}
          onPress={()=>router.push({pathname:'/(tabs)/train/session',params:{id:s.id}})}/>)}
    </Card>
    <Typography tone="tertiary" size="small">{t('train.offline')}</Typography>
    <Sheet visible={discard} title={t('train.discardTitle')} destructive
      description={t('train.discardDescription', { count: stats?.sets ?? 0 })
      } onClose={()=>setDiscard(false)}>
      <Button label={t('train.keep')} fullWidth onPress={()=>setDiscard(false)}/>
      <Button label={t('train.discard')} variant="danger" fullWidth onPress={()=>void deleteActive()}/>
    </Sheet>
  </Screen>;
}
