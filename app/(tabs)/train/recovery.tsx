import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { BodyMap } from '../../../src/features/train/BodyMap';
import { useTheme } from '../../../src/design/ThemeProvider';
import { Button, Card, Chip, Header, ListRow, Screen, SegmentedControl, Typography } from '../../../src/design/primitives';
import { readStrengthObservations } from '../../../src/services/database/historyRepository';
import { calculateMuscleRecovery, recoveryRowText, volumeBand,
  type MuscleRecovery } from '../../../src/features/train/recoveryMath';
import { titleMuscle, type Muscle } from '../../../src/services/database/gymTypes';
import type { MuscleShade } from '../../../src/features/train/BodyMap';

type Mode='recent'|'volume'|'untrained';
export default function Recovery(){
 const {theme}=useTheme();
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
 const renderRow=(row:MuscleRecovery)=><ListRow key={row.muscle}
  title={titleMuscle(row.muscle)} detail={recoveryRowText(row,mode,new Date())}
  onPress={()=>browse(row.muscle)} suffix={mode==='untrained'&&row.untrained?
   <Button label="Find exercises" variant="secondary" onPress={()=>browse(row.muscle)}/>:undefined}/>;
 const description=mode==='recent'?'Higher load, mostly the last 24 hours · Some load, 24–72 hours · Ready, little or none':
  mode==='volume'?'Sets this week: none · 1–5 · 6–11 · 12+':'No direct sets in 10+ days · Trained recently';
 return <Screen embedded>
  <Header title="Muscles" subtitle={mode==='recent'?'Last 72 hours · estimate':
   mode==='volume'?'Last 7 days · estimate':'Direct sets · last 10 days · estimate'}
   onBack={()=>router.back()}/>
  <SegmentedControl label="Recovery view" value={mode} onChange={setMode}
   options={[{value:'recent',label:'Recent'},{value:'volume',label:'Volume'},
    {value:'untrained',label:'Untrained'}]}/>
  <Card rim="train">
   <Chip kind="estimate" label="Estimate"/>
   <Typography tone="secondary" size="small">Counted from the sets you log in Liftria. It does not know your sleep, soreness or food.</Typography>
   <BodyMap shading={shades} primary={high} secondary={some} onSelect={browse}/>
   <Typography tone="secondary" size="small">{description}</Typography>
  </Card>
  <Card title="All 17 regions">
   {error&&<Button label="Retry" onPress={()=>void refresh()}/>}
   {empty?<View style={{gap:theme.space[2]}}>
    <Typography tone="secondary">Log a few workouts and your muscle map fills in.</Typography>
    <Button label="Start a workout" variant="train" onPress={()=>router.push('/(tabs)/train/preview')}/>
   </View>:mode==='untrained'?<>
    <Typography bold>{'No direct sets in 10+ days ('+untrainedRows.length+')'}</Typography>
    {untrainedRows.map(renderRow)}
    <Typography bold>{'Trained in the last 10 days ('+recentlyDirect.length+')'}</Typography>
    {recentlyDirect.map(renderRow)}
   </>:sorted.map(renderRow)}
  </Card>
  <Typography tone="tertiary" size="small">Warm-ups count 0. Secondary muscles count half a set. Imported sessions count like local workouts. No muscle data means no credit.</Typography>
 </Screen>;
}
