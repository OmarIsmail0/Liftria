import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { formatNumber, pluralForm, type TranslationKey } from '../../../src/i18n';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Button, Card, Chip, Field, Header, ListRow, Screen, Sheet, Typography } from '../../../src/design/primitives';
import { completeWorkout, discardInProgressWorkout, readWorkout, workoutNumbers,
  type ActiveWorkout } from '../../../src/features/train/workoutData';
import { elapsedLabel } from '../../../src/features/train/restClock';
import { previousCompletedWorkout } from '../../../src/features/train/workoutStats';
import { readRecords } from '../../../src/services/database/gymRepositories';
import { estimatedOneRepMax } from '../../../src/services/database/gymMath';

export default function WorkoutSummaryScreen() {
  const {t,language}=useLanguage();
  const {id}=useLocalSearchParams<{id:string}>();
  const [workout,setWorkout]=useState<ActiveWorkout|null>(null);
  const [notes,setNotes]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [discard,setDiscard]=useState(false);
  const [previousVolume,setPreviousVolume]=useState<number|null>(null);
  const [newRecords,setNewRecords]=useState(0);
  useFocusEffect(useCallback(()=>{
    let live=true;
    void readWorkout(id).then(result=>{
      if(!live)return;
      if(result.ok&&result.value){
        const current=result.value;setWorkout(current);setNotes(current.notes??'');
        void previousCompletedWorkout(current).then(prev=>setPreviousVolume(prev.ok?prev.value:null));
        void readRecords().then(records=>{
          if(!records.ok)return;
          const count=current.exercises.filter(e=>{
            const rows=current.sets.filter(s=>s.sessionExerciseId===e.id&&s.reps>0&&s.kind==='working');
            const best=rows.reduce((n,s)=>Math.max(n,s.weight),0);
            const estimate=rows.reduce((n,s)=>Math.max(n,estimatedOneRepMax(e.type,s)??0),0);
            const prior=records.value.filter(r=>r.exerciseId===e.exerciseId);
            return rows.length>0&&((best>0&&best>Math.max(0,...prior.map(r=>r.heaviest??0)))||
              (estimate>0&&estimate>Math.max(0,...prior.map(r=>r.bestEstimatedOneRepMax??0))));
          }).length;
          setNewRecords(count);
        });
      }
    });
    return()=>{live=false};
  },[id]));
  const save=async()=>{
    if(!workout||busy)return;setBusy(true);
    const result=await completeWorkout(workout.id,notes.trim()||null);
    if(result.ok&&result.value)router.replace('/(tabs)/train');
    else {setError(t('summary.saveError'));setBusy(false);}
  };
  const discardNow=async()=>{
    if(!workout||busy)return;setBusy(true);
    const result=await discardInProgressWorkout(workout.id);
    if(result.ok&&result.value)router.replace('/(tabs)/train');
    else{setError(t('summary.discardError'));setBusy(false);}
  };
  if(!workout)return <Screen embedded safeBottom>
    <Header title={t('summary.finish')} onBack={()=>router.back()}/>
    <Typography>{t('summary.loading')}</Typography>
  </Screen>;
  const stats=workoutNumbers(workout);
  const change=previousVolume&&previousVolume>0?
    (stats.volume-previousVolume)/previousVolume*100:null;
  const comparison=change===null||Math.abs(change)<1?t('summary.same'):
    (change>0?'+':'')+t('summary.comparison',{pct:formatNumber(language,Math.round(change))});
  return <Screen embedded safeBottom>
    <Header title={t('summary.title')} subtitle={workout.title} onBack={()=>router.back()}/>
    <Card rim="train" title={t('summary.complete')}>
      <ListRow title={t('summary.duration')} detail={elapsedLabel(workout.startedAt)}/>
      <ListRow title={t('summary.workingSets')} detail={formatNumber(language,stats.sets)}/>
      <ListRow title={t('summary.volume')} detail={t('summary.volumeValue',{amount:formatNumber(language,Math.round(stats.volume))})}/>
      <Typography tone="secondary">{t('summary.trainingVolume',{comparison})}</Typography>
      <Typography tone="secondary">{stats.pending?t((`summary.pending.${pluralForm(language,stats.pending)}`) as TranslationKey,{count:stats.pending}):t('summary.allLogged')}</Typography>
    </Card>
    <Card title={t('summary.records')}>
      {newRecords>0?<Typography bold>{t((`summary.records.${pluralForm(language,newRecords)}`) as TranslationKey,{count:newRecords})}</Typography>:
        <Typography tone="secondary">{t('summary.noRecords')}</Typography>}
      <Typography tone="secondary" size="small">{t('summary.recordNote')}</Typography>
    </Card>
    <Card title={t('summary.wearables')}>
      <ListRow title={t('summary.heart')} suffix={<Chip kind="pending" label={t('chips.pending')}/>}
        detail={t('summary.noWatch')}/>
      <ListRow title={t('summary.calories')} suffix={<Chip kind="pending" label={t("chips.pending")}/>}
        detail={t('summary.noCalories')}/>
    </Card>
    <Card title={t('summary.notes')}>
      <Field label={t('summary.notesOptional')} value={notes} onChangeText={setNotes} multiline/>
    </Card>
    {error&&<Typography>{error}</Typography>}
    <Button label={busy?t('summary.saving'):t('summary.save')} size="xl" variant="train"
      fullWidth disabled={busy} onPress={()=>void save()}/>
    <Button label={t('summary.back')} variant="secondary" fullWidth
      disabled={busy} onPress={()=>router.back()}/>
    <Button label={t('summary.discard')} variant="danger" disabled={busy}
      onPress={()=>setDiscard(true)}/>
    <Sheet visible={discard} destructive title={t('summary.discardTitle')}
      description={t((`summary.discardDescription.${pluralForm(language,stats.sets)}`) as TranslationKey,{count:stats.sets})}
      onClose={()=>setDiscard(false)}>
      <Button label={t('summary.keep')} fullWidth onPress={()=>setDiscard(false)}/>
      <Button label={t('summary.discard')} variant="danger" fullWidth disabled={busy}
        onPress={()=>void discardNow()}/>
    </Sheet>
  </Screen>;
}
