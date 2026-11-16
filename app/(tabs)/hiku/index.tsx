import {router,useFocusEffect} from 'expo-router';
import {useCallback,useState} from 'react';
import {View} from 'react-native';
import {Button,Card,Chip,EmptyState,Header,ListGroup,ListRow,Screen,SectionHeader,Skeleton} from '../../../src/design/primitives';
import {pluralForm,type TranslationKey} from '../../../src/i18n';
import {useLanguage} from '../../../src/i18n/LanguageProvider';
import {keyState} from '../../../src/services/secure-storage';
import {listHikuUsage} from '../../../src/features/hiku/requestRepository';

export default function HikuHome(){
 const {t,language}=useLanguage();
 const [known,setKnown]=useState(false),[ready,setReady]=useState(false);
 const [requests,setRequests]=useState(0);
 useFocusEffect(useCallback(()=>{
  let active=true;
  void Promise.all([keyState(),listHikuUsage()]).then(([k,u])=>{
   if(!active)return;
   setReady(k.status==='ready');
   if(u.ok)setRequests(u.value.length);
   setKnown(true);
  }).catch(()=>{if(active)setKnown(true);});
  return()=>{active=false;};
 },[]));
 const usageDetail=requests
  ?t((`hikuK.requestCount.${pluralForm(language,requests)}`) as TranslationKey,{count:requests})
  :t('hikuK.noRequests');
 return <Screen embedded>
  <Header mode="large" title={t('nav.hiku')}/>
  {!known?<Skeleton height={168}/>:!ready?<Card>
   <EmptyState title={t('hikuK.setupTitle')} description={t('hikuK.setupBody')}
    action={<Button label={t('hikuK.addKey')} fullWidth
     onPress={()=>router.push('/settings/hiku-key')}/>}/>
  </Card>:<>
   <View style={{gap:12}}>
    <Button label={t('hikuK.describe')} fullWidth
     onPress={()=>router.push('/(tabs)/hiku/describe')}/>
    <View style={{gap:8}}>
     <Chip kind="pending" label={t('hikuPhoto.beta')}/>
     <Button label={t('hikuPhoto.open')} variant="tonal" fullWidth
      onPress={()=>router.push('/(tabs)/hiku/photo')}/>
    </View>
   </View>
   <View style={{gap:12}}>
    <View style={{gap:8}}>
     <SectionHeader title={t('hikuK.usageTitle')}/>
     <ListGroup>
      <ListRow title={t('hikuK.usageLink')} detail={usageDetail}
       onPress={()=>router.push('/(tabs)/hiku/usage')}/>
     </ListGroup>
    </View>
    <ListGroup>
     <ListRow title={t('hikuK.apiKey')} onPress={()=>router.push('/settings/hiku-key')}/>
    </ListGroup>
   </View>
  </>}
 </Screen>;
}
