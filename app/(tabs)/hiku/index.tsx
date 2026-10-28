import {router,useFocusEffect} from 'expo-router';
import {useCallback,useState} from 'react';
import {Button,Card,Chip,Header,ListRow,Screen,Typography} from '../../../src/design/primitives';
import {useLanguage} from '../../../src/i18n/LanguageProvider';
import {getTypedSetting} from '../../../src/services/database/settings';
import {keyState} from '../../../src/services/secure-storage';
import {listHikuUsage} from '../../../src/features/hiku/requestRepository';
import {hikuModel,type HikuModelId,DEFAULT_HIKU_MODEL} from '../../../src/features/hiku/models';

export default function HikuHome(){
 const {t,language}=useLanguage();
 const [key,setKey]=useState(false),[model,setModel]=useState<HikuModelId>(DEFAULT_HIKU_MODEL);
 const [requests,setRequests]=useState(0);
 useFocusEffect(useCallback(()=>{
  let active=true;
  void Promise.all([keyState(),getTypedSetting('hiku.model'),listHikuUsage()]).then(([k,m,u])=>{
   if(!active)return;
   setKey(k.status==='ready');if(m.ok)setModel(m.value);if(u.ok)setRequests(u.value.length);
  });return()=>{active=false;};
 },[]));
 const current=hikuModel(model);
 return <Screen embedded>
  <Header title={t('nav.hiku')}/>
  <Card rim="hiku" title={t('hikuK.title')}>
   <Typography tone="secondary">{t('hikuK.intro')}</Typography>
   <Typography tone="secondary" size="small">{language==='ar'?current.nameAr:current.nameEn}</Typography>
   {!key&&<Typography tone="secondary">{t('hikuK.noKey')}</Typography>}
   <Button label={t('hikuK.describe')} fullWidth
    onPress={()=>router.push('/(tabs)/hiku/describe')}/>
   <Button label={t('hikuK.apiKey')} variant="secondary" onPress={()=>router.push('/settings/hiku-key')}/>
  </Card>
  <Card rim="hiku" title={t('hikuPhoto.title')}>
   <Chip kind="pending" label={t('hikuPhoto.beta')}/>
   <Typography tone="secondary">{t('hikuPhoto.warning')}</Typography>
   <Button label={t('hikuPhoto.open')} variant="secondary"
    onPress={()=>router.push('/(tabs)/hiku/photo')}/>
  </Card>
  <Card title={t('hikuK.usageTitle')}>
   <Typography tone="secondary">{requests?t('hikuK.requestCount',{count:requests}):t('hikuK.noRequests')}</Typography>
   <ListRow title={t('hikuK.usageLink')} onPress={()=>router.push('/(tabs)/hiku/usage')}/>
  </Card>
 </Screen>;
}
