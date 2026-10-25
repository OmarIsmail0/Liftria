import { router, useFocusEffect } from 'expo-router';
import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Field, Header, ListRow, Screen, SegmentedControl, Typography } from '../../../src/design/primitives';
import { useTheme } from '../../../src/design/ThemeProvider';
import { listPlans, listTemplates, savePlan, type Plan, type Template } from '../../../src/services/database/gymRepositories';
import { DAYS, scheduledTemplate } from '../../../src/features/train/weekPlan';

export default function PlansScreen() {
  const { t: tr } = useLanguage();
  const {theme}=useTheme();
  const [templates,setTemplates]=useState<Template[]>([]);
  const [plans,setPlans]=useState<Plan[]>([]);
  const [type,setType]=useState<'weekly'|'rotation'>('weekly');
  const [name,setName]=useState(tr('p4.plans.15'));
  const [weekday,setWeekday]=useState<Record<string,string|null>>({});
  const [rotation,setRotation]=useState<string[]>([]);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState<string|null>(null);
  useFocusEffect(useCallback(()=>{
    let mounted=true;
    void Promise.all([listTemplates(),listPlans()]).then(([ts,ps])=>{
      if(!mounted)return;
      if(ts.ok)setTemplates(ts.value);
      if(ps.ok){setPlans(ps.value);
        const plan=ps.value.find(p=>p.active);
        if(plan){setName(plan.name);setType(plan.type);
          if(Array.isArray(plan.schedule))setRotation(plan.schedule);
          else setWeekday(plan.schedule);}
      }
    });
    return ()=>{mounted=false};
  },[]));
  const cycle=(day:string)=>{
    const choices=[null,...templates.map(t=>t.id)];
    const current=weekday[day]??null;
    const next=choices[(choices.indexOf(current)+1)%choices.length]??null;
    setWeekday(old=>({...old,[day]:next}));
  };
  const active=plans.find(p=>p.active)??null;
  const doSave=async()=>{
    if(!name.trim()||templates.length===0)return;
    setBusy(true);
    const selected=type==='weekly'?weekday:rotation;
    const unchangedRotation=active?.type==='rotation'&&type==='rotation'&&
      JSON.stringify(active.schedule)===JSON.stringify(rotation);
    const saved=await savePlan({name:name.trim(),type,schedule:selected,
      nextIndex:unchangedRotation?active.nextIndex:0,active:true},
      active?.id);
    if(saved.ok){setNotice(tr('p4.plans.13'));
      const result=await listPlans();if(result.ok)setPlans(result.value);
    }else setNotice(tr('p4.plans.14'));
    setBusy(false);
  };
  return <Screen embedded>
    <Header title={tr('p4.plans.0')} subtitle={tr('p4.plans.1')} onBack={()=>router.back()}/>
    <Card title={tr('p4.plans.2')}>
      {templates.length===0?<Typography tone="secondary">{tr('p4.plans.10')}</Typography>:
        templates.map(t=><ListRow key={t.id} title={t.name}
          detail={t.exercises.length+' exercises'}
          onPress={()=>router.push({pathname:'/(tabs)/train/preview',params:{templateId:t.id}})}
          suffix={<Button label={tr('p4.plans.3')} variant="ghost"
            onPress={()=>router.push({pathname:'/(tabs)/train/template',params:{id:t.id}})}/>}/>)}
      <Button label={tr('p4.plans.4')} variant="train" onPress={()=>router.push('/(tabs)/train/template')}/>
    </Card>
    <Card title={tr('p4.plans.5')}>
      <Field label={tr('p4.plans.6')} value={name} onChangeText={setName}/>
      <SegmentedControl label={tr('p4.plans.7')} options={[{value:'weekly',label:tr('p4.plans.16')},{value:'rotation',label:tr('p4.plans.17')}]}
        value={type} onChange={setType}/>
      {type==='weekly'?DAYS.map(day=><ListRow key={day} title={day}
        detail={templates.find(t=>t.id===weekday[day])?.name??tr('p4.plans.18')}
        onPress={()=>cycle(day)} suffix={<Typography tone="secondary">{tr('p4.plans.11')}</Typography>}/>):
        <View style={{gap:theme.space[2]}}>
          <Typography tone="secondary" size="small">{tr('p4.plans.12')}</Typography>
          {templates.map(t=><ListRow key={t.id} title={t.name}
            detail={rotation.includes(t.id)?tr('p4.plans.19'):tr('p4.plans.20')}
            onPress={()=>setRotation(old=>old.includes(t.id)?old.filter(id=>id!==t.id):[...old,t.id])}/>)}
        </View>}
      <Button label={tr('p4.plans.8')} variant="train" fullWidth disabled={busy||!name.trim()||
        templates.length===0||(type==='rotation'&&rotation.length===0)}
        onPress={()=>void doSave()}/>
      {notice&&<Typography>{notice}</Typography>}
    </Card>
    {active&&<Card title={tr('p4.plans.9')}>
      <Typography>{scheduledTemplate(active,templates,new Date())?.name??tr('p4.plans.21')}</Typography>
    </Card>}
  </Screen>;
}
