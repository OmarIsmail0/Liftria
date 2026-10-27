import {router,useFocusEffect,useLocalSearchParams} from 'expo-router';
import {useCallback,useEffect,useState} from 'react';
import {useLanguage} from '../../../src/i18n/LanguageProvider';
import {bidiIsolate,formatNumber} from '../../../src/i18n';
import {Button,Card,Chip,Field,Header,ListRow,Screen,SegmentedControl,Sheet,Toggle,Typography} from '../../../src/design/primitives';
import {dayOffset,localDay} from '../../../src/features/eat/foodCatalog';
import {readDiaryRange,type DiaryEntry} from '../../../src/features/eat/diaryRepository';
import {getCurrentTarget,type Target} from '../../../src/services/database/targets';
import {getTypedSetting} from '../../../src/services/database/settings';
import {nutritionTrend,rangeDays,type RangeKey} from '../../../src/features/progress/trendMath';
import {NutritionGraph,ProteinPips} from '../../../src/features/progress/TrendCharts';
import {adaptiveExpenditure,checkinWeek,proposedCalories,type BurnResult} from '../../../src/features/progress/adaptiveExpenditure';
import {answerWeeklyCheckin,ensureWeeklyCheckin,type WeeklyCheckin} from '../../../src/features/progress/adaptiveCheckins';
import {listLocalWeights,cachedHealthWeights} from '../../../src/features/progress/weightRepository';
import {getProfile} from '../../../src/services/database/profile';
import {targetSafety} from '../../../src/features/onboarding/targetEstimate';

