import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { latinDigits, weightUnitLabel } from '../../../src/i18n';
import { router, useFocusEffect } from 'expo-router';
import { memo, useCallback, useState } from 'react';
import { FlatList, Platform, View } from 'react-native';
import { Button, Chip, EmptyState, Header, ListRow, Screen, Typography } from '../../../src/design/primitives';
import { ListInset } from '../../../src/design/primitives/Surfaces';
import { useTheme } from '../../../src/design/ThemeProvider';
import { listGroupRowStyle } from '../../../src/features/train/resultCardEdges';
import { readRecords } from '../../../src/services/database/gymRepositories';
import { getExercise } from '../../../src/services/database/exerciseLibrary';
import type { ExerciseRecord } from '../../../src/services/database/gymMath';
import { fromKg, sideLabel, type WeightUnit } from '../../../src/features/train/workoutUnits';
import { getTypedSetting } from '../../../src/services/database/settings';
import { exerciseName } from '../../../src/i18n/exerciseNames';
type Named={row:ExerciseRecord;name:string};
const recordKey=(item:Named)=>item.row.exerciseId+':'+item.row.side;
const RecordRow=memo(function RecordRow({item,index,count,language,weightUnit,unitLabel,estimateLabel,estimated1rmLabel,
 leastAssistance,heaviest,mostReps}:{item:Named;index:number;count:number;language:'en'|'ar';weightUnit:WeightUnit;unitLabel:string;
 estimateLabel:string;estimated1rmLabel:string;leastAssistance:string;heaviest:string;mostReps:string}){
 const {theme}=useTheme();
 const {row,name}=item;
 return <View style={listGroupRowStyle(theme,index,count)}><ListInset.Provider value={true}><ListRow
  title={name+(row.side?' · '+sideLabel(row.side,language):'')}
  detail={(row.lowestAssistance!==null?leastAssistance+' '+Number(fromKg(row.lowestAssistance,weightUnit).toFixed(1))+' '+unitLabel:
   row.heaviest!==null?heaviest+' '+Number(fromKg(row.heaviest,weightUnit).toFixed(1))+' '+unitLabel:mostReps+' '+row.maxReps)+
   ' · '+latinDigits(new Date(row.latestAt).toLocaleDateString(language==='ar'?'ar-EG-u-nu-latn':'en-US'))}
  divider={index!==count-1}
  onPress={()=>router.push({pathname:'/(tabs)/train/exercise/[id]',params:{id:row.exerciseId}})}
  suffix={row.bestEstimatedOneRepMax!==null?
   <View style={{alignItems:'flex-end',gap:4}}>
    <Chip kind="estimate" label={estimateLabel}/>
    <Typography size="secondary">{Math.round(fromKg(row.bestEstimatedOneRepMax,weightUnit))} {unitLabel} {estimated1rmLabel}</Typography>
   </View>:undefined}/></ListInset.Provider></View>;
});
export default function Records(){
 const {t,language}=useLanguage();
 const {theme}=useTheme();
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
 const unitLabel=weightUnitLabel(language,unit);
 const estimateLabel=t('chips.estimate'),estimated1rmLabel=t('records.estimated1rm');
 const leastAssistance=t('records.leastAssistance'),heaviest=t('records.heaviest'),mostReps=t('records.mostReps');
 const renderRow=useCallback(({item,index}:{item:Named;index:number})=>
  <RecordRow item={item} index={index} count={rows.length} language={language} weightUnit={unit} unitLabel={unitLabel}
   estimateLabel={estimateLabel} estimated1rmLabel={estimated1rmLabel} leastAssistance={leastAssistance}
   heaviest={heaviest} mostReps={mostReps}/>,
  [rows.length,language,unit,unitLabel,estimateLabel,estimated1rmLabel,leastAssistance,heaviest,mostReps]);
 return <Screen embedded scroll={false}>
  <FlatList style={{flex:1}} data={rows} keyExtractor={recordKey} renderItem={renderRow}
   keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingVertical:theme.space[4]}}
   removeClippedSubviews={Platform.OS==='android'} initialNumToRender={14} maxToRenderPerBatch={10}
   windowSize={9} updateCellsBatchingPeriod={50}
   ListHeaderComponent={<View style={{gap:theme.layout.cardGap,paddingBottom:theme.layout.cardGap}}>
    <Header mode="inline" title={t('train.records')} onBack={()=>router.back()}/>
    <Typography tone="secondary" size="secondary">{t('records.subtitle')}</Typography>
    <Typography tone="secondary" size="secondary">{t('records.explanation')}</Typography>
    {error&&<Button label={t('common.retry')} onPress={()=>router.replace('/(tabs)/train/records')}/>}
    {rows.length===0?<EmptyState title={t('records.empty')} description={t('records.disclaimer')}
      action={<Button label={t('records.start')} variant="tonal" onPress={()=>router.push('/(tabs)/train/preview')}/>}/>:null}
   </View>}
   ListFooterComponent={rows.length>0?<View style={{paddingTop:theme.layout.cardGap}}>
    <Typography size="secondary" tone="secondary">{t('records.disclaimer')}</Typography></View>:null}/>
 </Screen>;
}
