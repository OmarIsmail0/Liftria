import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useTheme } from '../../src/design/ThemeProvider';
import { Button, Card, Field, Header, ListRow, Screen, Sheet, Typography } from '../../src/design/primitives';
import { backOrReplace } from '../../src/navigation/back';
import { localStorageCounts, type LocalStorageCounts } from '../../src/services/database';
import { canDeleteEverything, clearHealthCacheOnPhone, deleteEverythingOnPhone } from '../../src/features/settings/storage';

export default function DataAndStorage() {
  const { theme } = useTheme();
  const [counts,setCounts]=useState<LocalStorageCounts|null>(null);
  const [confirmation,setConfirmation]=useState('');
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const load=useCallback(async()=>{
    const result=await localStorageCounts();
    if(result.ok)setCounts(result.value);
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
  async function deleteAll() {
    if(busy||!canDeleteEverything(confirmation))return;
    setBusy(true);setMessage(null);
    try{
      const result=await deleteEverythingOnPhone(confirmation);
      if(!result.ok){setMessage(result.message);setOpen(false);return;}
      // All app-owned Phase 2 data and the saved key are gone. Return to fresh onboarding.
      setOpen(false);setConfirmation('');
      router.replace({pathname:'/onboarding/[step]',params:{step:'welcome'}});
    }catch{setMessage('Could not finish deletion. Check the key in Settings and try again.');setOpen(false);}
    finally{setBusy(false);}
  }
  return <Screen>
    <Header title="Data and storage" subtitle="Everything stored on this phone"
      onBack={()=>backOrReplace(router,'/settings')} />
    <Card title="Local counts">
      {counts ? <>
        <ListRow title="Workouts" detail={`${counts.workouts} local Phase 0 test sessions`} />
        <ListRow title="Meals" detail={`${counts.meals} local Phase 0 test entries`} />
        <ListRow title="Cached health records" detail={String(counts.healthSamples+counts.healthAggregates)} />
        <ListRow title="Calorie target versions" detail={String(counts.targetVersions)} />
        <ListRow title="Saved profiles" detail={String(counts.profiles)} />
      </> : <Typography tone="secondary">Reading local counts…</Typography>}
      <Typography tone="secondary" size="small">These are actual stored row counts. Workout and meal logging arrive in later phases.</Typography>
    </Card>
    <Card title="Bring in your history">
      <Typography tone="secondary">Importing workouts from other apps is planned for a future phase. Nothing is imported automatically.</Typography>
    </Card>
    <Card title="Cache and backup">
      <Typography tone="secondary">Clear health cache removes only cached Health Connect readings. It does not remove data from Health Connect, Samsung Health, your profile or your API key.</Typography>
      <Button label={busy?'Working…':'Clear health cache'} variant="secondary"
        disabled={busy} onPress={()=>void clearCache()} />
      <ListRow title="Export or back up" detail="Future · unavailable in this release" />
      <Typography tone="secondary" size="small">If you lose or reset this phone, your Liftria data is gone. Backup is planned.</Typography>
    </Card>
    <Card title="Delete all data">
      <Typography tone="secondary">Delete local Liftria data and your saved Anthropic key. No Undo.</Typography>
      <Typography tone="secondary" size="small">Health Connect and Samsung Health records stay in their original apps. Anthropic request logs are not deleted. This version does not save user photos or generated workout files.</Typography>
      <Button label="Delete all data" variant="danger" disabled={busy} onPress={()=>setOpen(true)} />
    </Card>
    {message && <View accessibilityRole="alert" style={{paddingVertical:theme.space[2]}}>
      <Typography tone="secondary">ⓘ {message}</Typography>
    </View>}
    <Sheet visible={open} destructive title="Delete everything from Liftria?"
      description="This deletes all Liftria database rows and your local API key. Data held by Health Connect, Samsung Health and Anthropic is not deleted."
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
