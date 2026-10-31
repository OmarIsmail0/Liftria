import { useCallback, useEffect, useState } from 'react';
import {formatDate, pluralForm, type TranslationKey} from '../../src/i18n';
import { router,useLocalSearchParams } from 'expo-router';
import {View} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {File,Paths} from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../src/design/ThemeProvider';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { Button, Card, Field, Header, ListRow, Screen, Sheet, Typography } from '../../src/design/primitives';
import { backOrReplace } from '../../src/navigation/back';
import { localStorageCounts,DB_SCHEMA_VERSION,type LocalStorageCounts } from '../../src/services/database';
import { lastImportBatch, undoLastImport, type ImportBatch } from '../../src/features/import/importRepository';
import { canDeleteEverything, clearHealthCacheOnPhone, deleteEverythingOnPhone, exportFileName, formatLocalDatabaseSize } from '../../src/features/settings/storage';
import {exportBackup,parseBackup,backupPreview,previewGroups,progressPhotoByteCount,BACKUP_TABLES,restoreBackup,type BackupData} from '../../src/features/settings/backup';
import {progressPhotoUsage,type ProgressPhotoUsage} from '../../src/features/progress/progressPhotoRepository';
import {importerLabel} from '../../src/features/import/importCsv';
import {workoutCsv,diaryCsv,measurementsCsv} from '../../src/features/settings/csvExport';

