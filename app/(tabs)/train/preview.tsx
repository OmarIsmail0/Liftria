import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { BodyMap } from '../../../src/features/train/BodyMap';
import { ExerciseThumbnail } from '../../../src/features/train/ExerciseThumbnail';
import { startManualWorkout, readInProgressWorkout, completeWorkout, type ActiveWorkout } from '../../../src/features/train/workoutData';
import { Button, Card, Header, ListRow, Screen, Sheet, Typography } from '../../../src/design/primitives';
import { listTemplates, exerciseSessions, type Template } from '../../../src/services/database/gymRepositories';
import { getExercise } from '../../../src/services/database/exerciseLibrary';
import type { Exercise, Muscle } from '../../../src/services/database/gymTypes';

export default function WorkoutPreview() {
  const {t,language}=useLanguage();
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
    const started=await startManualWorkout(template?.name??t('preview.emptyWorkout'),templateId??null);
    if(started.ok)router.replace({pathname:'/(tabs)/train/active',params:{id:started.value}});
    else {setError(t('preview.startError'));setBusy(false);}
  };
  const begin=async()=>{
    if(busy)return;
    const session=await readInProgressWorkout();
    if(!session.ok){setError(t('preview.checkError'));return;}
    if(session.value){setExisting(session.value);return;}
    await create();
  };
  const replaceExisting=async()=>{
    if(!existing)return;
    setBusy(true);
    const finished=await completeWorkout(existing.id,null);
    if(!finished.ok||!finished.value){setError(t('preview.finishError'));setBusy(false);return;}
    setExisting(null);
    await create();
  };
  const muscles=[...new Set((template?.exercises??[]).flatMap(e=>lookup[e.exerciseId]?.primaryMuscles??[]))] as Muscle[];
  return <Screen embedded safeBottom>
    <Header title={template?.name??t('preview.emptyWorkout')} subtitle={t('preview.subtitle')} onBack={()=>router.back()}/>
    <Card rim="train">
      {muscles.length>0&&<BodyMap primary={muscles}/>}
      <Typography tone="secondary">{template?t('preview.details',{count:template.exercises.length,seconds:template.restSec}):
        t('preview.noneYet')}</Typography>
    </Card>
    <Card title={t('preview.upNext')}>
      {template?template.exercises.map((e,i)=><ListRow key={i}
        leading={lookup[e.exerciseId]?<ExerciseThumbnail exercise={lookup[e.exerciseId]!} />:undefined}
        title={lookup[e.exerciseId]?.name??t('preview.exercise')}
        detail={t('preview.sets',{count:e.targetSets,min:e.repMin,max:e.repMax})+
          (last[e.exerciseId]?t('preview.last',{date:new Date(last[e.exerciseId] ?? '').toLocaleDateString(language==='ar'?'ar-EG-u-nu-latn':'en-US')}):t('preview.noLast'))}/>):
        <Typography tone="secondary">{t('preview.startEmptyHint')}</Typography>}
    </Card>
    {error&&<Typography>{error}</Typography>}
    <View style={{gap:8}}>
      <Button label={busy?t('preview.starting'):t('preview.start')} size="xl" variant="train"
        fullWidth disabled={busy} onPress={()=>void begin()}/>
      <Typography tone="secondary" size="small">{t('preview.notLogged')}</Typography>
    </View>
    <Sheet visible={existing!==null} title={t('preview.alreadyActive')}
      description={t('preview.conflict',{current:existing?.title??t('preview.workout'),next:template?.name??t('preview.emptyWorkout')})}
      onClose={()=>setExisting(null)}>
      <Button label={t('preview.resume',{name:existing?.title??t('preview.workout')})} variant="train" fullWidth
        onPress={()=>{if(existing)router.replace({pathname:'/(tabs)/train/active',params:{id:existing.id}});}}/>
      <Button label={t('preview.keep')} variant="secondary" fullWidth onPress={()=>setExisting(null)}/>
      <Button label={t('preview.replace',{name:template?.name??t('preview.emptyWorkout')})} variant="danger" fullWidth
        disabled={busy} onPress={()=>void replaceExisting()}/>
    </Sheet>
  </Screen>;
}
