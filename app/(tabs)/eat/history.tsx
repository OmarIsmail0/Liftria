import {router,useFocusEffect} from 'expo-router';
import {useCallback,useState} from 'react';
import {View} from 'react-native';
import {Button,Card,Header,ListRow,Screen,Typography} from '../../../src/design/primitives';
import {useTheme} from '../../../src/design/ThemeProvider';
import {useLanguage} from '../../../src/i18n/LanguageProvider';
import {formatNumber} from '../../../src/i18n';
import {getCurrentTarget} from '../../../src/services/database/targets';
import {getTypedSetting} from '../../../src/services/database/settings';
import {dayOffset,localDay} from '../../../src/features/eat/foodCatalog';
import {readDiaryRange,summarizeEntries,type DiaryEntry} from '../../../src/features/eat/diaryRepository';
export default function NutritionHistory(){
  const {theme}=useTheme(),{t,language}=useLanguage();
  const [rows,setRows]=useState<DiaryEntry[]>([]);
  const [target,setTarget]=useState<number|null>(null),[hidden,setHidden]=useState(false);
  const [error,setError]=useState(false);
  const today=localDay(new Date()),first=dayOffset(today,-6);
  useFocusEffect(useCallback(()=>{
    let active=true;
    void Promise.all([readDiaryRange(first,today),getCurrentTarget(),getTypedSetting('hideNumbers')]).then(
      ([days,goal,hide])=>{if(!active)return;
        if(days.ok)setRows(days.value);else setError(true);
        if(goal.ok)setTarget(goal.value?.kcal??null);
        if(hide.ok)setHidden(hide.value);
      });
    return()=>{active=false;};
  },[first,today]));
  const days=Array.from({length:7},(_,i)=>{
    const day=dayOffset(first,i);
    return {day,...summarizeEntries(rows.filter(e=>e.day===day))};
  });
  const logged=days.filter(d=>d.logged),avg=logged.length?
    Math.round(logged.reduce((sum,d)=>sum+d.kcal,0)/logged.length):null;
  const peak=Math.max(target??0,...logged.map(d=>d.kcal),1);
  return <Screen embedded>
    <Header title={t('eatI.history')} onBack={()=>router.back()}/>
    <Card rim="eat" title={t('eatI.week')}>
      {logged.length===0?<Typography tone="secondary">{t('eatI.historyEmpty')}</Typography>:
        hidden?<Typography>{t('eatI.hidden')}</Typography>:
        <Typography size="head">{t('eatI.average',{count:formatNumber(language,avg??0),days:logged.length})}</Typography>}
      <View accessible accessibilityLabel={t('eatI.weekAccessible',{
        count:logged.length})} style={{height:140,flexDirection:'row',alignItems:'flex-end',gap:theme.space[2]}}>
        {days.map(row=><View key={row.day} style={{flex:1,gap:theme.space[1],alignItems:'center'}}>
          <View style={{width:'100%',height:row.logged?Math.max(4,110*row.kcal/peak):10,
            backgroundColor:row.logged?theme.color.domain.eat:'transparent',
            borderColor:theme.color.domain.eat,borderWidth:row.logged?0:1,
            borderStyle:row.logged?'solid':'dashed',
            borderRadius:theme.radius.sm}}/>
          <Typography size="small" tone="secondary">{row.day.slice(8)}</Typography>
        </View>)}
      </View>
      {days.map(row=><ListRow key={row.day} title={row.day}
        detail={!row.logged?t('eatI.notLogged'):hidden?t('eatI.hidden'):
          t('eatI.kcal',{count:formatNumber(language,row.kcal)})}
        onPress={()=>router.push({pathname:'/(tabs)/eat',params:{day:row.day}})}/>)}
    </Card>
    {error&&<Typography>{t('eatI.error')}</Typography>}
    <Button label={t('eatI.backToEat')} onPress={()=>router.back()}/>
  </Screen>;
}
