import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Network from 'expo-network';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  initializeDatabase, schemaVersion, addTestData, readTestData, clearTestData,
  setSetting, getSetting, saveHealthValues, listCachedHealth,
} from '../src/services/database';
import { keyState, saveKey, deleteKey, type KeyState } from '../src/services/secure-storage';
import { runMealEstimate, TEXT_EXAMPLE, DEFAULT_MODEL, type ImageData } from '../src/services/anthropic';
import { healthConnect, requestHistoryReadPermission, readDailyEnergy, type DailyEnergyRow } from '../src/services/health';
import { getLastWorkout, getWorkout, updateWorkout, getLastNutrition, deleteNutrition } from '../src/services/database/repositories';
import { metricTypes, type MetricType, type PermissionState, type HealthValue } from '../src/services/health/types';
import { appendLog, buildDiagnosticReport, logEntry, parseStoredLog } from '../src/features/diagnostics/report';

type RowStatus = { state: string; count?: number; source?: string; range?: string; device?: string; units?: string };
const common = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#11151C' },
  scroll: { paddingHorizontal: 18, paddingTop: 44, paddingBottom: 60 },
  h1: { color: '#F5F6F8', fontSize: 26, fontWeight: '700', marginBottom: 6 },
  sub: { color: '#AAB3BE', marginBottom: 20, fontSize: 13 },
  section: { backgroundColor: '#202732', borderRadius: 13, padding: 14, marginBottom: 14 },
  h2: { color: '#FFF', fontSize: 17, fontWeight: '700', marginBottom: 9 },
  body: { color: '#D0D8E2', fontSize: 13, lineHeight: 19, marginBottom: 6 },
  muted: { color: '#9AA8B9', fontSize: 12, marginBottom: 6 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  button: { backgroundColor: '#3656B5', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  buttonOff: { backgroundColor: '#444B57', opacity: 0.5 },
  buttonText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
  field: { borderWidth: 1, borderColor: '#506075', borderRadius: 8, padding: 10, color: '#FFF', marginVertical: 6 },
  line: { borderBottomColor: '#394554', borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 7 },
});
function Action({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label}
      disabled={disabled} onPress={onPress}
      style={[common.button, disabled && common.buttonOff]}
    ><Text style={common.buttonText}>{label}</Text></Pressable>
  );
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={common.section}><Text style={common.h2}>{title}</Text>{children}</View>;
}
function desc(value: HealthValue): string {
  if (value.kind === 'aggregate') return `${value.metric}: ${value.value} ${value.unit} [${value.windowStart} — ${value.windowEnd}]`;
  if (value.kind === 'session') return `exercise ${value.exerciseType}: ${Math.round(value.durationSec)} sec (${value.start} — ${value.end})`;
  if (value.kind === 'sleep') return `sleep: ${value.start} — ${value.end}, ${value.stages?.length ?? 0} stages`;
  if (value.kind === 'series') return `heart rate: ${value.points.length} samples (${value.start} — ${value.end}) bpm`;
  if (value.kind === 'interval') return `${value.metric}: ${value.value} ${value.unit} (${value.start} — ${value.end})`;
  return `${value.metric}: ${value.value} ${value.unit} at ${value.time}`;
}

const LOG_SETTING = 'diagnostic_log';
type LogStore = { current: { entries: string[]; loaded: boolean } };
/** Append to the on-device test log and persist it, so restart tests stay in the exported report. */
function record(store: LogStore, setCount: (n: number) => void, section: string, message: string) {
  store.current.entries = appendLog(store.current.entries, logEntry(section, message));
  setCount(store.current.entries.length);
  // Until the previous session's log is loaded, persisting would overwrite it.
  if (store.current.loaded) void setSetting(LOG_SETTING, JSON.stringify(store.current.entries));
}
const keySummary = (s: KeyState) => (s.status === 'ready' ? 'ready (masked)' : s.status);

