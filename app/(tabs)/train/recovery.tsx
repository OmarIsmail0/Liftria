import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { formatNumber, pluralForm, type TranslationKey } from '../../../src/i18n';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { BodyMap } from '../../../src/features/train/BodyMap';
import { useTheme } from '../../../src/design/ThemeProvider';
import { Button, Card, Chip, Header, ListRow, Screen, SegmentedControl, Typography } from '../../../src/design/primitives';
import { readStrengthObservations } from '../../../src/services/database/historyRepository';
import { calculateMuscleRecovery, volumeBand,
  type MuscleRecovery } from '../../../src/features/train/recoveryMath';
import { type Muscle } from '../../../src/services/database/gymTypes';
import type { MuscleShade } from '../../../src/features/train/BodyMap';

type Mode='recent'|'volume'|'untrained';
export default function Recovery(){
 const {theme}=useTheme();
 const {t,language}=useLanguage();
 const [mode,setMode]=useState<Mode>('recent');
 const [rows,setRows]=useState<MuscleRecovery[]>([]);
 const [empty,setEmpty]=useState(true);
 const [error,setError]=useState(false);
 const refresh=useCallback(async()=>{
  const result=await readStrengthObservations();
  if(result.ok){setRows(calculateMuscleRecovery(result.value,new Date()));setEmpty(result.value.length===0);}
  else setError(true);
 },[]);
 useFocusEffect(useCallback(()=>{void refresh();},[refresh]));
 const sorted=[...rows].sort((a,b)=>mode==='recent'?b.score-a.score:
  mode==='volume'?b.weeklyCredit-a.weeklyCredit:
   Number(b.untrained)-Number(a.untrained)||a.muscle.localeCompare(b.muscle));
 const high:Muscle[]=rows.filter(x=>mode==='recent'?x.band==='higher':
   mode==='volume'?volumeBand(x.weeklyCredit)==='high':false).map(x=>x.muscle);
 const some:Muscle[]=rows.filter(x=>mode==='recent'?x.band==='some':
   mode==='volume'?['medium','low'].includes(volumeBand(x.weeklyCredit)):x.untrained).map(x=>x.muscle);
 const shades=Object.fromEntries(rows.flatMap(x=>{
  const shade:MuscleShade|undefined=mode==='recent'?(x.band==='higher'?'higher':x.band==='some'?'some':undefined):
   mode==='volume'?(volumeBand(x.weeklyCredit)==='high'?'higher':
    volumeBand(x.weeklyCredit)==='medium'?'some':
    volumeBand(x.weeklyCredit)==='low'?'low':undefined):
    (x.untrained?'untrained':undefined);
  return shade?[[x.muscle,shade]]:[];
 })) as Partial<Record<Muscle,MuscleShade>>;
 const untrainedRows=sorted.filter(row=>row.untrained);
 const recentlyDirect=sorted.filter(row=>!row.untrained);
 const browse=(m:Muscle)=>router.push({pathname:'/(tabs)/train/muscles',params:{muscle:m}});
 const when=(date:string|null):string=>{
  if(!date)return t('recovery.notTrained');
  const d=new Date(date),now=new Date();
  const day=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const logged=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  const days=Math.round((day.valueOf()-logged.valueOf())/86400000);
  return days<=0?t('recovery.today'):days===1?t('recovery.yesterday'):
   t((`recovery.daysAgo.${pluralForm(language,days)}`) as TranslationKey,{count:days});
 };
 const sets=(count:number)=>{
  const rounded=Number(count.toFixed(1));
  return t(rounded===1?'recovery.oneSet':'recovery.sets',{count:formatNumber(language,rounded)});
 };
 const detail=(row:MuscleRecovery):string=>{
  if(mode==='recent')return t('recovery.rowRecent',{
   sets:sets(row.recentCredit),day:when(row.lastCredit),
   load:row.band==='higher'?t('recovery.high'):row.band==='some'?t('recovery.some'):t('recovery.ready')});
  if(mode==='volume')return t('recovery.rowVolume',{sets:sets(row.weeklyCredit),day:when(row.lastCredit)});
  if(!row.lastPrimary&&row.lastCredit)return t('recovery.helper',{day:when(row.lastCredit)});
  return when(row.lastPrimary);
 };
 const renderRow=(row:MuscleRecovery)=><ListRow key={row.muscle}
  title={t(`muscle.${row.muscle}` as TranslationKey)} detail={detail(row)}
  onPress={()=>browse(row.muscle)} suffix={mode==='untrained'&&row.untrained?
   <Button label={t('recovery.find')} variant="secondary" onPress={()=>browse(row.muscle)}/>:undefined}/>;
 const description=mode==='recent'?t('recovery.recentDesc'):mode==='volume'?t('recovery.volumeDesc'):t('recovery.untrainedDesc');
 return <Screen embedded>
  <Header title={t('recovery.title')} subtitle={mode==='recent'?t('recovery.recentSubtitle'):
   mode==='volume'?t('recovery.volumeSubtitle'):t('recovery.untrainedSubtitle')}
   onBack={()=>router.back()}/>
   <SegmentedControl label={t('recovery.view')} value={mode} onChange={setMode}
   options={[{value:'recent',label:t('recovery.recent')},{value:'volume',label:t('recovery.volume')},
    {value:'untrained',label:t('recovery.untrained')}]}/>
  <Card rim="train">
   <Chip kind="estimate" label={t('recovery.estimate')}/>
   <Typography tone="secondary" size="small">{t('recovery.explainer')}</Typography>
   <BodyMap shading={shades} primary={high} secondary={some} onSelect={browse}/>
   <Typography tone="secondary" size="small">{description}</Typography>
  </Card>
  <Card title={t('recovery.all')}>
   {error&& <Button label={t('recovery.retry')} onPress={()=>void refresh()}/>}
   {empty?<View style={{gap:theme.space[2]}}>
    <Typography tone="secondary">{t('recovery.empty')}</Typography>
     <Button label={t('recovery.start')} variant="train" onPress={()=>router.push('/(tabs)/train/preview')}/>
   </View>:mode==='untrained'?<>
    <Typography bold>{t('recovery.untrainedCount',{count:untrainedRows.length})}</Typography>
    {untrainedRows.map(renderRow)}
    <Typography bold>{t('recovery.trainedCount',{count:recentlyDirect.length})}</Typography>
    {recentlyDirect.map(renderRow)}
   </>:sorted.map(renderRow)}
  </Card>
  <Typography tone="tertiary" size="small">{t('recovery.footnote')}</Typography>
 </Screen>;
}
