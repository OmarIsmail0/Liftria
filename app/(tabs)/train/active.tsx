import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Linking, Pressable, ScrollView, Text, Vibration, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const {t}=useLanguage();
  const insets=useSafeAreaInsets();
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
    else setError(t('active.loadError'));
  },[currentId,t]);
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
  const restLabel=rest.status==='running'?displayRest(deadline,now):rest.status==='over'?t('active.restOver'):t('active.restTimer');
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
      if(message)void AccessibilityInfo.announceForAccessibility(message==='30 seconds'?t('active.30seconds'):message==='10 seconds'?t('active.10seconds'):t('active.restOver'));
    }
    previousRestMs.current=remaining;
  },[rest.remainingMs,rest.status,focused,t]);
  const log=async()=>{
    if(!view||!exercise||busy)return;
    if(edit){
      setBusy(true);
      const result=await editLoggedSet(edit.id,view.id,kg,reps);
      if(result.ok&&result.value){setEdit(null);setError(null);await refresh();}
      else setError(t('active.editError'));
      setBusy(false);return;
    }
    if(reps<1){setError(t('active.needReps'));return;}
    if(kg>500||reps>100){setError(t('active.largeValues'));return;}
    const position=kind==='warm-up'?Math.max(99,...view.sets.filter(s=>
      s.sessionExerciseId===exercise.id&&s.kind==='warm-up').map(s=>s.position))+1:
      current?.position;
    if(position===undefined){setError(t('active.allLoggedError'));return;}
    setBusy(true);setError(null);
    try{await cancelSessionRestAlerts(view.id);}catch{setError(t('active.cancelAlertError'));setBusy(false);return;}
    const saved=await logWorkoutSet({sessionId:view.id,sessionExerciseId:exercise.id,
      position,side:exercise.unilateral?(current?.side??'L'):null,weight:kg,reps,kind,restSec:exercise.restSec});
    setBusy(false);
    if(!saved.ok){setError(t('active.saveError'));return;}
    if(haptics)Vibration.vibrate(12);
    setLastLogged(saved.value);
    setRestSet(saved.value);
    if(kind==='working')setReps(0);
    void AccessibilityInfo.announceForAccessibility(t('active.loggedAnnouncement',{name:kind==='warm-up'?t('active.warmupSet'):t('active.set',{count:position+1}),seconds:exercise.restSec}));
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
    catch{setError(t('active.scheduleError'));}
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
    try{await cancelSessionRestAlerts(view.id);}catch{setError(t('active.undoAlertError'));return;}
    const result=await removeLoggedSet(item.id,view.id);
    if(!result.ok||!result.value){setError(t('active.undoError'));return;}

    setLastLogged(null);setRestSet(null);setRestVisible(false);setPendingUndo(null);
    setKg(item.weight);setReps(item.reps);setEdit(null);await refresh();
  };
  const adjust=async(delta:number)=>{
    if(!view||!visibleRest)return;
    const next=shiftRest(deadline,delta,now);
    try{await cancelSessionRestAlerts(view.id);}catch{setError(t('active.adjustAlertError'));return;}
    const saved=await updateRestDeadline(visibleRest.id,view.id,next);
    if(saved.ok&&saved.value){
      const updated={...visibleRest,restDeadline:next};
      setRestSet(updated);await refresh();
      if(next&&restAt(next).status==='running'&&exercise)void armNotification(updated,exercise.name);
    }
  };
  const choose=(index:number)=>{setSelected(index);setEdit(null);setSuggestion(null);setKg(0);setReps(0);};
  const selectEdit=(s:ActiveSet)=>{setEdit(s);setKg(s.weight);setReps(s.reps);setKind(s.kind);};
  if(!view)return <Screen embedded><Header title={t('active.workout')} onBack={()=>router.replace('/(tabs)/train')}/>
    <Typography tone="secondary">{error??t('active.opening')}</Typography></Screen>;
  return <Screen embedded scroll={false}>
    {screenOn&&focused&&<KeepScreenOn/>}
    <View style={{paddingHorizontal:theme.layout.gutter,paddingTop:theme.space[2],gap:theme.space[2]}}>
      <Header title={view.title} subtitle={t('active.elapsed',{time:elapsedLabel(view.startedAt,now),count:stats?.sets??0})}
        onBack={()=>router.replace('/(tabs)/train')} right={<Button label={t('active.finish')} variant="secondary"
          onPress={()=>stats?.pending?setFinishVisible(true):
            router.push({pathname:'/(tabs)/train/summary',params:{id:view.id}})}/>}/>
      <View style={{height:theme.space[1],backgroundColor:theme.color.track,
        borderRadius:theme.radius.pill,overflow:'hidden'}}>
        <View style={{height:'100%',width:(stats&&view.exercises.reduce((n,e)=>n+e.targetSets,0)>0?
          Math.min(100,100*stats.sets/view.exercises.reduce((n,e)=>n+e.targetSets,0)):0)+'%' as `${number}%`,
          backgroundColor:theme.color.domain.train}}/>
      </View>
      <View style={{flexDirection:'row',gap:theme.space[2],flexWrap:'wrap'}}>
        <Button label={restLabel}
          variant="secondary" onPress={()=>setRestVisible(true)}/>
        <Button label={t('active.addExercise')} variant="ghost"
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
          <Button label={t('active.exerciseOptions')} variant="secondary" onPress={()=>setMenuOpen(true)}/>
        </View>
        {view.sets.filter(s=>s.sessionExerciseId===exercise.id&&s.kind==='warm-up')
          .sort((a,b)=>a.position-b.position).map((s,index)=>
            <ListRow key={s.id} title={t('active.warmupRow',{count:index+1})}
              detail={displayWeight(s.weight,exercise.type,weightUnit)+' × '+t('active.repsCount',{count:s.reps})}
              suffix={<Button label={t('active.undo')} variant="secondary" onPress={()=>setPendingUndo(s)}/>}
              onPress={()=>selectEdit(s)}/>)}
        <Typography tone="secondary" size="small">{exercise.unilateral?t('active.bothSides'):''}
          {exercise.type==='dumbbell'?t('active.perHand'):exercise.type==='assisted'?t('active.assistance'):exercise.type==='bodyweight'?t('active.addedWeight'):t('active.usedWeight')}</Typography>
        {slots.map((slot,index)=>{
          const active=!slot.logged&&current===slot;
          const label=t('active.set',{count:slot.position+1})+(slot.side?' '+slot.side:'');
          return <View key={index} style={{flexDirection:'row',alignItems:'center',gap:theme.space[2],
            minHeight:64,paddingVertical:theme.space[2],borderBottomWidth:1,borderColor:theme.color.border.subtle}}>
            <View style={{flex:1,gap:theme.space[1]}}>
              <Typography bold>{label}{active?' · '+t('active.current'):''}</Typography>
              {slot.logged?<Pressable accessibilityRole="button" accessibilityLabel={t('active.loggedA11y',{set:label,weight:Number(fromKg(slot.logged.weight,weightUnit).toFixed(2)),unit:weightUnit,reps:slot.logged.reps})}
                onPress={()=>selectEdit(slot.logged!)}>
                <Typography>{displayWeight(slot.logged.weight,exercise.type,weightUnit)} × {slot.logged.reps} · {t('active.edit')}</Typography>
              </Pressable>:
                <Typography tone="tertiary" size="small">{t('active.notLogged')}</Typography>}
            </View>
            {slot.logged?<Button label={'✓ '+t('active.undo')} variant="secondary"
              onPress={()=>setPendingUndo(slot.logged)}/>:
              active?<Button label={'✓ '+t('active.log')} variant="train" disabled={busy} onPress={()=>void log()}/>:
              <Typography tone="tertiary">—</Typography>}
          </View>;
        })}
        <Text style={{fontStyle:'italic',color:theme.color.text.tertiary,fontSize:theme.type.small.size}}>
          {t('active.suggestionDisclaimer')}
        </Text>
      </Card>:<Card title={t('active.noExercises')}>
        <Typography tone="secondary">{t('active.addHint')}</Typography>
        <Button label={t('active.browse')} variant="train"
          onPress={()=>router.push('/(tabs)/train/library')}/>
      </Card>}
      {view.exercises[selected+1]&&<Card title={t('active.upNext')}>
        <ListRow title={view.exercises[selected+1]?.name ?? t('active.upNext')}
          onPress={()=>choose(selected+1)}/>
      </Card>}
      {denied&&<Typography tone="secondary">{t('active.alertsOff')}</Typography>}
      {error&&<Typography>{error}</Typography>}
    </ScrollView>
    <View style={{paddingHorizontal:theme.layout.gutter,paddingTop:theme.space[3],
      paddingBottom:theme.space[3]+insets.bottom,backgroundColor:theme.color.bg.raised,gap:theme.space[2]}}>
      {edit&&<Typography bold>{t('active.editingSet',{name:edit.kind==='warm-up'?t('active.warmupSet'):t('active.set',{count:edit.position+1})})}</Typography>}
      {!edit&&suggestion&&<Text style={{fontStyle:'italic',color:theme.color.text.tertiary,fontSize:theme.type.small.size}}>
        {suggestion.progressed?t('active.progressed',{weight:fromKg(step,weightUnit).toFixed(2).replace(/\.?0+$/,''),unit:weightUnit}):t('active.suggested')}
        {displayWeight(suggestion.weight,exercise?.type??'weighted',weightUnit)} × {t('active.suggestedReps',{count:suggestion.reps})}
      </Text>}
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:theme.space[2]}}>
        <GymStepper label={exercise?.type==='assisted'?t('active.assistanceUnit',{unit:weightUnit}):exercise?.type==='dumbbell'?t('active.eachUnit',{unit:weightUnit}):t('active.weightUnit',{unit:weightUnit})}
          value={fromKg(kg,weightUnit)} onChange={v=>setKg(toKg(v,weightUnit))}
          step={fromKg(step,weightUnit)} unit={weightUnit}/>
        <GymStepper label={t('active.reps')} value={reps} onChange={setReps} step={1} max={500}/>
      </View>
      <SegmentedControl label={t('active.kind')} value={kind} onChange={setKind}
        options={[{value:'working',label:t('active.working')},{value:'warm-up',label:t('active.warmup')}]}/>
      {denied&&<View style={{gap:theme.space[1]}}>
        <Typography tone="secondary" size="small">{t('active.enableNotificationsHint')}</Typography>
        <Button label={t('active.enableNotifications')} variant="secondary" onPress={()=>void Linking.openSettings()}/>
      </View>}
      <Button label={edit?t('active.saveCorrection'):kind==='warm-up'?t('active.logWarmup'):current?t('active.logSet',{count:current.position+1}):t('active.allSetsLabel')} variant="train" size="xl"
        fullWidth disabled={busy||!exercise||(!edit&&!current&&kind==='working')}
        onPress={()=>void log()}/>
      {edit&&<Button label={t('active.cancelEdit')} variant="ghost" onPress={()=>{setEdit(null);setKg(0);setReps(0);}}/>}
    </View>
    <Sheet visible={askVisible} title={t('active.restPermissionTitle')}
      description={t('active.restPermissionDesc')}
      onClose={()=>void allow(false)}>
      <Button label={t('active.restAllow')} variant="train" fullWidth onPress={()=>void allow(true)}/>
      <Button label={t('active.restAppOnly')} variant="secondary" fullWidth onPress={()=>void allow(false)}/>
    </Sheet>
    <Sheet visible={restVisible} title={restLabel}
      description={t('active.restPendingDesc')}
      onClose={()=>setRestVisible(false)}>
      <RestOrb remainingMs={rest.remainingMs} totalMs={(exercise?.restSec??120)*1000}
        label={restLabel} />
      <Chip kind="pending" label={t('active.devicePending')}/>
      <Typography tone="secondary" size="small">{t('active.nextSet',{name:exercise?.name??t('active.nextExercise'),set:current?t('active.set',{count:current.position+1}):t('active.chooseExercise')})}</Typography>
      <Typography tone="secondary">{lastLogged?
        t('active.recentLogged',{name:lastLogged.kind==='warm-up'?t('active.warmupSet'):t('active.set',{count:lastLogged.position+1}),weight:displayWeight(lastLogged.weight,exercise?.type??'weighted',weightUnit),reps:lastLogged.reps}):t('active.restContinues')}</Typography>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:theme.space[2]}}>
        <Button label="−15 s" variant="secondary" onPress={()=>void adjust(-15)}/>
        <Button label="+15 s" variant="secondary" onPress={()=>void adjust(15)}/>
        <Button label="+30 s" variant="secondary" onPress={()=>void adjust(30)}/>
      </View>
      <Button label={t('active.skipRest')} variant="secondary" fullWidth onPress={()=>void adjust(-3600)}/>
      {lastLogged&&<Button label={t('active.undoLogged')} variant="secondary" fullWidth
        onPress={()=>void undo(lastLogged)}/>}
      <Button label={t('active.backToWorkout')} variant="train" fullWidth onPress={()=>setRestVisible(false)}/>
    </Sheet>
    <Sheet visible={menuOpen} title={t('active.exerciseOptions')} description={exercise?.name}
      onClose={()=>setMenuOpen(false)}>
      <Button label={t('active.history')} fullWidth variant="secondary" onPress={()=>{
        setMenuOpen(false);if(exercise)router.push({
          pathname:'/(tabs)/train/exercise/[id]',params:{id:exercise.exerciseId}});
      }}/>
      <Button label={t('active.notes')} fullWidth variant="secondary"
        onPress={()=>{setMenuOpen(false);setNoteOpen(true);}}/>
      <Button label={t('active.replace')} fullWidth variant="secondary" onPress={()=>{
        setMenuOpen(false);if(view&&exercise)router.push({pathname:'/(tabs)/train/pick',
          params:{id:view.id,replaceId:exercise.id}});
      }}/>
      <Button label={t('active.earlier')} fullWidth variant="secondary" disabled={selected===0}
        onPress={()=>{if(view&&exercise)void reorderActiveExercise(view.id,exercise.id,-1)
          .then(()=>{setSelected(Math.max(0,selected-1));void refresh();setMenuOpen(false);});}}/>
      <Button label={t('active.later')} fullWidth variant="secondary" disabled={selected===view.exercises.length-1}
        onPress={()=>{if(view&&exercise)void reorderActiveExercise(view.id,exercise.id,1)
          .then(()=>{setSelected(Math.min(view.exercises.length-1,selected+1));void refresh();setMenuOpen(false);});}}/>
      <Button label={t('active.close')} fullWidth onPress={()=>setMenuOpen(false)}/>
    </Sheet>
    <Sheet visible={noteOpen} title={t('active.noteTitle')} onClose={()=>setNoteOpen(false)}>
      <Field label={t('active.notesLabel')} value={exerciseNote} onChangeText={setExerciseNote} multiline/>
      <Button label={t('active.saveNote')} variant="train" fullWidth onPress={()=>{
        if(exercise)void saveWorkoutExerciseNote(exercise.id,exerciseNote).then(()=>setNoteOpen(false));
      }}/>
    </Sheet>
    <Sheet visible={pendingUndo!==null} title={t('active.undoTitle')}
      description={t('active.undoDesc')}
      onClose={()=>setPendingUndo(null)}>
      <Button label={t('active.keepSet')} fullWidth onPress={()=>setPendingUndo(null)}/>
      <Button label={t('active.undoSet')} variant="secondary" fullWidth
        onPress={()=>{if(pendingUndo)void undo(pendingUndo);}}/>
    </Sheet>
    <Sheet visible={finishVisible} title={(stats?.pending??0)>0?
      t('active.pendingFinish',{count:stats?.pending??0}):t('active.finishTitle')}
      description={(stats?.pending??0)>0?t('active.dropPending'):t('active.reviewBeforeSave')}
      onClose={()=>setFinishVisible(false)}>
      <Button label={t('active.backToWorkout')} fullWidth onPress={()=>setFinishVisible(false)}/>
      <Button label={t('active.reviewSummary')} variant="train" fullWidth
        onPress={()=>{setFinishVisible(false);router.push({pathname:'/(tabs)/train/summary',params:{id:view.id}});}}/>
    </Sheet>
  </Screen>;
}
