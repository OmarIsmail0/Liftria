import {router,useFocusEffect} from 'expo-router';
import {useCallback,useState} from 'react';
import {Button,Card,Chip,Field,Header,Screen,Sheet,Toggle,Typography} from '../../../src/design/primitives';
import {useLanguage} from '../../../src/i18n/LanguageProvider';
import {getCurrentTarget,addTarget,type Target} from '../../../src/services/database/targets';
import {getProfile,type Profile} from '../../../src/services/database/profile';
import {getTypedSetting,setTypedSetting} from '../../../src/services/database/settings';
import {checkSettingsTarget,estimateEditedProfile} from '../../../src/features/settings/profileTargets';
import {MEALS,type MealKey} from '../../../src/features/eat/foodCatalog';

export default function EatTargets(){
 const {t}=useLanguage();
 const [current,setCurrent]=useState<Target|null>(null);
 const [profile,setProfile]=useState<Profile|null>(null);
 const [kcal,setKcal]=useState(''),[protein,setProtein]=useState('');
 const [carbs,setCarbs]=useState(''),[fat,setFat]=useState('');
 const [hide,setHide]=useState(false),[ramadan,setRamadan]=useState(false);
 const [iftarTime,setIftarTime]=useState('18:00');
 const [useCalculated,setUseCalculated]=useState(false);
 const [mealNames,setMealNames]=useState<Partial<Record<MealKey,string>>>({});
 const [warning,setWarning]=useState(false),[guidance,setGuidance]=useState(false);
 const [error,setError]=useState(false),[busy,setBusy]=useState(false);
 const [saved,setSaved]=useState(false);
 useFocusEffect(useCallback(()=>{
  let live=true;
  void Promise.all([getCurrentTarget(),getProfile(),getTypedSetting('hideNumbers'),
    getTypedSetting('eat.ramadan'),getTypedSetting('eat.mealNames'),getTypedSetting('eat.iftarTime')]).then(([goal,p,h,r,n,iftar])=>{
    if(!live)return;
    if(goal.ok){setCurrent(goal.value);if(goal.value){
      setUseCalculated(goal.value.source==='estimate');
      setKcal(String(goal.value.kcal));setProtein(String(goal.value.proteinG));
      setCarbs(String(goal.value.carbsG));setFat(String(goal.value.fatG));
    }}
    if(p.ok)setProfile(p.value);
    if(h.ok)setHide(h.value);if(r.ok)setRamadan(r.value);
    if(n.ok)setMealNames(n.value??{});
    if(iftar.ok)setIftarTime(iftar.value);
  });
  return()=>{live=false;};
 },[]));
 const numeric=[kcal,protein,carbs,fat].map(Number);
 const valid=numeric.every(Number.isFinite)&&numeric.every(n=>n>=0)&&
   [kcal,protein,carbs,fat].every(s=>s.trim().length>0)&&numeric[0]!>=1000;
 const estimated=profile?estimateEditedProfile(profile):null;
 const check=valid?checkSettingsTarget(numeric[0]!,profile??{
   name:null,sexForFormula:null,birthYear:null,heightCm:null,weightKg:null,activity:null,goal:null}):null;
 async function save(force=false){
  if(!valid||busy)return;
  if(check?.warning&&!force){setWarning(true);return;}
  if(check?.warning&&!guidance)return;
  setBusy(true);setSaved(false);
  const matched=useCalculated&&estimated&&numeric[0]===estimated.kcal&&
    numeric[1]===estimated.proteinG&&numeric[2]===estimated.carbsG&&numeric[3]===estimated.fatG;
  const result=await addTarget({kcal:numeric[0]!,proteinG:numeric[1]!,
    carbsG:numeric[2]!,fatG:numeric[3]!,source:matched?'estimate':'manual',
    inputs:matched?{...estimated.inputs}:null});
  if(result.ok){setCurrent(result.value);setSaved(true);setWarning(false);}
  else setError(true);
  setBusy(false);
 }
 async function setFlag(name:'hideNumbers'|'eat.ramadan',value:boolean){
  const result=name==='hideNumbers'?await setTypedSetting('hideNumbers',value):
    await setTypedSetting('eat.ramadan',value);
  if(result.ok){if(name==='hideNumbers')setHide(value);else setRamadan(value);}else setError(true);
 }
 async function updateName(meal:MealKey,value:string){
  const next={...mealNames,[meal]:value};
  setMealNames(next);
  // Save on explicit button to avoid one write per keystroke.
 }
 async function saveNames(){
  const result=await setTypedSetting('eat.mealNames',mealNames);
  if(!result.ok)setError(true);else setSaved(true);
 }
 const preset=async()=>{
  const next:Partial<Record<MealKey,string>>={breakfast:t('eatI.suhoor'),
    dinner:t('eatI.iftar'),snacks:t('eatI.snacks'),lunch:t('eatI.lunch')};
  const result=await setTypedSetting('eat.mealNames',next);
  if(result.ok)setMealNames(next);else setError(true);
 };
 return <Screen embedded>
  <Header title={t('eatI.targets')} onBack={()=>router.back()}/>
  <Card rim="eat" title={t('eatI.dailyTarget')}>
   {current?.source==='estimate'&&<Chip kind="estimate"/>}
   <Typography tone="secondary">{t('eatI.targetExplain')}</Typography>
   {estimated&&<Button label={t('eatI.useEstimate',{count:estimated.kcal})}
     variant="secondary" onPress={()=>{
       setKcal(String(estimated.kcal));setProtein(String(estimated.proteinG));
       setCarbs(String(estimated.carbsG));setFat(String(estimated.fatG));setUseCalculated(true);
     }}/>}
   <Field label={t('eatI.calories')} value={kcal} onChangeText={v=>{setKcal(v);setUseCalculated(false);}} keyboardType="decimal-pad"/>
   <Field label={t('eatI.protein')} value={protein} onChangeText={v=>{setProtein(v);setUseCalculated(false);}} keyboardType="decimal-pad"/>
   <Field label={t('eatI.carbs')} value={carbs} onChangeText={v=>{setCarbs(v);setUseCalculated(false);}} keyboardType="decimal-pad"/>
   <Field label={t('eatI.fat')} value={fat} onChangeText={v=>{setFat(v);setUseCalculated(false);}} keyboardType="decimal-pad"/>
   <Typography tone="secondary" size="small">{t('eatI.minCalories')}</Typography>
   <Button label={t('eatI.saveTarget')} disabled={!valid||busy} fullWidth
     onPress={()=>void save()}/>
   {saved&&<Typography>{t('eatI.saved')}</Typography>}
  </Card>
  <Card title={t('eatI.display')}>
   <Toggle label={t('eatI.hideNumbers')} value={hide}
     onChange={v=>void setFlag('hideNumbers',v)}/>
  </Card>
  <Card title={t('eatI.mealNames')}>
   <Toggle label={t('eatI.ramadanMode')} detail={t('eatI.ramadanDetail')}
     value={ramadan} onChange={v=>void setFlag('eat.ramadan',v)}/>
   {ramadan&&<>
      <Button label={t('eatI.ramadanPreset')} variant="secondary" onPress={()=>void preset()}/>
      <Field label={t('eatI.iftarTime')} value={iftarTime} onChangeText={setIftarTime}
        placeholder="18:00"/>
      <Button label={t('eatI.saveTime')} variant="secondary"
        disabled={!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(iftarTime)}
        onPress={()=>void setTypedSetting('eat.iftarTime',iftarTime).then(v=>{if(!v.ok)setError(true);})}/>
   </>
   {MEALS.map(meal=><Field key={meal} label={t(`eatI.${meal}`)}
     value={mealNames[meal]??''} placeholder={t(`eatI.${meal}`)}
     onChangeText={value=>void updateName(meal,value)}/>)}
   <Button label={t('eatI.saveNames')} variant="secondary" onPress={()=>void saveNames()}/>
  </Card>
  {error&&<Typography>{t('eatI.error')}</Typography>}
  <Sheet visible={warning} title={t('eatI.targetCaution')}
    description={t('eatI.targetWarning')} onClose={()=>setWarning(false)}>
   <Toggle label={t('eatI.guidance')} value={guidance} onChange={setGuidance}/>
   <Button label={t('eatI.use1200')} fullWidth onPress={()=>{
     setKcal(String(Math.max(1200,Math.ceil((estimated?.kcal??0)*0.75/50)*50)));
     setUseCalculated(false);
     setWarning(false);
   }}/>
   <Button label={t('eatI.keepTarget')} variant="secondary" fullWidth
     disabled={!guidance} onPress={()=>void save(true)}/>
  </Sheet>
 </Screen>;
}
