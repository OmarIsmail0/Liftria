import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { useTheme } from '../../design/ThemeProvider';
import {
  bidiIsolate, formatDate, pluralForm, type AppLanguage, type TranslationKey,
} from '../../i18n';
import { formatEditableNumber } from '../../i18n/editableNumber';
import { useLanguage } from '../../i18n/LanguageProvider';
import { Button, Card, Field, Header, ListRow, Screen, Sheet, Typography } from '../../design/primitives';
import { localDay } from '../eat/foodCatalog';
import { getTypedSetting } from '../../services/database/settings';
import type { WeightUnit } from '../train/workoutUnits';
import { MeasurementGraph } from './TrendCharts';
import {
  addMeasurements, listAllMeasurements, listMeasurements, removeMeasurement, saveMeasurement,
} from './measurementRepository';
import {
  MEASUREMENT_SITES, formatMeasurement, formatShownLength, formatSignedMeasurement, fromCm,
  isMeasurementSite, lengthUnitForWeight, lengthUnitLabel, measurementDateOk, measurementDrafts,
  parseMeasurementInput, shownChange, summarizeMeasurements,
  type BodyMeasurement, type LengthUnit, type MeasurementSite, type SiteSummary,
} from './measurements';

function siteKey(site: MeasurementSite): TranslationKey {
  return `measure.site.${site}` as TranslationKey;
}

function blankFields(): Record<MeasurementSite, string> {
  return Object.fromEntries(MEASUREMENT_SITES.map(site => [site, ''])) as Record<MeasurementSite, string>;
}

function measuredAtFromDay(day: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8)), 12);
  if (!Number.isFinite(date.getTime()) || localDay(date) !== day) return null;
  return date.toISOString();
}

function formatWhen(language: AppLanguage, at: string): string {
  const date = new Date(at);
  if (!Number.isFinite(date.getTime())) return '';
  return bidiIsolate(language, formatDate(language, date, { day: 'numeric', month: 'short', year: 'numeric' }));
}

export function chartLabel(t: (key: TranslationKey, params?: { count: number }) => string, language: AppLanguage, count: number, hidden: boolean): string {
  if (hidden) return t('trend.hidden');
  return t((`measure.chartA11y.${pluralForm(language, count)}`) as TranslationKey, { count });
}

