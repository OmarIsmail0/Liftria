import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import {Platform,Share,View} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {File,Paths} from 'expo-file-system';
import { useTheme } from '../../src/design/ThemeProvider';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { Button, Card, Field, Header, ListRow, Screen, Sheet, Typography } from '../../src/design/primitives';
import { backOrReplace } from '../../src/navigation/back';
import { localStorageCounts, type LocalStorageCounts } from '../../src/services/database';
import { lastImportBatch, undoLastImport, type ImportBatch } from '../../src/features/import/importRepository';
import { canDeleteEverything, clearHealthCacheOnPhone, deleteEverythingOnPhone, formatLocalDatabaseSize } from '../../src/features/settings/storage';
import {exportBackup,parseBackup,backupPreview,restoreBackup,type BackupData} from '../../src/features/settings/backup';
import {workoutCsv,diaryCsv} from '../../src/features/settings/csvExport';

export default function DataAndStorage() {
  const { theme, resetLocalPreferences } = useTheme();
  const { resetLanguage, t } = useLanguage();
  const [counts,setCounts]=useState<LocalStorageCounts|null>(null);
  const [imported,setImported]=useState<ImportBatch|null>(null);
  const [undoVisible,setUndoVisible]=useState(false);
  const [confirmation,setConfirmation]=useState('');
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const [pendingRestore,setPendingRestore]=useState<BackupData|null>(null);
  const [restoreText,setRestoreText]=useState('');
  const load=useCallback(async()=>{
    const result=await localStorageCounts();
    if(result.ok)setCounts(result.value);
    const batch=await lastImportBatch();
    if(batch.ok)setImported(batch.value);
    else setMessage(t('dataStorage.readError'));
  },[t]);
  useEffect(()=>{void Promise.resolve().then(() => load());},[load]);
  async function shareFile(name:string,content:string,kind:'json'|'csv'){
    // A user action always precedes writing or opening a local backup.
    const file=new File(Paths.cache,name);
    file.create({overwrite:true});
    await file.write(content);
    // Native preview lets the user explicitly save/copy the file. iOS additionally
    // supports a URI-backed share sheet. Android share attachment requires Expo Sharing
    // (dependency approval requested in PR; never fake a completed share).
    if(Platform.OS==='ios'){
      await Share.share({url:file.uri,title:name});
    }else{
      await file.preview({title:name,mimeType:kind==='csv'?'text/csv':'application/json'});
    }
  }
  async function exportData(kind:'backup'|'workouts'|'diary'){
    if(busy)return;setBusy(true);setMessage(null);
    try{
      const result=kind==='backup'?await exportBackup():
       kind==='workouts'?await workoutCsv():await diaryCsv();
      if(!result.ok){setMessage(t('backup.failed'));return;}
      const extension=kind==='backup'?'json':'csv';
      const date=new Date().toISOString().slice(0,10);
      await shareFile('liftria-'+kind+'-'+date+'.'+extension,
       typeof result.value==='string'?result.value:JSON.stringify(result.value),'json'===extension?'json':'csv');
      setMessage(t('backup.ready'));
    }catch{setMessage(t('backup.shareFailed'));}
    finally{setBusy(false);}
  }
  async function chooseBackup(){
    if(busy)return;setBusy(true);setMessage(null);
    try{
      const result=await DocumentPicker.getDocumentAsync({type:'application/json',copyToCacheDirectory:true});
      if(result.canceled)return;
      const asset=result.assets[0];
      if(!asset)throw new Error('Missing picked document');
      const file=new File(asset.uri);
      const parsed=parseBackup(await file.text());
      setPendingRestore(parsed);setRestoreText('');
    }catch{setMessage(t('backup.invalid'));}
    finally{setBusy(false);}
  }
  async function confirmRestore(){
    if(!pendingRestore||restoreText!=='RESTORE'||busy)return;
    setBusy(true);setMessage(null);
    try{
      const restored=await restoreBackup(pendingRestore,restoreText);
      if(!restored.ok){setMessage(t('backup.restoreFailed'));return;}
      setPendingRestore(null);setRestoreText('');
      // Re-read persistent preferences, counters, and visible screens after restoration.
      resetLocalPreferences();resetLanguage();
      setMessage(t('backup.restored'));
      await load();
    }catch{setMessage(t('backup.restoreFailed'));}
    finally{setBusy(false);}
  }
  async function clearCache() {
    if(busy)return;
    setBusy(true);
    try{
      const result=await clearHealthCacheOnPhone();
      setMessage(t(result.ok?'dataStorage.cacheCleared':'dataStorage.cacheFailed'));
      if(result.ok)await load();
    }catch{setMessage(t('dataStorage.cacheFailed'))}
    finally{setBusy(false);}
  }
  async function removeImport(){
    if(busy||!imported)return;
    setBusy(true);
    try{
      const result=await undoLastImport();
      setUndoVisible(false);
      if(result.ok&&result.value){
        setMessage(t('dataStorage.importRemoved',{workouts:result.value.sessions,exercises:result.value.custom}));
        await load();
      }else setMessage(t('dataStorage.undoFailed'));
    }finally{setBusy(false);}
  }
  async function deleteAll() {
    if(busy||!canDeleteEverything(confirmation))return;
    setBusy(true);setMessage(null);
    try{
      const result=await deleteEverythingOnPhone(confirmation);
      if(!result.ok){setMessage(t(result.stage==='database'?'dataStorage.deleteDatabaseFailed':'dataStorage.deleteKeyFailed'));setOpen(false);return;}
      // All app-owned Phase 2 data and the saved key are gone. Return to fresh onboarding.
      setOpen(false);setConfirmation('');
      resetLocalPreferences();
      resetLanguage();
      // Remove the Settings and (tabs) back stacks before routing to fresh onboarding.
      router.dismissAll();
      router.replace({pathname:'/onboarding/[step]',params:{step:'welcome'}});
    }catch{setMessage(t('dataStorage.deleteFailed'));setOpen(false);}
    finally{setBusy(false);}
  }
  return <Screen>
    <Header title={t('dataStorage.title')} subtitle={t('dataStorage.subtitle')}
      onBack={()=>backOrReplace(router,'/settings')} />
    <Card title={t('dataStorage.counts')}>
      {counts ? <>
        <ListRow title={t('dataStorage.workouts')} detail={String(counts.workouts)} />
        <ListRow title={t('dataStorage.meals')} detail={t('dataStorage.testEntries',{count:counts.meals})} />
        <ListRow title={t('dataStorage.health')} detail={String(counts.healthSamples+counts.healthAggregates)} />
        <ListRow title={t('dataStorage.targets')} detail={String(counts.targetVersions)} />
        <ListRow title={t('dataStorage.profiles')} detail={String(counts.profiles)} />
        <ListRow title={t('dataStorage.database')} detail={formatLocalDatabaseSize(counts.databaseBytes)} />
      </> : <Typography tone="secondary">{t('dataStorage.countsLoading')}</Typography>}
      <Typography tone="secondary" size="small">{t('dataStorage.countsNote')}</Typography>
    </Card>
    <Card title={t('dataStorage.importSection')}>
      <ListRow title={t('dataStorage.importRow')}
       detail={t('dataStorage.importDetail')}
       onPress={()=>router.push('/import')}/>
      {imported&&<ListRow title={t('dataStorage.undoImport')}
       detail={t('dataStorage.undoDetail',{count:imported.count,source:imported.source})}
       onPress={()=>setUndoVisible(true)}/>}
    </Card>
    <Card title={t('dataStorage.cacheTitle')}>
      <Typography tone="secondary">{t('dataStorage.cacheNote')}</Typography>
      <Button label={busy?t('dataStorage.working'):t('dataStorage.clearHealth')} variant="secondary"
        disabled={busy} onPress={()=>void clearCache()} />
      <Button label={t('backup.export')} disabled={busy} variant="secondary"
       onPress={()=>void exportData('backup')}/>
      <Button label={t('backup.restore')} disabled={busy} variant="secondary"
       onPress={()=>void chooseBackup()}/>
      <Button label={t('backup.workoutsCsv')} disabled={busy} variant="secondary"
       onPress={()=>void exportData('workouts')}/>
      <Button label={t('backup.diaryCsv')} disabled={busy} variant="secondary"
       onPress={()=>void exportData('diary')}/>
      <Typography tone="secondary" size="small">{t('dataStorage.backupNote')}</Typography>
    </Card>
    <Card title={t('dataStorage.deleteTitle')}>
      <Typography tone="secondary">{t('dataStorage.deleteNote')}</Typography>
      <Typography tone="secondary" size="small">{t('dataStorage.deletePrivacy')}</Typography>
      <Button label={t('dataStorage.deleteTitle')} variant="danger" disabled={busy} onPress={()=>setOpen(true)} />
    </Card>
    {message && <View accessibilityRole="alert" style={{paddingVertical:theme.space[2]}}>
      <Typography tone="secondary">ⓘ {message}</Typography>
    </View>}
    <Sheet visible={undoVisible} title={t('dataStorage.undoTitle',{count:imported?.count??0})}
      destructive description={t('dataStorage.undoDescription')}
      onClose={()=>{if(!busy)setUndoVisible(false);}}>
      <Button label={t('dataStorage.keepImport')} fullWidth disabled={busy} onPress={()=>setUndoVisible(false)}/>
      <Button label={t('dataStorage.removeImport')} variant="danger" fullWidth disabled={busy}
        onPress={()=>void removeImport()}/>
    </Sheet>
    <Sheet visible={pendingRestore!==null} destructive title={t('backup.confirmTitle')}
      description={t('backup.confirmDetail')} onClose={()=>{if(!busy)setPendingRestore(null);}}>
      {pendingRestore&&<>
        <Typography tone="secondary">{t('backup.preview',{schema:backupPreview(pendingRestore).schemaVersion,
         count:backupPreview(pendingRestore).total,date:backupPreview(pendingRestore).exportedAt})}</Typography>
        {backupPreview(pendingRestore).counts.filter(x=>x.count>0).map(x=>
         <Typography key={x.table} tone="secondary" size="small">{x.table}: {x.count}</Typography>)}
      </>}
      <Field label={t('backup.typeRestore')} placeholder="RESTORE"
       value={restoreText} onChangeText={setRestoreText}/>
      <Button label={t('backup.cancel')} variant="secondary" disabled={busy}
       onPress={()=>{setPendingRestore(null);setRestoreText('');}}/>
      <Button label={t('backup.replace')} variant="danger" disabled={busy||restoreText!=='RESTORE'}
       onPress={()=>void confirmRestore()}/>
    </Sheet>
    <Sheet visible={open} destructive title={t('dataStorage.deleteSheet')}
      description={t('dataStorage.deleteDescription')}
      onClose={()=>{if(!busy){setOpen(false);setConfirmation('')}}}>
      <Field label={t('dataStorage.typeDelete')} value={confirmation} onChangeText={setConfirmation}
        placeholder="DELETE" />
      <Button label={t('dataStorage.keepData')} fullWidth disabled={busy}
        onPress={()=>{setOpen(false);setConfirmation('')}} />
      <Button label={busy?t('dataStorage.deleting'):t('dataStorage.deleteEverything')} fullWidth variant="danger"
        disabled={busy||!canDeleteEverything(confirmation)} onPress={()=>void deleteAll()} />
    </Sheet>
  </Screen>;
}