export default function Diagnostics() {
  const [dbText, setDbTextRaw] = useState('Not initialized');
  const [key, setKey] = useState('');
  const [storedKey, setStoredKeyRaw] = useState<KeyState>({ status: 'missing' });
  const [aiText, setAiTextRaw] = useState('Not tested');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const [photo, setPhoto] = useState<ImageData | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [netText, setNetTextRaw] = useState('Checking');
  const [offlineText, setOfflineTextRaw] = useState('Not tested');
  const [healthText, setHealthTextRaw] = useState('Not checked');
  const [historyText, setHistoryTextRaw] = useState('Not requested');
  const [permissions, setPermissionsRaw] = useState<Record<MetricType, PermissionState> | null>(null);
  const [healthRows, setHealthRows] = useState<Partial<Record<MetricType, RowStatus>>>({});
  const [samples, setSamples] = useState<HealthValue[]>([]);
  const [healthBusy, setHealthBusy] = useState(false);
  const [dailyBusy, setDailyBusy] = useState(false);
  const [dailyRows, setDailyRows] = useState<DailyEnergyRow[]>([]);
  const healthBusyRef = useRef(false);
  const logRef = useRef({ entries: [] as string[], loaded: false });
  const [logCount, setLogCount] = useState(0);
  const note = (section: string, message: string) => record(logRef, setLogCount, section, message);
  const setDbText = (text: string) => { setDbTextRaw(text); note('SQLite', text); };
  const setAiText = (text: string) => { setAiTextRaw(text); note('Claude', text); };
  const setNetText = (text: string) => { setNetTextRaw(text); note('Network', text); };
  const setOfflineText = (text: string) => { setOfflineTextRaw(text); note('Offline', text); };
  const setHealthText = (text: string) => { setHealthTextRaw(text); note('Health Connect', text); };
  const setHistoryText = (text: string) => { setHistoryTextRaw(text); note('History permission', text); };
  const setStoredKey = (state: KeyState) => { setStoredKeyRaw(state); note('API key', keySummary(state)); };
  const setPermissions = (states: Record<MetricType, PermissionState>) => {
    setPermissionsRaw(states);
    const granted = metricTypes.filter(metric => states[metric] === 'granted');
    note('Permissions', `${granted.length}/${metricTypes.length} granted: ${granted.join(', ') || 'none'}`);
  };

  const refreshNetwork = async () => {
    try {
      const net = await Network.getNetworkStateAsync();
      const offline = net.isConnected === false || net.isInternetReachable === false;
      setNetText(offline ? 'Offline' : net.isInternetReachable === true ? 'Online' : 'Unknown (no internet check)');
      return offline;
    } catch { setNetText('Unknown'); return false; }
  };

  useEffect(() => {
    const mountNote = (section: string, message: string) => record(logRef, setLogCount, section, message);
    void initializeDatabase()
      .then(async () => {
        const stored = await getSetting(LOG_SETTING);
        logRef.current.entries = [...(stored.ok ? parseStoredLog(stored.value) : []), ...logRef.current.entries];
        logRef.current.loaded = stored.ok;
        mountNote('App', 'Started');
        return schemaVersion();
      })
      .then(result => {
        const text = result.ok ? `Schema v${result.value} initialized` : result.error.message;
        setDbTextRaw(text); mountNote('SQLite', text);
      })
      .catch(() => { setDbTextRaw('DB initialization failed'); mountNote('SQLite', 'DB initialization failed'); });
    void keyState().then(state => { setStoredKeyRaw(state); mountNote('API key', keySummary(state)); });
    // Async callback avoids synchronous setState in a mount effect (react-hooks lint).
    void Network.getNetworkStateAsync().then(net => {
      const offline = net.isConnected === false || net.isInternetReachable === false;
      const text = offline ? 'Offline' : net.isInternetReachable === true ? 'Online' : 'Unknown (no internet check)';
      setNetTextRaw(text); mountNote('Network', text);
    }).catch(() => setNetTextRaw('Unknown'));
    void healthConnect.getAvailability().then(status => {
      setHealthTextRaw(`Availability: ${status}`); mountNote('Health Connect', `Availability: ${status}`);
    });
    return () => requestRef.current?.abort();
  }, []);

  const showDb = async () => {
    const result = await readTestData();
    setDbText(result.ok ? JSON.stringify(result.value, null, 2) : result.error.message);
  };
  const refreshCached = async () => {
    const result = await listCachedHealth();
    if (result.ok) { setSamples(result.value); setOfflineText(`Read ${result.value.length} cached health records offline-capable`); }
    else setOfflineText(result.error.message);
  };

  const pickPhoto = async () => {
    try {
      const selection = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false });
      const asset = selection.assets?.[0];
      if (selection.canceled || !asset) return;
      const longest = Math.max(asset.width || 0, asset.height || 0);
      const resize = longest > 1024
        ? [{ resize: asset.width >= asset.height ? { width: 1024 } : { height: 1024 } }]
        : [];
      const processed = await ImageManipulator.manipulateAsync(asset.uri, resize, {
        compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true,
      });
      if (!processed.base64) { setAiText('Could not prepare a JPEG on the phone.'); return; }
      if (processed.base64.length > 10 * 1024 * 1024) { setAiText('Image is still too large for the Claude API. Choose another photo.'); return; }
      setPhoto({ base64: processed.base64, mediaType: 'image/jpeg' });
      setPhotoName('JPEG prepared on-device; not uploaded. Tap Test B to send.');
    } catch { setAiText('Image selection/compression failed.'); }
  };

  const runClaude = async (image?: ImageData) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    const controller = new AbortController();
    requestRef.current = controller;
    setAiText('Request in flight...');
    try {
      const result = await runMealEstimate({ image, signal: controller.signal });
      if (result.ok) {
        console.info('[Liftria] Claude token counts only', result.usage);
        const estimates = result.data.items.map(item =>
          `${item.name}: ${item.quantity} ${item.unit} (confidence ${item.confidence.toFixed(2)})`);
        setAiText(`Estimated only — NOT measured:\n${estimates.join('\n')}\nTokens: ${result.usage.inputTokens} input / ${result.usage.outputTokens} output`);
      } else setAiText(`${result.code}: ${result.message}`);
    } catch { setAiText('Unexpected diagnostics failure.'); }
    finally { busyRef.current = false; setBusy(false); requestRef.current = null; }
  };

  const permissionRefresh = async () => {
    const states = await healthConnect.getPermissionStatus([...metricTypes]);
    setPermissions(states);
  };
  const readHealth = async () => {
    if (healthBusyRef.current) return;
    healthBusyRef.current = true;
    setHealthBusy(true);
    const range = { start: new Date(Date.now() - 7 * 86400000), end: new Date() };
    const next: Partial<Record<MetricType, RowStatus>> = {};
    let all: HealthValue[] = [];
    try {
      // Refresh on every read: the app may have restarted since the last permission check.
      setPermissions(await healthConnect.getPermissionStatus([...metricTypes]));
      for (const metric of metricTypes) {
        const res = await healthConnect.read(metric, range);
        if (res.status === 'ok') {
          all = [...all, ...res.records];
          const first = res.records[0];
          const last = res.records[res.records.length - 1];
          next[metric] = {
            state: 'records found', count: res.records.length,
            source: [...new Set(res.records.flatMap(value => value.kind === 'aggregate' ? [] : [value.dataOrigin]))].join(', ') || 'unknown',
            range: first && first.kind !== 'aggregate'
              ? 'start' in first ? first.start : 'time' in first ? first.time : 'unknown' : 'aggregate',
            device: first && first.kind !== 'aggregate' ? JSON.stringify(first.device ?? {}) : undefined,
            units: first && 'unit' in first ? first.unit : undefined,
          };
          if (last && last.kind !== 'aggregate' && next[metric]) {
            next[metric]!.range += ` (last origin: ${last.dataOrigin})`;
          }
        } else next[metric] = { state: res.status === 'error' ? `error (${res.code}: ${res.message})` : res.status };
        setHealthRows({ ...next });
        const row = next[metric];
        note(`Health ${metric}`, `${row?.state ?? 'unknown'}${row?.count !== undefined ? ` · ${row.count} records · ${row.source ?? ''}` : ''}`);
      }
      if (all.length > 0) {
        const stored = await saveHealthValues(all);
        setHealthText(stored.ok ? `Imported/updated ${stored.value} read-only records on device` : stored.error.message);
      } else setHealthText('No normalized health records imported; check status per metric');
      setSamples(all.slice(0, 30));
    } catch { setHealthText('Health Connect diagnostic failed unexpectedly.'); }
    finally { setHealthBusy(false); healthBusyRef.current = false; }
  };

  const updateLastWorkout = async () => {
    const latest = await getLastWorkout();
    if (!latest.ok || !latest.value) {
      setDbText(latest.ok ? 'No workout to update' : latest.error.message);
      return;
    }
    const result = await updateWorkout(latest.value.id, 'Updated on device');
    if (!result.ok || result.value !== 1) { setDbText(result.ok ? 'Workout update affected no rows' : result.error.message); return; }
    const verified = await getWorkout(latest.value.id);
    setDbText(verified.ok && verified.value
      ? `Updated workout #${verified.value.id}: ${verified.value.title}`
      : 'Workout updated, but reading it back failed');
  };
  const deleteLastNutrition = async () => {
    const latest = await getLastNutrition();
    if (!latest.ok || !latest.value) { setDbText(latest.ok ? 'No nutrition row to delete' : latest.error.message); return; }
    const result = await deleteNutrition(latest.value.id);
    if (!result.ok || result.value !== 1) { setDbText(result.ok ? 'Delete affected no rows' : result.error.message); return; }
    await showDb();
  };
  const readDaily = async () => {
    if (dailyBusy) return;
    setDailyBusy(true);
    try {
      setPermissions(await healthConnect.getPermissionStatus([...metricTypes]));
      const rows = await readDailyEnergy(7);
      setDailyRows(rows);
      note('Daily energy', `${rows.filter(row => row.status === 'ok').length}/${rows.length} windows with source data, ${rows.filter(row => row.status === 'no-source').length} estimate-only`);
      const values = rows.flatMap(row => row.status === 'ok' ? [row.value] : []);
      if (values.length) {
        const saved = await saveHealthValues(values);
        setHealthText(saved.ok
          ? `Cached ${saved.value} time-windowed energy aggregates (daily coverage NOT verified)`
          : saved.error.message);
      } else setHealthText(rows.some(row => row.status === 'no-source')
        ? 'Only Health Connect estimates returned (no app wrote energy data); enable Samsung Health → Health Connect sync.'
        : 'No daily energy aggregates returned; check permission and Samsung Health sync.');
    } catch { setHealthText('Daily energy diagnostic failed.'); }
    finally { setDailyBusy(false); }
  };
  const exportReport = async () => {
    const report = buildDiagnosticReport({
      generatedAt: new Date().toISOString(),
      app: {
        version: Application.nativeApplicationVersion ?? 'unknown', build: Application.nativeBuildVersion ?? 'unknown',
        androidApi: String(Platform.Version), os: Device.osVersion ?? 'unknown',
        device: `${Device.manufacturer ?? 'unknown'} ${Device.modelName ?? 'unknown'}`,
      },
      status: {
        network: netText, database: dbText, apiKey: keySummary(storedKey), claude: aiText,
        health: healthText, history: historyText, offline: offlineText,
      },
      permissions, healthRows, daily: dailyRows, log: logRef.current.entries,
    });
    try { await Share.share({ title: 'Liftria Phase 0 device report', message: report }); }
    catch { setOfflineText('Could not open the share sheet for the report.'); }
  };
  const clearLog = () => {
    logRef.current.entries = [];
    setLogCount(0);
    if (logRef.current.loaded) void setSetting(LOG_SETTING, '[]');
  };
  const checkOffline = async () => {
    const offline = await refreshNetwork();
    if (!offline) { setOfflineText('Enable airplane mode first. No API request was sent.'); return; }
    const res = await runMealEstimate();
    setOfflineText(res.ok ? 'Unexpected API success while offline' : `Offline Claude test: ${res.code} — ${res.message}`);
  };

  return (
    <ScrollView style={common.page} contentContainerStyle={common.scroll} keyboardShouldPersistTaps="handled">
      <Text style={common.h1}>LIFTRIA / Phase 0</Text>
      <Text style={common.sub}>Local-first feasibility diagnostics · not the final UI</Text>
      <Section title="App / Device">
        <Text style={common.body}>Version: {Application.nativeApplicationVersion ?? 'unknown'}</Text>
        <Text style={common.body}>Android API: {String(Platform.Version)} · OS {Device.osVersion ?? 'unknown'}</Text>
        <Text style={common.body}>Device: {Device.manufacturer ?? 'unknown'} {Device.modelName ?? 'unknown'}</Text>
        <Text style={common.body}>Database: {dbText}</Text>
        <Text style={common.muted}>No app data is uploaded. Only the selected meal example/photo is sent to Claude after tapping Test.</Text>
      </Section>
      <Section title="SQLite / Local data">
        <View style={common.buttons}>
          <Action label="Init" onPress={() => { void initializeDatabase().then(showDb).catch(() => setDbText('Initialization failed')); }} />
          <Action label="Add test data" onPress={() => { void addTestData().then(showDb); }} />
          <Action label="Read" onPress={() => { void showDb(); }} />
          <Action label="Clear test data" onPress={() => { void clearTestData().then(showDb); }} />
          <Action label="Update last workout" onPress={() => { void updateLastWorkout(); }} />
          <Action label="Delete last nutrition" onPress={() => { void deleteLastNutrition(); }} />
        </View>
        <View style={common.buttons}>
          <Action label="Write setting" onPress={() => { void setSetting('phase0_flag', new Date().toISOString()).then(r => setDbText(r.ok ? 'Saved setting locally' : r.error.message)); }} />
          <Action label="Read setting" onPress={() => { void getSetting('phase0_flag').then(r => setDbText(r.ok ? `Setting: ${r.value ?? 'missing'}` : r.error.message)); }} />
        </View>
        <Text style={common.muted}>Add test data → force-stop app → reopen → Read to verify persistence.</Text>
      </Section>
      <Section title="Claude / SecureStore">
        <Text style={common.body}>Model: {DEFAULT_MODEL}</Text>
        <Text style={common.body}>Stored key: {storedKey.status === 'ready' ? storedKey.hint : storedKey.status}</Text>
        <TextInput
          value={key} onChangeText={setKey} secureTextEntry autoCapitalize="none"
          autoCorrect={false} autoComplete="off" placeholder="sk-ant-…" placeholderTextColor="#8993A0"
          style={common.field} accessibilityLabel="Anthropic API key" />
        <View style={common.buttons}>
          <Action label="Save key" onPress={() => { void saveKey(key).then(s => { setStoredKey(s); setKey(''); setAiText(s.status === 'ready' ? 'Key securely saved' : s.status); }); }} disabled={busy} />
          <Action label="Check key" onPress={() => { void keyState().then(setStoredKey); }} />
          <Action label="Delete key" onPress={() => { setKey(''); void deleteKey().then(setStoredKey); }} disabled={busy} />
        </View>
        <Text style={common.muted}>Test A input: {TEXT_EXAMPLE}</Text>
        <View style={common.buttons}>
          <Action label="Test A / key" disabled={busy} onPress={() => { void runClaude(); }} />
          <Action label="Pick photo" disabled={busy} onPress={() => { void pickPhoto(); }} />
          <Action label="Test B / photo" disabled={busy || !photo} onPress={() => { if (photo) void runClaude(photo); }} />
          <Action label="Clear photo" disabled={busy || !photo} onPress={() => { setPhoto(null); setPhotoName(null); }} />
          <Action label="Cancel" disabled={!busy} onPress={() => requestRef.current?.abort()} />
        </View>
        <Text style={common.muted}>{photoName ?? 'No meal photo selected'}</Text>
        {busy && <ActivityIndicator color="#A7C6FF" />}
        <Text style={common.body}>{aiText}</Text>
        <Text style={common.muted}>Results are estimates, not nutrition facts. Key is stored in Android Keystore-backed SecureStore.</Text>
      </Section>
      <Section title="Health Connect / Watch 4">
        <Text style={common.body}>{healthText}</Text>
        <Text style={common.muted}>Samsung Health → Settings → Health Connect sync must be enabled first. No health data is sent to Claude.</Text>
        <View style={common.buttons}>
          <Action label="Check availability" onPress={() => { void healthConnect.getAvailability().then(s => setHealthText(`Availability: ${s}`)); }} />
          <Action label="Permissions" onPress={() => { void permissionRefresh(); }} />
          <Action label="Grant read-only" onPress={() => { void healthConnect.requestPermissions([...metricTypes]).then(setPermissions); }} />
          <Action label="History grant" onPress={() => { void requestHistoryReadPermission().then(setHistoryText); }} />
          <Action label="Read 7 days" disabled={healthBusy || dailyBusy} onPress={() => { void readHealth(); }} />
          <Action label="Daily energy / 7 days" disabled={dailyBusy || healthBusy} onPress={() => { void readDaily(); }} />
        </View>
        <Text style={common.muted}>History permission: {historyText} · Special grant requires separate device verification.</Text>
        {metricTypes.map(metric => {
          const row = healthRows[metric];
          return (
            <View key={metric} style={common.line}>
              <Text style={common.body}>{metric} · permission: {permissions?.[metric] ?? 'not checked'}</Text>
              <Text style={common.muted}>API supported: adapter declared · {row?.state ?? 'not read'} · count {row?.count ?? '—'}</Text>
              {row?.source && <Text style={common.muted}>Origin: {row.source} · unit: {row.units ?? 'varies'} · time: {row.range ?? '—'}</Text>}
              {row?.device && <Text style={common.muted}>Device: {row.device}</Text>}
            </View>
          );
        })}
        <Text style={common.muted}>API support ≠ permission granted ≠ data present ≠ verified against Samsung Health.</Text>
        <Text style={common.h2}>Daily window totals (NOT verified daily expenditure)</Text>
        <Text style={common.muted}>Local calendar day; the current window is partial. Aggregation reflects only available Health Connect sources; it can include exercise intervals without all-day calories. Never add basal, active, and total together.</Text>
        {dailyRows.map((row) => (
          <View key={`${row.date}:${row.metric}`} style={common.line}>
            <Text style={common.body}>{row.date} · {row.metric}: {row.status === 'ok'
              ? `${row.value.value.toFixed(1)} kcal`
              : row.status === 'no-source'
                ? `${row.value.value.toFixed(1)} kcal — estimate only, no app wrote data`
                : row.status}</Text>
            {(row.status === 'ok' || row.status === 'no-source') &&
              <Text style={common.muted}>{row.value.operation} · {row.value.windowStart} — {row.value.windowEnd} · origin(s): {row.value.dataOrigins?.join(', ') || 'unknown'}</Text>}
          </View>
        ))}
      </Section>
      <Section title="Offline / Local cache">
        <Text style={common.body}>Connection: {netText}</Text>
        <Text style={common.body}>{offlineText}</Text>
        <View style={common.buttons}>
          <Action label="Network status" onPress={() => { void refreshNetwork(); }} />
          <Action label="Read health cache" onPress={() => { void refreshCached(); }} />
          <Action label="Test offline API failure" onPress={() => { void checkOffline(); }} />
        </View>
        {samples.slice(0, 12).map((record, i) =>
          <Text key={i} style={common.muted}>{desc(record)}{record.kind !== 'aggregate' ? ` · ${record.dataOrigin}` : ''}</Text>)}
        <Text style={common.muted}>Airplane-mode validation requires a bundled APK, not Metro.</Text>
      </Section>
      <Section title="Report">
        <Text style={common.body}>Test log: {logCount} entries (kept across restarts)</Text>
        <View style={common.buttons}>
          <Action label="Export report" onPress={() => { void exportReport(); }} />
          <Action label="Clear test log" onPress={clearLog} />
        </View>
        <Text style={common.muted}>Shares a text report of every result above. It never includes your API key, photos or raw health samples, but it does include health record counts, sources and daily kcal. Review before sending.</Text>
      </Section>
      <Text style={common.muted}>Privacy: on-device SQLite and credentials. Photos leave the device only when Test B is tapped. Direct Claude API keys can be extracted from compromised phones.</Text>
    </ScrollView>
  );
}