export function BodyMeasurements({ weightUnit, hidden }: { weightUnit: WeightUnit; hidden: boolean }) {
  const { t, language } = useLanguage();
  const unit = lengthUnitForWeight(weightUnit);
  const [rows, setRows] = useState<BodyMeasurement[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [fields, setFields] = useState(blankFields);
  const [day, setDay] = useState(localDay(new Date()));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const result = await listAllMeasurements();
    if (result.ok) {
      setRows(result.value);
      setError(false);
    } else setError(true);
    setReady(true);
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const summaries = summarizeMeasurements(rows);
  const at = measuredAtFromDay(day);
  const draft = measurementDrafts(fields, unit);
  const canSave = Boolean(at && draft.ok && note.length <= 400 && measurementDateOk(at));
  function openAdd() {
    setFields(blankFields());
    setDay(localDay(new Date()));
    setNote('');
    setAdding(true);
  }
  async function save() {
    if (!canSave || busy || !at || !draft.ok) return;
    setBusy(true);
    const saved = await addMeasurements({ measuredAt: at, note, entries: draft.values });
    setBusy(false);
    if (!saved.ok) { setError(true); return; }
    setAdding(false);
    await load();
  }
  return <>
    <Card rim="health" title={t('measure.title')}>
      {ready && summaries.length === 0 && !error &&
        <Typography tone="secondary">{t('measure.empty')}</Typography>}
      {summaries.map(item => <ListRow key={item.site} title={t(siteKey(item.site))}
        detail={summaryDetail(t, language, item, unit, hidden)}
        onPress={() => router.push({ pathname: '/(tabs)/progress/measurement/[site]', params: { site: item.site } })} />)}
      {error && <>
        <Typography tone="secondary">{t('measure.loadError')}</Typography>
        <Button label={t('common.retry')} onPress={() => void load()} />
      </>}
      <Button label={t('measure.add')} variant="secondary" onPress={openAdd} />
    </Card>
    <Sheet visible={adding} title={t('measure.add')} description={t('measure.formHelp')}
      onClose={() => { if (!busy) setAdding(false); }}>
      {MEASUREMENT_SITES.map(site => <Field key={site}
        label={t('measure.field', { site: t(siteKey(site)), unit: lengthUnitLabel(language, unit) })}
        value={fields[site]}
        onChangeText={value => setFields(current => ({ ...current, [site]: value }))}
        keyboardType="decimal-pad"
        error={parseMeasurementInput(fields[site], unit).kind === 'invalid' ? t('measure.invalid') : undefined} />)}
      <Field label={t('trend.date')} value={day} onChangeText={setDay} placeholder={t('trend.datePlaceholder')} />
      <Field label={t('trend.note')} value={note} onChangeText={setNote} multiline />
      <Button label={t('common.save')} disabled={!canSave || busy} fullWidth onPress={() => void save()} />
    </Sheet>
  </>;
}

export function summaryDetail(
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
  language: AppLanguage, item: SiteSummary, unit: LengthUnit, hidden: boolean,
): string {
  const when = formatWhen(language, item.latest.measuredAt);
  if (hidden) return t('trend.hidden') + ' · ' + when;
  const change = item.previous
    ? t('measure.sincePrevious', {
      change: formatSignedMeasurement(shownChange(item.latest.cm, item.previous.cm, unit), unit, language),
    })
    : t('measure.firstEntry');
  return formatMeasurement(item.latest.cm, unit, language) + ' · ' + when + ' · ' + change;
}

export function MeasurementSiteScreen() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const params = useLocalSearchParams<{ site?: string | string[] }>();
  const raw = Array.isArray(params.site) ? params.site[0] : params.site;
  const site = raw && isMeasurementSite(raw) ? raw : null;
  const [entries, setEntries] = useState<BodyMeasurement[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [hidden, setHidden] = useState(false);
  const [editing, setEditing] = useState<BodyMeasurement | null>(null);
  const [entered, setEntered] = useState('');
  const [day, setDay] = useState(localDay(new Date()));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const unit = lengthUnitForWeight(weightUnit);
  const load = useCallback(async () => {
    if (!site) { setReady(true); return; }
    const [list, units, hide] = await Promise.all([
      listMeasurements(site), getTypedSetting('units.weight'), getTypedSetting('hideNumbers'),
    ]);
    if (list.ok) { setEntries(list.value); setError(false); } else setError(true);
    if (units.ok) setWeightUnit(units.value);
    if (hide.ok) setHidden(hide.value);
    setReady(true);
  }, [site]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const at = measuredAtFromDay(day);
  const parsed = parseMeasurementInput(entered, unit);
  const canSave = Boolean(editing && at && parsed.kind === 'value' && note.length <= 400 && measurementDateOk(at));
  const points = entries.map(entry => ({ at: entry.measuredAt, value: fromCm(entry.cm, unit) }));
  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/progress/body');
  }
  function openEdit(entry: BodyMeasurement) {
    setEditing(entry);
    setEntered(formatEditableNumber(fromCm(entry.cm, unit), 'length'));
    setDay(localDay(new Date(entry.measuredAt)));
    setNote(entry.note ?? '');
  }
  async function save() {
    if (!editing || !canSave || busy || !at || parsed.kind !== 'value') return;
    setBusy(true);
    const saved = await saveMeasurement(editing.id, parsed.cm, at, note);
    setBusy(false);
    if (!saved.ok) { setError(true); return; }
    setEditing(null);
    await load();
  }
  async function remove() {
    if (!editing || busy) return;
    setBusy(true);
    const removed = await removeMeasurement(editing.id);
    setBusy(false);
    if (!removed.ok) { setError(true); return; }
    setEditing(null);
    await load();
  }
  if (!site) return <Screen embedded scroll={false}>
    <Header title={t('measure.title')} onBack={goBack} />
    <Typography tone="secondary">{t('measure.unknownSite')}</Typography>
  </Screen>;
  return <Screen embedded scroll={false}>
    <ScrollView keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: theme.layout.cardGap, paddingVertical: theme.space[3] }}>
      <Header title={t(siteKey(site))} onBack={goBack} />
      <Card rim="health" title={t('measure.title')}>
        {ready && entries.length === 0 && !error &&
          <Typography tone="secondary">{t('measure.historyEmpty')}</Typography>}
        {entries.length > 0 && <MeasurementGraph points={points} hidden={hidden}
          accessibilityLabel={chartLabel(t, language, entries.length, hidden)}
          valueLabel={value => formatShownLength(value, unit, language)} />}
        {entries.map(entry => <ListRow key={entry.id}
          title={hidden ? t('trend.hidden') : formatMeasurement(entry.cm, unit, language)}
          detail={formatWhen(language, entry.measuredAt) + (entry.note ? ' · ' + entry.note : '')}
          onPress={() => openEdit(entry)} />)}
        {error && <>
          <Typography tone="secondary">{t('measure.loadError')}</Typography>
          <Button label={t('common.retry')} onPress={() => void load()} />
        </>}
      </Card>
    </ScrollView>
    <Sheet visible={editing !== null} title={t('measure.edit')} description={t('measure.privacy')}
      onClose={() => { if (!busy) setEditing(null); }}>
      <Field label={t('measure.field', { site: t(siteKey(site)), unit: lengthUnitLabel(language, unit) })}
        value={entered} onChangeText={setEntered} keyboardType="decimal-pad"
        error={parsed.kind === 'invalid' ? t('measure.invalid') : undefined} />
      <Field label={t('trend.date')} value={day} onChangeText={setDay} placeholder={t('trend.datePlaceholder')} />
      <Field label={t('trend.note')} value={note} onChangeText={setNote} multiline />
      <Button label={t('trend.saveChanges')} disabled={!canSave || busy} fullWidth onPress={() => void save()} />
      <Button label={t('measure.delete')} variant="danger" disabled={busy} onPress={() => void remove()} />
    </Sheet>
  </Screen>;
}
