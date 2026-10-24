import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Button, Card, Field, Header, ListRow, Screen, SegmentedControl, Sheet, Typography } from '../../src/design/primitives';
import { backOrReplace } from '../../src/navigation/back';
import { useTheme } from '../../src/design/ThemeProvider';
import { getProfile, profileSchema, saveProfile, type ProfileInput } from '../../src/services/database/profile';
import { addTarget, getCurrentTarget, type Target } from '../../src/services/database/targets';
import { getTypedSetting } from '../../src/services/database/settings';
import { toMetricWeight, toMetricHeight, LB_PER_KG, CM_PER_IN, type WeightUnit, type HeightUnit } from '../../src/features/settings/units';
import { parseOptionalNumber, proposedTargetUpdate, type PendingProfileTarget } from '../../src/features/settings/profileTargets';

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
  useEffect(() => {
    let mounted = true;
    void Promise.all([getProfile(),getCurrentTarget(),
      getTypedSetting('units.weight'),getTypedSetting('units.height')]).then(([profile,current,w,h]) => {
      if (!mounted) return;
      const wu = w.ok ? w.value : 'kg', hu = h.ok ? h.value : 'cm';
      setUnit({weight:wu,height:hu});
      const value = profile.ok ? profile.value : null;
      setTarget(current.ok ? current.value : null);
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
  async function persist(input:ProfileInput,update:PendingProfileTarget|null) {
    setBusy(true);setMessage(null);
    try {
      const saved=await saveProfile(input);
      if (!saved.ok) { setMessage('Could not save the profile. Nothing else was changed.');return; }
      if (update) {
        const next=await addTarget(update.estimate);
        if (!next.ok) {
          setMessage('Profile saved, but the new target was not saved. Your earlier target is unchanged.');
          setPending(null); return;
        }
        setTarget(next.value);
      }
      setPending(null);setMessage(update ? 'Profile and new estimated target saved.' : 'Profile saved. Your target was kept.');
    } catch { setMessage('Could not save. Check the fields and try again.'); }
    finally { setBusy(false); }
  }
  function onSave() {
    const parsed=profileSchema.safeParse(inputFromForm());
    if (!parsed.success) {
      setMessage(parsed.error.issues.map(issue => issue.message).join(' '));return;
    }
    const proposal=proposedTargetUpdate(parsed.data,target);
    if (proposal) setPending(proposal);
    else void persist(parsed.data,null);
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
        onPress={()=>router.push({pathname:'/onboarding/[step]',params:{step:'target'}})} />
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
        onPress={()=>{if(pending)void persist(pending.input,pending)}} />
    </Sheet>
  </Screen>;
}
