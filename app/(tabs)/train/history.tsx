import { translateWorkoutCount, formatNumber, latinDigits, weightUnitLabel } from '../../../src/i18n';
import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { importerLabel } from '../../../src/features/import/importCsv';
import { router, useFocusEffect } from 'expo-router';
import { memo, useCallback, useEffect, useState } from 'react';
import { FlatList, Platform, View } from 'react-native';
import { Button, EmptyState, Header, Screen, Sheet, Snackbar, StatBlock, Typography } from '../../../src/design/primitives';
import { PressRow } from '../../../src/features/train/PressRow';
import { useTheme } from '../../../src/design/ThemeProvider';
import { listGroupRowStyle } from '../../../src/features/train/resultCardEdges';
import { getTypedSetting } from '../../../src/services/database/settings';
import { fromKg, type WeightUnit } from '../../../src/features/train/workoutUnits';
import { listCompletedWorkouts, readWorkoutsVolume,
 deleteFinishedWorkout, undoFinishedWorkout, type HistorySession } from '../../../src/services/database/historyRepository';
import { storeUndo, peekUndo, takeUndo, UNDO_WINDOW_MS } from '../../../src/features/train/historyUndo';

const HistoryRow=memo(function HistoryRow({session,language,index,count,importedLabel,holdLabel,onOpen,onHold}:{
 session:HistorySession;language:'en'|'ar';index:number;count:number;importedLabel:(name:string)=>string;
 holdLabel:string;onOpen:(id:string)=>void;onHold:(session:HistorySession)=>void;
}){
 const {theme}=useTheme();
 return <View style={listGroupRowStyle(theme,index,count)}><PressRow title={session.title}
  detail={latinDigits(new Date(session.startedAt).toLocaleDateString(language==='ar'?'ar-EG-u-nu-latn':'en-US'))+(session.importer?' · '+importedLabel(importerLabel(session.importer)):'')}
  divider={index!==count-1} onPress={()=>onOpen(session.id)} onLongPress={()=>onHold(session)} longPressLabel={holdLabel}/></View>;
});
export default function History(){
 const {theme}=useTheme();
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
  const total=await readWorkoutsVolume(thisMonth.map(s=>s.id));
  setVolume(total.ok?total.value:0);
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
 const monthValue=hidden?t('history.completed'):month===0?translateWorkoutCount(language,0):formatNumber(language,month);
 const volumeValue=formatNumber(language,Math.round(fromKg(volume,unit)))+' '+weightUnitLabel(language,unit);
 const openSession=useCallback((id:string)=>router.push({pathname:'/(tabs)/train/session',params:{id}}),[]);
 const holdSession=useCallback((session:HistorySession)=>setSelected(session),[]);
 const importedLabel=useCallback((name:string)=>t('history.importedFrom',{name}),[t]);
 const holdLabel=t('history.holdToDelete');
 const renderRow=useCallback(({item,index}:{item:HistorySession;index:number})=>
  <HistoryRow session={item} language={language} index={index} count={sessions.length}
   importedLabel={importedLabel} holdLabel={holdLabel} onOpen={openSession} onHold={holdSession}/>,
  [sessions.length,language,importedLabel,holdLabel,openSession,holdSession]);
 return <Screen embedded scroll={false}>
  <FlatList style={{flex:1}} data={sessions} keyExtractor={item=>item.id} renderItem={renderRow}
   keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingVertical:theme.space[4]}}
   removeClippedSubviews={Platform.OS==='android'} initialNumToRender={14} maxToRenderPerBatch={10}
   windowSize={9} updateCellsBatchingPeriod={50}
   ListHeaderComponent={<View style={{gap:theme.layout.cardGap,paddingBottom:theme.layout.cardGap}}>
    <Header mode="inline" title={t('train.history')} onBack={()=>router.back()}/>
    <View style={{gap:8}}>
     <View style={{flexDirection:'row'}}>
      <View style={{flex:1}}><StatBlock value={monthValue} label={t('history.month')}/></View>
      {!hidden && month>0 ? <View style={{flex:1}}><StatBlock value={volumeValue} label={t('workout.volume')}/></View> : null}
     </View>
     <Typography tone="secondary" size="secondary">{hidden?t('history.volumeHidden'):t('history.source')}</Typography>
    </View>
    {sessions.length===0?<EmptyState title={t('history.empty')} description={t('history.source')}
      action={<View style={{alignSelf:'stretch',gap:8}}>
       <Button label={t('records.start')} variant="tonal" fullWidth
        onPress={()=>router.push('/(tabs)/train/preview')}/>
       <Button label={t('history.switchApp')} variant="plain" fullWidth
        onPress={()=>router.push('/import')}/>
      </View>}/>:null}
   </View>}
   ListFooterComponent={<View style={{gap:theme.layout.cardGap,paddingTop:sessions.length>0?theme.layout.cardGap:0}}>
    <Button label={t('train.records')} variant="plain" onPress={()=>router.push('/(tabs)/train/records')}/>
    {undo&&<Snackbar message={t('history.deleted')} onUndo={()=>void restore()}
      onDismiss={()=>setUndo(false)}/>}
    {error&&<Typography>{error}</Typography>}
   </View>}/>
  <Sheet visible={selected!==null} destructive title={t('history.confirmDelete',{name:selected?.title??t('history.workout')})}
   description={t('history.undoWindow')}
   onClose={()=>setSelected(null)}>
   <Button label={t('history.keep')} fullWidth onPress={()=>setSelected(null)}/>
   <Button label={t('history.deleteWorkout')} variant="destructive" disabled={busy} fullWidth onPress={()=>void remove()}/>
  </Sheet>
 </Screen>;
}
