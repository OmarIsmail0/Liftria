import {router,useFocusEffect} from 'expo-router';
import {useCallback,useEffect,useState} from 'react';
import {ScrollView,View} from 'react-native';
import {useLanguage} from '../../../src/i18n/LanguageProvider';
import {bidiIsolate,formatNumber,weightUnitLabel} from '../../../src/i18n';
import {formatEditableNumber} from '../../../src/i18n/editableNumber';
import {useTheme} from '../../../src/design/ThemeProvider';
import {Button,Card,Chip,Field,Header,ListRow,Screen,SegmentedControl,
 Sheet,Snackbar,Stepper,Typography} from '../../../src/design/primitives';
import {dayOffset,localDay} from '../../../src/features/eat/foodCatalog';
import {rangeDays,weightTrend,sourceCounts,type RangeKey,type WeightPoint} from '../../../src/features/progress/trendMath';
import {cachedHealthWeights,listLocalWeights,removeWeight,restoreWeight,saveWeight,
 weightNeedsConfirmation,validateWeight,type LocalWeight} from '../../../src/features/progress/weightRepository';
import {WeightGraph} from '../../../src/features/progress/TrendCharts';
import {getTypedSetting} from '../../../src/services/database/settings';
import {fromKg,toKg,type WeightUnit} from '../../../src/features/train/workoutUnits';
import {appleHealthPhone,healthCopy} from '../../../src/features/health/deviceHealth';

type Undo={type:'added';entry:LocalWeight}|{type:'deleted';entry:LocalWeight}|
 {type:'edited';entry:LocalWeight};
