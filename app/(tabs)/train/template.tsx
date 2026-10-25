import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { Button, Card, Field, Header, ListRow, Screen, Sheet, Stepper, Typography } from '../../../src/design/primitives';
import { useTheme } from '../../../src/design/ThemeProvider';
import { ensureExercisePack, listExercises, searchExercises } from '../../../src/services/database/exerciseLibrary';
import { deleteTemplate, listTemplates, saveTemplate, type TemplateExerciseInput } from '../../../src/services/database/gymRepositories';
import type { Exercise } from '../../../src/services/database/gymTypes';

export default function TemplateEditor() {
  const {theme}=useTheme();
  const {id}=useLocalSearchParams<{id?:string}>();
  const [name,setName]=useState('');
  const [rest,setRest]=useState(120);
  const [notes,setNotes]=useState('');
  const [exercises,setExercises]=useState<TemplateExerciseInput[]>([]);
  const [library,setLibrary]=useState<Exercise[]>([]);
  const [query,setQuery]=useState('');
  const [saved,setSaved]=useState(false);
  const [deleteSheet,setDeleteSheet]=useState(false);
  const [discardSheet,setDiscardSheet]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  useFocusEffect(useCallback(()=>{
    let live=true;
    void (async()=>{
      const pack=await ensureExercisePack();
      const [all,templates]=await Promise.all([pack.ok?listExercises():Promise.resolve(null),listTemplates()]);
      if(!live)return;
      if(all?.ok)setLibrary(all.value);
      const existing=templates.ok?templates.value.find(t=>t.id===id):undefined;
      if(existing){setName(existing.name);setRest(existing.restSec);setNotes(existing.notes??'');
        setExercises(existing.exercises);}
    })();
    const sub=BackHandler.addEventListener('hardwareBackPress',()=>{setDiscardSheet(true);return true;});
    return ()=>{live=false;sub.remove();};
  },[id]));
  const filtered=useMemo(()=>searchExercises(library,query).slice(0,8),[library,query]);
  const update=(index:number,patch:Partial<TemplateExerciseInput>)=>
    setExercises(prev=>prev.map((item,i)=>i===index?{...item,...patch}:item));
  const add=(exercise:Exercise)=>{
    setExercises(prev=>[...prev,{exerciseId:exercise.id,targetSets:3,repMin:8,repMax:12,restSec:null,notes:null}]);
    setQuery('');
  };
  const save=async()=>{
    if(!name.trim()||exercises.length===0)return;
    setBusy(true);setError(null);
    const result=await saveTemplate({name:name.trim(),restSec:rest,notes:notes||null,exercises},id);
    setBusy(false);
    if(result.ok){setSaved(true);router.replace('/(tabs)/train/plans');}
    else setError('Could not save the template. Try again.');
  };
  const remove=async()=>{
    if(id){const result=await deleteTemplate(id);
      if(!result.ok){setError('Could not delete template.');return;}}
    router.replace('/(tabs)/train/plans');
  };
  return <Screen embedded>
    <Header title={id?'Edit template':'New template'} onBack={()=>setDiscardSheet(true)}/>
    <Card title="Workout details">
      <Field label="Template name" value={name} onChangeText={setName} placeholder="Upper A"/>
      <Field label="Notes (optional)" value={notes} onChangeText={setNotes} multiline/>
      <Stepper label="Default rest" value={rest} onChange={setRest} min={0} max={600} step={15} unit="sec"/>
    </Card>
    <Card title={'Exercises · '+exercises.length}>
      {exercises.length===0&&<Typography tone="secondary">Add your first exercise to enable Save.</Typography>}
      {exercises.map((e,i)=>{
        const item=library.find(x=>x.id===e.exerciseId);
        return <View key={i} style={{gap:theme.space[2],paddingVertical:theme.space[3],
          borderBottomWidth:1,borderColor:theme.color.border.subtle}}>
          <Typography bold>{item?.name??e.exerciseId}</Typography>
          <Stepper label="Working sets" value={e.targetSets} min={1} max={20} step={1}
            onChange={v=>update(i,{targetSets:v})}/>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:theme.space[2]}}>
            <View style={{flex:1,minWidth:120}}>
              <Stepper label="Reps min" value={e.repMin} min={1} max={100}
                onChange={v=>update(i,{repMin:v,repMax:Math.max(v,e.repMax)})}/>
            </View>
            <View style={{flex:1,minWidth:120}}>
              <Stepper label="Reps max" value={e.repMax} min={e.repMin} max={100}
                onChange={v=>update(i,{repMax:v})}/>
            </View>
          </View>
          <Stepper label="Exercise rest" value={e.restSec??rest} min={0} max={600} step={15}
            unit="sec" onChange={v=>update(i,{restSec:v})}/>
          <View style={{flexDirection:'row',gap:theme.space[2],flexWrap:'wrap'}}>
            <Button label="Move up" variant="secondary" disabled={i===0}
              onPress={()=>setExercises(old=>{const next=[...old];const a=next[i-1],b=next[i];
                if(a&&b){next[i-1]=b;next[i]=a;}return next;})}/>
            <Button label="Move down" variant="secondary" disabled={i===exercises.length-1}
              onPress={()=>setExercises(old=>{const next=[...old];const a=next[i+1],b=next[i];
                if(a&&b){next[i+1]=b;next[i]=a;}return next;})}/>
            <Button label="Remove" variant="ghost" onPress={()=>setExercises(old=>old.filter((_,n)=>n!==i))}/>
          </View>
        </View>;
      })}
    </Card>
    <Card title="Add exercise">
      <Field label="Search library" value={query} onChangeText={setQuery} placeholder="Bench, squat, OHP"/>
      {filtered.filter(e=>!exercises.some(row=>row.exerciseId===e.id)).map(e=>
        <ListRow key={e.id} title={e.name} detail={e.equipment??'Bodyweight'}
          onPress={()=>add(e)}/>)}
      <Button label="Browse muscle map" variant="secondary"
        onPress={()=>router.push('/(tabs)/train/muscles')}/>
    </Card>
    {error&&<Typography>{error}</Typography>}
    <Button label={busy?'Saving…':'Save template'} variant="train" fullWidth
      disabled={busy||!name.trim()||exercises.length===0}
      onPress={()=>void save()}/>
    {id&&<Button label="Delete template" variant="danger" onPress={()=>setDeleteSheet(true)}/>}
    <Sheet visible={discardSheet&&!saved} title="Discard template changes?"
      description="Unsaved changes to this template will be lost." onClose={()=>setDiscardSheet(false)}>
      <Button label="Keep editing" fullWidth onPress={()=>setDiscardSheet(false)}/>
      <Button label="Discard changes" variant="danger" fullWidth onPress={()=>router.back()}/>
    </Sheet>
    <Sheet visible={deleteSheet} destructive title="Delete this template?"
      description="Logged workouts will remain in your history." onClose={()=>setDeleteSheet(false)}>
      <Button label="Keep template" fullWidth onPress={()=>setDeleteSheet(false)}/>
      <Button label="Delete template" variant="danger" fullWidth onPress={()=>void remove()}/>
    </Sheet>
  </Screen>;
}
