import { router, useFocusEffect } from 'expo-router';
import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { bidiIsolate, formatNumber, latinDigits, weightUnitLabel } from '../../../src/i18n';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../../src/design/ThemeProvider';
import { Button, Card, Chip, Header, ListRow, Screen, SegmentedControl, Typography } from '../../../src/design/primitives';
import { readRecords } from '../../../src/services/database/gymRepositories';
import { readStrengthObservations, type StrengthObservation } from '../../../src/services/database/historyRepository';
import { strengthWeeks, strengthWindowSummary } from '../../../src/features/train/recoveryMath';
import type { ExerciseRecord } from '../../../src/services/database/gymMath';
import { fromKg, type WeightUnit } from '../../../src/features/train/workoutUnits';
import { getTypedSetting } from '../../../src/services/database/settings';
import { exerciseName } from '../../../src/i18n/exerciseNames';

type Range='4w'|'3m'|'1y';
export default function Strength(){
  const { t: tr, language } = useLanguage();
  const {theme}=useTheme();
 const [rows,setRows]=useState<StrengthObservation[]>([]);
 const [records,setRecords]=useState<ExerciseRecord[]>([]);
 const [range,setRange]=useState<Range>('4w');
 const [unit,setUnit]=useState<WeightUnit>('kg');
 const [error,setError]=useState(false);
 const refresh=useCallback(async()=>{
  const [s,r]=await Promise.all([readStrengthObservations(),readRecords()]);
  if(s.ok)setRows(s.value);else setError(true);
  if(r.ok)setRecords(r.value);else setError(true);
 },[]);
 useFocusEffect(useCallback(()=>{void refresh();
  void getTypedSetting('units.weight').then(result=>{if(result.ok)setUnit(result.value);});
 },[refresh]));
 const periods=range==='4w'?4:range==='3m'?13:52;
 const weeks=strengthWeeks(rows,new Date(),Math.max(8,periods*2));
 const summary=strengthWindowSummary(weeks,periods);
 const bars=weeks.slice(-8);
 const peak=Math.max(1,...bars.map(w=>w.volume));
 const top=records.filter(r=>r.bestEstimatedOneRepMax!==null)
  .sort((a,b)=>(b.bestEstimatedOneRepMax??0)-(a.bestEstimatedOneRepMax??0)).slice(0,4);
 const names=new Map(rows.map(r=>[r.exerciseId,exerciseName(language,r.exerciseId,r.name)]));
 const unitLabel=weightUnitLabel(language,unit);
 return <Screen embedded>
  <Header title={tr('p4.strength.0')} subtitle={tr('p4.strength.1')} onBack={()=>router.back()}/>
  <SegmentedControl label={tr('p4.strength.2')} value={range} onChange={setRange}
   options={[{value:'4w',label:tr('polish.range4w')},{value:'3m',label:tr('polish.range3m')},{value:'1y',label:tr('polish.range1y')}]}/>
  {error&&<Button label={tr('p4.strength.3')} onPress={()=>void refresh()}/>}
  {rows.length===0?<Card rim="train" title={tr('p4.strength.4')}>
   <Typography tone="secondary">{tr('p4.strength.14')}</Typography>
   <Button label={tr('p4.strength.5')} variant="train" onPress={()=>router.push('/(tabs)/train/preview')}/>
  </Card>:<>
   <Card rim="train" title={tr('p4.strength.6')}>
    <Typography size="metric-m">{bidiIsolate(language,formatNumber(language,Math.round(fromKg(summary.total,unit)))+' '+unitLabel)}</Typography>
    <Typography tone="secondary" size="small">{summary.changePct===null?tr('p4.strength.18'):
      bidiIsolate(language,(summary.changePct>=0?'+':'')+formatNumber(language,Math.round(summary.changePct))+'%')+' '+tr('p4.strength.19')}</Typography>
    <Typography tone="tertiary" size="small">{tr('p4.strength.15')}</Typography>
    <View style={{flexDirection:'row',alignItems:'flex-end',gap:theme.space[1],height:170}}>
     {bars.map(w=><View key={w.label} style={{flex:1,minWidth:20,alignItems:'center',gap:theme.space[1]}}>
      <Typography size="small">{w.logged?tr('strength.thousands',{count:Math.round(fromKg(w.volume,unit)/1000)}):'—'}</Typography>
      <View style={{height:120,width:'90%',justifyContent:'flex-end',borderBottomWidth:1,
       borderBottomColor:theme.color.border.subtle}}>
       <View style={{height:w.logged?Math.max(4,Math.round(115*w.volume/peak)):4,
        borderWidth:w.logged?0:1,borderStyle:w.logged?'solid':'dashed',
        borderColor:theme.color.border.strong,backgroundColor:w.logged?theme.color.domain.train:theme.color.bg.raised}}/>
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit
        accessibilityLabel={tr('p4.strength.21')+' '+w.label}
        style={{color:theme.color.text.tertiary,fontSize:theme.type.small.size,textAlign:'center'}}>
        {bidiIsolate(language,latinDigits(w.start.toLocaleDateString(language==='ar'?'ar-EG-u-nu-latn':'en-US',{month:'numeric',day:'numeric'})))}
      </Text>
     </View>)}
    </View>
   </Card>
   <Card title={tr('p4.strength.7')}>
    {top.length===0?<Typography tone="secondary">{tr('p4.strength.16')}</Typography>:
     top.map(r=><ListRow key={r.exerciseId+':'+r.side} title={names.get(r.exerciseId)??r.exerciseId}
      detail={bidiIsolate(language,formatNumber(language,Math.round(fromKg(r.bestEstimatedOneRepMax??0,unit)))+' '+unitLabel)+' '+tr('p4.strength.20')+' · '+bidiIsolate(language,latinDigits(new Date(r.latestAt).toLocaleDateString(language==='ar'?'ar-EG-u-nu-latn':'en-US')))}
      suffix={<Chip kind="estimate" label={tr('p4.strength.8')}/>}
      onPress={()=>router.push({pathname:'/(tabs)/train/exercise/[id]',params:{id:r.exerciseId}})}/>)}
    <Typography tone="secondary" size="small">{tr('p4.strength.17')}</Typography>
   </Card>
   <Card title={tr('p4.strength.9')}>
    <ListRow title={tr('p4.strength.10')} detail={tr('p4.strength.11')}
     onPress={()=>router.push('/(tabs)/train/records')}/>
    <ListRow title={tr('p4.strength.12')} detail={tr('p4.strength.13')}
     onPress={()=>router.push('/(tabs)/train/recovery')}/>
   </Card>
  </>}
 </Screen>;
}
