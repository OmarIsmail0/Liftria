import {router,useFocusEffect} from 'expo-router';
import {useCallback,useState} from 'react';
import {Button,Card,Chip,Header,ListRow,Screen,Typography} from '../../../src/design/primitives';
import {useLanguage} from '../../../src/i18n/LanguageProvider';
import {listHikuUsage,type RequestUsage} from '../../../src/features/hiku/requestRepository';
import {HIKU_PRICE_SOURCE,HIKU_PRICE_VERSION} from '../../../src/features/hiku/models';
export default function HikuUsage(){
 const {t}=useLanguage();const [rows,setRows]=useState<RequestUsage[]>([]),[error,setError]=useState(false);
 useFocusEffect(useCallback(()=>{
  void listHikuUsage().then(r=>{if(r.ok)setRows(r.value);else setError(true);});
 },[]));
 const month=new Date().toISOString().slice(0,7),current=rows.filter(row=>row.createdAt.startsWith(month));
 const known=current.filter(row=>row.costUsd!==null);
 const cost=known.reduce((sum,row)=>sum+(row.costUsd??0),0);
 return <Screen embedded>
  <Header title={t('hikuK.usageTitle')} onBack={()=>router.back()}/>
  <Card rim="hiku" title={t('hikuK.monthUsage')}>
   <Chip kind="estimate"/>
   <Typography>{t('hikuK.monthCost',{cost:cost.toFixed(5),count:current.length})}</Typography>
   {current.some(r=>r.costUsd===null)&&<Typography tone="secondary">{t('hikuK.costUnknown')}</Typography>}
   <Typography tone="secondary" size="small">{t('hikuK.priceNote',{date:HIKU_PRICE_VERSION})}</Typography>
   <Typography tone="secondary" size="small">{HIKU_PRICE_SOURCE}</Typography>
  </Card>
  <Card title={t('hikuK.requests')}>
   {rows.length===0&&<Typography tone="secondary">{t('hikuK.noRequests')}</Typography>}
   {rows.map(row=><ListRow key={row.id} title={row.model}
    detail={row.createdAt.slice(0,16)+' · '+row.status+
      (row.costUsd===null?'': ' · $'+row.costUsd.toFixed(5))}/>)}
   {error&&<Typography>{t('eatI.error')}</Typography>}
  </Card>
  <Typography tone="secondary">{t('hikuK.usagePrivacy')}</Typography>
  <Button label={t('hikuK.apiKey')} variant="secondary" onPress={()=>router.push('/settings/hiku-key')}/>
 </Screen>;
}
