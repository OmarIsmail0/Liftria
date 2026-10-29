import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Button, Card, Field, Header, ListRow, Screen, SegmentedControl, OptionRows, Sheet, Typography } from '../../src/design/primitives';
import { backOrReplace } from '../../src/navigation/back';
import { useTheme } from '../../src/design/ThemeProvider';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { formatEditableNumber } from '../../src/i18n/editableNumber';
import { getProfile, profileSchema, saveProfile, type ProfileInput } from '../../src/services/database/profile';
import { addTarget, getCurrentTarget, targetSchema, type TargetInput, type Target } from '../../src/services/database/targets';
import { getTypedSetting } from '../../src/services/database/settings';
import { toMetricWeight, toMetricHeight, LB_PER_KG, CM_PER_IN, type WeightUnit, type HeightUnit } from '../../src/features/settings/units';
import { parseOptionalNumber, proposedTargetUpdate, estimateEditedProfile, checkSettingsTarget, type PendingProfileTarget } from '../../src/features/settings/profileTargets';

type Form = {
  name:string; birthYear:string; heightCm:string; feet:string; inches:string; weight:string;
  sexForFormula: 'male' | 'female' | 'unspecified' | null;
  activity:'sitting' | 'some' | 'active' | null; goal:'lose' | 'maintain' | 'build' | null;
};
const empty: Form = { name:'',birthYear:'',heightCm:'',feet:'',inches:'',weight:'',
  sexForFormula:null,activity:null,goal:null };

