import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Linking, Pressable, ScrollView, Vibration, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { Button, Card, Chip, Field, Header, ListRow, Screen, SegmentedControl, Sheet, Typography } from '../../../src/design/primitives';
import { useTheme } from '../../../src/design/ThemeProvider';
import { GymStepper } from '../../../src/features/train/GymStepper';
import { askRestPermission, cancelSessionRestAlerts, scheduleRestOver } from '../../../src/features/train/restAlerts';
import { displayRest, elapsedLabel, restAnnouncement, restAt, shiftRest } from '../../../src/features/train/restClock';
import { editLoggedSet, logWorkoutSet, readWorkout, readInProgressWorkout, removeLoggedSet,
  updateRestDeadline, previousWorkingSets, suggestionForSlot, reorderActiveExercise,
  saveWorkoutExerciseNote, readWorkoutExerciseNote, workoutNumbers,
  type ActiveExercise, type ActiveSet, type ActiveWorkout } from '../../../src/features/train/workoutData';
import { RestOrb } from '../../../src/features/train/RestOrb';
import { displayWeight, fromKg, toKg, workoutWeightStep, type WeightUnit } from '../../../src/features/train/workoutUnits';
import { getSetting, setSetting } from '../../../src/services/database';
import { getTypedSetting } from '../../../src/services/database/settings';

function KeepScreenOn() { useKeepAwake('liftria-active-workout'); return null; }

