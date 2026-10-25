import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useTheme } from '../../src/design/ThemeProvider';
import { Button, Card, Field, Header, ListRow, Screen, Sheet, Typography } from '../../src/design/primitives';
import { backOrReplace } from '../../src/navigation/back';
import { localStorageCounts, type LocalStorageCounts } from '../../src/services/database';
import { lastImportBatch, undoLastImport, type ImportBatch } from '../../src/features/import/importRepository';
import { canDeleteEverything, clearHealthCacheOnPhone, deleteEverythingOnPhone, formatLocalDatabaseSize } from '../../src/features/settings/storage';

export default function DataAndStorage() {
  const { theme, resetLocalPreferences } = useTheme();
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
    else setMessage('Could not read storage counts from your phone.');
  },[]);
  useEffect(()=>{void Promise.resolve().then(() => load());},[load]);
  async function clearCache() {
    if(busy)return;
    setBusy(true);
    try{
      const result=await clearHealthCacheOnPhone();
      setMessage(result.message);
      if(result.ok)await load();
    }catch{setMessage('Health cache could not be cleared. Try again.')}
    finally{setBusy(false);}
  }
  async function removeImport(){
    if(busy||!imported)return;
    setBusy(true);
    try{
      const result=await undoLastImport();
      setUndoVisible(false);
      if(result.ok&&result.value){
        setMessage('Import removed: '+result.value.sessions+' workouts and '+
          result.value.custom+' custom exercises. Records recalculated.');
        await load();
      }else setMessage('Could not undo that import. Your history is unchanged.');
    }finally{setBusy(false);}
  }
  async function deleteAll() {
    if(busy||!canDeleteEverything(confirmation))return;
    setBusy(true);setMessage(null);
    try{
      const result=await deleteEverythingOnPhone(confirmation);
      if(!result.ok){setMessage(result.message);setOpen(false);return;}
      // All app-owned Phase 2 data and the saved key are gone. Return to fresh onboarding.
      setOpen(false);setConfirmation('');
      resetLocalPreferences();
      // Remove the Settings and (tabs) back stacks before routing to fresh onboarding.
      router.dismissAll();
      router.replace({pathname:'/onboarding/[step]',params:{step:'welcome'}});
    }catch{setMessage('Could not finish deletion. Check the key in Settings and try again.');setOpen(false);}
    finally{setBusy(false);}
  }
  return <Screen>
    <Header title="Data and storage" subtitle="Everything stored on this phone"
      onBack={()=>backOrReplace(router,'/settings')} />
    <Card title="Local counts">
      {counts ? <>
        <ListRow title="Workouts" detail={String(counts.workouts)} />
        <ListRow title="Meals" detail={`${counts.meals} local Phase 0 test entries`} />
        <ListRow title="Cached health records" detail={String(counts.healthSamples+counts.healthAggregates)} />
        <ListRow title="Calorie target versions" detail={String(counts.targetVersions)} />
        <ListRow title="Saved profiles" detail={String(counts.profiles)} />
        <ListRow title="Database size" detail={formatLocalDatabaseSize(counts.databaseBytes)} />
      </> : <Typography tone="secondary">Reading local counts…</Typography>}
      <Typography tone="secondary" size="small">These are actual stored row counts. Imported workouts count with your completed workouts.</Typography>
    </Card>
    <Card title="Bring in your history">
      <ListRow title="Import workouts from another app"
       detail="Hevy, Strong, FitNotes or CSV · nothing leaves this phone"
       onPress={()=>router.push('/import')}/>
      {imported&&<ListRow title="Undo import"
       detail={'Removes '+imported.count+' workouts from '+imported.source+'. Available until your next import.'}
       onPress={()=>setUndoVisible(true)}/>}
    </Card>
    <Card title="Cache and backup">
      <Typography tone="secondary">Clear health cache removes only cached Health Connect readings. It does not remove data from Health Connect, Samsung Health, your profile or your API key.</Typography>
      <Button label={busy?'Working…':'Clear health cache'} variant="secondary"
        disabled={busy} onPress={()=>void clearCache()} />
      <ListRow title="Export or back up" detail="Future · unavailable in this release" />
      <Typography tone="secondary" size="small">If you lose or reset this phone, your Liftria data is gone. Backup is planned.</Typography>
    </Card>
    <Card title="Delete all data">
      <Typography tone="secondary">Delete your profile, calorie targets, preferences, onboarding progress, cached health records, local workouts and meals, and Hiku API key. No Undo.</Typography>
      <Typography tone="secondary" size="small">Health Connect and Samsung Health records stay in their original apps. Anthropic request logs are not deleted. This version does not save user photos or generated workout files.</Typography>
      <Button label="Delete all data" variant="danger" disabled={busy} onPress={()=>setOpen(true)} />
    </Card>
    {message && <View accessibilityRole="alert" style={{paddingVertical:theme.space[2]}}>
      <Typography tone="secondary">ⓘ {message}</Typography>
    </View>}
    <Sheet visible={undoVisible} title={'Remove '+(imported?.count??0)+' imported workouts?'}
      destructive description="Removes this batch's workouts and sets, including any edits. Custom exercises this import created are deleted only if no other workout or template uses them. Your own workouts, plans, templates and library exercise matches stay. Records are recalculated. You can import this file again later."
      onClose={()=>{if(!busy)setUndoVisible(false);}}>
      <Button label="Keep it" fullWidth disabled={busy} onPress={()=>setUndoVisible(false)}/>
      <Button label="Remove import" variant="danger" fullWidth disabled={busy}
        onPress={()=>void removeImport()}/>
    </Sheet>
    <Sheet visible={open} destructive title="Delete everything from Liftria?"
      description="Deletes: profile, targets, settings, onboarding, health cache, Liftria workouts and meals, and saved Hiku key. Does not delete Health Connect or Samsung Health originals or Anthropic request logs. There is no undo."
      onClose={()=>{if(!busy){setOpen(false);setConfirmation('')}}}>
      <Field label="Type DELETE to confirm" value={confirmation} onChangeText={setConfirmation}
        placeholder="DELETE" />
      <Button label="Keep my data" fullWidth disabled={busy}
        onPress={()=>{setOpen(false);setConfirmation('')}} />
      <Button label={busy?'Deleting…':'Delete everything'} fullWidth variant="danger"
        disabled={busy||!canDeleteEverything(confirmation)} onPress={()=>void deleteAll()} />
    </Sheet>
  </Screen>;
}