export default function NutritionTrends(){
 const {t,language}=useLanguage();
 const {demoAdaptive}=useLocalSearchParams<{demoAdaptive?:'early'|'ready'}>();
 const [range,setRange]=useState<RangeKey>('4w'),[entries,setEntries]=useState<DiaryEntry[]>([]);
 const [target,setTarget]=useState<Target|null>(null),[hidden,setHidden]=useState(false),[error,setError]=useState(false);
 const [burn,setBurn]=useState<BurnResult|null>(null);
 const [checkin,setCheckin]=useState<WeeklyCheckin|null>(null);
 const [goalMissing,setGoalMissing]=useState(false);
 const [editing,setEditing]=useState(false),[proposedInput,setProposedInput]=useState('');
 const [pendingAnswer,setPendingAnswer]=useState<{action:'accept'|'edit';kcal:number}|null>(null);
 const [guidance,setGuidance]=useState(false),[busy,setBusy]=useState(false);
 const [reviewVisible,setReviewVisible]=useState(false);
 const today=localDay(new Date()),days=rangeDays(range);
 const load=useCallback(async()=>{
  const now=localDay(new Date());
  const [diary,goal,hide,weights,health,profile]=await Promise.all([
   readDiaryRange(dayOffset(now,-rangeDays(range)),dayOffset(now,-1)),
   getCurrentTarget(),getTypedSetting('hideNumbers'),
   listLocalWeights(),cachedHealthWeights(),getProfile()]);
  if(diary.ok)setEntries(diary.value);else setError(true);
  if(goal.ok)setTarget(goal.value);else setError(true);
  if(hide.ok)setHidden(hide.value);
  if(profile.ok)setGoalMissing(profile.value?.goal==null);
  if(!diary.ok||!weights.ok||!health.ok){setError(true);return;}
  // Every diary row contributes its own stored calories; never infer unlogged days.
  const result=adaptiveExpenditure(diary.value.map(item=>({day:item.day,kcal:item.kcal})),
   [...weights.value,...health.value],now);
  setBurn(result);
  setCheckin(null);
  if(result.ready&&goal.ok&&goal.value&&profile.ok&&profile.value?.goal){
   const weekly=await ensureWeeklyCheckin(checkinWeek(now),profile.value.goal,
    result.estimatedBurn,proposedCalories(result.estimatedBurn,profile.value.goal),goal.value);
   if(weekly.ok)setCheckin(weekly.value);else setError(true);
  }
 },[range]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 useEffect(()=>{
  if(demoAdaptive==='ready'&&checkin?.status==='pending')setReviewVisible(true);
 },[demoAdaptive,checkin?.status]);
 const shownBurn=demoAdaptive==='early'?adaptiveExpenditure([],[],today):burn;
 const shownCheckin=demoAdaptive==='early'?null:checkin;
 const summary=nutritionTrend(entries,today,days,target?.proteinG??null);
 const amount=(v:number|null)=>v===null?'—':bidiIsolate(language,formatNumber(language,Math.round(v)));
 const edited=proposedInput.trim()?Number(proposedInput):NaN;
 const editedValid=Number.isInteger(edited)&&edited>=1000&&edited<=10000;
 async function answer(action:'accept'|'edit'|'dismiss',kcal:number|null=null,confirmed=false){
  if(!checkin||busy||checkin.status!=='pending')return;
  if(action!=='dismiss'){
   const chosen=action==='accept'?checkin.proposedKcal:kcal;
   if(chosen===null||!Number.isInteger(chosen)||chosen<1000||chosen>10000)return;
   if(targetSafety(chosen,checkin.estimatedBurn).warning&&!confirmed){
    setPendingAnswer({action,kcal:chosen});setGuidance(false);return;
   }
  }
  setBusy(true);
  const saved=await answerWeeklyCheckin(checkin.week,action,kcal,confirmed);
  setBusy(false);
  if(saved.ok){setCheckin(saved.value);setEditing(false);setPendingAnswer(null);setReviewVisible(false);void load();}
  else setError(true);
 }
 return <Screen embedded>
  <Header title={t('trend.nutrition')} onBack={()=>router.back()}/>
  {demoAdaptive&&<Typography tone="secondary" size="small">{t('adaptive.demoWarning')}</Typography>}
  <Card rim="eat" title={t('adaptive.burnTitle')}>
   {shownBurn===null?<Typography tone="secondary">{t('adaptive.loading')}</Typography>:
    shownBurn.ready?<>
     <Chip kind="estimate"/>
     <Typography size="head">{hidden?t('trend.hidden'):t('adaptive.burnValue',{count:amount(shownBurn.estimatedBurn)})}</Typography>
     <Typography tone="secondary" size="small">{t('adaptive.burnMethod',{logged:shownBurn.loggedDays,weights:shownBurn.weighIns,days:Math.round(shownBurn.elapsedDays)})}</Typography>
    </>:<Typography tone="secondary">{t('adaptive.needData',{logged:shownBurn.needLogged,
     weights:shownBurn.needWeighIns,days:shownBurn.needHistory})}</Typography>}
   <Typography tone="secondary" size="small">{t('adaptive.sourceNote')}</Typography>
   {shownBurn?.ready&&!hidden&&shownCheckin&&<>
    <Typography bold>{t('adaptive.weeklyTitle')}</Typography>
    {shownCheckin.status==='pending'?<>
      <Typography>{t('adaptive.proposal',{count:amount(shownCheckin.proposedKcal)})}</Typography>
      <Typography tone="secondary" size="small">{t('adaptive.currentTarget',{count:target?.kcal??'—'})}</Typography>
      <Button label={t('adaptive.review')} variant="secondary" disabled={busy}
       onPress={()=>setReviewVisible(true)}/>
    </>:<Typography tone="secondary">{t('adaptive.recorded',{status:t('adaptive.status.'+shownCheckin.status as 'adaptive.status.accepted'|'adaptive.status.edited'|'adaptive.status.dismissed')})}</Typography>}
   </>}
   {shownBurn?.ready&&hidden&&<Button label={t('eatI.showNumbers')} variant="ghost"
    onPress={()=>router.push('/settings/preferences')}/>}
   {shownBurn?.ready&&!shownCheckin&&<Typography tone="secondary">{goalMissing?t('adaptive.needGoal'):t('adaptive.needTarget')}</Typography>}
  </Card>
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
  <Sheet visible={reviewVisible&&shownCheckin?.status==='pending'} title={t('adaptive.weeklyTitle')}
   description={t('adaptive.proposal',{count:shownCheckin?.proposedKcal??0})}
   onClose={()=>setReviewVisible(false)}>
    <Typography tone="secondary">{t('adaptive.currentTarget',{count:target?.kcal??'—'})}</Typography>
    <Button label={t('adaptive.accept')} fullWidth disabled={busy}
     onPress={()=>void answer('accept')}/>
    <Button label={t('adaptive.edit')} variant="secondary" fullWidth disabled={busy}
     onPress={()=>{
      setProposedInput(String(shownCheckin?.proposedKcal??''));
      setReviewVisible(false);setEditing(true);
     }}/>
    <Button label={t('adaptive.dismiss')} variant="ghost" fullWidth disabled={busy}
     onPress={()=>void answer('dismiss')}/>
  </Sheet>
  <Sheet visible={editing} title={t('adaptive.editTitle')} onClose={()=>setEditing(false)}
   description={t('adaptive.editHint')}>
    <Field label={t('eatI.calories')} value={proposedInput} onChangeText={setProposedInput}
     keyboardType="decimal-pad"/>
    <Typography tone="secondary" size="small">{t('eatI.minCalories')}</Typography>
    <Button label={t('adaptive.saveEdited')} fullWidth disabled={!editedValid||busy}
     onPress={()=>void answer('edit',edited)}/>
  </Sheet>
  <Sheet visible={pendingAnswer!==null} title={t('eatI.targetCaution')}
   description={t('eatI.targetWarning')} onClose={()=>setPendingAnswer(null)}>
    <Toggle label={t('eatI.guidance')} value={guidance} onChange={setGuidance}/>
    <Button label={t('eatI.use1200')} onPress={()=>{
     const safe=Math.max(1200,Math.ceil((checkin?.estimatedBurn??0)*.75/50)*50);
     setProposedInput(String(safe));setPendingAnswer(null);setEditing(true);
    }}/>
    <Button label={t('eatI.keepTarget')} variant="secondary" fullWidth
     disabled={!guidance||busy} onPress={()=>{
       if(pendingAnswer)void answer(pendingAnswer.action,
        pendingAnswer.action==='edit'?pendingAnswer.kcal:null,true);
     }}/>
  </Sheet>
 </Screen>;
}
