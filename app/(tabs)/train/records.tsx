import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { latinDigits } from '../../../src/i18n';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Chip, Header, ListRow, Screen, Typography } from '../../../src/design/primitives';
import { readRecords } from '../../../src/services/database/gymRepositories';
import { getExercise } from '../../../src/services/database/exerciseLibrary';
import type { ExerciseRecord } from '../../../src/services/database/gymMath';
import { fromKg, sideLabel, type WeightUnit } from '../../../src/features/train/workoutUnits';
import { getTypedSetting } from '../../../src/services/database/settings';
import { exerciseName } from '../../../src/i18n/exerciseNames';
type Named={row:ExerciseRecord;name:string};
export default function Records(){
 const {t,language}=useLanguage();
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
    exerciseName(language,row.exerciseId,names[i].value.name):row.exerciseId})).sort((a,b)=>b.row.latestAt.localeCompare(a.row.latestAt)));
  })();
  return()=>{live=false;};
 },[language]));
 return <Screen embedded>
  <Header title={t('train.records')} subtitle={t('records.subtitle')} onBack={()=>router.back()}/>
  <Card rim="train" title={t('records.bestSets')}>
   <Typography tone="secondary">{t('records.explanation')}</Typography>
   {error&&<Button label={t('common.retry')} onPress={()=>router.replace('/(tabs)/train/records')}/>}
   {rows.length===0?<View style={{gap:8}}>
    <Typography tone="secondary">{t('records.empty')}</Typography>
    <Button label={t('records.start')} variant="train" onPress={()=>router.push('/(tabs)/train/preview')}/>
   </View>:rows.map(({row,name})=><ListRow key={row.exerciseId+':'+row.side}
    title={name+(row.side?' · '+sideLabel(row.side,language):'')}
    detail={(row.lowestAssistance!==null?t('records.leastAssistance')+' ' +Number(fromKg(row.lowestAssistance,unit).toFixed(1))+' '+unit:
      row.heaviest!==null?t('records.heaviest')+' ' +Number(fromKg(row.heaviest,unit).toFixed(1))+' '+unit:t('records.mostReps')+' ' +row.maxReps)+
      ' · '+latinDigits(new Date(row.latestAt).toLocaleDateString(language==='ar'?'ar-EG-u-nu-latn':'en-US'))}
    onPress={()=>router.push({pathname:'/(tabs)/train/exercise/[id]',params:{id:row.exerciseId}})}
    suffix={row.bestEstimatedOneRepMax!==null?
      <View style={{alignItems:'flex-end',gap:4}}>
       <Chip kind="estimate" label={t('chips.estimate')}/>
       <Typography size="small">{Math.round(fromKg(row.bestEstimatedOneRepMax,unit))} {unit} {t('records.estimated1rm')}</Typography>
      </View>:undefined}/>)}
  </Card>
  <Typography size="small" tone="secondary">{t('records.disclaimer')}</Typography>
 </Screen>;
}
