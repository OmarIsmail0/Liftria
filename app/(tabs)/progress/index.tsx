import {router,useFocusEffect} from 'expo-router';
import {useCallback,useState} from 'react';
import {useLanguage} from '../../../src/i18n/LanguageProvider';
import {bidiIsolate,formatNumber} from '../../../src/i18n';
import {Card,Header,ListRow,Screen,Typography} from '../../../src/design/primitives';
import {dayOffset,localDay} from '../../../src/features/eat/foodCatalog';
import {readDiaryRange,type DiaryEntry} from '../../../src/features/eat/diaryRepository';
import {nutritionTrend,weightTrend,type WeightPoint} from '../../../src/features/progress/trendMath';
import {cachedHealthWeights,listLocalWeights} from '../../../src/features/progress/weightRepository';
import {getTypedSetting} from '../../../src/services/database/settings';

export default function ProgressTab(){
 const {t,language}=useLanguage();
 const [entries,setEntries]=useState<DiaryEntry[]>([]),[weights,setWeights]=useState<WeightPoint[]>([]);
 const [hidden,setHidden]=useState(false),[error,setError]=useState(false);
 const today=localDay(new Date());
 const load=useCallback(async()=>{
  const [food,local,health,hide]=await Promise.all([
   readDiaryRange(dayOffset(today,-28),dayOffset(today,-1)),
   listLocalWeights(),cachedHealthWeights(),getTypedSetting('hideNumbers')]);
  if(food.ok)setEntries(food.value);else setError(true);
  if(local.ok&&health.ok)setWeights([...local.value,...health.value]);else setError(true);
  if(hide.ok)setHidden(hide.value);
 },[today]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 const nutrition=nutritionTrend(entries,today,28,null);
 const body=weightTrend(weights,dayOffset(today,-27),today);
 const format=(v:number,digits=0)=>bidiIsolate(language,formatNumber(language,v,
  {maximumFractionDigits:digits,minimumFractionDigits:digits}));
 return <Screen embedded>
  <Header title={t('nav.progress')}/>
  {error&&<Typography tone="secondary">{t('eatI.error')}</Typography>}
  <Card rim="train" title={t('progress.strength')}>
   <Typography tone="secondary">{t('progress.strengthDescription')}</Typography>
   <ListRow title={t('progress.strengthTrends')} detail={t('progress.strengthPeriods')}
    onPress={()=>router.push('/(tabs)/progress/strength')}/>
  </Card>
  <Card rim="eat" title={t('trend.nutrition')}>
   <Typography tone="secondary" size="small">{t('trend.diarySource')}</Typography>
   <Typography>{nutrition.loggedDays===0?t('trend.nutritionEmpty'):
    hidden?t('trend.hidden'):t('trend.avgCalories',{
     count:format(nutrition.avgKcal??0),days:nutrition.loggedDays,total:28})}</Typography>
   <ListRow title={t('trend.openNutrition')} onPress={()=>router.push('/(tabs)/progress/nutrition')}/>
  </Card>
  <Card rim="health" title={t('trend.body')}>
   <Typography tone="secondary" size="small">{t('trend.weightSource')}</Typography>
   <Typography>{!body.latest?t('trend.weightEmpty'):hidden?t('trend.hidden'):
    t('trend.kg',{weight:format(body.latest.trend,1)})}</Typography>
   <ListRow title={t('trend.openBody')} onPress={()=>router.push('/(tabs)/progress/body')}/>
  </Card>
  <Card rim="health" title={t('progress.health')}>
   <Typography tone="secondary">{t('progress.healthDescription')}</Typography>
   <ListRow title={t('settings.home.health')} detail={t('progress.healthOverview')}
    onPress={()=>router.push('/(tabs)/progress/health')}/>
  </Card>
 </Screen>;
}
