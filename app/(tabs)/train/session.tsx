import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { formatNumber } from '../../../src/i18n';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Field, Header, ListRow, Screen, Sheet, Typography } from '../../../src/design/primitives';
import { getTypedSetting } from '../../../src/services/database/settings';
import { GymStepper } from '../../../src/features/train/GymStepper';
import { displayWeight, fromKg, toKg, workoutWeightStep, type WeightUnit } from '../../../src/features/train/workoutUnits';
import { readHistoryDetail, historyNumbers, recordsChangedIfDeleted,
 saveFinishedWorkout, deleteFinishedWorkout, type HistoryDetail, type SetEdit } from '../../../src/services/database/historyRepository';
import { storeUndo } from '../../../src/features/train/historyUndo';
import { readRecords } from '../../../src/services/database/gymRepositories';
import { estimatedOneRepMax, type ExerciseRecord } from '../../../src/services/database/gymMath';
export default function SessionDetail(){
 const {t,language}=useLanguage();
 const {id}=useLocalSearchParams<{id:string}>();
 const [data,setData]=useState<HistoryDetail|null>(null);
 const [records,setRecords]=useState<ExerciseRecord[]>([]);
 const [draft,setDraft]=useState<SetEdit[]>([]);
 const [title,setTitle]=useState('');
 const [notes,setNotes]=useState('');
 const [editing,setEditing]=useState(false);
 const [confirm,setConfirm]=useState(false);
 const [changed,setChanged]=useState<string[]>([]);
 const [unit,setUnit]=useState<WeightUnit>('kg');
 const [smallPlates,setSmallPlates]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const refresh=useCallback(async()=>{
  const result=await readHistoryDetail(id);
  if(result.ok&&result.value){
   setData(result.value);setTitle(result.value.session.title);setNotes(result.value.session.notes??'');
   setDraft(result.value.exercises.flatMap(e=>e.sets.map(s=>({
    id:s.id,sessionExerciseId:s.sessionExerciseId,position:s.position,kind:s.kind,side:s.side,
    weight:s.weight,reps:s.reps,
   }))));
  }else setError(t('sessionDetail.loadError'));
  const latest=await readRecords();
  if(latest.ok)setRecords(latest.value);
 },[id,t]);
 useFocusEffect(useCallback(()=>{void refresh();
  void getTypedSetting('units.weight').then(x=>{if(x.ok)setUnit(x.value);});
  void getTypedSetting('units.smallPlates').then(x=>{if(x.ok)setSmallPlates(x.value);});
 },[refresh]));
 const change=(i:number,patch:Partial<SetEdit>)=>setDraft(rows=>rows.map((r,n)=>n===i?{...r,...patch}:r));
 const save=async()=>{
  if(busy)return;setBusy(true);
  const result=await saveFinishedWorkout(id,title,notes||null,draft);
  if(result.ok&&result.value){setEditing(false);await refresh();}
  else setError(t('sessionDetail.saveError'));
  setBusy(false);
 };
 const deletePrompt=async()=>{
  const result=await recordsChangedIfDeleted(id);
  if(!result.ok){setError(t('sessionDetail.recordsError'));return;}
  setChanged(result.value);setConfirm(true);
 };
 const remove=async()=>{
  if(busy)return;setBusy(true);
  const result=await deleteFinishedWorkout(id);
  setBusy(false);
  if(result.ok&&result.value){storeUndo(result.value);router.replace('/(tabs)/train/history');}
  else setError(t('sessionDetail.deleteError'));
 };
 if(!data)return <Screen embedded><Header title={t('sessionDetail.loadingTitle')} onBack={()=>router.back()}/>
  <Typography>{error??t('sessionDetail.loading')}</Typography></Screen>;
 const stats=historyNumbers(data);
 const duration=Math.max(0,Date.parse(data.session.endedAt)-Date.parse(data.session.startedAt));
 return <Screen embedded>
  <Header title={editing?t('sessionDetail.editing'):data.session.title}
   subtitle={new Date(data.session.startedAt).toLocaleString(language==='ar'?'ar-EG-u-nu-latn':'en-US')}
   onBack={()=>{if(editing){setEditing(false);void refresh();}else router.back();}}
   right={<Button label={editing?t('sessionDetail.cancel'):t('sessionDetail.edit')} variant="secondary"
     onPress={()=>{if(editing)void refresh();setEditing(v=>!v);}}/>}/>
  {editing&&<Card rim="train"><Typography bold>{t('sessionDetail.editUnsaved')}</Typography>
   <Field label={t('sessionDetail.workoutName')} value={title} onChangeText={setTitle}/>
   <Field label={t('sessionDetail.notes')} value={notes} onChangeText={setNotes} multiline/>
  </Card>}
  <Card rim="train" title={t('sessionDetail.statistics')}>
   <ListRow title={t('sessionDetail.start')} detail={new Date(data.session.startedAt).toLocaleTimeString(language==='ar'?'ar-EG-u-nu-latn':'en-US')}/>
   <ListRow title={t('sessionDetail.duration')} detail={t('sessionDetail.minute',{count:Math.round(duration/60000)})}/>
   <ListRow title={t('sessionDetail.workingSets')} detail={formatNumber(language,stats.sets)}/>
   <ListRow title={t('sessionDetail.volume')} detail={formatNumber(language,Math.round(fromKg(stats.volume,unit)))+' '+unit}/>
   {data.session.importer&&<Typography tone="secondary">{t('sessionDetail.importedFrom',{name:data.session.importer})}
    {data.session.importedAt?t('sessionDetail.importedAt',{date:new Date(data.session.importedAt).toLocaleDateString(language==='ar'?'ar-EG-u-nu-latn':'en-US')}):''}
   </Typography>}
  </Card>
  {data.exercises.map(e=><Card key={e.id} title={e.name}>
   {editing?draft.filter(s=>s.sessionExerciseId===e.id).map(s=>{
    const i=draft.indexOf(s);
    return <View key={s.id??e.id+':'+i} style={{gap:8,paddingBottom:12}}>
     <Typography tone="secondary" size="small">{s.kind==='warm-up'?t('sessionDetail.warmup'):t('sessionDetail.set',{count:s.position+1})}{s.side?' '+s.side:''}</Typography>
     <GymStepper label={t('sessionDetail.weight')} value={fromKg(s.weight,unit)} unit={unit}
       step={fromKg(workoutWeightStep(e.type,unit,smallPlates),unit)}
       onChange={v=>change(i,{weight:toKg(v,unit)})}/>
     <GymStepper label={t('sessionDetail.reps')} value={s.reps} onChange={v=>change(i,{reps:v})}/>
     <Button label={t('sessionDetail.removeSet')} variant="secondary" onPress={()=>setDraft(rows=>rows.filter((_,n)=>n!==i))}/>
    </View>;
   }):e.sets.map(s=>{
    const r=records.find(x=>x.exerciseId===e.exerciseId&&x.side===s.side);
    const pr=s.kind==='working'&&s.reps>0&&!!r&&(
      (r.heaviestSessionId===id&&r.heaviest!==null&&s.weight===r.heaviest)||
      (r.lowestAssistanceSessionId===id&&r.lowestAssistance!==null&&s.weight===r.lowestAssistance)||
      (r.maxRepsSessionId===id&&s.reps===r.maxReps)||
      (r.bestEstimatedOneRepMaxSessionId===id&&r.bestEstimatedOneRepMax!==null&&
        estimatedOneRepMax(e.type,s)===r.bestEstimatedOneRepMax));
    return <ListRow key={s.id} title={s.kind==='warm-up'?t('sessionDetail.warmup'):t('sessionDetail.set',{count:s.position+1})}
      detail={displayWeight(s.weight,e.type,unit)+' × '+s.reps+(s.side?' · '+s.side:'')}
      suffix={pr?<Typography bold size="small" tone="secondary">{t('sessionDetail.record')}</Typography>:undefined}/>;
   })}
   {editing&&<Button label={t('sessionDetail.addSet')} variant="secondary" onPress={()=>{
    const used=draft.filter(s=>s.sessionExerciseId===e.id);
    const next=Math.max(-1,...used.filter(s=>s.kind==='working').map(s=>s.position))+1;
    setDraft(old=>[...old,...(e.unilateral?(['L','R'] as const):([null] as const)).map(side=>({
     sessionExerciseId:e.id,position:next,side,weight:0,reps:1,kind:'working' as const,
    }))]);
   }}/>}
  </Card>)}
  {error&&<Typography>{error}</Typography>}
  {editing?<View style={{gap:8}}>
   <Button label={t('sessionDetail.save')} variant="train" size="xl" fullWidth disabled={busy||!title.trim()} onPress={()=>void save()}/>
   <Button label={t('sessionDetail.cancel')} variant="secondary" fullWidth onPress={()=>{setEditing(false);void refresh();}}/>
  </View>:<Button label={t('sessionDetail.delete')} variant="danger" onPress={()=>void deletePrompt()}/>}
  <Sheet visible={confirm} destructive title={t('sessionDetail.deleteTitle')}
   description={changed.length?t('sessionDetail.changed',{names:changed.join(', ')}):t('sessionDetail.deleteDesc')}
   onClose={()=>setConfirm(false)}>
   <Button label={t('sessionDetail.keep')} fullWidth onPress={()=>setConfirm(false)}/>
   <Button label={t('sessionDetail.delete')} variant="danger" fullWidth disabled={busy} onPress={()=>void remove()}/>
  </Sheet>
 </Screen>;
}
