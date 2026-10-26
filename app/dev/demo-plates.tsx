import {router} from 'expo-router';
import {Button,Card,Header,Screen,Typography} from '../../src/design/primitives';
import {useLanguage} from '../../src/i18n/LanguageProvider';
export default function DemoPlates(){
 const {t}=useLanguage();
 return <Screen>
  <Header title={t('gymParity.demoPlates')} onBack={()=>router.back()}/>
  <Card rim="train">
   <Typography tone="secondary">{t('gymParity.warmupDisclaimer')}</Typography>
   <Button label={t('gymParity.plates')} onPress={()=>router.push({
    pathname:'/(tabs)/train/plates',params:{target:'100'}})}/>
  </Card>
 </Screen>;
}
