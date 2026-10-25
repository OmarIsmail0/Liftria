import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Chip, Header, ListRow, Screen, Typography } from '../../../src/design/primitives';
import { readRecords } from '../../../src/services/database/gymRepositories';
import { getExercise } from '../../../src/services/database/exerciseLibrary';
import type { ExerciseRecord } from '../../../src/services/database/gymMath';
import { fromKg, type WeightUnit } from '../../../src/features/train/workoutUnits';
import { getTypedSetting } from '../../../src/services/database/settings';
type Named={row:ExerciseRecord;name:string};
export default function Records(){
 const [rows,setRows]=useState<Named[]>([]);
 const [unit,setUnit]=useState<WeightUnit>('kg');
 const [error,setError]=useState(false);
 useFocusEffect(useCallback(()=>{
  let live=true;
  void getTypedSetting('units.weight').then(x=>{if(live&&x.ok)setUnit(x.value);});
  void (async()=>{
   const result=await readRecords();
   if(!live)return;
   if(!result.ok){setError(true);return;}
   const names=await Promise.all(result.value.map(r=>getExercise(r.exerciseId)));
   if(!live)return;
   setRows(result.value.map((row,i)=>({row,name:names[i]?.ok&&names[i]?.value?
    names[i].value.name:row.exerciseId})).sort((a,b)=>b.row.latestAt.localeCompare(a.row.latestAt)));
  })();
  return()=>{live=false;};
 },[]));
 return <Screen embedded>
  <Header title="Records" subtitle="Only finished, logged working sets" onBack={()=>router.back()}/>
  <Card rim="train" title="Your best sets">
   <Typography tone="secondary">Records are recalculated whenever you edit or delete a workout. Each side of a unilateral exercise keeps its own records.</Typography>
   {error&&<Button label="Retry" onPress={()=>router.replace('/(tabs)/train/records')}/>}
   {rows.length===0?<View style={{gap:8}}>
    <Typography tone="secondary">Finish a workout to see your personal records here.</Typography>
    <Button label="Start a workout" variant="train" onPress={()=>router.push('/(tabs)/train/preview')}/>
   </View>:rows.map(({row,name})=><ListRow key={row.exerciseId+':'+row.side}
    title={name+(row.side?' · '+row.side:'')}
    detail={(row.lowestAssistance!==null?'Least assistance '+Number(fromKg(row.lowestAssistance,unit).toFixed(1))+' '+unit:
      row.heaviest!==null?'Heaviest '+Number(fromKg(row.heaviest,unit).toFixed(1))+' '+unit:'Most reps '+row.maxReps)+
      ' · '+new Date(row.latestAt).toLocaleDateString()}
    onPress={()=>router.push({pathname:'/(tabs)/train/exercise/[id]',params:{id:row.exerciseId}})}
    suffix={row.bestEstimatedOneRepMax!==null?
      <View style={{alignItems:'flex-end',gap:4}}>
       <Chip kind="estimate" label="Estimate"/>
       <Typography size="small">{Math.round(fromKg(row.bestEstimatedOneRepMax,unit))} {unit} est. 1RM</Typography>
      </View>:undefined}/>)}
  </Card>
  <Typography size="small" tone="secondary">Estimated 1RM uses Epley for logged 1–12 rep sets. A trend, not a test.</Typography>
 </Screen>;
}
