import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../design/ThemeProvider';
import { Typography } from '../../design/primitives';
import { bidiIsolate } from '../../i18n';
import { useLanguage } from '../../i18n/LanguageProvider';

/** Static, reduced-motion safe rest countdown ring with explicit timer text alternative. */
export function RestOrb({remainingMs,totalMs,label}:{
  remainingMs:number;totalMs:number;label:string;
}) {
  const {theme}=useTheme();
  const {t,language}=useLanguage();
  const circumference=2*Math.PI*85;
  const fraction=totalMs>0?Math.max(0,Math.min(1,remainingMs/totalMs)):0;
  return <View accessible accessibilityRole="timer" accessibilityLabel={t('active.restTimerA11y',{
    time:bidiIsolate(language,label),
  })}
    style={{alignSelf:'center',width:200,height:200,justifyContent:'center',alignItems:'center'}}>
    <Svg width={200} height={200} viewBox="0 0 200 200" style={{position:'absolute'}}>
      <Circle cx={100} cy={100} r={92} fill={theme.color.tint.train}/>
      <Circle cx={100} cy={100} r={85} stroke={theme.color.border.subtle} fill="none" strokeWidth={9}/>
      <Circle cx={100} cy={100} r={85} stroke={theme.color.domain.train} fill="none" strokeWidth={9}
        strokeLinecap="round" rotation={-90} origin="100,100"
        strokeDasharray={String(circumference)} strokeDashoffset={circumference*(1-fraction)}/>
    </Svg>
    <Typography size="metric-xl">{label}</Typography>
    <Typography tone="secondary" size="small">{t('active.restLabel')}</Typography>
  </View>;
}
