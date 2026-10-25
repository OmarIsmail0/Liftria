import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../src/design/ThemeProvider';
import { Button, Card, Chip, Header, ListRow, Screen, SegmentedControl, Typography } from '../../../src/design/primitives';
import { readRecords } from '../../../src/services/database/gymRepositories';
import { readStrengthObservations, type StrengthObservation } from '../../../src/services/database/historyRepository';
import { strengthWeeks, strengthWindowSummary } from '../../../src/features/train/recoveryMath';
import type { ExerciseRecord } from '../../../src/services/database/gymMath';
import { fromKg, type WeightUnit } from '../../../src/features/train/workoutUnits';
import { getTypedSetting } from '../../../src/services/database/settings';

type Range='4w'|'3m'|'1y';
export default function Strength(){
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
 const names=new Map(rows.map(r=>[r.exerciseId,r.name]));
 return <Screen embedded>
  <Header title="Strength" subtitle="From your workouts in Liftria" onBack={()=>router.back()}/>
  <SegmentedControl label="Range" value={range} onChange={setRange}
   options={[{value:'4w',label:'4 W'},{value:'3m',label:'3 M'},{value:'1y',label:'1 Y'}]}/>
  {error&&<Button label="Retry" onPress={()=>void refresh()}/>}
  {rows.length===0?<Card rim="train" title="Strength over time">
   <Typography tone="secondary">Finish a workout to see strength trends.</Typography>
   <Button label="Start a workout" variant="train" onPress={()=>router.push('/(tabs)/train/preview')}/>
  </Card>:<>
   <Card rim="train" title="Weekly volume">
    <Typography size="metric-m">{Math.round(fromKg(summary.total,unit)).toLocaleString()} {unit}</Typography>
    <Typography tone="secondary" size="small">{summary.changePct===null?'No previous period to compare':
      (summary.changePct>=0?'+':'')+Math.round(summary.changePct)+'% vs the previous period'}</Typography>
    <Typography tone="tertiary" size="small">From your workouts in Liftria · logged working sets only</Typography>
    <View style={{flexDirection:'row',alignItems:'flex-end',gap:theme.space[1],height:170}}>
     {bars.map(w=><View key={w.label} style={{flex:1,minWidth:20,alignItems:'center',gap:theme.space[1]}}>
      <Typography size="small">{w.logged?Math.round(fromKg(w.volume,unit)/1000)+'k':'—'}</Typography>
      <View style={{height:120,width:'90%',justifyContent:'flex-end',borderBottomWidth:1,
       borderBottomColor:theme.color.border.subtle}}>
       <View style={{height:w.logged?Math.max(4,Math.round(115*w.volume/peak)):4,
        borderWidth:w.logged?0:1,borderStyle:w.logged?'solid':'dashed',
        borderColor:theme.color.border.strong,backgroundColor:w.logged?theme.color.domain.train:theme.color.bg.raised}}/>
      </View>
      <Typography size="small" tone="tertiary">{w.label}</Typography>
     </View>)}
    </View>
   </Card>
   <Card title="Top lifts">
    {top.length===0?<Typography tone="secondary">Log a weighted set to see an estimated 1RM.</Typography>:
     top.map(r=><ListRow key={r.exerciseId+':'+r.side} title={names.get(r.exerciseId)??r.exerciseId}
      detail={Math.round(fromKg(r.bestEstimatedOneRepMax??0,unit))+' '+unit+' est. 1RM · '+new Date(r.latestAt).toLocaleDateString()}
      suffix={<Chip kind="estimate" label="Estimate"/>}
      onPress={()=>router.push({pathname:'/(tabs)/train/exercise/[id]',params:{id:r.exerciseId}})}/>)}
    <Typography tone="secondary" size="small">Estimated 1RM is a trend, not a test (Epley, 1–12 reps).</Typography>
   </Card>
   <Card title="Records and muscles">
    <ListRow title="All strength records" detail="Recalculated from finished working sets"
     onPress={()=>router.push('/(tabs)/train/records')}/>
    <ListRow title="Muscle map" detail="Last 72 hours · estimate"
     onPress={()=>router.push('/(tabs)/train/recovery')}/>
   </Card>
  </>}
 </Screen>;
}
