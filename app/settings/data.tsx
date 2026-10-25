import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useTheme } from '../../src/design/ThemeProvider';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { Button, Card, Field, Header, ListRow, Screen, Sheet, Typography } from '../../src/design/primitives';
import { backOrReplace } from '../../src/navigation/back';
import { localStorageCounts, type LocalStorageCounts } from '../../src/services/database';
import { lastImportBatch, undoLastImport, type ImportBatch } from '../../src/features/import/importRepository';
import { canDeleteEverything, clearHealthCacheOnPhone, deleteEverythingOnPhone, formatLocalDatabaseSize } from '../../src/features/settings/storage';

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
  const load=useCallback(async()=>{
    const result=await localStorageCounts();
    if(result.ok)setCounts(result.value);
    const batch=await lastImportBatch();
    if(batch.ok)setImported(batch.value);
    else setMessage(t('dataStorage.readError'));
  },[t]);
  useEffect(()=>{void Promise.resolve().then(() => load());},[load]);
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
      <ListRow title={t('dataStorage.export')} detail={t('dataStorage.exportFuture')} />
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
