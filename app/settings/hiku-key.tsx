import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as Network from 'expo-network';
import { View } from 'react-native';
import { Button, Card, Chip, Field, Header, ListRow, Screen, Sheet, Toggle, Typography } from '../../src/design/primitives';
import { backOrReplace } from '../../src/navigation/back';
import { deleteKey, getKey, isKeyWellFormed, keyState, saveKey, type KeyState } from '../../src/services/secure-storage';
import { getTypedSetting, setTypedSetting } from '../../src/services/database/settings';
import { keyTestMessage, testAnthropicKey } from '../../src/features/settings/keyTest';

type PrivacyFlags = { today: boolean; training: boolean; photos: boolean };
const initialFlags: PrivacyFlags = { today: false, training: false, photos: false };

export default function HikuKeySettings() {
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
    }).catch(() => { if (mounted) setMessage('Could not read saved preferences from the phone.'); });
    return () => { mounted = false; };
  }, []);

  async function save() {
    if (busy) return;
    if (!isKeyWellFormed(entry)) { setMessage('Enter a valid Anthropic API key first.'); return; }
    setBusy(true); setMessage(null);
    try {
      const result = await saveKey(entry);
      if (result.status === 'ready') {
        setState(result);
        setTestWorks(false);
        setEntry('');
        setReplacing(false);
        setMessage('Key saved securely on this phone.');
      } else setMessage('The key could not be saved securely. Nothing has changed.');
    } catch { setMessage('The key could not be saved securely. Nothing has changed.'); }
    finally { setBusy(false); }
  }

  async function test() {
    if (busy) return;
    setBusy(true); setTesting(true); setMessage('Testing key…'); setTestWorks(false);
    try {
      const key = await getKey();
      if (!key) { setState({ status: 'missing' }); setMessage('Save a key before testing.'); return; }
      const net = await Network.getNetworkStateAsync();
      const offline = net.isConnected === false || net.isInternetReachable === false;
      const outcome = await testAnthropicKey(key, offline);
      setTestWorks(outcome === 'works');
      setMessage(keyTestMessage(outcome));
    } catch { setMessage('Could not verify this key right now. Your saved key remains on the phone.'); }
    finally { setBusy(false); setTesting(false); }
  }

  async function deleteSavedKey() {
    if (busy) return;
    setBusy(true); setMessage(null);
    try {
      const result = await deleteKey();
      if (result.status !== 'missing') { setMessage('Unable to delete the stored key. Try again.'); return; }
      setState(result);
      setTestWorks(false);
      setEntry('');
      setReplacing(false);
      setDeletionOpen(false);
      setMessage('Key deleted from this phone. Hiku stops until you add another key.');
    } catch { setMessage('Unable to delete the stored key. Try again.'); }
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
      setMessage('Could not save this preference.');
    }
  }

  return <Screen>
    <Header title="Hiku and API key" subtitle="Private key on your phone"
      onBack={() => backOrReplace(router, '/settings')} />
    <Card title="Anthropic API key" rim="none">
      {state.status === 'ready' && !replacing ? <>
        <Typography>Saved on this phone (Android Keystore)</Typography>
        <Typography tone="secondary">{state.hint}</Typography>
        <Button label={testing ? 'Testing…' : 'Test key'} variant="secondary" onPress={() => void test()}
          disabled={busy} />
        {testWorks && <Chip kind="pending" label="First device test" />}
        <Button label="Replace key" variant="ghost" disabled={busy} onPress={() => setReplacing(true)} />
        <Button label="Delete key" variant="ghost" disabled={busy} onPress={() => setDeletionOpen(true)} />
      </> : <>
        <Typography tone="secondary" size="small">Hiku uses your own Anthropic key. Long-press the field to Paste from the Android clipboard. No key is stored in the Liftria database.</Typography>
        <Field label={replacing ? 'Replacement Anthropic key' : 'Anthropic API key'}
          value={entry} onChangeText={setEntry} secure placeholder="sk-ant-…" />
        <Button label={busy ? 'Saving…' : 'Save key'} fullWidth disabled={busy || !entry.trim()}
          onPress={() => void save()} />
        {replacing && <Button label="Keep existing key" variant="ghost" disabled={busy} onPress={() => {
          setEntry(''); setReplacing(false);
        }} />}
      </>}
      {state.status === 'malformed' && <Typography tone="secondary">The saved key needs replacement.</Typography>}
      {state.status === 'storage-error' && <Typography tone="secondary">Secure storage is unavailable on this device.</Typography>}
      {message && <View accessibilityRole="alert"><Typography tone="secondary" size="small">ⓘ {message}</Typography></View>}
    </Card>
    <Card title="AI privacy defaults">
      <Typography tone="secondary" size="small">All are off by default. Hiku never sends anything until you start a request.</Typography>
      <Toggle label="Include Today's totals" detail="Allow this local summary in an explicitly requested Hiku prompt."
        value={flags.today} onChange={v => void setPrivacy('today', v)} />
      <Toggle label="Include training day" detail="Allow the current training day when you request advice."
        value={flags.training} onChange={v => void setPrivacy('training', v)} />
      <Toggle label="Keep photos" detail="Save selected photos on this device for later use."
        value={flags.photos} onChange={v => void setPrivacy('photos', v)} />
    </Card>
    <Card title="Usage and model">
      <ListRow title="Usage and what is sent" detail="Hiku request details · Coming soon" />
      <Typography tone="secondary" size="small">Hiku uses Anthropic’s Claude Haiku model.</Typography>
    </Card>
    <Sheet visible={deletionOpen} title="Delete your API key?"
      description="Hiku stops working until you add a key. Your food diary is not affected."
      onClose={() => setDeletionOpen(false)}>
      <Button label="Keep key" fullWidth onPress={() => setDeletionOpen(false)} />
      <Button label={busy ? 'Deleting…' : 'Delete key'} variant="danger" fullWidth
        disabled={busy} onPress={() => void deleteSavedKey()} />
    </Sheet>
  </Screen>;
}
