import {router,useFocusEffect} from 'expo-router';
import {useCallback,useState} from 'react';
import {Linking,View} from 'react-native';
import {Card,Chip,Header,ListGroup,ListRow,Screen,SectionHeader,Typography} from '../../../src/design/primitives';
import {useLanguage} from '../../../src/i18n/LanguageProvider';
import {pluralForm,type TranslationKey,languages} from '../../../src/i18n';
import {listHikuUsage,type RequestUsage} from '../../../src/features/hiku/requestRepository';
import {HIKU_PRICE_SOURCE,HIKU_PRICE_VERSION,classifyHikuCostUsd,formatHikuUsd,hikuModelName} from '../../../src/features/hiku/models';
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
 const translateStatus=(status:string)=>{
  const key=`hikuK.requestStatus.${status}` as TranslationKey;
  if(key in languages[language])return t(key);
  return status;
 };
 return <Screen embedded>
  <Header mode="inline" title={t('hikuK.usageTitle')} onBack={()=>router.back()}/>
  <View style={{gap:12}}>
   <Card title={t('hikuK.monthUsage')}>
    <Chip kind="estimate"/>
    <Typography>{monthCost===null?t('hikuK.monthCostUnknown',{requests:requestCount}):
     t('hikuK.monthCost',{cost:monthCost,requests:requestCount})}</Typography>
    {current.some(r=>r.costUsd===null)&&<Typography tone="secondary">{t('hikuK.costUnknown')}</Typography>}
    <Typography tone="secondary" size="secondary">{t('hikuK.priceNote',{date:HIKU_PRICE_VERSION})}</Typography>
   </Card>
   <ListGroup>
    <ListRow title={t('hikuK.priceSourceLink')} onPress={()=>{void Linking.openURL(HIKU_PRICE_SOURCE);}}/>
   </ListGroup>
  </View>
  <View style={{gap:8}}>
   <SectionHeader title={t('hikuK.requests')}/>
   {rows.length===0?<Typography tone="secondary">{t('hikuK.noRequests')}</Typography>:<ListGroup>
    {rows.map(row=>{
     const rowCost=formatRowCost(row.costUsd);
     const modelName=hikuModelName(row.model,language);
     const statusText=translateStatus(row.status);
     return <ListRow key={row.id} title={modelName}
      detail={row.createdAt.slice(0,16)+' · '+statusText+(rowCost?' · '+rowCost:'')}/>;
    })}
   </ListGroup>}
  </View>
  {error&&<Typography>{t('eatI.error')}</Typography>}
  <Typography tone="secondary">{t('hikuK.usagePrivacy')}</Typography>
  <ListGroup>
   <ListRow title={t('hikuK.apiKey')} onPress={()=>router.push('/settings/hiku-key')}/>
  </ListGroup>
 </Screen>;
}
