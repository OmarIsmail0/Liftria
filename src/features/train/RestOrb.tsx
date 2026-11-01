import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../design/ThemeProvider';
import { Typography } from '../../design/primitives';
import { useLanguage } from '../../i18n/LanguageProvider';
import { restOrbTextSize } from './restClock';

/** Static, reduced-motion safe rest countdown ring with explicit timer text alternative.
 * The fraction is the same ceiled seconds as the label. Words use a smaller line so they stay inside the ring. */
export function RestOrb({fraction,label}:{fraction:number;label:string}) {
  const {theme}=useTheme();
  const {t}=useLanguage();
  const circumference=2*Math.PI*85;
  const shown=Number.isFinite(fraction)?Math.max(0,Math.min(1,fraction)):0;
  const clock=restOrbTextSize(label)==='metric-xl';
  return <View accessible accessibilityRole="timer" accessibilityLabel={t('restOrb.a11y',{label})}
    style={{alignSelf:'center',width:200,height:200,justifyContent:'center',alignItems:'center'}}>
    <Svg width={200} height={200} viewBox="0 0 200 200" style={{position:'absolute'}}>
      <Circle cx={100} cy={100} r={92} fill={theme.color.tint.train}/>
      <Circle cx={100} cy={100} r={85} stroke={theme.color.border.subtle} fill="none" strokeWidth={9}/>
      <Circle cx={100} cy={100} r={85} stroke={theme.color.domain.train} fill="none" strokeWidth={9}
        strokeLinecap="round" rotation={-90} origin="100,100"
        strokeDasharray={String(circumference)} strokeDashoffset={circumference*(1-shown)}/>
    </Svg>
    <View style={{width:clock?156:148,alignItems:'center'}}>
      <Typography size={restOrbTextSize(label)} lines={1}>{label}</Typography>
      {clock?<Typography tone="secondary" size="small" lines={1}>{t('restOrb.caption')}</Typography>:null}
    </View>
  </View>;
}
