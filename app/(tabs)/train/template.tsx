import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { equipmentLabel } from '../../../src/i18n/equipment';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Field, Header, ListRow, Screen, Sheet, Stepper, Typography } from '../../../src/design/primitives';
import { useTheme } from '../../../src/design/ThemeProvider';
import { ensureExercisePack, listExercises, searchExercises, newGymId } from '../../../src/services/database/exerciseLibrary';
import { deleteTemplate, listTemplates, saveTemplate, type TemplateExerciseInput } from '../../../src/services/database/gymRepositories';
import type { Exercise } from '../../../src/services/database/gymTypes';
import { ExerciseThumbnail } from '../../../src/features/train/ExerciseThumbnail';

export default function TemplateEditor() {
  const navigation=useNavigation();
  const {theme}=useTheme();
  const {t,language}=useLanguage();
  const {id,exerciseId}=useLocalSearchParams<{id?:string;exerciseId?:string}>();
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
  const [baseline,setBaseline]=useState(JSON.stringify({name:'',rest:120,notes:'',exercises:[]}));
  const dirty=JSON.stringify({name,rest,notes,exercises})!==baseline;
  const pendingRemove=useRef<Parameters<typeof navigation.dispatch>[0]|null>(null);
  // Set after save, delete or discard; the replace runs on the next render, once removal
  // is no longer prevented.
  const [exiting,setExiting]=useState(false);
  // usePreventRemove (not a bare beforeRemove listener) also blocks the native iOS
  // swipe-back and Android hardware back while there are unsaved changes.
  usePreventRemove(dirty&&!exiting,({data})=>{
    pendingRemove.current=data.action;
    setDiscardSheet(true);
  });
  useEffect(()=>{if(exiting)router.replace('/(tabs)/train/plans');},[exiting]);
  const back=()=>{if(router.canGoBack())router.back();else router.replace('/(tabs)/train/plans');};
  const cancelDiscard=()=>{pendingRemove.current=null;setDiscardSheet(false);};
  const discard=()=>{
    setDiscardSheet(false);
    const action=pendingRemove.current;
    pendingRemove.current=null;
    // A blocked action is marked as already checked, so dispatching it again goes through.
    if(action)navigation.dispatch(action);
    else setExiting(true);
  };
  useFocusEffect(useCallback(()=>{
    let live=true;
    void (async()=>{
      const pack=await ensureExercisePack();
      const [all,templates]=await Promise.all([pack.ok?listExercises():Promise.resolve(null),listTemplates()]);
      if(!live)return;
      if(all?.ok)setLibrary(all.value);
      const existing=templates.ok?templates.value.find(t=>t.id===id):undefined;
      if(existing){setName(existing.name);setRest(existing.restSec);setNotes(existing.notes??'');
        setExercises(existing.exercises);
        setBaseline(JSON.stringify({name:existing.name,rest:existing.restSec,
          notes:existing.notes??'',exercises:existing.exercises}));}
      else if(exerciseId){
        const entry=[{exerciseId,targetSets:3,repMin:8,repMax:12,restSec:null,notes:null}];
        setExercises(entry);
      }
    })();
    return ()=>{live=false;};
  },[id,exerciseId]));
  const filtered=useMemo(()=>searchExercises(library,query).slice(0,8),[library,query]);
  const linkGroup=(index:number,size:2|3)=>{
    setExercises(old=>{
      if(old.slice(index,index+size).length!==size||
       old.slice(index,index+size).some(e=>e.supersetGroup))return old;
      const group=newGymId();
      return old.map((e,i)=>i>=index&&i<index+size?{...e,supersetGroup:group}:e);
    });
  };
  const unlink=(group:string)=>setExercises(old=>old.map(e=>
    e.supersetGroup===group?{...e,supersetGroup:null}:e));
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
    if(result.ok){setSaved(true);setExiting(true);}
    else setError(t('template.saveError'));
  };
  const remove=async()=>{
    if(id){const result=await deleteTemplate(id);
      if(!result.ok){setError(t('template.deleteError'));return;}}
    setExiting(true);
  };
  return <Screen embedded>
    <Header title={id?t('template.edit'):t('template.new')} onBack={back}/>
    <Card title={t('template.details')}>
      <Field label={t('template.name')} value={name} onChangeText={setName} placeholder={t('template.nameExample')}/>
      <Field label={t('template.notes')} value={notes} onChangeText={setNotes} multiline/>
      <Stepper label={t('template.rest')} value={rest} onChange={setRest} min={0} max={600} step={15} unit={t('units.sec')}/>
    </Card>
    <Card title={t('template.exerciseCount',{count:exercises.length})}>
      {(!name.trim()||exercises.length===0)&&<Typography tone="secondary">
        {(!name.trim()&&exercises.length===0)?t('template.needBoth'):
          !name.trim()?t('template.needName'):t('template.needExercise')}
      </Typography>}
      {exercises.map((e,i)=>{
        const item=library.find(x=>x.id===e.exerciseId);
        return <View key={i} style={{gap:theme.space[2],paddingVertical:theme.space[3],
          borderBottomWidth:1,borderColor:theme.color.border.subtle}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:theme.space[2]}}>
            {item && <ExerciseThumbnail exercise={item} />}
            <Typography bold>{item?.name??e.exerciseId}</Typography>
          </View>
          {e.supersetGroup?<Button label={t('gymParity.unlink')} variant="secondary"
            onPress={()=>unlink(e.supersetGroup!)}/>:
           <View style={{flexDirection:'row',flexWrap:'wrap',gap:theme.space[2]}}>
             <Button label={t('gymParity.linkNext')} variant="secondary"
              disabled={i+1>=exercises.length||Boolean(exercises[i+1]?.supersetGroup)}
              onPress={()=>linkGroup(i,2)}/>
             <Button label={t('gymParity.superset')+' × 3'} variant="secondary"
              disabled={i+2>=exercises.length||Boolean(exercises[i+1]?.supersetGroup)||
                Boolean(exercises[i+2]?.supersetGroup)}
              onPress={()=>linkGroup(i,3)}/>
           </View>}
          <Stepper label={t('template.workingSets')} value={e.targetSets} min={1} max={20} step={1}
            onChange={v=>update(i,{targetSets:v})}/>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:theme.space[2]}}>
            <View style={{flex:1,minWidth:120}}>
              <Stepper label={t('template.repsMin')} value={e.repMin} min={1} max={100}
                onChange={v=>update(i,{repMin:v,repMax:Math.max(v,e.repMax)})}/>
            </View>
            <View style={{flex:1,minWidth:120}}>
              <Stepper label={t('template.repsMax')} value={e.repMax} min={e.repMin} max={100}
                onChange={v=>update(i,{repMax:v})}/>
            </View>
          </View>
          <Stepper label={t('template.exerciseRest')} value={e.restSec??rest} min={0} max={600} step={15}
            unit={t('units.sec')} onChange={v=>update(i,{restSec:v})}/>
          <View style={{flexDirection:'row',gap:theme.space[2],flexWrap:'wrap'}}>
            <Button label={t('template.moveUp')} variant="secondary" disabled={i===0}
              onPress={()=>setExercises(old=>{const next=old.map(x=>({...x,supersetGroup:null}));const a=next[i-1],b=next[i];
                if(a&&b){next[i-1]=b;next[i]=a;}return next;})}/>
            <Button label={t('template.moveDown')} variant="secondary" disabled={i===exercises.length-1}
              onPress={()=>setExercises(old=>{const next=old.map(x=>({...x,supersetGroup:null}));const a=next[i+1],b=next[i];
                if(a&&b){next[i+1]=b;next[i]=a;}return next;})}/>
            <Button label={t('template.remove')} variant="ghost" onPress={()=>setExercises(old=>old.filter((_,n)=>n!==i).map(x=>({...x,supersetGroup:null})))}/>
          </View>
        </View>;
      })}
    </Card>
    <Card title={t('template.addExercise')}>
      <Field label={t('template.searchLibrary')} value={query} onChangeText={setQuery} placeholder={t('template.searchExample')}/>
      {filtered.filter(e=>!exercises.some(row=>row.exerciseId===e.id)).map(e=>
        <ListRow key={e.id} title={e.name} detail={equipmentLabel(language,e.equipment,t('template.bodyweight'))}
          leading={<ExerciseThumbnail exercise={e} />} onPress={()=>add(e)}/>)}
      <Button label={t('template.browseMap')} variant="secondary"
        onPress={()=>router.push('/(tabs)/train/muscles')}/>
    </Card>
    {error&&<Typography>{error}</Typography>}
    <Button label={busy?t('template.saving'):t('template.save')} variant="train" fullWidth
      disabled={busy||!name.trim()||exercises.length===0}
      onPress={()=>void save()}/>
    {id&&<Button label={t('template.delete')} variant="danger" onPress={()=>setDeleteSheet(true)}/>}
    <Sheet visible={discardSheet&&!saved} title={t('template.discardTitle')}
      description={t('template.discardDescription')} onClose={cancelDiscard}>
      <Button label={t('template.keepEditing')} fullWidth onPress={cancelDiscard}/>
      <Button label={t('template.discard')} variant="danger" fullWidth onPress={discard}/>
    </Sheet>
    <Sheet visible={deleteSheet} destructive title={t('template.deleteTitle')}
      description={t('template.deleteDescription')} onClose={()=>setDeleteSheet(false)}>
      <Button label={t('template.keep')} fullWidth onPress={()=>setDeleteSheet(false)}/>
      <Button label={t('template.delete')} variant="danger" fullWidth onPress={()=>void remove()}/>
    </Sheet>
  </Screen>;
}
