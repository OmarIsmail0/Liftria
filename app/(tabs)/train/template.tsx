import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { equipmentLabel } from '../../../src/i18n/equipment';
import { bidiIsolate } from '../../../src/i18n';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Button, Card, Field, Header, Screen, Sheet, Stepper, Typography } from '../../../src/design/primitives';
import { useTheme } from '../../../src/design/ThemeProvider';
import { ensureExercisePack, listExercises, searchExercises, newGymId } from '../../../src/services/database/exerciseLibrary';
import { deleteTemplate, listTemplates, saveTemplate, type TemplateExerciseInput } from '../../../src/services/database/gymRepositories';
import type { Exercise } from '../../../src/services/database/gymTypes';
import { ExerciseFigure } from '../../../src/features/train/ExerciseFigure';
import { muscleLabel } from '../../../src/i18n/muscles';
import { fontFamilyFor } from '../../../src/design/fonts';
import { exerciseName } from '../../../src/i18n/exerciseNames';

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
  const [menuAt,setMenuAt]=useState<number|null>(null);
  const [restAt,setRestAt]=useState<number|null>(null);
  const [baseline,setBaseline]=useState(JSON.stringify({name:'',rest:120,notes:'',exercises:[]}));
  const dirty=JSON.stringify({name,rest,notes,exercises})!==baseline;
  const pendingRemove=useRef<Parameters<typeof navigation.dispatch>[0]|null>(null);
  // Coming back from an exercise's detail must not reload the draft over unsaved edits.
  const hydratedFor=useRef<string|null>(null);
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
    const key=(id??'')+'|'+(exerciseId??'');
    void (async()=>{
      const pack=await ensureExercisePack();
      const [all,templates]=await Promise.all([pack.ok?listExercises():Promise.resolve(null),listTemplates()]);
      if(!live)return;
      if(all?.ok)setLibrary(all.value);
      if(hydratedFor.current===key)return;
      if(id&&!templates.ok)return;
      hydratedFor.current=key;
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
  const filtered=useMemo(()=>searchExercises(library,query,null,language).slice(0,8),[library,query,language]);
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
        const shown=exerciseName(language,e.exerciseId,item?.name??e.exerciseId);
        const muscle=item?.primaryMuscles[0];
        const repsLabel=e.repMin===e.repMax?String(e.repMin):e.repMin+'–'+e.repMax;
        return <View key={i} style={{gap:theme.space[2],paddingVertical:theme.space[3],
          borderBottomWidth:1,borderColor:theme.color.border.subtle,
          borderStartWidth:e.supersetGroup?3:0,borderStartColor:theme.color.status.warning,
          paddingStart:e.supersetGroup?theme.space[2]:0}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:theme.space[2]}}>
            <Pressable accessibilityRole="button"
              accessibilityLabel={t('exerciseRow.open',{name:bidiIsolate(language,shown)})}
              onPress={()=>router.push({pathname:'/(tabs)/train/exercise/[id]',params:{id:e.exerciseId}})}
              style={{flex:1,flexDirection:'row',alignItems:'center',gap:theme.space[2],minHeight:theme.size.touch.min}}>
              {item && <ExerciseFigure exercise={item} />}
              <View style={{flex:1}}>
                <Typography bold lines={2}>{shown}</Typography>
                {muscle && <Typography tone="secondary" size="small">{muscleLabel(language,muscle)}</Typography>}
              </View>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t('workout.menu')}
              onPress={()=>setMenuAt(i)}
              style={{width:theme.size.touch.min,height:theme.size.touch.min,alignItems:'center',justifyContent:'center'}}>
              <Typography size="head">⋯</Typography>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={t('workout.restTime')}
            onPress={()=>setRestAt(i)}
            style={{alignSelf:'flex-start',minHeight:theme.size.touch.min,paddingHorizontal:theme.space[3],
              borderRadius:theme.radius.pill,justifyContent:'center',backgroundColor:theme.surface.control}}>
            <Typography size="small" bold>{t('workout.restChip',{time:String(e.restSec??rest)})}</Typography>
          </Pressable>
          <View style={{flexDirection:'row',gap:theme.space[2]}}>
            <View style={{width:48,alignItems:'center'}}><Typography size="label" tone="tertiary">{t('workout.columnSet')}</Typography></View>
            <View style={{flex:1,alignItems:'center'}}><Typography size="label" tone="tertiary">{t('workout.columnReps')}</Typography></View>
          </View>
          {Array.from({length:e.targetSets},(_,setIndex)=>{
            const setNumber=setIndex+1;
            return <View key={setNumber} style={{flexDirection:'row',alignItems:'center',gap:theme.space[2],minHeight:theme.size.touch.min}}>
              <View style={{width:48,alignItems:'center'}}><Typography bold>{setNumber}</Typography></View>
              <TextInput accessibilityLabel={t('workout.columnReps')} value={repsLabel}
                keyboardType="number-pad"
                onChangeText={text=>{
                  const value=Number(text.replace(/[^0-9]/g,''));
                  if(Number.isInteger(value)&&value>=1&&value<=100)update(i,{repMin:value,repMax:value});
                }}
                style={{flex:1,minHeight:theme.size.touch.min,textAlign:'center',borderRadius:theme.radius.sm,
                  borderWidth:theme.size.border.thin,borderColor:theme.surface.hairline,
                  backgroundColor:theme.surface.control,color:theme.color.text.primary,
                  fontFamily:fontFamilyFor('Figtree','700',language==='ar'),fontSize:theme.type.body.size}}/>
            </View>;
          })}
          <Pressable accessibilityRole="button" accessibilityLabel={t('workout.addSet')}
            onPress={()=>update(i,{targetSets:Math.min(20,e.targetSets+1)})}
            style={{minHeight:theme.size.touch.min,borderRadius:theme.radius.md,alignItems:'center',
              justifyContent:'center',backgroundColor:theme.surface.control}}>
            <Typography bold>{t('workout.addSet')}</Typography>
          </Pressable>
          {e.targetSets>1 && <Button label={t('sessionDetail.removeSet')} variant="ghost"
            onPress={()=>update(i,{targetSets:e.targetSets-1})}/>}
        </View>;
      })}
    </Card>
    <Card title={t('template.addExercise')}>
      <Field label={t('template.searchLibrary')} value={query} onChangeText={setQuery} placeholder={t('template.searchExample')}/>
      {filtered.filter(e=>!exercises.some(row=>row.exerciseId===e.id)).map(e=>{
        const shown=exerciseName(language,e.id,e.name);
        const isolated=bidiIsolate(language,shown);
        return <View key={e.id} style={{flexDirection:'row',alignItems:'center',gap:theme.space[2]}}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('exerciseRow.open',{name:isolated})}
            onPress={()=>router.push({pathname:'/(tabs)/train/exercise/[id]',params:{id:e.id}})}
            style={{flex:1,flexDirection:'row',alignItems:'center',gap:theme.space[2],minHeight:theme.size.touch.min}}>
            <ExerciseFigure exercise={e} />
            <View style={{flex:1}}>
              <Typography bold lines={1}>{shown}</Typography>
              <Typography tone="secondary" size="small" lines={1}>{equipmentLabel(language,e.equipment,t('template.bodyweight'))}</Typography>
            </View>
          </Pressable>
          <Button label={t('exerciseRow.add')} variant="secondary"
            accessibilityLabel={t('exerciseRow.addNamed',{name:isolated})} onPress={()=>add(e)}/>
        </View>;
      })}
      <Button label={t('template.browseMap')} variant="secondary"
        onPress={()=>router.push('/(tabs)/train/muscles')}/>
    </Card>
    {error&&<Typography>{error}</Typography>}
    <Button label={busy?t('template.saving'):t('template.save')} variant="train" fullWidth
      disabled={busy||!name.trim()||exercises.length===0}
      onPress={()=>void save()}/>
    {id&&<Button label={t('template.delete')} variant="danger" onPress={()=>setDeleteSheet(true)}/>}
    <Sheet visible={menuAt!==null} title={menuAt!==null?exerciseName(language,exercises[menuAt]?.exerciseId??'',library.find(item=>item.id===exercises[menuAt]?.exerciseId)?.name??''):t('workout.menu')}
      onClose={()=>setMenuAt(null)}>
      {menuAt!==null&&<>
        {exercises[menuAt]?.supersetGroup?<Button label={t('gymParity.unlink')} variant="secondary" fullWidth
          onPress={()=>{unlink(exercises[menuAt]!.supersetGroup!);setMenuAt(null);}}/>:
          <>
            <Button label={t('gymParity.linkNext')} variant="secondary" fullWidth
              disabled={menuAt+1>=exercises.length||Boolean(exercises[menuAt+1]?.supersetGroup)}
              onPress={()=>{linkGroup(menuAt,2);setMenuAt(null);}}/>
            <Button label={t('gymParity.superset')+' × 3'} variant="secondary" fullWidth
              disabled={menuAt+2>=exercises.length||Boolean(exercises[menuAt+1]?.supersetGroup)||Boolean(exercises[menuAt+2]?.supersetGroup)}
              onPress={()=>{linkGroup(menuAt,3);setMenuAt(null);}}/>
          </>}
        <Button label={t('template.moveUp')} variant="secondary" fullWidth disabled={menuAt===0}
          onPress={()=>{setExercises(old=>{const next=old.map(x=>({...x,supersetGroup:null}));const a=next[menuAt-1],b=next[menuAt];
            if(a&&b){next[menuAt-1]=b;next[menuAt]=a;}return next;});setMenuAt(null);}}/>
        <Button label={t('template.moveDown')} variant="secondary" fullWidth disabled={menuAt>=exercises.length-1}
          onPress={()=>{setExercises(old=>{const next=old.map(x=>({...x,supersetGroup:null}));const a=next[menuAt+1],b=next[menuAt];
            if(a&&b){next[menuAt+1]=b;next[menuAt]=a;}return next;});setMenuAt(null);}}/>
        <Button label={t('workout.restTime')} variant="secondary" fullWidth onPress={()=>{setRestAt(menuAt);setMenuAt(null);}}/>
        <Button label={t('template.remove')} variant="danger" fullWidth
          onPress={()=>{setExercises(old=>old.filter((_,n)=>n!==menuAt).map(x=>({...x,supersetGroup:null})));setMenuAt(null);}}/>
      </>}
    </Sheet>
    <Sheet visible={restAt!==null} title={t('workout.restTime')} onClose={()=>setRestAt(null)}>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:theme.space[2]}}>
        {[0,60,90,120,150,180,240].map(seconds=><Button key={seconds}
          label={seconds===0?t('workout.restOff'):String(seconds)}
          variant={(exercises[restAt??-1]?.restSec??rest)===seconds?'train':'secondary'}
          onPress={()=>{if(restAt!==null)update(restAt,{restSec:seconds});setRestAt(null);}}/>)}
      </View>
    </Sheet>
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