type Slot={position:number;side:'L'|'R'|null;logged:ActiveSet|null};
function slotsFor(exercise:ActiveExercise,sets:ActiveSet[]):Slot[] {
  const result:Slot[]=[];
  for(let position=0;position<exercise.targetSets;position++){
    for(const side of (exercise.unilateral?['L','R'] as const:[null])){
      const logged=sets.find(s=>s.sessionExerciseId===exercise.id&&s.position===position&&s.side===side&&s.kind==='working')??null;
      result.push({position,side,logged});
    }
  }
  return result;
}
export default function ActiveWorkoutScreen() {
  const {id}=useLocalSearchParams<{id?:string}>();
  const {theme}=useTheme();
  const [view,setView]=useState<ActiveWorkout|null>(null);
  const [selected,setSelected]=useState(0);
  const [kg,setKg]=useState(0);
  const [reps,setReps]=useState(0);
  const [kind,setKind]=useState<'working'|'warm-up'>('working');
  const [edit,setEdit]=useState<ActiveSet|null>(null);
  const [pendingUndo,setPendingUndo]=useState<ActiveSet|null>(null);
  const [lastLogged,setLastLogged]=useState<ActiveSet|null>(null);
  const [restSet,setRestSet]=useState<ActiveSet|null>(null);
  const [restVisible,setRestVisible]=useState(false);
  const [askVisible,setAskVisible]=useState(false);
  const [finishVisible,setFinishVisible]=useState(false);
  const [denied,setDenied]=useState(false);
  const [screenOn,setScreenOn]=useState(false);
  const [haptics,setHaptics]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [now,setNow]=useState(() => Date.now());
  const [focused,setFocused]=useState(false);
  const [weightUnit,setWeightUnit]=useState<WeightUnit>('kg');
  const [smallPlates,setSmallPlates]=useState(false);
  const [suggestion,setSuggestion]=useState<{weight:number;reps:number;progressed:boolean}|null>(null);
  const [exerciseNote,setExerciseNote]=useState('');
  const [menuOpen,setMenuOpen]=useState(false);
  const [noteOpen,setNoteOpen]=useState(false);
  const previousRestMs=useRef<number|null>(null);
  const currentId=id??'';
  const refresh=useCallback(async()=>{
    const loaded=currentId?await readWorkout(currentId):await readInProgressWorkout();
    if(loaded.ok)setView(loaded.value);
    else setError('Could not load workout. Your logged sets remain on this phone.');
  },[currentId]);
  useFocusEffect(useCallback(()=>{
    setFocused(true);
    void refresh();
    void getTypedSetting('keepScreenOn').then(result=>{if(result.ok)setScreenOn(result.value);});
    void getTypedSetting('haptics').then(result=>{if(result.ok)setHaptics(result.value);});
    void getTypedSetting('units.weight').then(result=>{if(result.ok)setWeightUnit(result.value);});
    void getTypedSetting('units.smallPlates').then(result=>{if(result.ok)setSmallPlates(result.value);});
    return()=>setFocused(false);
  },[refresh]));
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  const exercise=view?.exercises[selected]??null;
  const slots=useMemo(()=>exercise&&view?slotsFor(exercise,view.sets):[],[exercise,view]);
  const current=slots.find(slot=>!slot.logged)??null;
  const latestRest=view?.sets.filter(s=>s.restDeadline).sort((a,b)=>b.loggedAt.localeCompare(a.loggedAt))[0]??null;
  const visibleRest=restSet??latestRest;
  const deadline=visibleRest?.restDeadline??null;
  const rest=restAt(deadline,now);
  const stats=view?workoutNumbers(view):null;
  const step=workoutWeightStep(exercise?.type??'weighted',weightUnit,smallPlates);
  useEffect(()=>{
    if(!exercise||!current||edit)return;
    let live=true;
    void previousWorkingSets(exercise.exerciseId).then(result=>{
      if(!live)return;
      const next=result.ok?suggestionForSlot(result.value,current.position,current.side,
        exercise.repMax,exercise.targetSets*(exercise.unilateral?2:1),step):null;
      setSuggestion(next);
      setKg(next?.weight??0);setReps(next?.reps??0);
    });
    return()=>{live=false;};
  },[exercise?.exerciseId,current?.position,current?.side,edit,step]);
  useEffect(()=>{
    if(!exercise)return;
    void readWorkoutExerciseNote(exercise.id).then(result=>{
      if(result.ok)setExerciseNote(result.value);
    });
  },[exercise?.id]);
  useEffect(()=>{
    if(!focused||rest.status==='idle')return;
    const remaining=rest.remainingMs;
    const prior=previousRestMs.current;
    if(prior!==null){
      const message=restAnnouncement(prior,remaining);
      if(message)void AccessibilityInfo.announceForAccessibility(message);
    }
    previousRestMs.current=remaining;
  },[rest.remainingMs,rest.status,focused]);
  const log=async()=>{
    if(!view||!exercise||busy)return;
    if(edit){
      setBusy(true);
      const result=await editLoggedSet(edit.id,view.id,kg,reps);
      if(result.ok&&result.value){setEdit(null);setError(null);await refresh();}
      else setError('Could not update the logged set.');
      setBusy(false);return;
    }
    if(reps<1){setError('Add reps first. Nothing has been logged.');return;}
    if(kg>500||reps>100){setError('Check unusually large values before logging.');return;}
    const position=kind==='warm-up'?Math.max(99,...view.sets.filter(s=>
      s.sessionExerciseId===exercise.id&&s.kind==='warm-up').map(s=>s.position))+1:
      current?.position;
    if(position===undefined){setError('All planned sets are logged.');return;}
    setBusy(true);setError(null);
    try{await cancelSessionRestAlerts(view.id);}catch{setError('Could not cancel an earlier rest alert. Retry.');setBusy(false);return;}
    const saved=await logWorkoutSet({sessionId:view.id,sessionExerciseId:exercise.id,
      position,side:exercise.unilateral?(current?.side??'L'):null,weight:kg,reps,kind,restSec:exercise.restSec});
    setBusy(false);
    if(!saved.ok){setError('Could not save this set. Try again.');return;}
    if(haptics)Vibration.vibrate(12);
    setLastLogged(saved.value);
    setRestSet(saved.value);
    if(kind==='working')setReps(0);
    void AccessibilityInfo.announceForAccessibility('Set '+(position+1)+' logged. Rest '+exercise.restSec+' seconds.');
    await refresh();
    if(saved.value.restDeadline){
      const asked=await getSetting('rest.permissionPromptSeen');
      if(asked.ok&&asked.value!=='yes'){setAskVisible(true);}
      else {setRestVisible(true);void armNotification(saved.value,exercise.name);}
    }
  };
  const armNotification=async(set:ActiveSet,name:string)=>{
    if(!set.restDeadline||!view)return;
    try{await scheduleRestOver(set.restDeadline,view.id,name,set.id);}
    catch{setError('The lock-screen alert could not be scheduled. Your in-app rest timer still works.');}
  };
  const allow=async(grant:boolean)=>{
    setAskVisible(false);
    await setSetting('rest.permissionPromptSeen','yes');
    if(grant){const approved=await askRestPermission().catch(()=>false);
      setDenied(!approved);
      if(approved&&restSet&&exercise)void armNotification(restSet,exercise.name);
    }else setDenied(true);
    setRestVisible(true);
  };
  const undo=async(item:ActiveSet)=>{
    if(!view)return;
    try{await cancelSessionRestAlerts(view.id);}catch{setError('Could not cancel the rest alert. Retry undo.');return;}
    const result=await removeLoggedSet(item.id,view.id);
    if(!result.ok||!result.value){setError('Could not undo this set.');return;}

    setLastLogged(null);setRestSet(null);setRestVisible(false);setPendingUndo(null);
    setKg(item.weight);setReps(item.reps);setEdit(null);await refresh();
  };
  const adjust=async(delta:number)=>{
    if(!view||!visibleRest)return;
    const next=shiftRest(deadline,delta,now);
    try{await cancelSessionRestAlerts(view.id);}catch{setError('Could not cancel the old rest alert. Retry.');return;}
    const saved=await updateRestDeadline(visibleRest.id,view.id,next);
    if(saved.ok&&saved.value){
      const updated={...visibleRest,restDeadline:next};
      setRestSet(updated);await refresh();
      if(next&&restAt(next).status==='running'&&exercise)void armNotification(updated,exercise.name);
    }
  };
  const choose=(index:number)=>{setSelected(index);setEdit(null);setSuggestion(null);setKg(0);setReps(0);};
  const selectEdit=(s:ActiveSet)=>{setEdit(s);setKg(s.weight);setReps(s.reps);setKind(s.kind);};
  if(!view)return <Screen embedded><Header title="Workout" onBack={()=>router.replace('/(tabs)/train')}/>
    <Typography tone="secondary">{error??'Opening your saved workout…'}</Typography></Screen>;
  return <Screen embedded scroll={false}>
    {screenOn&&focused&&<KeepScreenOn/>}
    <View style={{paddingHorizontal:theme.layout.gutter,paddingTop:theme.space[2],gap:theme.space[2]}}>
      <Header title={view.title} subtitle={elapsedLabel(view.startedAt,now)+' elapsed · '+(stats?.sets??0)+' sets logged'}
        onBack={()=>router.replace('/(tabs)/train')} right={<Button label="Finish" variant="secondary"
          onPress={()=>setFinishVisible(true)}/>}/>
      <View style={{height:theme.space[1],backgroundColor:theme.color.track,
        borderRadius:theme.radius.pill,overflow:'hidden'}}>
        <View style={{height:'100%',width:(stats&&view.exercises.reduce((n,e)=>n+e.targetSets,0)>0?
          Math.min(100,100*stats.sets/view.exercises.reduce((n,e)=>n+e.targetSets,0)):0)+'%',
          backgroundColor:theme.color.domain.train}}/>
      </View>
      <View style={{flexDirection:'row',gap:theme.space[2],flexWrap:'wrap'}}>
        <Button label={rest.status==='running'?displayRest(deadline,now):rest.status==='over'?'Rest over':'Rest timer'}
          variant="secondary" onPress={()=>setRestVisible(true)}/>
        <Button label="Add exercise" variant="ghost"
          onPress={()=>router.push({pathname:'/(tabs)/train/pick',params:{id:view.id}})}/>
      </View>
    </View>
    <ScrollView contentContainerStyle={{padding:theme.layout.gutter,gap:theme.layout.cardGap,paddingBottom:theme.space[3]}}>
      <ScrollView horizontal contentContainerStyle={{gap:theme.space[2]}} showsHorizontalScrollIndicator={false}>
        {view.exercises.map((e,index)=><Button key={e.id} label={e.name}
          variant={selected===index?'train':'secondary'} onPress={()=>choose(index)}/>)}
      </ScrollView>
      {exercise?<Card title={exercise.name} rim="train">
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:theme.space[2]}}>
          <Button label="Exercise options" variant="secondary" onPress={()=>setMenuOpen(true)}/>
        </View>
        {view.sets.filter(s=>s.sessionExerciseId===exercise.id&&s.kind==='warm-up')
          .sort((a,b)=>a.position-b.position).map((s,index)=>
            <ListRow key={s.id} title={'W'+(index+1)+' · Warm-up'}
              detail={displayWeight(s.weight,exercise.type,weightUnit)+' × '+s.reps+' reps'}
              suffix={<Button label="Undo" variant="secondary" onPress={()=>setPendingUndo(s)}/>}
              onPress={()=>selectEdit(s)}/>)}
        <Typography tone="secondary" size="small">{exercise.unilateral?'Log both sides separately · ':''}
          {exercise.type==='dumbbell'?'Weight per hand':exercise.type==='assisted'?'Assistance weight':
            exercise.type==='bodyweight'?'Added weight only':'Weight used'}</Typography>
        {slots.map((slot,index)=>{
          const active=!slot.logged&&current===slot;
          const label='Set '+(slot.position+1)+(slot.side?' '+slot.side:'');
          return <View key={index} style={{flexDirection:'row',alignItems:'center',gap:theme.space[2],
            minHeight:64,paddingVertical:theme.space[2],borderBottomWidth:1,borderColor:theme.color.border.subtle}}>
            <View style={{flex:1,gap:theme.space[1]}}>
              <Typography bold>{label}{active?' · current':''}</Typography>
              {slot.logged?<Pressable accessibilityRole="button" accessibilityLabel={label+', '+
                slot.logged.weight+' kilograms, '+slot.logged.reps+' reps, logged. Edit set'}
                onPress={()=>selectEdit(slot.logged!)}>
                <Typography>{displayWeight(slot.logged.weight,exercise.type,weightUnit)} × {slot.logged.reps} · Edit</Typography>
              </Pressable>:
                <Typography tone="tertiary" size="small">Not logged · suggested values are not saved</Typography>}
            </View>
            {slot.logged?<Button label="✓ Undo" variant="secondary"
              onPress={()=>setPendingUndo(slot.logged)}/>:
              active?<Button label="✓ Log" variant="train" disabled={busy} onPress={()=>void log()}/>:
              <Typography tone="tertiary">—</Typography>}
          </View>;
        })}
        <Typography tone="tertiary" italic size="small">Suggested values come from your last session and remain unsaved until Log set.</Typography>
      </Card>:<Card title="No exercises">
        <Typography tone="secondary">Add an exercise from the library to begin logging.</Typography>
        <Button label="Browse exercises" variant="train"
          onPress={()=>router.push('/(tabs)/train/library')}/>
      </Card>}
      {view.exercises[selected+1]&&<Card title="Up next">
        <ListRow title={view.exercises[selected+1]?.name ?? 'Up next'}
          onPress={()=>choose(selected+1)}/>
      </Card>}
      {denied&&<Typography tone="secondary">Notifications are off. Rest alerts work inside Liftria while it is open.</Typography>}
      {error&&<Typography>{error}</Typography>}
    </ScrollView>
    <View style={{paddingHorizontal:theme.layout.gutter,paddingVertical:theme.space[3],
      backgroundColor:theme.color.bg.raised,gap:theme.space[2]}}>
      {edit&&<Typography bold>Editing logged set {edit.kind==='warm-up'?'warm-up':edit.position+1}</Typography>}
      {!edit&&suggestion&&<Typography tone="tertiary" size="small" italic>
        {suggestion.progressed?'Suggested +'+fromKg(step,weightUnit).toFixed(2).replace(/\.?0+$/,'')+' '+weightUnit+' · ':'Suggested · '}
        {displayWeight(suggestion.weight,exercise?.type??'weighted',weightUnit)} × {suggestion.reps} reps · not logged
      </Typography>}
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:theme.space[2]}}>
        <GymStepper label={exercise?.type==='assisted'?'Assistance kg':exercise?.type==='dumbbell'?'kg each':'Weight kg'}
          value={fromKg(kg,weightUnit)} onChange={v=>setKg(toKg(v,weightUnit))}
          step={fromKg(step,weightUnit)} unit={weightUnit}/>
        <GymStepper label="Reps" value={reps} onChange={setReps} step={1} max={500}/>
      </View>
      <SegmentedControl label="Set kind" value={kind} onChange={setKind}
        options={[{value:'working',label:'Working'},{value:'warm-up',label:'Warm-up'}]}/>
      {denied&&<View style={{gap:theme.space[1]}}>
        <Typography tone="secondary" size="small">Rest alerts only work in-app. Turn on notifications in Android settings.</Typography>
        <Button label="Turn on notifications" variant="secondary" onPress={()=>void Linking.openSettings()}/>
      </View>}
      <Button label={edit?'Save corrected set':kind==='warm-up'?'Log warm-up set':current?
        'Log set '+(current.position+1):'All sets logged'} variant="train" size="xl"
        fullWidth disabled={busy||!exercise||(!edit&&!current&&kind==='working')}
        onPress={()=>void log()}/>
      {edit&&<Button label="Cancel edit" variant="ghost" onPress={()=>{setEdit(null);setKg(0);setReps(0);}}/>}
    </View>
    <Sheet visible={askVisible} title="Rest alerts on this phone?"
      description="Liftria can try to alert you when rest ends. Android may delay alerts if your phone is locked. Workout data stays on your phone."
      onClose={()=>void allow(false)}>
      <Button label="Turn on rest alerts" variant="train" fullWidth onPress={()=>void allow(true)}/>
      <Button label="Only in-app timer" variant="secondary" fullWidth onPress={()=>void allow(false)}/>
    </Sheet>
    <Sheet visible={restVisible} title={displayRest(deadline,now)}
      description="Lock-screen alert at 0:00 is being tested on your phone."
      onClose={()=>setRestVisible(false)}>
      <RestOrb remainingMs={rest.remainingMs} totalMs={(exercise?.restSec??120)*1000}
        label={displayRest(deadline,now)} />
      <Chip kind="pending" label="Device test pending"/>
      <Typography tone="secondary" size="small">Next set: {exercise?.name??'Your next exercise'} · {current?'Set '+(current.position+1):'Choose your next exercise'}</Typography>
      <Typography tone="secondary">{lastLogged?
        'Set '+(lastLogged.position+1)+' logged · '+lastLogged.weight+' kg × '+lastLogged.reps:
        'Timer continues if you close this sheet.'}</Typography>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:theme.space[2]}}>
        <Button label="−15 s" variant="secondary" onPress={()=>void adjust(-15)}/>
        <Button label="+15 s" variant="secondary" onPress={()=>void adjust(15)}/>
        <Button label="+30 s" variant="secondary" onPress={()=>void adjust(30)}/>
      </View>
      <Button label="Skip rest" variant="secondary" fullWidth onPress={()=>void adjust(-3600)}/>
      {lastLogged&&<Button label="Undo logged set" variant="secondary" fullWidth
        onPress={()=>void undo(lastLogged)}/>}
      <Button label="Back to workout" variant="train" fullWidth onPress={()=>setRestVisible(false)}/>
    </Sheet>
    <Sheet visible={menuOpen} title="Exercise options" description={exercise?.name}
      onClose={()=>setMenuOpen(false)}>
      <Button label="Exercise notes" fullWidth variant="secondary"
        onPress={()=>{setMenuOpen(false);setNoteOpen(true);}}/>
      <Button label="Replace exercise" fullWidth variant="secondary" onPress={()=>{
        setMenuOpen(false);if(view&&exercise)router.push({pathname:'/(tabs)/train/pick',
          params:{id:view.id,replaceId:exercise.id}});
      }}/>
      <Button label="Move earlier" fullWidth variant="secondary" disabled={selected===0}
        onPress={()=>{if(view&&exercise)void reorderActiveExercise(view.id,exercise.id,-1)
          .then(()=>{setSelected(Math.max(0,selected-1));void refresh();setMenuOpen(false);});}}/>
      <Button label="Move later" fullWidth variant="secondary" disabled={selected===view.exercises.length-1}
        onPress={()=>{if(view&&exercise)void reorderActiveExercise(view.id,exercise.id,1)
          .then(()=>{setSelected(Math.min(view.exercises.length-1,selected+1));void refresh();setMenuOpen(false);});}}/>
      <Button label="Close" fullWidth onPress={()=>setMenuOpen(false)}/>
    </Sheet>
    <Sheet visible={noteOpen} title="Exercise note" onClose={()=>setNoteOpen(false)}>
      <Field label="Notes" value={exerciseNote} onChangeText={setExerciseNote} multiline/>
      <Button label="Save note" variant="train" fullWidth onPress={()=>{
        if(exercise)void saveWorkoutExerciseNote(exercise.id,exerciseNote).then(()=>setNoteOpen(false));
      }}/>
    </Sheet>
    <Sheet visible={pendingUndo!==null} title="Undo this set?"
      description="The logged set will be removed. You can log it again."
      onClose={()=>setPendingUndo(null)}>
      <Button label="Keep logged set" fullWidth onPress={()=>setPendingUndo(null)}/>
      <Button label="Undo set" variant="secondary" fullWidth
        onPress={()=>{if(pendingUndo)void undo(pendingUndo);}}/>
    </Sheet>
    <Sheet visible={finishVisible} title={(stats?.pending??0)>0?
      (stats?.pending??0)+' sets have no reps. Finish anyway?':'Finish workout?'}
      description={(stats?.pending??0)>0?'Untouched sets are dropped when you save.':'Review your logged workout before saving.'}
      onClose={()=>setFinishVisible(false)}>
      <Button label="Back to workout" fullWidth onPress={()=>setFinishVisible(false)}/>
      <Button label="Review summary" variant="train" fullWidth
        onPress={()=>{setFinishVisible(false);router.push({pathname:'/(tabs)/train/summary',params:{id:view.id}});}}/>
    </Sheet>
  </Screen>;
}
