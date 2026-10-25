import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as Network from 'expo-network';
import { View } from 'react-native';
import { Button, Card, Chip, Field, Header, ListRow, Screen, Sheet, Toggle, Typography } from '../../src/design/primitives';
import { backOrReplace } from '../../src/navigation/back';
import { deleteKey, getKey, isKeyWellFormed, keyState, saveKey, type KeyState } from '../../src/services/secure-storage';
import { getTypedSetting, setTypedSetting } from '../../src/services/database/settings';
import { testAnthropicKey } from '../../src/features/settings/keyTest';
import { useLanguage } from '../../src/i18n/LanguageProvider';

type PrivacyFlags = { today: boolean; training: boolean; photos: boolean };
const initialFlags: PrivacyFlags = { today: false, training: false, photos: false };

export default function HikuKeySettings() {
  const { t } = useLanguage();
  const [state, setState] = useState<KeyState>({ status: 'missing' });
  const [flags, setFlags] = useState<PrivacyFlags>(initialFlags);
  const [entry, setEntry] = useState('');
  const [replacing, setReplacing] = useState(false);
  const [deletionOpen, setDeletionOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testWorks, setTestWorks] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    void Promise.all([
      keyState(), getTypedSetting('hiku.shareToday'), getTypedSetting('hiku.shareTraining'),
      getTypedSetting('hiku.keepPhotos'),
    ]).then(([key, today, training, photos]) => {
      if (!mounted) return;
      setState(key);
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
      const outcome = await testAnthropicKey(key, offline);
      setTestWorks(outcome === 'works');
      setMessage(outcome === 'works' ? t('hikuSettings.testWorks') :
        outcome === 'unauthorized' ? t('hikuSettings.testUnauthorized') :
        outcome === 'offline' ? t('hikuSettings.testOffline') : t('hikuSettings.testUnavailable'));
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
    <Card title={t('hikuSettings.privacy')}>
      <Typography tone="secondary" size="small">{t('hikuSettings.privacyIntro')}</Typography>
      <Toggle label={t('hikuSettings.includeToday')} detail={t('hikuSettings.includeTodayDetail')}
        value={flags.today} onChange={v => void setPrivacy('today', v)} />
      <Toggle label={t('hikuSettings.includeTraining')} detail={t('hikuSettings.includeTrainingDetail')}
        value={flags.training} onChange={v => void setPrivacy('training', v)} />
      <Toggle label={t('hikuSettings.keepPhotos')} detail={t('hikuSettings.keepPhotosDetail')}
        value={flags.photos} onChange={v => void setPrivacy('photos', v)} />
    </Card>
    <Card title={t('hikuSettings.usage')}>
      <ListRow title={t('hikuSettings.usageRow')} detail={t('hikuSettings.usageComing')} />
      <Typography tone="secondary" size="small">{t('hikuSettings.modelNote')}</Typography>
    </Card>
    <Sheet visible={deletionOpen} title={t('hikuSettings.deleteTitle')}
      description={t('hikuSettings.deleteDescription')}
      onClose={() => setDeletionOpen(false)}>
      <Button label={t('hikuSettings.keepKey')} fullWidth onPress={() => setDeletionOpen(false)} />
      <Button label={busy ? t('hikuSettings.deleting') : t('hikuSettings.delete')} variant="danger" fullWidth
        disabled={busy} onPress={() => void deleteSavedKey()} />
    </Sheet>
  </Screen>;
}
