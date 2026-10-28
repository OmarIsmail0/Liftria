import {router,useFocusEffect} from 'expo-router';
import {useCallback,useState} from 'react';
import {Linking} from 'react-native';
import {Button,Card,Chip,Header,ListRow,Screen,Typography} from '../../../src/design/primitives';
import {useLanguage} from '../../../src/i18n/LanguageProvider';
import {pluralForm,type TranslationKey} from '../../../src/i18n';
import {listHikuUsage,type RequestUsage} from '../../../src/features/hiku/requestRepository';
import {HIKU_PRICE_SOURCE,HIKU_PRICE_VERSION,classifyHikuCostUsd,formatHikuUsd} from '../../../src/features/hiku/models';
export default function HikuUsage(){
 const {t,language}=useLanguage();const [rows,setRows]=useState<RequestUsage[]>([]),[error,setError]=useState(false);
 useFocusEffect(useCallback(()=>{
  void listHikuUsage().then(r=>{if(r.ok)setRows(r.value);else setError(true);});
 },[]));
 const month=new Date().toISOString().slice(0,7),current=rows.filter(row=>row.createdAt.startsWith(month));
 const known=current.filter(row=>row.costUsd!==null);
 const cost=known.reduce((sum,row)=>sum+(row.costUsd??0),0);
 const monthBand=classifyHikuCostUsd(current.length>0&&known.length===0?null:cost);
 const monthCost=monthBand==='less-than-cent'?t('hikuK.costLessThanCent'):
  monthBand==='amount'?formatHikuUsd(cost):null;
 const requestCount=t(('count.requests.'+pluralForm(language,current.length)) as TranslationKey,{count:current.length});
 const formatRowCost=(value:number|null)=>{
  const band=classifyHikuCostUsd(value);
  if(band==='unknown')return null;
  return band==='less-than-cent'?t('hikuK.costLessThanCent'):formatHikuUsd(value??0);
 };
 return <Screen embedded>
  <Header title={t('hikuK.usageTitle')} onBack={()=>router.back()}/>
  <Card rim="hiku" title={t('hikuK.monthUsage')}>
   <Chip kind="estimate"/>
   <Typography>{monthCost===null?t('hikuK.monthCostUnknown',{requests:requestCount}):
    t('hikuK.monthCost',{cost:monthCost,requests:requestCount})}</Typography>
   {current.some(r=>r.costUsd===null)&&<Typography tone="secondary">{t('hikuK.costUnknown')}</Typography>}
   <Typography tone="secondary" size="small">{t('hikuK.priceNote',{date:HIKU_PRICE_VERSION})}</Typography>
   <ListRow title={t('hikuK.priceSourceLink')} onPress={()=>{void Linking.openURL(HIKU_PRICE_SOURCE);}}/>
  </Card>
  <Card title={t('hikuK.requests')}>
   {rows.length===0&&<Typography tone="secondary">{t('hikuK.noRequests')}</Typography>}
   {rows.map(row=>{
    const rowCost=formatRowCost(row.costUsd);
    return <ListRow key={row.id} title={row.model}
     detail={row.createdAt.slice(0,16)+' · '+row.status+(rowCost?' · '+rowCost:'')}/>;
   })}
   {error&&<Typography>{t('eatI.error')}</Typography>}
  </Card>
  <Typography tone="secondary">{t('hikuK.usagePrivacy')}</Typography>
  <Button label={t('hikuK.apiKey')} variant="secondary" onPress={()=>router.push('/settings/hiku-key')}/>
 </Screen>;
}
