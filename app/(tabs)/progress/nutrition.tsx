import {router,useFocusEffect} from 'expo-router';
import {useCallback,useState} from 'react';
import {View} from 'react-native';
import {useLanguage} from '../../../src/i18n/LanguageProvider';
import {bidiIsolate,formatNumber} from '../../../src/i18n';
import {useTheme} from '../../../src/design/ThemeProvider';
import {Button,Card,Header,ListRow,Screen,SegmentedControl,Typography} from '../../../src/design/primitives';
import {dayOffset,localDay} from '../../../src/features/eat/foodCatalog';
import {readDiaryRange,type DiaryEntry} from '../../../src/features/eat/diaryRepository';
import {getCurrentTarget,type Target} from '../../../src/services/database/targets';
import {getTypedSetting} from '../../../src/services/database/settings';
import {nutritionTrend,rangeDays,type RangeKey} from '../../../src/features/progress/trendMath';
import {NutritionGraph,ProteinPips} from '../../../src/features/progress/TrendCharts';

export default function NutritionTrends(){
 const {t,language}=useLanguage(),{theme}=useTheme();
 const [range,setRange]=useState<RangeKey>('4w'),[entries,setEntries]=useState<DiaryEntry[]>([]);
 const [target,setTarget]=useState<Target|null>(null),[hidden,setHidden]=useState(false),[error,setError]=useState(false);
 const today=localDay(new Date()),days=rangeDays(range);
 const start=dayOffset(today,-days),end=dayOffset(today,-1);
 const load=useCallback(async()=>{
  const [diary,goal,hide]=await Promise.all([
   readDiaryRange(start,end),getCurrentTarget(),getTypedSetting('hideNumbers')]);
  if(diary.ok)setEntries(diary.value);else setError(true);
  if(goal.ok)setTarget(goal.value);
  if(hide.ok)setHidden(hide.value);
 },[start,end]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 const summary=nutritionTrend(entries,today,days,target?.proteinG??null);
 const amount=(v:number|null)=>v===null?'—':bidiIsolate(language,formatNumber(language,Math.round(v)));
 return <Screen embedded>
  <Header title={t('trend.nutrition')} onBack={()=>router.back()}/>
  <SegmentedControl label={t('trend.range')} value={range} onChange={setRange}
   options={[{value:'4w',label:t('polish.range4w')},{value:'3m',label:t('polish.range3m')},{value:'1y',label:t('polish.range1y')}]}/>
  {error&&<Button label={t('common.retry')} onPress={()=>void load()}/>}
  {summary.loggedDays===0?<Card rim="eat" title={t('trend.calorieChart')}>
   <Typography tone="secondary">{t('trend.nutritionEmpty')}</Typography>
   <Button label={t('today.logMeal')} variant="secondary" onPress={()=>router.push('/(tabs)/eat')}/>
  </Card>:<>
   <Card rim="eat" title={t('trend.calorieChart')}>
    <Typography size="head">{hidden?t('trend.hidden'):t('trend.avgCalories',{
      count:amount(summary.avgKcal),days:summary.loggedDays,total:days})}</Typography>
    <Typography tone="secondary" size="small">{t('trend.diarySource')}</Typography>
    <NutritionGraph trend={summary} target={target?.kcal??null} hidden={hidden}/>
    <Typography tone="secondary" size="small">{t('trend.gapsNote')}</Typography>
   </Card>
   <Card rim="eat" title={t('trend.proteinGoal')}>
    <Typography tone="secondary">{target?.proteinG===undefined?t('trend.noProteinGoal'):
      hidden?t('trend.hidden'):t('trend.proteinCount',{count:summary.proteinMetDays,total:summary.completeMacroDays})}</Typography>
    <ProteinPips days={summary.days.slice(-28)} hidden={hidden}/>
    <Typography tone="secondary" size="small">{t('trend.pipsHint')}</Typography>
   </Card>
   <Card rim="eat" title={t('trend.macroSplit')}>
    <Typography tone="secondary" size="small">{t('trend.diarySource')}</Typography>
    {summary.completeMacroDays===0?<Typography>{t('trend.noMacroData')}</Typography>:
     <Typography>{hidden?t('trend.hidden'):t('trend.macroValues',{
       p:amount(summary.avgProtein),c:amount(summary.avgCarbs),f:amount(summary.avgFat),
       count:summary.completeMacroDays})}</Typography>}
   </Card>
   <Card title={t('trend.daysTitle')}>
    {summary.days.filter(d=>d.logged).map(d=><ListRow key={d.day} title={bidiIsolate(language,d.day)}
     detail={hidden?t('trend.hidden'):t('eatI.kcal',{count:amount(d.kcal)})}
     onPress={()=>router.push({pathname:'/(tabs)/eat',params:{day:d.day}})}/>)}
    <Typography tone="secondary" size="small">{t('trend.gapsNote')}</Typography>
   </Card>
  </>}
 </Screen>;
}
