import {router,useFocusEffect} from 'expo-router';
import {useCallback,useEffect,useState} from 'react';
import {View} from 'react-native';
import {useLanguage} from '../../../src/i18n/LanguageProvider';
import {bidiIsolate,formatNumber} from '../../../src/i18n';
import {useTheme} from '../../../src/design/ThemeProvider';
import {Button,Card,Chip,Field,Header,ListRow,Screen,SegmentedControl,
 Sheet,Snackbar,Stepper,Typography} from '../../../src/design/primitives';
import {dayOffset,localDay} from '../../../src/features/eat/foodCatalog';
import {rangeDays,weightTrend,sourceCounts,type RangeKey,type WeightPoint} from '../../../src/features/progress/trendMath';
import {cachedHealthWeights,listLocalWeights,removeWeight,restoreWeight,saveWeight,
 weightNeedsConfirmation,validateWeight,type LocalWeight} from '../../../src/features/progress/weightRepository';
import {WeightGraph} from '../../../src/features/progress/TrendCharts';
import {getTypedSetting} from '../../../src/services/database/settings';

type Undo={type:'added';entry:LocalWeight}|{type:'deleted';entry:LocalWeight}|
 {type:'edited';entry:LocalWeight};
export default function BodyTrends(){
 const {t,language}=useLanguage(),{theme}=useTheme();
 const [range,setRange]=useState<RangeKey>('4w');
 const [local,setLocal]=useState<LocalWeight[]>([]),[health,setHealth]=useState<WeightPoint[]>([]);
 const [hidden,setHidden]=useState(false),[error,setError]=useState(false);
 const [editing,setEditing]=useState(false),[current,setCurrent]=useState<LocalWeight|null>(null);
 const [kg,setKg]=useState(''),[day,setDay]=useState(localDay(new Date())),[note,setNote]=useState('');
 const [busy,setBusy]=useState(false),[warning,setWarning]=useState(false);
 const [undo,setUndo]=useState<Undo|null>(null);
 const today=localDay(new Date());
 const load=useCallback(async()=>{
  const [a,b,h]=await Promise.all([listLocalWeights(),cachedHealthWeights(),getTypedSetting('hideNumbers')]);
  if(a.ok)setLocal(a.value);else setError(true);
  if(b.ok)setHealth(b.value);else setError(true);
  if(h.ok)setHidden(h.value);
 },[]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 useEffect(()=>{
  if(!undo)return;
  const timer=setTimeout(()=>setUndo(null),8000);
  return()=>clearTimeout(timer);
 },[undo]);
 const first=dayOffset(today,1-rangeDays(range)),result=weightTrend([...local,...health],first,today);
 const recent=[...local,...health].filter(row=>Number.isFinite(new Date(row.at).getTime()))
  .sort((a,b)=>b.at.localeCompare(a.at)).slice(0,30);
 const counts=sourceCounts(result.points.flatMap(p=>p.entries));
 const weight=Number(kg),validDate=/^\d{4}-\d{2}-\d{2}$/.test(day);
 const date=validDate?new Date(Number(day.slice(0,4)),Number(day.slice(5,7))-1,Number(day.slice(8)),12):null;
 const valid=kg.trim()!==''&&date!==null&&localDay(date)===day&&
  validateWeight(weight,date.toISOString())&&note.length<=400;
 const fmt=(n:number,digits=1)=>bidiIsolate(language,formatNumber(language,n,
  {minimumFractionDigits:digits,maximumFractionDigits:digits}));
 function open(entry?:LocalWeight){
  setCurrent(entry??null);setDay(entry?localDay(new Date(entry.at)):today);
  setKg(entry?String(entry.kg):'');setNote(entry?.note??'');
  setWarning(false);setEditing(true);
 }
 async function save(confirmed=false){
  if(!valid||busy||!date)return;
  if(weightNeedsConfirmation(weight)&&!confirmed){setWarning(true);return;}
  setBusy(true);
  const previous=current;
  const recordedAt=previous&&day===localDay(new Date(previous.at))?previous.at:date.toISOString();
  const saved=await saveWeight(weight,recordedAt,note,current?.id);
  setBusy(false);
  if(!saved.ok){setError(true);return;}
  setUndo(previous?{type:'edited',entry:previous}:{type:'added',entry:saved.value});
  setEditing(false);setWarning(false);await load();
 }
 async function remove(){
  if(!current||busy)return;setBusy(true);
  const done=await removeWeight(current.id);setBusy(false);
  if(done.ok&&done.value){setUndo({type:'deleted',entry:done.value});
   setEditing(false);await load();
  }else setError(true);
 }
 async function undoAction(){
  if(!undo)return;
  const result=undo.type==='added'?await removeWeight(undo.entry.id):
   undo.type==='edited'?await saveWeight(undo.entry.kg,undo.entry.at,undo.entry.note,undo.entry.id):
    await restoreWeight(undo.entry);
  if(result.ok){setUndo(null);await load();}else setError(true);
 }
 return <Screen embedded>
  <Header title={t('trend.body')} onBack={()=>router.back()}/>
  <SegmentedControl label={t('trend.range')} value={range} onChange={setRange}
   options={[{value:'4w',label:t('polish.range4w')},
    {value:'3m',label:t('polish.range3m')},{value:'1y',label:t('polish.range1y')}]}/>
  <Card rim="health" title={t('trend.weightTrend')}>
   <Typography tone="secondary" size="small">{t('trend.weightSource')}</Typography>
   {result.latest?<Typography size="metric-m">{hidden?t('trend.hidden'):
    t('trend.kg',{weight:fmt(result.latest.trend)})}</Typography>:
    <Typography tone="secondary">{t('trend.weightEmpty')}</Typography>}
   <Typography tone="secondary" size="small">{t('trend.emaDescription')}</Typography>
   {result.change!==null&&!hidden&&<Typography tone="secondary">{t('trend.trendChange',{
    change:fmt(result.change)})}</Typography>}
   {result.points.length>0&&<WeightGraph trend={result} hidden={hidden}/>}
   <View style={{flexDirection:'row',gap:theme.space[3],flexWrap:'wrap'}}>
    <Chip kind="phone" label={t('trend.myWeight')}/>
    <Chip kind="measured" label={t('trend.healthConnect')}/>
   </View>
   <Typography tone="secondary" size="small">{t('trend.sourceCounts',{
    local:counts.local,health:counts.health})}</Typography>
   {hidden&&<Button label={t('eatI.showNumbers')} variant="ghost" onPress={()=>
    router.push('/settings/preferences')}/>}
   <Button label={t('trend.logWeight')} variant="secondary" onPress={()=>open()}/>
  </Card>
  <Card title={t('trend.bodyFat')}>
   <Typography tone="secondary">{t('trend.bodyFatPending')}</Typography>
  </Card>
  <Card title={t('trend.weightHistory')}>
   {recent.length===0?<Typography tone="secondary">{t('trend.weightEmpty')}</Typography>:
   recent.map(row=><ListRow key={row.id} title={hidden?t('trend.hidden'):
       t('trend.kg',{weight:fmt(row.kg)})}
      detail={bidiIsolate(language,localDay(new Date(row.at)))+' · '+
       (row.source==='liftria'?t('trend.myWeight'):t('trend.healthConnect'))+
       (row.source==='health-connect'&&row.origin?' · '+row.origin:'')}
      onPress={row.source==='liftria'?()=>open(row as LocalWeight):undefined}
      suffix={row.source==='health-connect'?<Chip kind="measured" label={t('trend.readOnly')}/>:undefined}/>)}
   {health.length>0&&<Typography tone="secondary" size="small">{t('trend.healthPrivacy')}</Typography>}
  </Card>
  {error&&<Button label={t('common.retry')} onPress={()=>{setError(false);void load();}}/>}
  {undo&&<Snackbar message={t('trend.weightChanged')} onUndo={()=>void undoAction()}/>}
  <Sheet visible={editing} title={current?t('trend.editWeight'):t('trend.logWeight')}
    description={t('trend.localWeightPrivacy')} onClose={()=>setEditing(false)}>
   <Field label={t('trend.kgInput')} value={kg} onChangeText={v=>{setKg(v);setWarning(false);}}
    keyboardType="decimal-pad"/>
   {Number.isFinite(weight)&&weight>0&&<Stepper label={t('trend.adjustWeight')}
     value={Math.round(weight*10)/10} min={0.1} max={500} step={0.1} unit="kg"
     onChange={v=>{setKg((Math.round(v*10)/10).toFixed(1));setWarning(false);}}/>}
   <Field label={t('trend.date')} value={day} onChangeText={setDay} placeholder="YYYY-MM-DD"/>
   <Field label={t('trend.note')} value={note} onChangeText={setNote} multiline/>
   {warning&&<Card title={t('trend.unusualWeight')}>
     <Typography tone="secondary">{t('trend.unusualDetail')}</Typography>
     <Button label={t('trend.fixWeight')} onPress={()=>setWarning(false)}/>
     <Button label={t('trend.saveAnyway')} variant="secondary" disabled={!valid||busy}
      onPress={()=>void save(true)}/>
   </Card>}
   {!warning&&<Button label={current?t('trend.saveChanges'):t('common.save')}
    disabled={!valid||busy} fullWidth onPress={()=>void save()}/>}
   {current&&<Button label={t('trend.deleteWeight')} variant="danger"
    disabled={busy} onPress={()=>void remove()}/>}
  </Sheet>
 </Screen>;
}
