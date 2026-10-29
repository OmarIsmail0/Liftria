import { translateWorkoutCount, formatNumber, latinDigits } from '../../../src/i18n';
import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { importerLabel } from '../../../src/features/import/importCsv';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Header, ListRow, Screen, Sheet, Snackbar, Typography } from '../../../src/design/primitives';
import { getTypedSetting } from '../../../src/services/database/settings';
import { fromKg, type WeightUnit } from '../../../src/features/train/workoutUnits';
import { listCompletedWorkouts, readHistoryDetail, historyNumbers,
 deleteFinishedWorkout, undoFinishedWorkout, type HistorySession } from '../../../src/services/database/historyRepository';
import { storeUndo, peekUndo, takeUndo, UNDO_WINDOW_MS } from '../../../src/features/train/historyUndo';

export default function History(){
 const {t,language}=useLanguage();
 const [sessions,setSessions]=useState<HistorySession[]>([]);
 const [volume,setVolume]=useState(0);
 const [hidden,setHidden]=useState(false);
 const [unit,setUnit]=useState<WeightUnit>('kg');
 const [selected,setSelected]=useState<HistorySession|null>(null);
 const [undo,setUndo]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const refresh=useCallback(async()=>{
  const data=await listCompletedWorkouts();
  if(!data.ok){setError(t('history.loadError'));return;}
  setSessions(data.value);
  const n=new Date();
  const thisMonth=data.value.filter(s=>{const d=new Date(s.startedAt);
    return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear();});
  const details=await Promise.all(thisMonth.map(s=>readHistoryDetail(s.id)));
  setVolume(details.reduce((v,x)=>v+(x.ok&&x.value?historyNumbers(x.value).volume:0),0));
 },[t]);
 useFocusEffect(useCallback(()=>{
  void refresh();setUndo(peekUndo()!==null);
  void getTypedSetting('hideNumbers').then(x=>{if(x.ok)setHidden(x.value);});
  void getTypedSetting('units.weight').then(x=>{if(x.ok)setUnit(x.value);});
 },[refresh]));
 useEffect(()=>{if(!undo)return;const t=setTimeout(()=>setUndo(false),UNDO_WINDOW_MS);
  return()=>clearTimeout(t);},[undo]);
 const remove=async()=>{
  if(!selected||busy)return;setBusy(true);
  const result=await deleteFinishedWorkout(selected.id);setSelected(null);
  if(result.ok&&result.value){storeUndo(result.value);setUndo(true);await refresh();}
  else setError(t('history.deleteError'));
  setBusy(false);
 };
 const restore=async()=>{
  const row=takeUndo();if(!row){setUndo(false);return;}
  const result=await undoFinishedWorkout(row);
  if(!result.ok||!result.value)setError(t('history.restoreError'));
  await refresh();setUndo(false);
 };
 const n=new Date(),month=sessions.filter(s=>{
  const d=new Date(s.startedAt);return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear();
 }).length;
 return <Screen embedded>
  <Header title={t('train.history')} subtitle={t('history.subtitle')} onBack={()=>router.back()}/>
  <Card rim="train" title={t('history.month')}>
   <Typography>{hidden?t('history.completed'):translateWorkoutCount(language,month)}</Typography>
   <Typography tone="secondary">{hidden?t('history.volumeHidden'):t('history.volumeValue',{value:formatNumber(language,Math.round(fromKg(volume,unit))),unit})}</Typography>
   <Typography tone="tertiary" size="small">{t('history.source')}</Typography>
  </Card>
  <Card title={t('train.recent')}>
   {sessions.length===0?<Typography tone="secondary">{t('history.empty')}</Typography>:
    sessions.map(s=><ListRow key={s.id} title={s.title}
      detail={latinDigits(new Date(s.startedAt).toLocaleDateString(language==='ar'?'ar-EG-u-nu-latn':'en-US'))+(s.importer?' · '+t('history.importedFrom',{name:importerLabel(s.importer)}):'')}
      onPress={()=>router.push({pathname:'/(tabs)/train/session',params:{id:s.id}})}
      suffix={<Button label={t('history.delete')} variant="ghost" onPress={()=>setSelected(s)}/>}/>)}
   {sessions.length===0&&<>
    <Button label={t('records.start')} variant="train"
     onPress={()=>router.push('/(tabs)/train/preview')}/>
    <Button label={t('history.switchApp')} variant="secondary"
     onPress={()=>router.push('/import')}/>
   </>}
  </Card>
  <Button label={t('train.records')} variant="secondary" onPress={()=>router.push('/(tabs)/train/records')}/>
  {undo&&<Snackbar message={t('history.deleted')} onUndo={()=>void restore()}
    onDismiss={()=>setUndo(false)}/>}
  {error&&<Typography>{error}</Typography>}
  <Sheet visible={selected!==null} destructive title={t('history.confirmDelete',{name:selected?.title??t('history.workout')})}
   description={t('history.undoWindow')}
   onClose={()=>setSelected(null)}>
   <Button label={t('history.keep')} fullWidth onPress={()=>setSelected(null)}/>
   <Button label={t('history.deleteWorkout')} variant="danger" disabled={busy} fullWidth onPress={()=>void remove()}/>
  </Sheet>
 </Screen>;
}
