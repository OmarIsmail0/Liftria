import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Header, ListRow, Screen, Sheet, Snackbar, Typography } from '../../../src/design/primitives';
import { getTypedSetting } from '../../../src/services/database/settings';
import { listCompletedWorkouts, readHistoryDetail, historyNumbers,
 deleteFinishedWorkout, undoFinishedWorkout, type HistorySession } from '../../../src/services/database/historyRepository';
import { storeUndo, peekUndo, takeUndo, UNDO_WINDOW_MS } from '../../../src/features/train/historyUndo';

export default function History(){
 const [sessions,setSessions]=useState<HistorySession[]>([]);
 const [volume,setVolume]=useState(0);
 const [hidden,setHidden]=useState(false);
 const [selected,setSelected]=useState<HistorySession|null>(null);
 const [undo,setUndo]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const refresh=useCallback(async()=>{
  const data=await listCompletedWorkouts();
  if(!data.ok){setError('Could not load workout history.');return;}
  setSessions(data.value);
  const n=new Date();
  const thisMonth=data.value.filter(s=>{const d=new Date(s.startedAt);
    return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear();});
  const details=await Promise.all(thisMonth.map(s=>readHistoryDetail(s.id)));
  setVolume(details.reduce((v,x)=>v+(x.ok&&x.value?historyNumbers(x.value).volume:0),0));
 },[]);
 useFocusEffect(useCallback(()=>{
  void refresh();setUndo(peekUndo()!==null);
  void getTypedSetting('hideNumbers').then(x=>{if(x.ok)setHidden(x.value);});
 },[refresh]));
 useEffect(()=>{if(!undo)return;const t=setTimeout(()=>setUndo(false),UNDO_WINDOW_MS);
  return()=>clearTimeout(t);},[undo]);
 const remove=async()=>{
  if(!selected||busy)return;setBusy(true);
  const result=await deleteFinishedWorkout(selected.id);setSelected(null);
  if(result.ok&&result.value){storeUndo(result.value);setUndo(true);await refresh();}
  else setError('Delete failed. The workout is unchanged.');
  setBusy(false);
 };
 const restore=async()=>{
  const row=takeUndo();if(!row){setUndo(false);return;}
  const result=await undoFinishedWorkout(row);
  if(!result.ok||!result.value)setError('Undo could not restore this workout.');
  await refresh();setUndo(false);
 };
 const n=new Date(),month=sessions.filter(s=>{
  const d=new Date(s.startedAt);return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear();
 }).length;
 return <Screen embedded>
  <Header title="History" subtitle="Finished sessions on this phone" onBack={()=>router.back()}/>
  <Card rim="train" title="This month">
   <Typography>{hidden?'Completed workouts':month+' workouts'}</Typography>
   <Typography tone="secondary">{hidden?'Volume from working sets':Math.round(volume).toLocaleString()+' kg volume'}</Typography>
   <Typography tone="tertiary" size="small">From your logged Liftria workouts.</Typography>
  </Card>
  <Card title="Recent workouts">
   {sessions.length===0?<Typography tone="secondary">Finish a workout to build your history.</Typography>:
    sessions.map(s=><ListRow key={s.id} title={s.title}
      detail={new Date(s.startedAt).toLocaleDateString()+(s.importer?' · '+s.importer:'')}
      onPress={()=>router.push({pathname:'/(tabs)/train/session',params:{id:s.id}})}
      suffix={<Button label="Delete" variant="ghost" onPress={()=>setSelected(s)}/>}/>)}
   {sessions.length===0&&<Button label="Start a workout" variant="train"
     onPress={()=>router.push('/(tabs)/train/preview')}/>}
  </Card>
  <Button label="Records" variant="secondary" onPress={()=>router.push('/(tabs)/train/records')}/>
  {undo&&<Snackbar message="Workout deleted. Records updated." onUndo={()=>void restore()}
    onDismiss={()=>setUndo(false)}/>}
  {error&&<Typography>{error}</Typography>}
  <Sheet visible={selected!==null} destructive title={'Delete '+(selected?.title??'workout')+'?'}
   description="Records update immediately. Undo is available for 8 seconds."
   onClose={()=>setSelected(null)}>
   <Button label="Keep workout" fullWidth onPress={()=>setSelected(null)}/>
   <Button label="Delete workout" variant="danger" disabled={busy} fullWidth onPress={()=>void remove()}/>
  </Sheet>
 </Screen>;
}
