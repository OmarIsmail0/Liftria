import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, Card, Header, ListGroup, ListRow, Screen, SectionHeader, Sheet, Typography } from '../../design/primitives';
import { SearchIcon } from '../../design/primitives/TabIcon';
import { useTheme } from '../../design/ThemeProvider';
import { useLanguage } from '../../i18n/LanguageProvider';
import { formatDate, formatNumber, pluralForm, translateWorkoutCount, type TranslationKey } from '../../i18n';
import { deleteTemplate, listPlans, listSessions, listTemplates, saveTemplate, type Plan, type Session, type Template } from '../../services/database/gymRepositories';
import { readInProgressWorkout, discardInProgressWorkout, workoutNumbers,
  type ActiveWorkout } from './workoutData';
import { weekDays, scheduledTemplate, isLocalDate } from './weekPlan';
import { elapsedLabel } from './restClock';
import { ensureExercisePack, listExercises } from '../../services/database/exerciseLibrary';
import { relativeTrainingDay } from './recoveryMath';
import type { Exercise } from '../../services/database/gymTypes';
import { PressRow } from './PressRow';

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
  const [starterBusy,setStarterBusy]=useState(false);
  const [starterMessage,setStarterMessage]=useState<string|null>(null);
  const [library,setLibrary]=useState<Record<string,Exercise>>({});
  const [menuTemplate,setMenuTemplate]=useState<Template|null>(null);
  const [deleteTemplateId,setDeleteTemplateId]=useState<string|null>(null);
  const refresh=useCallback(async()=>{
    const [a,ts,ps,ss,pack]=await Promise.all([
      readInProgressWorkout(),listTemplates(),listPlans(),listSessions(250),
      ensureExercisePack().then(seeded=>seeded.ok?listExercises():Promise.resolve(null)),
    ]);
    if(pack?.ok)setLibrary(Object.fromEntries(pack.value.map(exercise=>[exercise.id,exercise])));
    setError(!a.ok||!ts.ok||!ps.ok||!ss.ok);
    if(a.ok)setActive(a.value);
    if(ts.ok)setTemplates(ts.value);
    if(ps.ok)setPlans(ps.value);
    if(ss.ok)setSessions(ss.value);
    setLoading(false);
  },[]);
  useFocusEffect(useCallback(()=>{void refresh();},[refresh]));
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
  const today=new Date();
  const plan=plans.find(p=>p.active)??null;
  const logged=sessions.filter(s=>s.state==='finished');
  const resume=()=>{if(active)router.push({pathname:'/(tabs)/train/active',params:{id:active.id}});};
  const deleteActive=async()=>{
    if(!active)return;
    const result=await discardInProgressWorkout(active.id);
    setDiscard(false);
    if(result.ok&&result.value)await refresh();
  };
  const stats=active?workoutNumbers(active):null;
  const lastDone=new Map<string,string>();
  for(const session of sessions){
    if(session.state!=='finished'||!session.templateId||lastDone.has(session.templateId))continue;
    lastDone.set(session.templateId,session.startedAt);
  }
  const routineDetail=(template:Template)=>{
    const exercises=t((`count.exercises.${pluralForm(language,template.exercises.length)}`) as TranslationKey,{count:template.exercises.length});
    const when=lastDone.get(template.id);
    if(!when)return exercises;
    return t('train.routineWhen',{exercises,when:relativeTrainingDay(when,today,language)});
  };
  const routineTitle=(name:string)=>name==='Upper A'?t('train.starterUpperName'):
    name==='Lower B'?t('train.starterLowerName'):name;
  const duplicate=async(template:Template)=>{
    const saved=await saveTemplate({name:t('train.copyName',{name:template.name}),
      restSec:template.restSec,notes:template.notes,exercises:template.exercises});
    setMenuTemplate(null);
    if(saved.ok)await refresh();
  };
  const removeTemplate=async()=>{
    if(!deleteTemplateId)return;
    const result=await deleteTemplate(deleteTemplateId);
    setDeleteTemplateId(null);
    if(result.ok)await refresh();
  };
  const starters:('Upper A'|'Lower B')[]=[];
  if(!templates.some(template=>template.name==='Upper A'))starters.push('Upper A');
  if(!templates.some(template=>template.name==='Lower B'))starters.push('Lower B');
  const routineRows=templates.length+starters.length;
  const exerciseCount=Object.keys(library).length;
  const openPreview=(templateId?:string)=>router.push(templateId?
    {pathname:'/(tabs)/train/preview',params:{templateId}}:
    '/(tabs)/train/preview');
  return <Screen embedded>
    <Header mode="large" title={t('nav.train')} right={
      <Pressable accessibilityRole="button" accessibilityLabel={t('train.search')}
        onPress={()=>router.push('/(tabs)/train/library')}
        style={{width:theme.size.touch.min,height:theme.size.touch.min,alignItems:'center',justifyContent:'center'}}>
        <SearchIcon color={theme.color.text.primary} size={theme.space[6]} strokeWidth={theme.size.iconStroke}/>
      </Pressable>}/>
    {loading?<Typography tone="secondary">{t('train.loading')}</Typography>:
      error?<Card><Typography>{t('train.loadError')}</Typography>
        <Button label={t('train.retry')} onPress={()=>void refresh()}/></Card>:
      active&&<Card>
        <Typography size="secondary" tone="secondary">{t('train.inProgress')}</Typography>
        <Typography bold>{active.title}</Typography>
        <Typography tone="secondary" size="secondary">{elapsedLabel(active.startedAt)} · {t((`train.setsLogged.${pluralForm(language, stats?.sets ?? 0)}`) as TranslationKey, { count: stats?.sets ?? 0 })}</Typography>
        <Button label={t('train.resume')} variant="primary" fullWidth onPress={resume}/>
        <Button label={t('train.discard')} variant="destructive" fullWidth onPress={()=>setDiscard(true)}/>
      </Card>}
    <Button label={t('train.startEmpty')} variant="primary" fullWidth onPress={()=>openPreview()}/>
    <View style={{gap:theme.space[2]}}>
      <SectionHeader title={t('train.routines')} actionLabel={t('train.newRoutine')}
        onAction={()=>router.push('/(tabs)/train/template')}/>
      {!loading && routineRows>0 && <ListGroup>
        {templates.map((template,index)=>{
          const last=index===templates.length-1 && starters.length===0;
          return <PressRow key={template.id} title={routineTitle(template.name)} detail={routineDetail(template)}
            divider={!last} onPress={()=>openPreview(template.id)}
            onLongPress={()=>setMenuTemplate(template)} longPressLabel={t('train.routineOptions')}
            trailing={<Pressable accessibilityRole="button" accessibilityLabel={t('train.routineOptions')}
              onPress={()=>setMenuTemplate(template)}
              style={{width:theme.size.touch.min,height:theme.size.touch.min,alignItems:'center',justifyContent:'center'}}>
              <Text allowFontScaling style={{color:theme.color.text.primary,fontSize:theme.type.title.size,
                lineHeight:theme.type.title.line}}>{'⋯'}</Text>
            </Pressable>}/>;
        })}
        {starters.map((name,index)=><PressRow key={name} title={routineTitle(name)} detail={t('train.starterLabel')}
          divider={index!==starters.length-1} onPress={()=>void starter(name)}/>)}
      </ListGroup>}
      {starterMessage?<Typography>{starterMessage}</Typography>:null}
    </View>
    <View style={{gap:theme.space[2]}}>
      <SectionHeader title={t('train.librarySection')}/>
      <ListGroup>
        <ListRow title={t('train.exercises')}
          value={!loading && exerciseCount>0 ? formatNumber(language, exerciseCount) : undefined}
          onPress={()=>router.push('/(tabs)/train/library')}/>
        <ListRow title={t('train.history')}
          value={!loading && !error ? translateWorkoutCount(language, logged.length) : undefined}
          onPress={()=>router.push('/(tabs)/train/history')}/>
        <ListRow title={t('train.records')} onPress={()=>router.push('/(tabs)/train/records')}/>
        <ListRow title={t('train.musclesRecovery')} onPress={()=>router.push('/(tabs)/train/recovery')}/>
        <ListRow title={t('train.templatesPlans')} onPress={()=>router.push('/(tabs)/train/plans')}/>
        <ListRow title={t('progress.strengthTrends')} onPress={()=>router.push('/(tabs)/progress/strength')}/>
      </ListGroup>
    </View>
    <ListGroup>
      <ListRow title={t('train.importRow')} detail={t('train.importDescription')}
        onPress={()=>router.push('/import')}/>
    </ListGroup>
    <View style={{gap:theme.space[2]}}>
      <SectionHeader title={t('train.week')}/>
      <View style={{flexDirection:'row',gap:theme.space[1]}}>
        {weekDays(today).map(day=>{
          const done=logged.some(s=>isLocalDate(s.startedAt,day.date));
          const next=scheduledTemplate(plan,templates,day.date);
          const label=done?t('train.done'):next?.name??t('train.rest');
          return <View key={day.label} accessible accessibilityLabel={day.label+', '+label+
            (day.today?', '+t('train.todayA11y'):'')} style={{flex:1,minHeight:theme.size.touch.min,
            alignItems:'center',justifyContent:'center',gap:theme.space[1]}}>
            <Text allowFontScaling style={{textAlign:'center',fontWeight:'600',
              color:day.today?theme.color.accent:theme.color.text.primary,
              fontSize:theme.type.caption.size,lineHeight:theme.type.caption.line}}>
              {formatDate(language, day.date, { weekday: 'short' })}
            </Text>
            <Text allowFontScaling numberOfLines={1} style={{textAlign:'center',
              color:theme.color.text.secondary,fontSize:theme.type.caption.size,lineHeight:theme.type.caption.line}}>
              {done?'✓':day.today?t('nav.today'):next?'●':'—'}
            </Text>
          </View>;
        })}
      </View>
      <Typography tone="secondary" size="secondary">{t('train.weekNote')}</Typography>
    </View>
    <View style={{gap:theme.space[2]}}>
      <SectionHeader title={t('train.recent')}/>
      {logged.length===0?<Typography tone="secondary">{t('train.noCompleted')}</Typography>:
        <ListGroup>
          {logged.slice(0,4).map(s=><ListRow key={s.id} title={s.title}
            detail={formatDate(language, new Date(s.startedAt))}
            onPress={()=>router.push({pathname:'/(tabs)/train/session',params:{id:s.id}})}/>)}
        </ListGroup>}
    </View>
    <Sheet visible={menuTemplate!==null} title={menuTemplate?routineTitle(menuTemplate.name):t('train.routineOptions')}
      onClose={()=>setMenuTemplate(null)}>
      <Button label={t('train.editTemplate')} variant="neutral" fullWidth onPress={()=>{
        const template=menuTemplate; setMenuTemplate(null);
        if(template)router.push({pathname:'/(tabs)/train/template',params:{id:template.id}});
      }}/>
      <Button label={t('train.duplicate')} variant="neutral" fullWidth
        onPress={()=>{if(menuTemplate)void duplicate(menuTemplate);}}/>
      <Button label={t('train.deleteRoutine')} variant="destructive" fullWidth onPress={()=>{
        const template=menuTemplate; setMenuTemplate(null); if(template)setDeleteTemplateId(template.id);
      }}/>
    </Sheet>
    <Sheet visible={deleteTemplateId!==null} title={t('train.deleteRoutineTitle')} destructive
      description={t('train.deleteRoutineDesc')} onClose={()=>setDeleteTemplateId(null)}>
      <Button label={t('train.keep')} fullWidth onPress={()=>setDeleteTemplateId(null)}/>
      <Button label={t('train.deleteRoutine')} variant="destructive" fullWidth onPress={()=>void removeTemplate()}/>
    </Sheet>
    <Sheet visible={discard} title={t('train.discardTitle')} destructive
      description={t((`train.discardDescription.${pluralForm(language, stats?.sets ?? 0)}`) as TranslationKey, { count: stats?.sets ?? 0 })
      } onClose={()=>setDiscard(false)}>
      <Button label={t('train.keep')} fullWidth onPress={()=>setDiscard(false)}/>
      <Button label={t('train.discard')} variant="destructive" fullWidth onPress={()=>void deleteActive()}/>
    </Sheet>
  </Screen>;
}