export default function ProfileAndGoals() {
  const {t}=useLanguage();
  const { theme } = useTheme();
  const [form,setForm] = useState<Form>(empty);
  const [unit,setUnit] = useState<{weight:WeightUnit;height:HeightUnit}>({weight:'kg',height:'cm'});
  const [target,setTarget] = useState<Target|null>(null);
  const [ready,setReady] = useState(false);
  const [busy,setBusy] = useState(false);
  const [pending,setPending] = useState<PendingProfileTarget|null>(null);
  const [message,setMessage] = useState<string|null>(null);
  const [targetEditor,setTargetEditor] = useState(false);
  const [manualKcal,setManualKcal] = useState('');
  const [manualProtein,setManualProtein] = useState('');
  const [manualFat,setManualFat] = useState('');
  const [manualCarbs,setManualCarbs] = useState('');
  const [floorRequest,setFloorRequest] = useState<{ input:ProfileInput; target:TargetInput }|null>(null);
  useEffect(() => {
    let mounted = true;
    void Promise.all([getProfile(),getCurrentTarget(),
      getTypedSetting('units.weight'),getTypedSetting('units.height')]).then(([profile,current,w,h]) => {
      if (!mounted) return;
      const wu = w.ok ? w.value : 'kg', hu = h.ok ? h.value : 'cm';
      setUnit({weight:wu,height:hu});
      const value = profile.ok ? profile.value : null;
      const savedTarget = current.ok ? current.value : null;
      setTarget(savedTarget);
      if (savedTarget) {
        setManualKcal(formatEditableNumber(savedTarget.kcal,'kcal'));
        setManualProtein(formatEditableNumber(savedTarget.proteinG,'grams'));
        setManualFat(formatEditableNumber(savedTarget.fatG,'grams'));
        setManualCarbs(formatEditableNumber(savedTarget.carbsG,'grams'));
      }
      if (!value) return;
      const heightInches = value.heightCm !== null ? Math.round(value.heightCm / CM_PER_IN) : null;
      setForm({
        name:value.name ?? '',birthYear:formatEditableNumber(value.birthYear,'count'),
        heightCm:formatEditableNumber(value.heightCm,'length'),
        feet:heightInches === null ? '' : formatEditableNumber(Math.floor(heightInches / 12),'count'),
        inches:heightInches === null ? '' : formatEditableNumber(heightInches % 12,'count'),
        weight:value.weightKg === null ? '' :
          formatEditableNumber(wu === 'lb' ? value.weightKg * LB_PER_KG : value.weightKg,'weight'),
        sexForFormula:value.sexForFormula,activity:value.activity,goal:value.goal,
      });
    }).catch(() => { if (mounted) setMessage(t('profileSettings.readError')); })
      .finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, [t]);
  function patch<K extends keyof Form>(key:K,value:Form[K]) {
    setForm(prev=>({...prev,[key]:value}));setMessage(null);
  }
  function inputFromForm(): ProfileInput {
    const cm = unit.height === 'cm'
      ? parseOptionalNumber(form.heightCm)
      : form.feet.trim() === '' && form.inches.trim() === '' ? null
        : toMetricHeight(parseOptionalNumber(form.feet) ?? Number.NaN,parseOptionalNumber(form.inches) ?? 0,'ftin');
    const weight = parseOptionalNumber(form.weight);
    return {
      name: form.name.trim() || null,
      sexForFormula:form.sexForFormula,
      birthYear:parseOptionalNumber(form.birthYear),
      heightCm:cm,weightKg:weight === null ? null : toMetricWeight(weight,unit.weight),
      activity:form.activity,goal:form.goal,
    };
  }
  async function persist(input:ProfileInput,update:TargetInput|null) {
    setBusy(true);setMessage(null);
    try {
      const saved=await saveProfile(input);
      if (!saved.ok) { setMessage(t('profileSettings.saveError'));return; }
      if (update) {
        const next=await addTarget(update);
        if (!next.ok) {
          setMessage(t('profileSettings.targetSaveError'));
          setPending(null); return;
        }
        setTarget(next.value);
      }
      setPending(null);setTargetEditor(false);setFloorRequest(null);
      setMessage(update ? t('profileSettings.savedTogether') : t('profileSettings.savedProfile'));
      if (update) router.replace('/settings');
    } catch { setMessage(t('profileSettings.saveFailed')); }
    finally { setBusy(false); }
  }
  function queueTarget(input:ProfileInput,targetInput:TargetInput) {
    const check=checkSettingsTarget(targetInput.kcal,input);
    if(check.blocked) { setMessage(t('profileSettings.belowFloor')); setTargetEditor(false); setPending(null); return; }
    if(check.warning) { setFloorRequest({input,target:targetInput}); setTargetEditor(false); setPending(null); return; }
    void persist(input,targetInput);
  }
  function inputIfValid(): ProfileInput | null {
    const result=profileSchema.safeParse(inputFromForm());
    if (!result.success) {
      setMessage(t('profileSettings.invalidProfile'));
      return null;
    }
    return result.data;
  }
  function useEditedEstimate() {
    const input=inputIfValid();
    if(!input) return;
    const estimate=estimateEditedProfile(input);
    if(!estimate) {
      setMessage(t('profileSettings.missingRequired'));
      return;
    }
    queueTarget(input,estimate);
  }
  function useManualTarget() {
    const input=inputIfValid();
    if(!input) return;
    const numbers=[manualKcal,manualProtein,manualFat,manualCarbs].map(n=>parseOptionalNumber(n));
    if(numbers.some(n=>n===null || !Number.isFinite(n))) {
      setMessage(t('profileSettings.invalidManual'));
      return;
    }
    const [kcal,proteinG,fatG,carbsG]=numbers as [number, number, number, number];
    if(kcal<1000) { setMessage(t('profileSettings.belowFloor'));return; }
    const targetInput=targetSchema.safeParse({kcal,proteinG,fatG,carbsG,source:'manual',inputs:null});
    if(!targetInput.success) {
      setMessage(t('profileSettings.invalidTarget'));return;
    }
    queueTarget(input,targetInput.data);
  }
  function onSave() {
    const input=inputIfValid();
    if(!input) return;
    const proposal=proposedTargetUpdate(input,target);
    if (proposal) setPending(proposal);
    else void persist(input,null);
  }
  return <Screen>
    <Header title={t('profileSettings.title')} subtitle={t('profileSettings.subtitle')}
      onBack={() => backOrReplace(router,'/settings')} />
    <Card title={t('profileSettings.profile')}>
      <Field label={t('profileSettings.name')} value={form.name} onChangeText={v=>patch('name',v)} />
      <SegmentedControl label={t('profileSettings.sex')}
        value={form.sexForFormula === 'unspecified' ? null : form.sexForFormula}
        onChange={v=>patch('sexForFormula',v)}
        options={[{value:'male',label:t('profileSettings.male')},
          {value:'female',label:t('profileSettings.female')}] as const} />
      <Typography tone="secondary" size="small">{t('polish.sexExplanation')}</Typography>
      {form.sexForFormula!==null&&<Button label={t('polish.clearSelection')} variant="ghost"
        onPress={()=>patch('sexForFormula',null)}/>}
      <Field label={t('profileSettings.birthYear')} value={form.birthYear} keyboardType="number-pad"
        onChangeText={v=>patch('birthYear',v)} placeholder={t('profileSettings.yearExample')} />
      {unit.height === 'cm' ? <Field label={t('profileSettings.heightCm')} value={form.heightCm} keyboardType="decimal-pad"
        onChangeText={v=>patch('heightCm',v)} /> :
        <View style={{gap:theme.space[2]}}>
          <Field label={t('profileSettings.heightFeet')} value={form.feet} keyboardType="number-pad" onChangeText={v=>patch('feet',v)} />
          <Field label={t('profileSettings.heightInches')} value={form.inches} keyboardType="number-pad" onChangeText={v=>patch('inches',v)} />
        </View>}
      <Field label={unit.weight==='kg'?t('profileSettings.weightKg'):t('profileSettings.weightLb')} value={form.weight}
        keyboardType="decimal-pad" onChangeText={v=>patch('weight',v)} />
      <Typography tone="secondary" size="small">{t('profileSettings.metricNote')}</Typography>
    </Card>
    <Card title={t('profileSettings.activityGoal')}>
      <OptionRows label={t('profileSettings.activity')} value={form.activity}
        onChange={v=>patch('activity',v)}
        options={[{value:'sitting',label:t('profileSettings.sitting'),description:t('polish.activitySitting')},
          {value:'some',label:t('profileSettings.some'),description:t('polish.activitySome')},
          {value:'active',label:t('profileSettings.active'),description:t('polish.activityActive')}] as const} />
      <OptionRows label={t('profileSettings.goal')} value={form.goal}
        onChange={v=>patch('goal',v)}
        options={[{value:'lose',label:t('profileSettings.lose'),description:t('polish.goalLose')},
          {value:'maintain',label:t('profileSettings.maintain'),description:t('polish.goalMaintain')},
          {value:'build',label:t('profileSettings.build'),description:t('polish.goalBuild')}] as const} />
      <ListRow title={t('profileSettings.currentTarget')} detail={target ? `${t('eatI.kcal',{count:target.kcal})} · ${target.source==='manual'?t('profileSettings.manual'):t('profileSettings.estimate')}` : t('profileSettings.noTarget')}
        onPress={()=>{setTargetEditor(true);setMessage(null)}} />
      <Typography tone="secondary" size="small">{t('profileSettings.editNote')}</Typography>
      {target?.source==='manual' && <Typography tone="secondary">{t('profileSettings.manualNote')}</Typography>}
    </Card>
    {message && <View accessibilityRole="alert"><Typography tone="secondary">ⓘ {message}</Typography></View>}
    <Button label={busy ? t('profileSettings.saving') : t('profileSettings.saveProfile')} fullWidth disabled={!ready||busy} onPress={onSave} />
    <Sheet visible={pending!==null} title={t('profileSettings.updateTitle')}
      description={pending ? t('profileSettings.updateDescription',{before:pending.previous.kcal,after:pending.estimate.kcal}) : undefined}
      onClose={()=>setPending(null)}>
      <Button label={t('profileSettings.keepTarget')} fullWidth disabled={busy}
        onPress={()=>{if(pending)void persist(pending.input,null)}} />
      <Button label={t('profileSettings.updateTarget')} variant="secondary" fullWidth disabled={busy}
        onPress={()=>{if(pending)queueTarget(pending.input,pending.estimate)}} />
    </Sheet>
    <Sheet visible={targetEditor} title={t('profileSettings.editTarget')}
      description={t('profileSettings.editTargetDesc')}
      onClose={()=>setTargetEditor(false)}>
      {estimateEditedProfile(inputFromForm()) ? <>
        <Typography tone="secondary">{t('profileSettings.estimateDescription',{kcal:estimateEditedProfile(inputFromForm())?.kcal??0})}</Typography>
        <Button label={t('profileSettings.useEstimate')} variant="secondary" fullWidth disabled={busy}
          onPress={useEditedEstimate} />
      </> : <Typography tone="secondary">{t('profileSettings.missingEstimate')}</Typography>}
      <Field label={t('profileSettings.calories')} value={manualKcal} keyboardType="numeric" onChangeText={setManualKcal} />
      <Field label={t('profileSettings.protein')} value={manualProtein} keyboardType="numeric" onChangeText={setManualProtein} />
      <Field label={t('profileSettings.fat')} value={manualFat} keyboardType="numeric" onChangeText={setManualFat} />
      <Field label={t('profileSettings.carbs')} value={manualCarbs} keyboardType="numeric" onChangeText={setManualCarbs} />
      {message && <View accessibilityRole="alert"><Typography tone="secondary" size="small">ⓘ {message}</Typography></View>}
      <Button label={t('profileSettings.saveManual')} variant="secondary" disabled={busy} fullWidth onPress={useManualTarget} />
    </Sheet>
    <Sheet visible={floorRequest!==null} title={t('profileSettings.caution')}
      description={t('profileSettings.cautionDesc')}
      onClose={()=>setFloorRequest(null)}>
      <Button label={t('profileSettings.keepTarget')} fullWidth onPress={()=>setFloorRequest(null)} />
      <Button label={t('profileSettings.continueTarget')} variant="secondary" fullWidth
        disabled={busy} onPress={()=>{if(floorRequest)void persist(floorRequest.input,floorRequest.target)}} />
    </Sheet>
  </Screen>;
}
