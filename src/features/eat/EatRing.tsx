import {I18nManager,View} from 'react-native';
import {Orb} from '../../design/primitives';
import {useTheme} from '../../design/ThemeProvider';
import {useLanguage} from '../../i18n/LanguageProvider';

export function EatRing({eaten,target,hidden=false,onPress}:{
 eaten:number;target:number|null;hidden?:boolean;onPress?:()=>void;
}){
 const {theme}=useTheme();
 const {language}=useLanguage();
 const rtl=language==='ar'||I18nManager.isRTL;
 if(!rtl)return <Orb eaten={eaten} target={target} hidden={hidden} onPress={onPress}/>;
 const size=theme.orbSize.today;
 return <View style={{
  width:size,height:size,alignSelf:'center',borderRadius:theme.radius.pill,
  overflow:'hidden',backgroundColor:'transparent',direction:'ltr',
 }}>
  {/* Android RTL + animated transforms can draw a dark square around the full ring. */}
  <Orb eaten={eaten} target={target} hidden={hidden} active={false} onPress={onPress}/>
 </View>;
}