/** In-memory sample never written to SQLite or accepted by restoreBackup. */
const DEMO_BACKUP:BackupData={
 format:'liftria-backup',formatVersion:1,schemaVersion:DB_SCHEMA_VERSION,
 exportedAt:'2026-10-27T10:00:00Z',
 tables:{...Object.fromEntries(BACKUP_TABLES.map(table=>[table,[]])),
  sessions:[{id:'demo-session',state:'finished'}],
  sets:[{id:'demo-set'}],
  diary_entries:[{id:'demo-meal',kcal:100}],
  foods:[{id:'demo-food'}],
  water_logs:[{day:'2026-10-27',glasses:3,glass_ml:250}],
  app_settings:[{key:'demo.preview',value:'true'}]},
};
export default function DataAndStorage() {
  const {demoBackup}=useLocalSearchParams<{demoBackup?:string}>();
  const isDemo=demoBackup==='1';
  const { theme, resetLocalPreferences } = useTheme();
  const { language,resetLanguage, t } = useLanguage();
  const [counts,setCounts]=useState<LocalStorageCounts|null>(null);
  const [photoUsage,setPhotoUsage]=useState<ProgressPhotoUsage|null>(null);
  const [imported,setImported]=useState<ImportBatch|null>(null);
  const [undoVisible,setUndoVisible]=useState(false);
  const [confirmation,setConfirmation]=useState('');
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const [pendingRestore,setPendingRestore]=useState<BackupData|null>(null);
  const [restoreText,setRestoreText]=useState('');
  const previewBackup=isDemo?DEMO_BACKUP:pendingRestore;
  const groups=previewBackup?previewGroups(previewBackup).filter(g=>g.count>0||g.group==='photos'):[];
  const date=previewBackup?formatDate(language,new Date(previewBackup.exportedAt),
   {dateStyle:'medium',timeStyle:'short'}):'';
  const closePreview=()=>{
   if(busy)return;
   if(isDemo)router.replace('/settings/data');
   else{setPendingRestore(null);setRestoreText('');}
  };
  const load=useCallback(async()=>{
    const result=await localStorageCounts();
    if(result.ok)setCounts(result.value);
    const photos=await progressPhotoUsage();
    if(photos.ok)setPhotoUsage(photos.value);
    const batch=await lastImportBatch();
    if(batch.ok)setImported(batch.value);
    else setMessage(t('dataStorage.readError'));
  },[t]);
  useEffect(()=>{void Promise.resolve().then(() => load());},[load]);
  async function shareFile(name:string,content:string,kind:'json'|'csv'):Promise<void>{
    // Both platforms share the actual attachment; never transmit a file URI as text.
    const file=new File(Paths.cache,name);
    try{
      file.create({overwrite:true});
      file.write(content);
      await Sharing.shareAsync(file.uri,{
        mimeType:kind==='csv'?'text/csv':'application/json',dialogTitle:name,
      });
    }finally{
      // Backups contain private data: remove the temporary full copy even on errors.
      try{file.delete();}catch{/* File may already have been removed by the OS. */}
    }
  }
  async function exportData(kind:'backup'|'workouts'|'diary'|'measurements'){
    if(busy)return;setBusy(true);setMessage(null);
    try{
      const result=kind==='backup'?await exportBackup():
       kind==='workouts'?await workoutCsv():kind==='diary'?await diaryCsv():await measurementsCsv();
      if(!result.ok){setMessage(t('backup.failed'));return;}
      const extension=kind==='backup'?'json':'csv';
      await shareFile(exportFileName(kind),
       typeof result.value==='string'?result.value:JSON.stringify(result.value),extension==='json'?'json':'csv');
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
      try{
        const parsed=parseBackup(await file.text());
        setPendingRestore(parsed);setRestoreText('');
      }finally{
        // DocumentPicker was asked to copy to cache; do not retain a second full backup.
        try{file.delete();}catch{/* Picker can clean its own cached file. */}
      }
    }catch{setMessage(t('backup.invalid'));}
    finally{setBusy(false);}
  }
  async function confirmRestore(){
    if(isDemo||!pendingRestore||restoreText!=='RESTORE'||busy)return;
    setBusy(true);setMessage(null);
    try{
      const restored=await restoreBackup(pendingRestore,restoreText);
      if(!restored.ok){setMessage(t('backup.restoreFailed'));return;}
      setPendingRestore(null);setRestoreText('');
      // Do not reset Settings here: that would overwrite the restored theme/language.
      setMessage(t('backup.restored'));
      await load();
    }catch{setMessage(t('backup.restoreFailed'));}
    finally{setBusy(false);}
  }
  async function clearCache() {
    if(busy)return;
    setBusy(true);
    try{
      const result=await clearHealthCacheOnPhone(language);
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
        setMessage(t('dataStorage.importRemoved',{
          workouts:t((`dataStorage.importRemoved.workouts.${pluralForm(language,result.value.sessions)}`) as TranslationKey,{count:result.value.sessions}),
          exercises:t((`dataStorage.importRemoved.exercises.${pluralForm(language,result.value.custom)}`) as TranslationKey,{count:result.value.custom}),
        }));
        await load();
      }else setMessage(t('dataStorage.undoFailed'));
    }finally{setBusy(false);}
  }
  async function deleteAll() {
    if(busy||!canDeleteEverything(confirmation))return;
    setBusy(true);setMessage(null);
    try{
      const result=await deleteEverythingOnPhone(confirmation,undefined,language);
      if(!result.ok){setMessage(t(result.stage==='database'?'dataStorage.deleteDatabaseFailed':
        result.stage==='key'?'dataStorage.deleteKeyFailed':'dataStorage.deleteFilesFailed'));setOpen(false);return;}
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
        <ListRow title={t('dataStorage.database')} detail={formatLocalDatabaseSize(counts.databaseBytes, language)} />
        {photoUsage&&<ListRow title={t('dataStorage.photos')} detail={t((`progressPhotos.count.${pluralForm(language,photoUsage.count)}`) as TranslationKey,{count:photoUsage.count})+' · '+formatLocalDatabaseSize(photoUsage.bytes, language)} />}
      </> : <Typography tone="secondary">{t('dataStorage.countsLoading')}</Typography>}
      <Typography tone="secondary" size="small">{t('dataStorage.countsNote')}</Typography>
    </Card>
    <Card title={t('dataStorage.importSection')}>
      <ListRow title={t('dataStorage.importRow')}
       detail={t('dataStorage.importDetail')}
       onPress={()=>router.push('/import')}/>
      {imported&&<ListRow title={t('dataStorage.undoImport')}
       detail={t((`dataStorage.undoDetail.${pluralForm(language,imported.count)}`) as TranslationKey,{count:imported.count,source:importerLabel(imported.source)})}
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
      <Button label={t('backup.measurementsCsv')} disabled={busy} variant="secondary"
       onPress={()=>void exportData('measurements')}/>
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
    <Sheet visible={undoVisible} title={t((`dataStorage.undoTitle.${pluralForm(language,imported?.count??0)}`) as TranslationKey,{count:imported?.count??0})}
      destructive description={t('dataStorage.undoDescription')}
      onClose={()=>{if(!busy)setUndoVisible(false);}}>
      <Button label={t('dataStorage.keepImport')} fullWidth disabled={busy} onPress={()=>setUndoVisible(false)}/>
      <Button label={t('dataStorage.removeImport')} variant="danger" fullWidth disabled={busy}
        onPress={()=>void removeImport()}/>
    </Sheet>
    <Sheet visible={previewBackup!==null} destructive title={t('backup.confirmTitle')}
      description={t('backup.confirmDetail')} onClose={closePreview}>
      {previewBackup&&<>
        {isDemo&&<Typography tone="secondary">{t('backup.demoNotice')}</Typography>}
        <Typography tone="secondary">{t((`backup.preview.${pluralForm(language,backupPreview(previewBackup).total)}`) as TranslationKey,{
         schema:backupPreview(previewBackup).schemaVersion,
         count:backupPreview(previewBackup).total,date})}</Typography>
        {groups.map(g=><Typography key={g.group} tone="secondary" size="small">
          {t(('backup.group.'+g.group) as 'backup.group.workouts'|'backup.group.sets'|
           'backup.group.diary'|'backup.group.foods'|'backup.group.weights'|'backup.group.measurements'|
           'backup.group.photos'|'backup.group.water'|'backup.group.health'|'backup.group.plans'|
           'backup.group.settings')}{': '}
          {g.group==='photos'&&previewBackup
            ? t((`progressPhotos.count.${pluralForm(language,g.count)}`) as TranslationKey,{count:g.count})
              +' · '+formatLocalDatabaseSize(progressPhotoByteCount(previewBackup), language)
            : String(g.count)}
        </Typography>)}
      </>}
      {!isDemo&&<Field label={t('backup.typeRestore')} placeholder={t('backup.restoreKeyword')}
       value={restoreText} onChangeText={setRestoreText}/>}
      <Button label={t('backup.replace')} variant="danger"
       disabled={isDemo||busy||restoreText!=='RESTORE'} onPress={()=>void confirmRestore()}/>
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
