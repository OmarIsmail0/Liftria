import {router,useFocusEffect} from 'expo-router';
import {useCallback,useState} from 'react';
import {Button,Card,Header,ListRow,Screen,Typography} from '../../../src/design/primitives';
import {useLanguage} from '../../../src/i18n/LanguageProvider';
import {bidiIsolate,formatNumber} from '../../../src/i18n';
import {dayOffset,localDay} from '../../../src/features/eat/foodCatalog';
import {readDiaryRange,type DiaryEntry} from '../../../src/features/eat/diaryRepository';
import {getCurrentTarget,type Target} from '../../../src/services/database/targets';
import {getTypedSetting} from '../../../src/services/database/settings';
import {nutritionTrend} from '../../../src/features/progress/trendMath';
import {NutritionGraph} from '../../../src/features/progress/TrendCharts';

export default function NutritionHistory(){
 const {t,language}=useLanguage();
 const [entries,setEntries]=useState<DiaryEntry[]>([]);
 const [target,setTarget]=useState<Target|null>(null);
 const [hidden,setHidden]=useState(false),[error,setError]=useState(false);
 const today=localDay(new Date()),first=dayOffset(today,-7),last=dayOffset(today,-1);
 const load=useCallback(async()=>{
  const day=localDay(new Date());
  const [diary,goal,hide]=await Promise.all([
   readDiaryRange(dayOffset(day,-7),dayOffset(day,-1)),getCurrentTarget(),getTypedSetting('hideNumbers')]);
  if(diary.ok)setEntries(diary.value);else setError(true);
  if(goal.ok)setTarget(goal.value);
  if(hide.ok)setHidden(hide.value);
 },[]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 const week=nutritionTrend(entries,today,7,target?.proteinG??null);
 const total=week.loggedDays,avg=week.avgKcal;
 const text=(n:number)=>bidiIsolate(language,formatNumber(language,Math.round(n)));
 return <Screen embedded>
  <Header title={t('eatI.history')} onBack={()=>router.back()}/>
  <Card rim="eat" title={t('eatI.week')}>
   {total===0?<Typography tone="secondary">{t('eatI.historyEmpty')}</Typography>:
    <Typography size="head">{hidden?t('trend.hidden'):
     t('eatI.average',{count:text(avg??0),days:total})}</Typography>}
   <Typography tone="secondary" size="small">{t('trend.diarySource')}</Typography>
   {total>0&&<NutritionGraph trend={week} target={target?.kcal??null} hidden={hidden}/>}
   {week.days.map(d=><ListRow key={d.day} title={bidiIsolate(language,d.day)}
    detail={!d.logged?t('eatI.notLogged'):hidden?t('trend.hidden'):
     t('eatI.kcal',{count:text(d.kcal??0)})}
    onPress={()=>router.push({pathname:'/(tabs)/eat',params:{day:d.day}})}/>)}
   <Typography tone="secondary" size="small">{t('trend.gapsNote')}</Typography>
  </Card>
  {error&&<Typography>{t('eatI.error')}</Typography>}
  <Button label={t('trend.openNutrition')} onPress={()=>router.push('/(tabs)/progress/nutrition')}/>
 </Screen>;
}
