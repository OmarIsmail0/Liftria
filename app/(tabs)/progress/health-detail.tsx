import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, View  } from 'react-native';
import { appleHealthPhone, formatAppleAmount, healthCopy } from '../../../src/features/health/deviceHealth';
import { useTheme } from '../../../src/design/ThemeProvider';
import { Button, Card, Chip, Header, ListRow, Screen, Typography } from '../../../src/design/primitives';
import { backOrReplace } from '../../../src/navigation/back';
import { healthConnect, readDailyEnergy } from '../../../src/services/health';
import { metricTypes, type HealthValue, type HealthRecord, type MetricType } from '../../../src/services/health/types';
import { overviewMetrics, useHealthSnapshot } from '../../../src/features/health/useHealthSnapshot';
import { StepsChart, HeartRateChart } from '../../../src/features/health/HealthCharts';
import { appleWindowSummary, dailyStepsBySource, emptyMetricState, heartRateSamples,
  hourlyStepsBySource, NOTE_APPLE_READ_ERROR, NOTE_APPLE_TOTAL, recordsInWindow, SOURCE_APPLE,
  sourceName, summarizeAppleTotal, summarizeRecords,
  type HealthSummary } from '../../../src/features/health/presentation';
import { formatNumber, pluralForm, type TranslationKey } from '../../../src/i18n';
import { useLanguage } from '../../../src/i18n/LanguageProvider';

const label: Partial<Record<MetricType,TranslationKey>> = {
  steps:'healthMetric.steps','heart-rate':'healthMetric.heart',
  'exercise-session':'healthMetric.session','sleep-session':'healthMetric.sleep',
  weight:'healthMetric.weight','body-fat':'healthMetric.fat','active-calories':'healthMetric.energy',
};
function metricOf(r: HealthValue): MetricType {
  return r.kind === 'session' ? 'exercise-session' : r.kind === 'sleep' ? 'sleep-session' : r.metric;
}
function recordTime(r: HealthValue): string {
  return r.kind === 'instant' || r.kind === 'rate' ? r.time :
    r.kind === 'aggregate' ? r.windowEnd : r.end;
}

