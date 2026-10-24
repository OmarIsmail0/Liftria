import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Button, Card, Field, Header, ListRow, Screen, SegmentedControl, Sheet, Typography } from '../../src/design/primitives';
import { backOrReplace } from '../../src/navigation/back';
import { useTheme } from '../../src/design/ThemeProvider';
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
const fmt = (n:number|null, decimal=false):string => n === null ? '' : decimal ? n.toFixed(1) : String(n);

export default function ProfileAndGoals() {
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
        setManualKcal(String(savedTarget.kcal));
        setManualProtein(String(savedTarget.proteinG));
        setManualFat(String(savedTarget.fatG));
        setManualCarbs(String(savedTarget.carbsG));
      }
      if (!value) return;
      const heightInches = value.heightCm !== null ? Math.round(value.heightCm / CM_PER_IN) : null;
      setForm({
        name:value.name ?? '',birthYear:fmt(value.birthYear),
        heightCm:fmt(value.heightCm,true),
        feet:heightInches === null ? '' : String(Math.floor(heightInches / 12)),
        inches:heightInches === null ? '' : String(heightInches % 12),
        weight:value.weightKg === null ? '' : fmt(wu === 'lb' ? value.weightKg * LB_PER_KG : value.weightKg,true),
        sexForFormula:value.sexForFormula,activity:value.activity,goal:value.goal,
      });
    }).catch(() => { if (mounted) setMessage('Unable to read your saved profile.'); })
      .finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, []);
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
      if (!saved.ok) { setMessage('Could not save the profile. Nothing else was changed.');return; }
      if (update) {
        const next=await addTarget(update);
        if (!next.ok) {
          setMessage('Profile saved, but the new target was not saved. Your earlier target is unchanged.');
          setPending(null); return;
        }
        setTarget(next.value);
      }
      setPending(null);setTargetEditor(false);setFloorRequest(null);
      setMessage(update ? 'Profile and target saved.' : 'Profile saved. Your target was kept.');
      if (update) router.replace('/settings');
    } catch { setMessage('Could not save. Check the fields and try again.'); }
    finally { setBusy(false); }
  }
  function queueTarget(input:ProfileInput,targetInput:TargetInput) {
    const check=checkSettingsTarget(targetInput.kcal,input);
    if(check.blocked) { setMessage(check.reason); setTargetEditor(false); setPending(null); return; }
    if(check.warning) { setFloorRequest({input,target:targetInput}); setTargetEditor(false); setPending(null); return; }
    void persist(input,targetInput);
  }
  function inputIfValid(): ProfileInput | null {
    const result=profileSchema.safeParse(inputFromForm());
    if (!result.success) {
      setMessage(result.error.issues.map(issue=>issue.message).join(' '));
      return null;
    }
    return result.data;
  }
  function useEditedEstimate() {
    const input=inputIfValid();
    if(!input) return;
    const estimate=estimateEditedProfile(input);
    if(!estimate) {
      setMessage('Complete age, height, weight, formula sex, activity and goal to calculate an estimate.');
      return;
    }
    queueTarget(input,estimate);
  }
  function useManualTarget() {
    const input=inputIfValid();
    if(!input) return;
    const numbers=[manualKcal,manualProtein,manualFat,manualCarbs].map(n=>parseOptionalNumber(n));
    if(numbers.some(n=>n===null || !Number.isFinite(n))) {
      setMessage('Enter valid calories, protein, fat and carbs before saving a manual target.');
      return;
    }
    const [kcal,proteinG,fatG,carbsG]=numbers as number[];
    if(kcal<1000) { setMessage('A calorie target below 1,000 kcal cannot be saved.');return; }
    const targetInput=targetSchema.safeParse({kcal,proteinG,fatG,carbsG,source:'manual',inputs:null});
    if(!targetInput.success) {
      setMessage(targetInput.error.issues.map(issue=>issue.message).join(' '));return;
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
    <Header title="Profile and goals" subtitle="Stored locally · optional fields"
      onBack={() => backOrReplace(router,'/settings')} />
    <Card title="Profile">
      <Field label="Name (optional)" value={form.name} onChangeText={v=>patch('name',v)} />
      <Typography tone="secondary" size="small">Used only to estimate your calorie target. You can leave this blank.</Typography>
      <SegmentedControl label="Sex for the formula" value={form.sexForFormula ?? 'unset'}
        onChange={v=>patch('sexForFormula',v==='unset'?null:v)}
        options={[{value:'unset',label:'Not set'},{value:'male',label:'Male'},{value:'female',label:'Female'},
          {value:'unspecified',label:'Prefer not to say'}]} />
      <Field label="Birth year" value={form.birthYear} keyboardType="number-pad"
        onChangeText={v=>patch('birthYear',v)} placeholder="e.g. 1996" />
      {unit.height === 'cm' ? <Field label="Height (cm)" value={form.heightCm} keyboardType="decimal-pad"
        onChangeText={v=>patch('heightCm',v)} /> :
        <View style={{gap:theme.space[2]}}>
          <Field label="Height (feet)" value={form.feet} keyboardType="number-pad" onChangeText={v=>patch('feet',v)} />
          <Field label="Height (inches)" value={form.inches} keyboardType="number-pad" onChangeText={v=>patch('inches',v)} />
        </View>}
      <Field label={unit.weight==='kg'?'Weight (kg)':'Weight (lb)'} value={form.weight}
        keyboardType="decimal-pad" onChangeText={v=>patch('weight',v)} />
      <Typography tone="secondary" size="small">Measurements are stored in metric, whatever units you choose.</Typography>
    </Card>
    <Card title="Activity and goal">
      <SegmentedControl label="Activity" value={form.activity ?? 'unset'}
        onChange={v=>patch('activity',v==='unset'?null:v)}
        options={[{value:'unset',label:'Not set'},{value:'sitting',label:'Sitting'},
          {value:'some',label:'Some'},{value:'active',label:'Active'}]} />
      <SegmentedControl label="Goal" value={form.goal ?? 'unset'}
        onChange={v=>patch('goal',v==='unset'?null:v)}
        options={[{value:'unset',label:'Not set'},{value:'lose',label:'Lose'},
          {value:'maintain',label:'Maintain'},{value:'build',label:'Build'}]} />
      <ListRow title="Current calorie target" detail={target ? `${target.kcal} kcal · ${target.source==='manual'?'Manual':'Estimate'}` : 'No target set'}
        onPress={()=>{setTargetEditor(true);setMessage(null)}} />
      <Typography tone="secondary" size="small">Edit or recalculate here using your current form. No onboarding steps are changed.</Typography>
      {target?.source==='manual' && <Typography tone="secondary">Manual targets never change automatically when you save your profile.</Typography>}
    </Card>
    {message && <View accessibilityRole="alert"><Typography tone="secondary">ⓘ {message}</Typography></View>}
    <Button label={busy ? 'Saving…' : 'Save profile'} fullWidth disabled={!ready||busy} onPress={onSave} />
    <Sheet visible={pending!==null} title="Update your estimated target?"
      description={pending ? `Your estimated target changes from ${pending.previous.kcal.toLocaleString()} to ${pending.estimate.kcal.toLocaleString()} kcal. This is optional.` : undefined}
      onClose={()=>setPending(null)}>
      <Button label="Keep current target" fullWidth disabled={busy}
        onPress={()=>{if(pending)void persist(pending.input,null)}} />
      <Button label="Update target" variant="secondary" fullWidth disabled={busy}
        onPress={()=>{if(pending)queueTarget(pending.input,pending.estimate)}} />
    </Sheet>
    <Sheet visible={targetEditor} title="Edit calorie target"
      description="Calculate from the edited profile above, or set a manual target. A manual target will never change automatically."
      onClose={()=>setTargetEditor(false)}>
      {estimateEditedProfile(inputFromForm()) ? <>
        <Typography tone="secondary">Estimate from edited profile: {estimateEditedProfile(inputFromForm())?.kcal.toLocaleString()} kcal</Typography>
        <Button label="Use this estimate" variant="secondary" fullWidth disabled={busy}
          onPress={useEditedEstimate} />
      </> : <Typography tone="secondary">Complete the optional profile fields above to calculate an estimate.</Typography>}
      <Field label="Calories (kcal)" value={manualKcal} keyboardType="numeric" onChangeText={setManualKcal} />
      <Field label="Protein (g)" value={manualProtein} keyboardType="numeric" onChangeText={setManualProtein} />
      <Field label="Fat (g)" value={manualFat} keyboardType="numeric" onChangeText={setManualFat} />
      <Field label="Carbs (g)" value={manualCarbs} keyboardType="numeric" onChangeText={setManualCarbs} />
      <Button label="Save manual target" variant="secondary" disabled={busy} fullWidth onPress={useManualTarget} />
    </Sheet>
    <Sheet visible={floorRequest!==null} title="Calorie target caution"
      description="This is lower than Liftria recommends without guidance from a professional. You can keep your current target or explicitly continue."
      onClose={()=>setFloorRequest(null)}>
      <Button label="Keep current target" fullWidth onPress={()=>setFloorRequest(null)} />
      <Button label="Continue with this target" variant="secondary" fullWidth
        disabled={busy} onPress={()=>{if(floorRequest)void persist(floorRequest.input,floorRequest.target)}} />
    </Sheet>
  </Screen>;
}