export default function BodyTrends(){
 const {t,language}=useLanguage(),{theme}=useTheme();
 const [range,setRange]=useState<RangeKey>('4w');
 const [local,setLocal]=useState<LocalWeight[]>([]),[health,setHealth]=useState<WeightPoint[]>([]);
 const [hidden,setHidden]=useState(false),[error,setError]=useState(false);
 const [weightUnit,setWeightUnit]=useState<WeightUnit>('kg');
 const [editing,setEditing]=useState(false),[current,setCurrent]=useState<LocalWeight|null>(null);
 const [entered,setEntered]=useState(''),[day,setDay]=useState(localDay(new Date())),[note,setNote]=useState('');
 const [busy,setBusy]=useState(false),[warning,setWarning]=useState(false);
 const [undo,setUndo]=useState<Undo|null>(null);
 const today=localDay(new Date());
 const load=useCallback(async()=>{
  const [a,b,h,u]=await Promise.all([listLocalWeights(),cachedHealthWeights(),getTypedSetting('hideNumbers'),getTypedSetting('units.weight')]);
  if(a.ok)setLocal(a.value);else setError(true);
  if(b.ok)setHealth(b.value);else setError(true);
  if(h.ok)setHidden(h.value);
  if(u.ok)setWeightUnit(u.value);
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
 const demoCount=local.filter(p=>p.note?.startsWith('Demo fixture')).length;
 const inputValue=Number(entered),weightKg=toKg(inputValue,weightUnit);
 const step=weightUnit==='lb'?0.2:0.1;
 const validDate=/^\d{4}-\d{2}-\d{2}$/.test(day);
 const date=validDate?new Date(Number(day.slice(0,4)),Number(day.slice(5,7))-1,Number(day.slice(8)),12):null;
 const valid=entered.trim()!==''&&date!==null&&localDay(date)===day&&
  validateWeight(weightKg,date.toISOString())&&note.length<=400;
 const fmt=(n:number,digits=1)=>bidiIsolate(language,formatNumber(language,n,
  {minimumFractionDigits:digits,maximumFractionDigits:digits}));
 const unitLabel=weightUnitLabel(language,weightUnit);
 function open(entry?:LocalWeight){
  setCurrent(entry??null);setDay(entry?localDay(new Date(entry.at)):today);
  setEntered(entry?formatEditableNumber(fromKg(entry.kg,weightUnit),'weight'):'');setNote(entry?.note??'');
  setWarning(false);setEditing(true);
 }
 async function save(confirmed=false){
  if(!valid||busy||!date)return;
  if(weightNeedsConfirmation(weightKg)&&!confirmed){setWarning(true);return;}
  setBusy(true);
  const previous=current;
  const recordedAt=previous&&day===localDay(new Date(previous.at))?previous.at:date.toISOString();
  const saved=await saveWeight(weightKg,recordedAt,note,current?.id);
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
 return <Screen embedded scroll={false}>
  <ScrollView keyboardShouldPersistTaps="handled"
   contentContainerStyle={{gap:theme.layout.cardGap,paddingVertical:theme.space[3]}}>
  <Header title={t('trend.body')} onBack={()=>router.back()}/>
  <SegmentedControl label={t('trend.range')} value={range} onChange={setRange}
   options={[{value:'4w',label:t('polish.range4w')},
    {value:'3m',label:t('polish.range3m')},{value:'1y',label:t('polish.range1y')}]}/>
  <Card rim="health" title={t('trend.weightTrend')}>
   <Typography tone="secondary" size="small">{t(healthCopy('trend.source'))}</Typography>
   {demoCount>0&&<Typography tone="secondary" size="small">{t('trend.demoDataWarning',{count:demoCount})}</Typography>}
   {result.latest?<Typography size="metric-m">{hidden?t('trend.hidden'):
    t('trend.weightValue',{weight:fmt(fromKg(result.latest.trend,weightUnit)),unit:unitLabel})}</Typography>:
    <Typography tone="secondary">{t(healthCopy('trend.empty'))}</Typography>}
   <Typography tone="secondary" size="small">{t('trend.emaDescription')}</Typography>
   {result.change!==null&&!hidden&&<Typography tone="secondary">{t('trend.trendChange',{
    change:fmt(fromKg(result.change,weightUnit)),unit:unitLabel})}</Typography>}
   {result.points.length>0&&<WeightGraph trend={result} hidden={hidden} unit={weightUnit}/>}
   <View style={{flexDirection:'row',gap:theme.space[3],flexWrap:'wrap'}}>
    <Chip kind="phone" label={t('trend.myWeight')}/>
    <Chip kind={counts.health===0?'off':'measured'} label={t(healthCopy('trend.chip'))}/>
   </View>
   <Typography tone="secondary" size="small">{t('trend.sourceCounts',{
    local:counts.local,health:counts.health})}</Typography>
   {hidden&&<Button label={t('eatI.showNumbers')} variant="ghost" onPress={()=>
    router.push('/settings/preferences')}/>}
   <Button label={t('trend.logWeight')} variant="secondary" onPress={()=>open()}/>
  </Card>
  <Card title={t('trend.bodyFat')}>
   <Typography tone="secondary">{t(appleHealthPhone()?'appleHealth.trend.bodyFat':'trend.bodyFatPending')}</Typography>
  </Card>
  <Card title={t('trend.weightHistory')}>
   {recent.length===0?<Typography tone="secondary">{t(healthCopy('trend.empty'))}</Typography>:
   recent.map(row=><ListRow key={row.id} title={hidden?t('trend.hidden'):
       t('trend.weightValue',{weight:fmt(fromKg(row.kg,weightUnit)),unit:unitLabel})}
      detail={bidiIsolate(language,localDay(new Date(row.at)))+' · '+
       (row.source==='liftria'?t('trend.myWeight'):t(healthCopy('trend.chip')))+
       (row.source!=='liftria'&&row.origin?' · '+row.origin:'')+
       ('note' in row&&typeof row.note==='string'&&row.note?' · '+row.note:'')}
      onPress={row.source==='liftria'?()=>open(row as LocalWeight):undefined}
      suffix={row.source!=='liftria'?<Chip kind="measured" label={t('trend.readOnly')}/>:undefined}/>)}
   {health.length>0&&<Typography tone="secondary" size="small">{t(healthCopy('trend.privacy'))}</Typography>}
  </Card>
  {error&&<Button label={t('common.retry')} onPress={()=>{setError(false);void load();}}/>}
  </ScrollView>
  {undo&&<View style={{paddingVertical:theme.space[2]}}>
   <Snackbar message={t('trend.weightChanged')} onUndo={()=>void undoAction()}/>
  </View>}
  <Sheet visible={editing} title={current?t('trend.editWeight'):t('trend.logWeight')}
    description={t(healthCopy('trend.localPrivacy'))} onClose={()=>setEditing(false)}>
   <Field label={t('trend.weightInput',{unit:unitLabel})} value={entered}
    onChangeText={v=>{setEntered(v);setWarning(false);}} keyboardType="decimal-pad"/>
   {Number.isFinite(inputValue)&&inputValue>0&&<Stepper
     label={t('trend.weightAdjust',{step:step.toFixed(1),unit:unitLabel})}
     value={Math.round(inputValue*10)/10} min={step}
     max={weightUnit==='lb'?1102.3:500} step={step} unit={unitLabel}
     onChange={v=>{setEntered(formatEditableNumber(v,'weight'));setWarning(false);}}/>}
   <Field label={t('trend.date')} value={day} onChangeText={setDay} placeholder={t('trend.datePlaceholder')}/>
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