function HealthMetricDetailAndroid() {
  const { metric: param } = useLocalSearchParams<{ metric: string }>();
  const metric: MetricType = typeof param === 'string' && metricTypes.includes(param as MetricType)
    ? param as MetricType : 'steps';
  const { theme } = useTheme();
  const { t,language } = useLanguage();
  const locale=language==='ar'?'ar-EG-u-nu-latn':'en-US';
  const { snapshot, refresh, refreshing } = useHealthSnapshot(overviewMetrics);
  const [window, setWindow] = useState<'day' | 'week'>('day');
  const [week, setWeek] = useState<HealthSummary | null>(null);
  const [weekRecords, setWeekRecords] = useState<HealthValue[]>([]);
  const [weekRefresh, setWeekRefresh] = useState(0);
  const [showEstimate, setShowEstimate] = useState(false);
  const [estimate, setEstimate] = useState<{ kcal: number; type: string } | null>(null);
  const permission = snapshot.permissions[metric];
  const available = snapshot.availability === 'available';
  const permitted = appleHealthPhone() ? available && permission !== 'denied' : permission === 'granted';
  const base = snapshot.readings[metric];
  const today = new Date(), start = new Date(today);
  start.setHours(0,0,0,0);
  const weekStart = new Date(start); weekStart.setDate(weekStart.getDate() - 6);
  const rangeStart = window === 'day' ? start : weekStart;
  const dayScoped = appleHealthPhone()
    ? appleWindowSummary(metric, snapshot.records, start, today, available)
    : summarizeRecords(metric,
      recordsInWindow(metric, snapshot.records, start, today),
      snapshot.permissions[metric] ?? 'unknown', available);
  const dayResult = base?.state === 'error'
    ? { ...dayScoped, state: 'error' as const, note: base.note } : dayScoped;
  const result = window === 'week' ? (!available || !permitted
    ? emptyMetricState(metric, snapshot.permissions[metric] ?? 'unknown', available) : week) : dayResult;
  // Week never falls back to day readings or a previous metric's results.
  const sourceRecords = window === 'day' ? snapshot.records : weekRecords;
  const rangeStartMs = rangeStart.getTime();
  const records: HealthRecord[] = !permitted || !available || (window === 'week' && week === null)
    ? [] : sourceRecords.filter((r): r is HealthRecord => r.kind !== 'aggregate' &&
      metricOf(r) === metric && Date.parse(recordTime(r)) >= rangeStartMs &&
      Date.parse(recordTime(r)) <= today.getTime())
      .sort((a,b) => recordTime(b).localeCompare(recordTime(a))).slice(0,50);
  useEffect(() => {
    if (window !== 'week' || !available || !permitted) return;
    let mounted = true;
    const until = new Date(), from = new Date(until);
    from.setDate(from.getDate() - 6); from.setHours(0,0,0,0);
    void healthConnect.read(metric, { start: from, end: until }).then(value => {
      if (!mounted) return;
      if (value.status === 'ok') {
        setWeekRecords(value.records);
        if (appleHealthPhone()) {
          const aggregate = value.records.find(row => row.kind === 'aggregate' && row.metric === metric && row.value > 0);
          setWeek(aggregate && aggregate.kind === 'aggregate'
            ? summarizeAppleTotal(metric, aggregate)
            : appleWindowSummary(metric, value.records, from, until, true));
        } else {
          setWeek(summarizeRecords(metric, recordsInWindow(metric, value.records, from, until), 'granted', true));
        }
      } else {
        setWeekRecords([]);
        setWeek(value.status === 'error'
          ? { ...emptyMetricState(metric, 'granted', true), state: 'error',
            note: t(healthCopy('metric.weekError')) }
          : emptyMetricState(metric, value.status === 'permission-denied' ? 'denied' : 'unknown',
            value.status !== 'unavailable'));
      }
    }).catch(() => { if (mounted) setWeek({ ...emptyMetricState(metric,'granted',true),
      state:'error', note:t(healthCopy('metric.weekReadError')) }); });
    return () => { mounted = false; };
  }, [metric, window, available, permitted, permission, weekRefresh, t]);

  useEffect(() => {
    if (appleHealthPhone() || metric !== 'active-calories' || !available ||
        snapshot.permissions['active-calories'] !== 'granted') return;
    let mounted = true;
    void readDailyEnergy(1).then(rows => {
      if (!mounted) return;
      const hidden = rows.find(row => row.status === 'no-source' && row.metric === 'total-calories');
      setEstimate(hidden && hidden.status === 'no-source'
        ? { kcal: hidden.value.value, type: 'total energy' } : null);
    }).catch(() => { if (mounted) setEstimate(null); });
    return () => { mounted = false; };
  }, [metric,available,snapshot.permissions]);

  const originLabel=(name:string)=>name==='Phone'?t('healthMetric.sourcePhone'):
    name==='Unknown source'?t('healthMetric.sourceUnknown'):
    name===SOURCE_APPLE?t('appleHealth.name'):name;
  const age=(iso:string):string=>{
    const parsed=Date.parse(iso);
    if(!Number.isFinite(parsed))return t('healthMetric.timeUnknown');
    const mins=Math.max(0,Math.floor((today.getTime()-parsed)/60000));
    const ago=(base:string,count:number)=>t((`${base}.${pluralForm(language,count)}`) as TranslationKey,{count});
    if(mins<60)return ago('healthMetric.minuteAge',mins);
    const hours=Math.floor(mins/60);
    return hours<24?ago('healthMetric.hourAge',hours):
      ago('healthMetric.dayAge',Math.floor(hours/24));
  };
  const displayNote=(value:string):string=>value==='Not allowed'?t('healthMetric.notAllowed'):
    value==='Not available'?t('healthMetric.notAvailable'):
    value==='Permission not confirmed'?t('healthMetric.permissionUnknown'):
    value==='No data'?t('healthMetric.noData'):
    value==='Unverified device. The data origin does not prove this came from a watch.'?t('healthMetric.sourceUnverified'):
    value==='Separate sources; no combined total.'?t('healthMetric.sourceSeparate'):
    value===NOTE_APPLE_TOTAL?t('appleHealth.overview.total'):
    value===NOTE_APPLE_READ_ERROR?t('appleHealth.readError'):
    language==='en'?value:t('healthMetric.readError');
  const describe=(r:HealthValue):string=>{
    if(r.kind==='interval')return appleHealthPhone()
      ? formatAppleAmount(language, r.value, r.metric==='steps'?'steps':r.unit)
      : formatNumber(language,r.value)+' '+r.unit;
    if(r.kind==='series')return t('healthMetric.heartSamples',{count:r.points.length});
    if(r.kind==='instant'||r.kind==='rate')return appleHealthPhone()
      ? formatAppleAmount(language, r.value, r.unit)
      : formatNumber(language,r.value)+' '+r.unit;
    if(r.kind==='session')return appleHealthPhone()
      ? formatAppleAmount(language, r.durationSec/60, 'minutes')
      : t((`healthMetric.minutes.${pluralForm(language,Math.round(r.durationSec/60))}`) as TranslationKey,{count:Math.round(r.durationSec/60)});
    return t('healthMetric.sleepSession');
  };
  const energyStatus=()=>!available?t('healthMetric.notAvailable'):
    permission==='denied'?t('healthMetric.notAllowed'):
    permission==='unknown'?t('healthMetric.permissionUnknown'):
    t('healthMetric.noMeasured');
  const energy = metric === 'active-calories';
  const sourceRows = result?.sources ?? [];
  const stepSeries = metric === 'steps' && permitted && available
    ? window === 'day' ? hourlyStepsBySource(sourceRecords, start, today)
      : dailyStepsBySource(sourceRecords, weekStart, today) : [];
  const hrSamples = metric === 'heart-rate' && permitted && available
    ? heartRateSamples(sourceRecords, rangeStart, today) : [];

  if (!snapshot.loaded) return <Screen embedded>
    <Header title={label[metric]?t(label[metric]):metric} subtitle={t('healthMetric.loading')} />
    <Typography tone="secondary">{t(healthCopy('metric.checkingPermission'))}</Typography>
  </Screen>;
  return <Screen embedded scroll={false}><ScrollView contentContainerStyle={{
    paddingVertical: theme.space[4], gap: theme.layout.cardGap }}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
      setWeek(null); setWeekRecords([]); setWeekRefresh(v => v+1); void refresh(true);
    }} colors={[theme.color.domain.health]} tintColor={theme.color.domain.health} />}>
    <Header title={label[metric]?t(label[metric]):metric} subtitle={t(healthCopy('metric.readOnly'))}
      onBack={() => backOrReplace(router, '/(tabs)/progress')} />
    <Card rim="health" title={t('healthMetric.measurement')}>
      <View style={{ flexDirection: 'row', gap: theme.space[2] }}>
        <Button label={t("healthMetric.day")} size="sm" variant={window === 'day' ? 'primary' : 'secondary'}
          onPress={() => { setWeek(null); setWindow('day'); }} />
        <Button label={t("healthMetric.week")} size="sm" variant={window === 'week' ? 'primary' : 'secondary'}
          onPress={() => { setWeek(null); setWeekRecords([]); setWeekRefresh(v => v+1); setWindow('week'); }} />
      </View>
      {energy && !appleHealthPhone() ? <>
        <Typography>{energyStatus()}</Typography>
        <Typography tone="secondary">{t('healthMetric.energyWarning')}</Typography>
        {permitted && estimate && <Button label={showEstimate?t('healthMetric.hideEstimate'):t('healthMetric.showEstimate')} variant="ghost"
          onPress={() => setShowEstimate(v => !v)} />}
        {permitted && showEstimate && estimate && <>
          <Chip kind="estimate" label={t('healthMetric.estimate')} />
          <Typography>{t('healthMetric.energyValue',{count:formatNumber(language,estimate.kcal),type:estimate.type==='total energy'?t('healthMetric.totalEnergy'):estimate.type})}</Typography>
          <Typography tone="secondary">{t('healthMetric.estimateNote')}</Typography>
        </>}
      </> : window === 'week' && week === null && available && permitted ? <Typography tone="secondary">{t('healthMetric.weekLoading')}</Typography>
        : result?.state === 'value' ? <>
          {metric === 'steps' && result.total !== null && (!appleHealthPhone() || result.total > 0) &&
            <Typography size="metric-l">{appleHealthPhone()
              ? formatAppleAmount(language, result.total, 'steps')
              : t('healthMetric.stepsTotal',{count:result.total})}</Typography>}
          {metric !== 'steps' && result.total !== null && (!appleHealthPhone() || result.total > 0) &&
            <Typography size="metric-l">{appleHealthPhone()
              ? formatAppleAmount(language, result.total, sourceRows[0]?.unit ?? '')
              : <>{formatNumber(language,result.total)} {sourceRows[0]?.unit}</>}</Typography>}
          {result.total === null && <Typography>{t('healthMetric.separate')}</Typography>}
          {result.unverified && <Chip kind="pending" label={t('healthMetric.unverified')} />}
          {result.note ? <Typography tone="secondary">{displayNote(result.note)}</Typography> : null}
        </>         : <Typography tone="secondary">{result?.note?displayNote(result.note):t(healthCopy('metric.checking'))}</Typography>}
      {appleHealthPhone() && result?.state === 'no-data' &&
        <Typography tone="secondary">{t('appleHealth.changeAccess')}</Typography>}
      {result?.state === 'value' && metric === 'steps' && !(appleHealthPhone() && stepSeries.length === 0) &&
        <StepsChart series={stepSeries} period={window} />}
      {result?.state === 'value' && metric === 'heart-rate' &&
        <HeartRateChart samples={hrSamples} />}
      {permitted && result?.state === 'value' && <Typography tone="secondary" size="small">
        {t(healthCopy('metric.sourceExplain'))}
      </Typography>}
    </Card>
    <Card title={t('healthMetric.sources')} rim="health">
      {sourceRows.length && permitted ? sourceRows.map(source =>
        <ListRow key={source.origin} title={originLabel(source.label)}
          detail={source.origin+' · '+(source.stale?t('healthMetric.stale',{time:age(source.latestAt)}):t('healthMetric.latest',{time:age(source.latestAt)}))}
          suffix={<Typography>{appleHealthPhone()
            ? formatAppleAmount(language, source.value, source.unit)
            : <>{formatNumber(language,source.value)} {source.unit}</>}</Typography>} />)
        : <Typography tone="secondary">{t('healthMetric.noSource')}</Typography>}
      <Typography size="small" tone="secondary">{t('healthMetric.originNote')}</Typography>
    </Card>
    <Card title={t('healthMetric.what')}>
      <Typography tone="secondary">{metric === 'steps'
        ? t(healthCopy('metric.stepsNote'))
        : metric === 'heart-rate'
          ? t(healthCopy('metric.heartNote'))
          : metric === 'sleep-session'
            ? t(healthCopy('metric.sleepNote'))
            : metric === 'exercise-session'
              ? t(healthCopy('metric.sessionNote'))
              : energy ? t(healthCopy('metric.energyNote'))
                : t(healthCopy('metric.otherNote'))}</Typography>
    </Card>
    <Card title={t('healthMetric.recent')}>
      {records.length ? records.map(r =>
        <ListRow key={r.adapter + ':' + r.dataOrigin + ':' + r.recordId}
          title={describe(r)}
          detail={t('healthMetric.recordLine',{source:originLabel(sourceName(r.dataOrigin)),time:new Date(recordTime(r)).toLocaleString(locale)})}
          onPress={() => router.push({ pathname: '/(tabs)/progress/health-record',
            params: { metric, recordId: r.recordId, origin: r.dataOrigin,
              adapter: r.adapter, readAt: snapshot.readAt ?? '' } })} />)
        : <Typography tone="secondary">{t(healthCopy('metric.noRecords'))}</Typography>}
    </Card>
  </ScrollView></Screen>;
}

export default function HealthMetricDetail(){
 return <HealthMetricDetailAndroid/>;
}
