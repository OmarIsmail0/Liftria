import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { appleHealthPhone, formatAppleAmount, healthAdapterVisible, healthCopy } from '../../../src/features/health/deviceHealth';
import { formatNumber, latinDigits } from '../../../src/i18n';
import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Card, Chip, Header, ListRow, Screen, Typography } from '../../../src/design/primitives';
import { listCachedHealth } from '../../../src/services/database';
import { healthConnect } from '../../../src/services/health';
import { metricTypes, type HealthRecord, type MetricType, type PermissionState } from '../../../src/services/health/types';
import { sourceName } from '../../../src/features/health/presentation';

function recordAt(value: HealthRecord): string {
  return value.kind === 'instant' || value.kind === 'rate' ? value.time : value.end;
}
function HealthRecordDetailAndroid() {
  const {t,language}=useLanguage();
  const dateLocale=language==='ar'?'ar-EG-u-nu-latn':'en-US';
  const measuredValue=(value: HealthRecord):string=>{
   if(value.kind==='interval')return appleHealthPhone()
    ? formatAppleAmount(language,value.value,value.metric==='steps'?'steps':value.unit)
    : formatNumber(language,value.value)+' '+value.unit;
   if(value.kind==='series')return t('healthRecord.samples',{count:value.points.length});
   if(value.kind==='instant'||value.kind==='rate')return appleHealthPhone()
    ? formatAppleAmount(language,value.value,value.unit)
    : formatNumber(language,value.value)+' '+value.unit;
   if(value.kind==='session')return appleHealthPhone()
    ? formatAppleAmount(language,value.durationSec/60,'minutes')
    : t('healthRecord.exercise',{minutes:Math.round(value.durationSec/60)});
   return t('healthRecord.sleep');
  };

  const query = useLocalSearchParams<{ metric: string; recordId: string; origin: string; adapter: string; readAt?: string }>();
  const metric = metricTypes.includes(query.metric as MetricType) ? query.metric as MetricType : 'steps';
  const [record,setRecord] = useState<HealthRecord|null>(null);
  const [loading,setLoading] = useState(true);
  const [permission,setPermission] = useState<PermissionState>('unknown');
  useEffect(() => {
    let mounted = true;
    void Promise.all([listCachedHealth(500),healthConnect.getAvailability()]).then(async ([cached,available]) => {
      const rows = cached.ok ? cached.value.filter(row => healthAdapterVisible(row.adapter)) : [];
      const match = rows.find((r): r is HealthRecord =>
        r.kind !== 'aggregate' && r.recordId === query.recordId &&
        r.dataOrigin === query.origin && r.adapter === query.adapter) ?? null;
      if (appleHealthPhone()) {
        if (!mounted) return;
        setPermission('unknown');
        setRecord(match);
        return;
      }
      const permitted = available === 'available' ?
        (await healthConnect.getPermissionStatus([metric]))[metric] : 'unknown';
      if (!mounted) return;
      setPermission(permitted);
      if (permitted === 'granted') setRecord(match);
    }).catch(() => { /* Stay private when permission cannot be checked. */ })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [metric,query.recordId,query.origin,query.adapter]);

  return <Screen embedded>
    <Header title={t('healthRecord.title')} subtitle={t(healthCopy('record.readOnly'))}
      onBack={() => { if (router.canGoBack()) router.back(); else router.replace({ pathname: '/(tabs)/progress/health-detail', params: { metric } }); }} />
    {loading ? <Typography tone="secondary">{t(healthCopy('record.loading'))}</Typography> :
      !appleHealthPhone() && permission !== 'granted' ? <Card title={t('healthRecord.notAllowed')}>
        <Typography>{t('healthRecord.hidden')}</Typography>
      </Card> : !record ? <Card title={t('healthRecord.notAvailable')}>
        <Typography>{t(healthCopy('record.notFound'))}</Typography>
        {appleHealthPhone() && <Typography tone="secondary">{t('appleHealth.changeAccess')}</Typography>}
      </Card> : <>
        <Card rim="health" title={t('healthRecord.recorded')}>
          <Chip kind={record.kind === 'interval' && record.metric === 'steps' &&
            sourceName(record.dataOrigin) === 'Phone' ? 'phone' : 'pending'}
            label={sourceName(record.dataOrigin)} />
          <Chip kind="pending" label={t('healthRecord.unverified')} />
          <ListRow title={t('healthRecord.value')} detail={measuredValue(record)} />
          <ListRow title={t('healthRecord.time')} detail={new Date(recordAt(record)).toLocaleString(dateLocale)} />
          <ListRow title={t('healthRecord.origin')} detail={`${sourceName(record.dataOrigin)} · ${record.dataOrigin}`} />
          <ListRow title={t('healthRecord.device')} detail={record.device?.model
            ? `${record.device.manufacturer ?? ''} ${record.device.model}`
            : t('healthRecord.noDevice')} />
          <ListRow title={t('healthRecord.recordedRead')} detail={t('healthRecord.recordedAt',{time:latinDigits(new Date(recordAt(record)).toLocaleTimeString(dateLocale))})+' · '+(query.readAt?t('healthRecord.checked',{time:latinDigits(new Date(query.readAt).toLocaleTimeString(dateLocale))}):t('healthRecord.noReadTime'))} />
          <ListRow title={t('healthRecord.permission')} detail={appleHealthPhone()?t('appleHealth.record.access'):t('healthRecord.allowed')} />
        </Card>
        <Card title={t('healthRecord.aboutFields')}>
          <Typography tone="secondary">{t(healthCopy('record.originNote'))}</Typography>
          <Typography tone="secondary">{t(healthCopy('record.noWrite'))}</Typography>
        </Card>
      </>}
  </Screen>;
}

export default function HealthRecordDetail(){
 return <HealthRecordDetailAndroid/>;
}
