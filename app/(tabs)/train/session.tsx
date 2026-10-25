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
  }else setError('Could not load this finished workout.');
  const latest=await readRecords();
  if(latest.ok)setRecords(latest.value);
 },[id]);
 useFocusEffect(useCallback(()=>{void refresh();
  void getTypedSetting('units.weight').then(x=>{if(x.ok)setUnit(x.value);});
  void getTypedSetting('units.smallPlates').then(x=>{if(x.ok)setSmallPlates(x.value);});
 },[refresh]));
 const change=(i:number,patch:Partial<SetEdit>)=>setDraft(rows=>rows.map((r,n)=>n===i?{...r,...patch}:r));
 const save=async()=>{
  if(busy)return;setBusy(true);
  const result=await saveFinishedWorkout(id,title,notes||null,draft);
  if(result.ok&&result.value){setEditing(false);await refresh();}
  else setError('Could not save changes; the previous workout is unchanged.');
  setBusy(false);
 };
 const deletePrompt=async()=>{
  const result=await recordsChangedIfDeleted(id);
  if(!result.ok){setError('Could not check affected records. Retry.');return;}
  setChanged(result.value);setConfirm(true);
 };
 const remove=async()=>{
  if(busy)return;setBusy(true);
  const result=await deleteFinishedWorkout(id);
  setBusy(false);
  if(result.ok&&result.value){storeUndo(result.value);router.replace('/(tabs)/train/history');}
  else setError('Could not delete the workout.');
 };
 if(!data)return <Screen embedded><Header title="Workout detail" onBack={()=>router.back()}/>
  <Typography>{error??'Loading…'}</Typography></Screen>;
 const stats=historyNumbers(data);
 const duration=Math.max(0,Date.parse(data.session.endedAt)-Date.parse(data.session.startedAt));
 return <Screen embedded>
  <Header title={editing?'Editing':data.session.title}
   subtitle={new Date(data.session.startedAt).toLocaleString()}
   onBack={()=>{if(editing){setEditing(false);void refresh();}else router.back();}}
   right={<Button label={editing?'Cancel':'Edit'} variant="secondary"
     onPress={()=>{if(editing)void refresh();setEditing(v=>!v);}}/>}/>
  {editing&&<Card rim="train"><Typography bold>Editing · changes are not saved yet.</Typography>
   <Field label="Workout name" value={title} onChangeText={setTitle}/>
   <Field label="Notes" value={notes} onChangeText={setNotes} multiline/>
  </Card>}
  <Card rim="train" title="Session statistics">
   <ListRow title="Start" detail={new Date(data.session.startedAt).toLocaleTimeString()}/>
   <ListRow title="Duration" detail={Math.round(duration/60000)+' min'}/>
   <ListRow title="Working sets" detail={String(stats.sets)}/>
   <ListRow title="Volume" detail={Math.round(fromKg(stats.volume,unit)).toLocaleString()+' '+unit}/>
   {data.session.importer&&<Typography tone="secondary">Imported from {data.session.importer}</Typography>}
  </Card>
  {data.exercises.map(e=><Card key={e.id} title={e.name}>
   {editing?draft.filter(s=>s.sessionExerciseId===e.id).map(s=>{
    const i=draft.indexOf(s);
    return <View key={s.id??e.id+':'+i} style={{gap:8,paddingBottom:12}}>
     <Typography tone="secondary" size="small">{s.kind==='warm-up'?'W':'Set '+(s.position+1)}{s.side?' '+s.side:''}</Typography>
     <GymStepper label="Weight" value={fromKg(s.weight,unit)} unit={unit}
       step={fromKg(workoutWeightStep(e.type,unit,smallPlates),unit)}
       onChange={v=>change(i,{weight:toKg(v,unit)})}/>
     <GymStepper label="Reps" value={s.reps} onChange={v=>change(i,{reps:v})}/>
     <Button label="Remove set" variant="secondary" onPress={()=>setDraft(rows=>rows.filter((_,n)=>n!==i))}/>
    </View>;
   }):e.sets.map(s=>{
    const r=records.find(x=>x.exerciseId===e.exerciseId&&x.side===s.side);
    const pr=s.kind==='working'&&s.reps>0&&!!r&&(
      (r.heaviestSessionId===id&&r.heaviest!==null&&s.weight===r.heaviest)||
      (r.lowestAssistanceSessionId===id&&r.lowestAssistance!==null&&s.weight===r.lowestAssistance)||
      (r.maxRepsSessionId===id&&s.reps===r.maxReps)||
      (r.bestEstimatedOneRepMaxSessionId===id&&r.bestEstimatedOneRepMax!==null&&
        estimatedOneRepMax(e.type,s)===r.bestEstimatedOneRepMax));
    return <ListRow key={s.id} title={s.kind==='warm-up'?'W':'Set '+(s.position+1)}
      detail={displayWeight(s.weight,e.type,unit)+' × '+s.reps+(s.side?' · '+s.side:'')}
      suffix={pr?<Typography bold size="small" tone="secondary">Record</Typography>:undefined}/>;
   })}
   {editing&&<Button label="Add working set" variant="secondary" onPress={()=>{
    const used=draft.filter(s=>s.sessionExerciseId===e.id);
    const next=Math.max(-1,...used.filter(s=>s.kind==='working').map(s=>s.position))+1;
    setDraft(old=>[...old,...(e.unilateral?(['L','R'] as const):([null] as const)).map(side=>({
     sessionExerciseId:e.id,position:next,side,weight:0,reps:1,kind:'working' as const,
    }))]);
   }}/>}
  </Card>)}
  {error&&<Typography>{error}</Typography>}
  {editing?<View style={{gap:8}}>
   <Button label="Save changes" variant="train" size="xl" fullWidth disabled={busy||!title.trim()} onPress={()=>void save()}/>
   <Button label="Cancel" variant="secondary" fullWidth onPress={()=>{setEditing(false);void refresh();}}/>
  </View>:<Button label="Delete workout" variant="danger" onPress={()=>void deletePrompt()}/>}
  <Sheet visible={confirm} destructive title="Delete this workout?"
   description={changed.length?'Records that will change: '+changed.join(', ')+'. Undo for 8 seconds.':
    'Its sets will be removed and records recalculated. Undo is available for 8 seconds.'}
   onClose={()=>setConfirm(false)}>
   <Button label="Keep workout" fullWidth onPress={()=>setConfirm(false)}/>
   <Button label="Delete workout" variant="danger" fullWidth disabled={busy} onPress={()=>void remove()}/>
  </Sheet>
 </Screen>;
}
