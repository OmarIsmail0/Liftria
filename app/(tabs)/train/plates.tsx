import {router,useLocalSearchParams} from 'expo-router';
import {Header,Screen} from '../../../src/design/primitives';
import {PlateCalculatorCard} from '../../../src/features/train/PlateCalculatorCard';
import {useLanguage} from '../../../src/i18n/LanguageProvider';
export default function PlatesScreen(){
 const {t}=useLanguage(),{target}=useLocalSearchParams<{target?:string}>();
 const n=Number(target);
 return <Screen embedded>
  <Header title={t('gymParity.plates')} onBack={()=>router.back()}/>
  <PlateCalculatorCard targetKg={Number.isFinite(n)&&n>0?n:undefined}/>
 </Screen>;
}
