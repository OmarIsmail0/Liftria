import {router} from 'expo-router';
import {Card,Header,Screen,Typography} from '../../design/primitives';
import {useLanguage} from '../../i18n/LanguageProvider';
import {backOrReplace,type BackFallback} from '../../navigation/back';

/** Shared honest iOS fallback for all former Health Connect pages.
 * Does not read, request, or imply the existence of Apple Health records. */
export function AppleHealthComing({backTo='/(tabs)/progress/health'}:{
 backTo?:BackFallback;
}){
 const {t}=useLanguage();
 return <Screen embedded>
  <Header title={t('iosHealth.title')} onBack={()=>backOrReplace(router,backTo)}/>
  <Card rim="health" title={t('iosHealth.coming')}>
   <Typography>{t('iosHealth.description')}</Typography>
   <Typography tone="secondary">{t('iosHealth.noData')}</Typography>
   <Typography tone="secondary" size="small">{t('iosHealth.askFirst')}</Typography>
  </Card>
 </Screen>;
}
