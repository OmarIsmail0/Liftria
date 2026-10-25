import { Linking, RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../../src/design/ThemeProvider';
import { Button, Card, Chip, Header, ListRow, Screen, Typography } from '../../../src/design/primitives';
import { backOrReplace } from '../../../src/navigation/back';
import { type MetricType } from '../../../src/services/health/types';
import { overviewMetrics, useHealthSnapshot } from '../../../src/features/health/useHealthSnapshot';
import { canInstallHealthConnect, earliestCachedRecordAt } from '../../../src/features/health/presentation';
import { formatNumber, type TranslationKey } from '../../../src/i18n';
import { useLanguage } from '../../../src/i18n/LanguageProvider';

const names: Partial<Record<MetricType,TranslationKey>> = {
  steps:'healthOverview.steps','heart-rate':'healthOverview.heartRate',
  'exercise-session':'healthOverview.exercise','sleep-session':'healthOverview.sleep',
  weight:'healthOverview.weight','body-fat':'healthOverview.bodyFat',
  'active-calories':'healthOverview.energy',
};

export default function HealthOverview() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const locale = language==='ar'?'ar-EG-u-nu-latn':'en-US';
  const { snapshot, refreshing, refresh } = useHealthSnapshot(overviewMetrics);
  const available = snapshot.availability === 'available';
  const allowed = overviewMetrics.filter(m => snapshot.permissions[m] === 'granted').length;
  const firstSeen = earliestCachedRecordAt(snapshot.records);
  const sourceLabel=(label:string)=>label==='Phone'?t('chips.phone'):label==='Unknown source'?t('healthOverview.unknownSource'):label;
  const age=(iso:string):string=>{
    const at=Date.parse(iso);
    if(!Number.isFinite(at))return t('healthOverview.timeUnknown');
    const mins=Math.max(0,Math.floor((Date.now()-at)/60000));
    if(mins<60)return t('healthOverview.minutesAgo',{count:mins});
    const hours=Math.floor(mins/60);
    return hours<24?t('healthOverview.hoursAgo',{count:hours}):
      t('healthOverview.daysAgo',{count:Math.floor(hours/24)});
  };
  const availability=()=>snapshot.availability===null?t('healthOverview.checkingStatus'):
    snapshot.availability==='available'?t('healthOverview.available'):
    snapshot.availability==='not-installed'?t('healthOverview.missing'):
    snapshot.availability==='needs-update'?t('healthOverview.update'):t('healthOverview.unsupported');
  const readingNote=(note:string)=>note==='Not allowed'?t('healthOverview.notAllowed'):
    note==='Not available'?t('healthOverview.notAvailable'):
    note==='Permission not confirmed'?t('healthOverview.unknownPermission'):
    note==='No data'?t('healthOverview.noData'):
    note==='Unverified device. The data origin does not prove this came from a watch.'?t('healthOverview.noteUnverified'):
    note==='Separate sources; no combined total.'?t('healthOverview.noteSeparate'):note;
  const energyNote=()=>!available?t('healthOverview.notAvailable'):
    snapshot.permissions['active-calories']==='denied'?t('healthOverview.notAllowed'):
    snapshot.permissions['active-calories']==='unknown'?t('healthOverview.unknownPermission'):
    t('healthOverview.noMeasure');
  if (!snapshot.loaded) return <Screen embedded>
    <Header title={t('healthOverview.health')} subtitle={t('healthOverview.checking')} />
    <View style={{ gap: theme.layout.cardGap, paddingTop: theme.space[4] }}>
      <Typography tone="secondary">{t('healthOverview.loading')}</Typography>
    </View>
  </Screen>;
  return <Screen embedded scroll={false}>
    <ScrollView contentContainerStyle={{ paddingVertical: theme.space[4], gap: theme.layout.cardGap }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh(true)}
        colors={[theme.color.domain.health]} tintColor={theme.color.domain.health} />}>
      <Header title={t('healthOverview.health')} subtitle={t('healthOverview.readOnly')}
        onBack={() => backOrReplace(router, '/(tabs)/progress')} />
      <Card rim="health" title={available ? t('healthOverview.connected') : t('healthOverview.connect')}>
        <Typography tone="secondary">{t('healthOverview.privacy')}</Typography>
        <Typography>{availability()}</Typography>
        <Typography>{available
          ? t('healthOverview.allowed',{allowed,total:overviewMetrics.length})
          : t('healthOverview.hidden')}</Typography>
        <Typography tone="secondary" size="small">{firstSeen
          ? t('healthOverview.fromDate',{date:new Date(firstSeen).toLocaleDateString(locale)})
          : t('healthOverview.noCached')}</Typography>
        <Button label={available ? t('healthOverview.review') : t('healthOverview.permissions')} variant="secondary"
          onPress={() => router.push('/(tabs)/progress/health-permissions')} />
        {!available && canInstallHealthConnect(snapshot.availability) &&
          <Button label={t("healthOverview.get")} onPress={() =>
            void Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata')} />}
        {!available && <Typography tone="secondary">{t('healthOverview.worksWithout')}</Typography>}
        {snapshot.readAt && <Typography tone="secondary" size="small">{t('healthOverview.lastChecked',{time:new Date(snapshot.readAt).toLocaleTimeString(locale)})}</Typography>}
      </Card>
      <Card title={t("healthOverview.measurements")} rim="health">
        {overviewMetrics.map(metric => {
          const result = snapshot.readings[metric];
          if (metric === 'active-calories') {
            const state = energyNote();
            return <ListRow key={metric} title={t('healthOverview.energy')} detail={state}
              suffix={<Chip kind="off" label={state} />}
              onPress={() => router.push({ pathname: '/(tabs)/progress/health-detail', params: { metric } })} />;
          }
          const first = result?.sources[0];
          const state = result?.state;
          const detail = result?.state === 'value'
            ? result.sources.length > 1 ? t('healthOverview.separate')
              : t('healthOverview.sourceTimeUnverified',{source:sourceLabel(first?.label??'Unknown source'),
                time:first?age(first.latestAt):t('healthOverview.timeUnknown'),
                warning:result.unverified?t('healthOverview.unverifiedDevice'):''}).replace(/ · $/,'')
            : result?.note ? readingNote(result.note) : t('healthOverview.checking');
          const amount = result?.state === 'value' && result.total !== null
            ? `${formatNumber(language,Math.round(result.total))} ${first?.unit ?? ''}` : null;
          return <ListRow key={metric} title={names[metric]?t(names[metric]):metric} detail={detail}
            suffix={result?.state === 'value' ? <View style={{ alignItems:'flex-end',gap:theme.space[1] }}>
              {amount && <Typography>{amount}</Typography>}
              {result.sources.map(source => <View key={source.origin}
                style={{ alignItems:'flex-end', gap:theme.space[1] }}>
                <Chip kind={metric === 'steps' && source.label === 'Phone' ? 'phone' : 'pending'}
                  label={metric === 'heart-rate' ? t('healthOverview.hrSource',{source:sourceLabel(source.label)}):sourceLabel(source.label)} />
                {source.stale && <Chip kind="stale" label={age(source.latestAt)} />}
              </View>)}
            </View> : <Chip kind={state === 'not-allowed' ? 'off' : 'pending'}
              label={state === 'no-data'?t('healthOverview.noData'):state === 'not-allowed'?t('healthOverview.notAllowed'):
                state === 'not-available'?t('healthOverview.unavailable'):state === 'error'?t('healthOverview.readError'):t('healthOverview.pending')} />}
            onPress={() => router.push({ pathname: '/(tabs)/progress/health-detail', params: { metric } })} />;
        })}
      </Card>
      <Card title={t("healthOverview.watchMissing")}>
        <Typography tone="secondary">{t('healthOverview.watchExplain')}</Typography>
        <ListRow title={t('healthOverview.sync')} detail={t('healthOverview.syncDetail')}
          onPress={() => router.push('/(tabs)/progress/health-sync')} />
        <ListRow title={t('healthOverview.troubleshoot')} detail={t('healthOverview.troubleshootDetail')}
          onPress={() => router.push('/(tabs)/progress/health-troubleshoot')} />
      </Card>
      <View style={{ alignItems: 'center' }}>
        <Typography size="small" tone="secondary">{t('healthOverview.footer')}</Typography>
      </View>
    </ScrollView>
  </Screen>;
}
