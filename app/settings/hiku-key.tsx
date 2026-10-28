import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as Network from 'expo-network';
import { View } from 'react-native';
import { Button, Card, Chip, Field, Header, ListRow, OptionRows, Screen, Sheet, Toggle, Typography } from '../../src/design/primitives';
import { backOrReplace } from '../../src/navigation/back';
import { deleteKey, getKey, isKeyWellFormed, keyState, saveKey, type KeyState } from '../../src/services/secure-storage';
import { getTypedSetting, setTypedSetting } from '../../src/services/database/settings';
import { testAnthropicKey } from '../../src/features/settings/keyTest';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import {DEFAULT_HIKU_MODEL,HIKU_MODELS,type HikuModelId} from '../../src/features/hiku/models';
import {keptPhotoUsage,deleteKeptPhotos,type KeptPhotoUsage} from '../../src/features/hiku/keptPhotos';

type PrivacyFlags = { today: boolean; training: boolean; photos: boolean };
const initialFlags: PrivacyFlags = { today: false, training: false, photos: false };

export default function HikuKeySettings() {
  const { t, language } = useLanguage();
  const [model,setModel]=useState<HikuModelId>(DEFAULT_HIKU_MODEL);
  const [state, setState] = useState<KeyState>({ status: 'missing' });
  const [flags, setFlags] = useState<PrivacyFlags>(initialFlags);
  const [entry, setEntry] = useState('');
  const [replacing, setReplacing] = useState(false);
  const [deletionOpen, setDeletionOpen] = useState(false);
  const [photoDeleteOpen,setPhotoDeleteOpen]=useState(false);
  const [photoUsage,setPhotoUsage]=useState<KeptPhotoUsage|null>(null);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testWorks, setTestWorks] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    void Promise.all([
      keyState(), getTypedSetting('hiku.shareToday'), getTypedSetting('hiku.shareTraining'),
      getTypedSetting('hiku.keepPhotos'),getTypedSetting('hiku.model'),keptPhotoUsage(),
    ]).then(([key, today, training, photos, chosen, usage]) => {
      if (!mounted) return;
      setState(key);
      if(chosen.ok)setModel(chosen.value);
      if(usage.ok)setPhotoUsage(usage.value);
      setFlags({ today: today.ok ? today.value : false,
        training: training.ok ? training.value : false,
        photos: photos.ok ? photos.value : false });
    }).catch(() => { if (mounted) setMessage(t('hikuSettings.readError')); });
    return () => { mounted = false; };
  }, [t]);

  async function save() {
    if (busy) return;
    if (!isKeyWellFormed(entry)) { setMessage(t('hikuSettings.invalid')); return; }
    setBusy(true); setMessage(null);
    try {
      const result = await saveKey(entry);
      if (result.status === 'ready') {
        setState(result);
        setTestWorks(false);
        setEntry('');
        setReplacing(false);
        setMessage(t('hikuSettings.saved'));
      } else setMessage(t('hikuSettings.saveError'));
    } catch { setMessage(t('hikuSettings.saveError')); }
    finally { setBusy(false); }
  }

  async function test() {
    if (busy) return;
    setBusy(true); setTesting(true); setMessage(t('hikuSettings.testingStatus')); setTestWorks(false);
    try {
      const key = await getKey();
      if (!key) { setState({ status: 'missing' }); setMessage(t('hikuSettings.keyRequired')); return; }
      const net = await Network.getNetworkStateAsync();
      const offline = net.isConnected === false || net.isInternetReachable === false;
      const outcome = await testAnthropicKey(key, offline, fetch, model);
      setTestWorks(outcome === 'works');
      setMessage(outcome === 'works' ? t('hikuSettings.testWorks') :
        outcome === 'unauthorized' ? t('hikuSettings.testUnauthorized') :
        outcome === 'offline' ? t('hikuSettings.testOffline') :
        outcome === 'model-unavailable' ? t('hikuK.modelUnavailable') : t('hikuSettings.testUnavailable'));
    } catch { setMessage(t('hikuSettings.testError')); }
    finally { setBusy(false); setTesting(false); }
  }

  async function deleteSavedKey() {
    if (busy) return;
    setBusy(true); setMessage(null);
    try {
      const result = await deleteKey();
      if (result.status !== 'missing') { setMessage(t('hikuSettings.deleteError')); return; }
      setState(result);
      setTestWorks(false);
      setEntry('');
      setReplacing(false);
      setDeletionOpen(false);
      setMessage(t('hikuSettings.deleted'));
    } catch { setMessage(t('hikuSettings.deleteError')); }
    finally { setBusy(false); }
  }

  async function removeKeptPhotos(){
    if(busy)return;
    setBusy(true);setMessage(null);
    try{
      const result=await deleteKeptPhotos();
      if(!result.ok){setMessage(t('hikuSettings.photosDeleteError'));return;}
      setPhotoDeleteOpen(false);
      const next=await keptPhotoUsage();
      if(next.ok)setPhotoUsage(next.value);
      else setMessage(t('hikuSettings.photosReadError'));
      if(next.ok)setMessage(t('hikuSettings.photosDeleted'));
    }catch{setMessage(t('hikuSettings.photosDeleteError'));}
    finally{setBusy(false);}
  }

  async function setPrivacy<K extends keyof PrivacyFlags>(field: K, value: PrivacyFlags[K]) {
    const previous = flags[field];
    setFlags(p => ({ ...p, [field]: value }));
    const result = field === 'today' ? await setTypedSetting('hiku.shareToday', value) :
      field === 'training' ? await setTypedSetting('hiku.shareTraining', value) :
        await setTypedSetting('hiku.keepPhotos', value);
    if (!result.ok) {
      setFlags(p => ({ ...p, [field]: previous }));
      setMessage(t('hikuSettings.preferenceError'));
    }
  }

  return <Screen>
    <Header title={t('hikuSettings.title')} subtitle={t('hikuSettings.subtitle')}
      onBack={() => backOrReplace(router, '/settings')} />
    <Card title={t('hikuSettings.apiKey')} rim="none">
      {state.status === 'ready' && !replacing ? <>
        <Typography>{t('hikuSettings.storedOnPhone')}</Typography>
        <Typography tone="secondary">{state.hint}</Typography>
        <Button label={testing ? t('hikuSettings.testing') : t('hikuSettings.test')} variant="secondary" onPress={() => void test()}
          disabled={busy} />
        {testWorks && <Chip kind="pending" label={t('hikuSettings.deviceTest')} />}
        <Button label={t('hikuSettings.replace')} variant="ghost" disabled={busy} onPress={() => setReplacing(true)} />
        <Button label={t('hikuSettings.delete')} variant="ghost" disabled={busy} onPress={() => setDeletionOpen(true)} />
      </> : <>
        <Typography tone="secondary" size="small">{t('hikuSettings.intro')}</Typography>
        <Field label={replacing ? t('hikuSettings.replacement') : t('hikuSettings.apiKey')}
          value={entry} onChangeText={setEntry} secure placeholder="sk-ant-…" />
        <Button label={busy ? t('hikuSettings.saving') : t('hikuSettings.save')} fullWidth disabled={busy || !entry.trim()}
          onPress={() => void save()} />
        {replacing && <Button label={t('hikuSettings.keep')} variant="ghost" disabled={busy} onPress={() => {
          setEntry(''); setReplacing(false);
        }} />}
      </>}
      {state.status === 'malformed' && <Typography tone="secondary">{t('hikuSettings.malformed')}</Typography>}
      {state.status === 'storage-error' && <Typography tone="secondary">{t('hikuSettings.storageUnavailable')}</Typography>}
      {message && <View accessibilityRole="alert"><Typography tone="secondary" size="small">ⓘ {message}</Typography></View>}
    </Card>
    <Card title={t('hikuK.modelSettings')}>
      <OptionRows label={t('hikuK.modelSettings')} value={model}
       options={HIKU_MODELS.map(row=>({
        value:row.id,label:language==='ar'?row.nameAr:row.nameEn,
        description:t(row.id==='claude-haiku-5-5'?'hikuK.modelFastDetail':'hikuK.modelAccurateDetail'),
       }))}
       onChange={next=>{void setTypedSetting('hiku.model',next).then(result=>{
         if(result.ok){setModel(next);setTestWorks(false);setMessage(t('hikuK.modelSaved'));}
         else setMessage(t('hikuSettings.preferenceError'));
       });}}/>
    </Card>
    <Card title={t('hikuSettings.privacy')}>
      <Typography tone="secondary" size="small">{t('hikuSettings.privacyIntro')}</Typography>
      <Toggle label={t('hikuSettings.includeToday')} detail={t('hikuSettings.includeTodayDetail')}
        value={flags.today} onChange={v => void setPrivacy('today', v)} />
      <Toggle label={t('hikuSettings.includeTraining')} detail={t('hikuSettings.includeTrainingDetail')}
        value={flags.training} onChange={v => void setPrivacy('training', v)} />
      <Toggle label={t('hikuSettings.keepPhotos')} detail={t('hikuSettings.keepPhotosDetail')}
        value={flags.photos} onChange={v => void setPrivacy('photos', v)} />
      <Typography tone="secondary" size="small">{photoUsage?
        t('hikuSettings.keptPhotoCount',{count:photoUsage.count,
         mb:(photoUsage.bytes/(1024*1024)).toFixed(2)}):
        t('hikuSettings.photosReadError')}</Typography>
      <Button label={t('hikuSettings.deletePhotos')} variant="secondary"
       disabled={busy||!photoUsage?.count} onPress={()=>setPhotoDeleteOpen(true)}/>
    </Card>
    <Card title={t('hikuSettings.usage')}>
      <ListRow title={t('hikuSettings.usageRow')} onPress={()=>router.push('/(tabs)/hiku/usage')}/>
      <Typography tone="secondary" size="small">{t('hikuK.selectedModel',{
        model:language==='ar'?HIKU_MODELS.find(m=>m.id===model)?.nameAr??'':HIKU_MODELS.find(m=>m.id===model)?.nameEn??''
      })}</Typography>
    </Card>
    <Sheet visible={photoDeleteOpen} destructive title={t('hikuSettings.deletePhotos')}
      description={t('hikuSettings.deletePhotosWarning')}
      onClose={()=>{if(!busy)setPhotoDeleteOpen(false);}}>
      <Button label={t('hikuSettings.keepPhotosCancel')} fullWidth disabled={busy}
       onPress={()=>setPhotoDeleteOpen(false)}/>
      <Button label={t('hikuSettings.deletePhotosConfirm')} variant="danger" fullWidth disabled={busy}
       onPress={()=>void removeKeptPhotos()}/>
    </Sheet>
    <Sheet visible={deletionOpen} title={t('hikuSettings.deleteTitle')}
      description={t('hikuSettings.deleteDescription')}
      onClose={() => setDeletionOpen(false)}>
      <Button label={t('hikuSettings.keepKey')} fullWidth onPress={() => setDeletionOpen(false)} />
      <Button label={busy ? t('hikuSettings.deleting') : t('hikuSettings.delete')} variant="danger" fullWidth
        disabled={busy} onPress={() => void deleteSavedKey()} />
    </Sheet>
  </Screen>;
}
