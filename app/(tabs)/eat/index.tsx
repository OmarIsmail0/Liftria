import {router,useFocusEffect,useLocalSearchParams} from 'expo-router';
import {useCallback,useEffect,useState} from 'react';
import {ScrollView,View} from 'react-native';
import {Button,Card,Chip,Header,ListRow,Orb,Screen,Snackbar,Typography} from '../../../src/design/primitives';
import {useTheme} from '../../../src/design/ThemeProvider';
import {useLanguage} from '../../../src/i18n/LanguageProvider';
import {formatNumber} from '../../../src/i18n';
import {getCurrentTarget,type Target} from '../../../src/services/database/targets';
import {getTypedSetting} from '../../../src/services/database/settings';
import {dayOffset,localDay,MEALS,mealAtTime,type MealKey} from '../../../src/features/eat/foodCatalog';
import {copyDay,copyMeal,deleteEntry,listSavedMeals,logSavedMeal,readDiaryDay,
  summarizeEntries,type DiaryEntry,type SavedMeal} from '../../../src/features/eat/diaryRepository';

export default function EatHome(){
  const {theme}=useTheme(),{t,language}=useLanguage();
  const params=useLocalSearchParams<{undo?:string;day?:string}>();
  const [day,setDay]=useState(params.day??localDay(new Date()));
  const [entries,setEntries]=useState<DiaryEntry[]>([]);
  const [target,setTarget]=useState<Target|null>(null);
  const [hidden,setHidden]=useState(false);
  const [ramadan,setRamadan]=useState(false);
  const [iftarTime,setIftarTime]=useState('18:00');
  const [labels,setLabels]=useState<Partial<Record<MealKey,string>>>({});
  const [saved,setSaved]=useState<SavedMeal[]>([]);
  const [notice,setNotice]=useState<string|null>(null);
  const [undo,setUndo]=useState<string|null>(params.undo??null);
  const [error,setError]=useState(false);
  const reload=useCallback(async()=>{
    const [diary,goal,hide,fast,names,meals,iftar]=await Promise.all([
      readDiaryDay(day),getCurrentTarget(),getTypedSetting('hideNumbers'),
      getTypedSetting('eat.ramadan'),getTypedSetting('eat.mealNames'),listSavedMeals(),getTypedSetting('eat.iftarTime')]);
    if(diary.ok)setEntries(diary.value);else setError(true);
    if(goal.ok)setTarget(goal.value);
    if(hide.ok)setHidden(hide.value);
    if(fast.ok)setRamadan(fast.value);
    if(iftar.ok)setIftarTime(iftar.value);
    if(names.ok)setLabels(names.value??{});
    if(meals.ok)setSaved(meals.value);
  },[day]);
  useFocusEffect(useCallback(()=>{void reload();},[reload]));
  useEffect(()=>{
    if(!undo)return;
    const timeout=setTimeout(()=>setUndo(null),4000);
    return()=>clearTimeout(timeout);
  },[undo]);
  const today=localDay(new Date()),summary=summarizeEntries(entries);
  const format=(value:number)=>formatNumber(language,value);
  const mealName=(key:MealKey)=>labels[key]||
    (ramadan?(key==='breakfast'?t('eatI.suhoor'):key==='dinner'?t('eatI.iftar'):
      key==='snacks'?t('eatI.snacks'):t('eatI.lunch')):t(`eatI.${key}`));
  const go=(meal:MealKey)=>router.push({pathname:'/(tabs)/eat/search',params:{meal,day}});
  async function repeat(meal:MealKey|null){
    const result=meal?await copyMeal(dayOffset(day,-1),day,meal):
      await copyDay(dayOffset(day,-1),day);
    if(result.ok&&result.value>0){setNotice(t('eatI.copied',{count:result.value}));await reload();}
    else setNotice(t('eatI.nothingCopy'));
  }
  async function applySaved(savedMeal:SavedMeal,meal:MealKey){
    const result=await logSavedMeal(savedMeal,meal,day);
    if(result.ok){setNotice(t('eatI.savedLogged',{name:savedMeal.name}));await reload();}
    else setError(true);
  }
  return <Screen embedded scroll={false}>
    <ScrollView contentContainerStyle={{gap:theme.layout.cardGap,paddingVertical:theme.space[3]}}>
      <Header title={t('nav.eat')} right={<Button label={t('eatI.quick')} variant="secondary"
        onPress={()=>router.push({pathname:'/(tabs)/eat/quick',params:{day,meal:mealAtTime(new Date(),ramadan,iftarTime)}})}/>}/>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
        <Button label={t('eatI.previous')} variant="ghost" onPress={()=>setDay(dayOffset(day,-1))}/>
        <Typography bold>{day===today?t('eatI.today'):day}</Typography>
        <Button label={t('eatI.next')} variant="ghost" disabled={day>=today}
          onPress={()=>setDay(dayOffset(day,1))}/>
      </View>
      <Orb eaten={summary.kcal} target={target?.kcal??null} hidden={hidden} onPress={()=>
        router.push('/(tabs)/eat/targets')}/>
      <View style={{alignItems:'center',gap:theme.space[2]}}>
        {target?.source==='estimate'&&<Chip kind="estimate"/>}
        <Typography tone="secondary">{hidden?t('eatI.hidden'):
          !summary.logged?t('eatI.notLogged'):
            t('eatI.eaten',{count:format(summary.kcal)})}</Typography>
        {target&&<Typography tone="secondary" size="small">{hidden?t('eatI.onTrack'):
          t('eatI.target',{count:format(target.kcal)})}</Typography>}
        {hidden&&<Button label={t('eatI.showNumbers')} variant="ghost" onPress={()=>
          router.push('/(tabs)/eat/targets')}/>}
        {!target&&<Button label={t('today.setTarget')} variant="secondary" onPress={()=>
          router.push('/(tabs)/eat/targets')}/>}
      </View>
      <Card rim="eat" title={t('eatI.macros')}>
        {!summary.logged?<Typography tone="secondary">{t('eatI.startLogging')}</Typography>:
          hidden?<Typography tone="secondary">{t('eatI.hidden')}</Typography>:
          summary.protein===null&&summary.carbs===null&&summary.fat===null?
          <Typography tone="secondary">{t('eatI.caloriesOnlyNoMacros')}</Typography>:
          <Typography tone="secondary">{t('eatI.macroAmounts',{p:summary.protein===null?'—':format(Math.round(summary.protein)),
            c:summary.carbs===null?'—':format(Math.round(summary.carbs)),
            f:summary.fat===null?'—':format(Math.round(summary.fat))})}</Typography>}
      </Card>
      {MEALS.map(meal=>{
        const inMeal=entries.filter(entry=>entry.meal===meal),part=summary.byMeal[meal];
        return <Card key={meal} rim="eat" title={mealName(meal)}>
          <Typography tone="secondary">{part.count===0?t('eatI.notLogged'):
            hidden?t('eatI.items',{count:part.count}):t('eatI.kcal',{count:format(part.kcal)})}</Typography>
          {inMeal.map(entry=><ListRow key={entry.id} title={entry.name}
            detail={hidden?t('eatI.hidden'):(entry.grams?t('eatI.grams',{count:format(entry.grams)})+' · ':'')+
              t('eatI.kcal',{count:format(entry.kcal)})}
            onPress={()=>router.push({pathname:'/(tabs)/eat/meal',params:{meal,day}})}/>)}
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:theme.space[2]}}>
            <Button label={t('eatI.add')} variant="secondary" onPress={()=>go(meal)}/>
            <Button label={t('eatI.repeatYesterday')} variant="ghost" onPress={()=>void repeat(meal)}/>
            {part.count>0&&<Button label={t('eatI.details')} variant="ghost" onPress={()=>
              router.push({pathname:'/(tabs)/eat/meal',params:{meal,day}})}/>}
          </View>
          {saved.slice(0,2).map(item=><ListRow key={item.id} title={item.name}
            detail={t('eatI.savedMeal')} onPress={()=>void applySaved(item,meal)}/>)}
        </Card>;
      })}
      <Card title={t('eatI.repeatDay')}>
        <Typography tone="secondary">{t('eatI.repeatDayHint')}</Typography>
        <Button label={t('eatI.copyYesterday')} variant="secondary" onPress={()=>void repeat(null)}/>
      </Card>
      <ListRow title={t('eatI.targets')} onPress={()=>router.push('/(tabs)/eat/targets')}/>
      <ListRow title={t('eatI.history')} onPress={()=>router.push('/(tabs)/eat/history')}/>
      {(notice||undo)&&<Snackbar message={notice??t('eatI.added')}
        onUndo={undo?()=>void deleteEntry(undo).then(()=>{setUndo(null);void reload();}):undefined}
        onDismiss={()=>{setUndo(null);setNotice(null);}}/>}
      {error&&<Typography tone="secondary">{t('eatI.error')}</Typography>}
    </ScrollView>
  </Screen>;
}
