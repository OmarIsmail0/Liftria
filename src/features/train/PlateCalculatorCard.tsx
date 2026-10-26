import {useFocusEffect} from 'expo-router';
import {useCallback,useState} from 'react';
import {View} from 'react-native';
import {Button,Card,Stepper,Typography} from '../../design/primitives';
import {useLanguage} from '../../i18n/LanguageProvider';
import {getTypedSetting} from '../../services/database/settings';
import {calculatePlates,suggestedWarmups} from './plateCalculator';
import {fromKg,toKg,type WeightUnit} from './workoutUnits';
import {useTheme} from '../../design/ThemeProvider';
export type WarmupPick={weight:number;reps:number};
/** Read-only suggestions. This component never writes any set or setting. */
export function PlateCalculatorCard({targetKg,onWarmup}:{
 targetKg?:number;onWarmup?:(item:WarmupPick)=>void;
}){
 const {t}=useLanguage(),{theme}=useTheme();
 const [unit,setUnit]=useState<WeightUnit>('kg'),[barKg,setBarKg]=useState(20),
 [barLb,setBarLb]=useState(45),[small,setSmall]=useState(false);
 const [manual,setManual]=useState<number|null>(null);
 useFocusEffect(useCallback(()=>{
  let live=true;
  void Promise.all([getTypedSetting('units.weight'),getTypedSetting('train.barKg'),
   getTypedSetting('train.barLb'),getTypedSetting('units.smallPlates')]).then(([u,k,b,s])=>{
    if(!live)return;
    if(u.ok)setUnit(u.value);if(k.ok)setBarKg(k.value);
    if(b.ok)setBarLb(b.value);if(s.ok)setSmall(s.value);
   });return()=>{live=false;};
 },[]));
 const bar=unit==='kg'?barKg:barLb;
 const target=manual??(targetKg&&targetKg>0?fromKg(targetKg,unit):bar);
 const result=calculatePlates(target,bar,unit,small);
 const warmups=suggestedWarmups(toKg(target,unit),bar,unit,small);
 const label=(n:number)=>String(Number(n.toFixed(2)));
 return <Card title={t('gymParity.plates')} rim="train">
   <Stepper label={t('gymParity.targetWeight',{unit})} value={target}
    min={0} max={unit==='kg'?1000:2200} step={unit==='kg'?2.5:5}
    unit={unit} onChange={setManual}/>
   <Typography tone="secondary" size="small">{t('gymParity.barWeight',{unit})+': '+label(bar)+' '+unit}</Typography>
   {result.belowBar&&<Typography tone="secondary">{t('gymParity.belowBar')}</Typography>}
   <Typography bold>{result.exact?t('gymParity.exactWeight',{weight:label(result.actual),unit}):
      t('gymParity.cannotMake',{weight:label(result.actual),unit})}</Typography>
   <Typography>{t('gymParity.perSide')}</Typography>
   {result.perSide.length?<View style={{flexDirection:'row',flexWrap:'wrap',gap:theme.space[2]}}>
      {result.perSide.map(p=><Typography key={p.weight}>{p.count} × {label(p.weight)} {unit}</Typography>)}
    </View>:<Typography tone="secondary">{t('gymParity.barOnly')}</Typography>}
   {onWarmup&&<>
     <Typography bold>{t('gymParity.warmups')}</Typography>
     <Typography tone="secondary" size="small">{t('gymParity.warmupDisclaimer')}</Typography>
     {warmups.map((row,i)=><Button key={i} variant="secondary" fullWidth
       label={t('gymParity.warmupStep',{weight:label(row.actual),unit,reps:row.reps})}
       onPress={()=>onWarmup({weight:row.weightKg,reps:row.reps})}/>)}
   </>}
  </Card>;
}
