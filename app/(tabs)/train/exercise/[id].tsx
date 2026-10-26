import { useLanguage } from '../../../../src/i18n/LanguageProvider';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { BodyMap } from '../../../../src/features/train/BodyMap';
import { equipmentLabel } from '../../../../src/i18n/equipment';
import { Button, Card, Chip, EmptyState, Header, ListRow, Screen, Sheet, Typography } from '../../../../src/design/primitives';
import { useTheme } from '../../../../src/design/ThemeProvider';
import { type Exercise } from '../../../../src/services/database/gymTypes';
import { ensureExercisePack, getExercise } from '../../../../src/services/database/exerciseLibrary';
import { appendExerciseToActiveSession, exerciseSessions, listTemplates, readRecords, saveTemplate,
  type Template } from '../../../../src/services/database/gymRepositories';
import { readInProgressWorkout } from '../../../../src/features/train/workoutData';
import type { ExerciseRecord } from '../../../../src/services/database/gymMath';

export default function ExerciseDetail(){
  const {id}=useLocalSearchParams<{id:string}>();
  const {theme}=useTheme();
  const {t,language}=useLanguage();
  const [exercise,setExercise]=useState<Exercise|null>(null);
  const [records,setRecords]=useState<ExerciseRecord[]>([]);
  const [sessions,setSessions]=useState<{id:string;title:string;startedAt:string}[]>([]);
  const [loading,setLoading]=useState(true);
  const [choosing,setChoosing]=useState(false);
  const [templates,setTemplates]=useState<Template[]>([]);
  const [adding,setAdding]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const add=async()=>{
    if(adding)return;
    setAdding(true);
    const active=await readInProgressWorkout();
    if(active.ok&&active.value){
      const result=await appendExerciseToActiveSession(id);
      setAdding(false);
      if(result.ok&&result.value)router.push({pathname:'/(tabs)/train/active',params:{id:active.value.id}});
      else setMessage(t('exerciseDetail.addError'));
      return;
    }
    if(!active.ok){setMessage(t('exerciseDetail.checkError'));setAdding(false);return;}
    const saved=await listTemplates();
    setAdding(false);
    if(saved.ok){setTemplates(saved.value);setChoosing(true);}
    else setMessage(t('exerciseDetail.templateError'));
  };
  const toTemplate=async(template:Template)=>{
    if(adding)return;setAdding(true);
    const saved=await saveTemplate({name:template.name,notes:template.notes,restSec:template.restSec,
      exercises:[...template.exercises,{exerciseId:id,targetSets:3,repMin:8,repMax:12,restSec:null,notes:null}]},template.id);
    setAdding(false);
    if(saved.ok){setChoosing(false);setMessage(t('exerciseDetail.addedTo',{name:template.name}));}
    else setMessage(t('exerciseDetail.updateError'));
  };
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
  if(loading)return <Screen embedded><Header title={t('exerciseDetail.loadTitle')} onBack={()=>router.back()}/><Typography>{t('exerciseDetail.loading')}</Typography></Screen>;
  if(!exercise)return <Screen embedded><Header title={t('exerciseDetail.notFound')} onBack={()=>router.back()}/>
    <EmptyState title={t('exerciseDetail.unavailable')} description={t('exerciseDetail.unavailableDesc')}/></Screen>;
  const highest=records.reduce<number|null>((n,r)=>r.heaviest!==null?Math.max(n??0,r.heaviest):n,null);
  const est=records.reduce<number|null>((n,r)=>r.bestEstimatedOneRepMax!==null?Math.max(n??0,r.bestEstimatedOneRepMax):n,null);
  const volume=records.reduce((n,r)=>Math.max(n,r.bestSessionVolume),0);
  return <Screen embedded scroll={false}>
    <ScrollView contentContainerStyle={{paddingVertical:theme.space[3],gap:theme.layout.cardGap}}>
      <Header title={exercise.name} subtitle={equipmentLabel(language,exercise.equipment,t('exerciseDetail.equipmentUnknown'))}
        onBack={()=>router.back()}/>
      <Card rim="train">
        <BodyMap primary={exercise.primaryMuscles} secondary={exercise.secondaryMuscles}/>
        {exercise.type!=='weighted'||exercise.unilateral?
          <Typography tone="secondary">{exercise.type==='dumbbell'?t('exerciseDetail.weightPerHand'):exercise.type==='assisted'?t('exerciseDetail.assistanceWeight'):exercise.type==='bodyweight'?t('exerciseDetail.bodyweight'):''}{exercise.unilateral?t('exerciseDetail.separateSides'):''}</Typography>:null}
      </Card>
      <Card title={t('exerciseDetail.addCard')}>
        <Button label={adding?t('exerciseDetail.adding'):t('exerciseDetail.add')} variant="train" disabled={adding}
          onPress={()=>void add()}/>
        {message&&<Typography tone="secondary" size="small">{message}</Typography>}
      </Card>
      <Card title={t('exerciseDetail.progressTitle')}>
        {sessions.length===0?<EmptyState title={t('exerciseDetail.emptyTitle')}
          description={t('exerciseDetail.emptyDesc')}/>:
        <View style={{gap:theme.space[2]}}>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:theme.space[4]}}>
            <View><Typography size="metric-m">{highest===null?'—':highest+' kg'}</Typography><Typography tone="secondary" size="small">{t('exerciseDetail.heaviest')}</Typography></View>
            <View><Typography size="metric-m">{volume?Math.round(volume)+' kg':'—'}</Typography><Typography tone="secondary" size="small">{t('exerciseDetail.bestVolume')}</Typography></View>
            <View><Typography size="metric-m">{est===null?'—':Math.round(est)+' kg'}</Typography><Typography tone="secondary" size="small">{t('exerciseDetail.estimateRM')}</Typography></View>
          </View>
          <Chip kind="estimate" label={t('exerciseDetail.estimate')}/>
          <Typography tone="secondary" size="small">{t('exerciseDetail.estimateDesc')}</Typography>
          <Typography tone="secondary">{sessions.length===1?t('exerciseDetail.oneSession'):t('exerciseDetail.manySessions',{count:sessions.length})}</Typography>
        </View>}
      </Card>
      <Card title={t('exerciseDetail.recentTitle')}>
        {sessions.length===0?<Typography tone="secondary">{t('exerciseDetail.noSession')}</Typography>:
          sessions.slice(0,5).map(s=><ListRow key={s.id} title={s.title}
            detail={new Date(s.startedAt).toLocaleDateString(language==='ar'?'ar-EG-u-nu-latn':'en-US')}/>)}
      </Card>
      <Card title={t('exerciseDetail.howTo')}>
        {exercise.instructions.length?exercise.instructions.map((step,index)=>
          <View key={index} style={{flexDirection:'row',gap:theme.space[2]}}>
            <Typography tone="secondary">{index+1}.</Typography>
            <View style={{flex:1}}><Typography>{step}</Typography></View>
          </View>):<Typography tone="secondary">{t('exerciseDetail.noInstructions')}</Typography>}
      </Card>
      {exercise.source==='pack'&&<Typography tone="tertiary" size="small">{t('exerciseDetail.license')}</Typography>}
    </ScrollView>
    <Sheet visible={choosing} title={t('exerciseDetail.sheetTitle')}
      description={t('exerciseDetail.sheetDesc')}
      onClose={()=>setChoosing(false)}>
      {templates.map(t=><Button key={t.id} label={t.name} variant="secondary" fullWidth
        disabled={adding} onPress={()=>void toTemplate(t)}/>)}
      <Button label={t('exerciseDetail.newTemplate')} variant="train" fullWidth onPress={()=>{
        setChoosing(false);router.push({pathname:'/(tabs)/train/template',params:{exerciseId:id}});
      }}/>
      <Button label={t('exerciseDetail.cancel')} variant="secondary" fullWidth onPress={()=>setChoosing(false)}/>
    </Sheet>
  </Screen>;
}