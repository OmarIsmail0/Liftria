import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Linking, Pressable, ScrollView, Text, Vibration, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Chip, Field, Header, ListRow, Screen, SegmentedControl, Sheet, Typography } from '../../../src/design/primitives';
import { useTheme } from '../../../src/design/ThemeProvider';
import { GymStepper } from '../../../src/features/train/GymStepper';
import { askRestPermission, cancelSessionRestAlerts, scheduleRestOver } from '../../../src/features/train/restAlerts';
import { displayRest, elapsedLabel, restAnnouncement, restAt, shiftRest } from '../../../src/features/train/restClock';
import { editLoggedSet, logWorkoutSet, readWorkout, readInProgressWorkout, removeLoggedSet,
  updateRestDeadline, previousWorkingSets, suggestionForSlot, reorderActiveExercise,
  saveWorkoutExerciseNote, readWorkoutExerciseNote, previousExerciseNote, updateActiveSuperset, workoutNumbers,
  type ActiveExercise, type ActiveSet, type ActiveWorkout } from '../../../src/features/train/workoutData';
import { RestOrb } from '../../../src/features/train/RestOrb';
import { PlateCalculatorCard } from '../../../src/features/train/PlateCalculatorCard';
import { isPlateLoadedBarbell } from '../../../src/features/train/plateCalculator';
import { supersetAfterSet } from '../../../src/features/train/superset';
import { displayWeight, fromKg, sideLabel, toKg, workoutWeightStep, type WeightUnit } from '../../../src/features/train/workoutUnits';
import { getSetting, setSetting } from '../../../src/services/database';
import { getTypedSetting } from '../../../src/services/database/settings';
import { getExercise } from '../../../src/services/database/exerciseLibrary';
import { MUSCLES, type Exercise } from '../../../src/services/database/gymTypes';
import { summarizeActiveMuscles } from '../../../src/features/train/activeMuscleLoad';
import { BodyMap } from '../../../src/features/train/BodyMap';
import { muscleLabel } from '../../../src/i18n/muscles';
import { formatNumber } from '../../../src/i18n';
import { formatEditableNumber } from '../../../src/i18n/editableNumber';

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
  const {t,language}=useLanguage();
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
  const [previousNote,setPreviousNote]=useState<string|null>(null);
  const [plateVisible,setPlateVisible]=useState(false);
  const [effortMode,setEffortMode]=useState<'off'|'rpe'|'rir'>('off');
  const [effortValue,setEffortValue]=useState('');
  const [menuOpen,setMenuOpen]=useState(false);
  const [noteOpen,setNoteOpen]=useState(false);
  const [muscleOpen,setMuscleOpen]=useState(false);
  const [muscleLookup,setMuscleLookup]=useState<Record<string,Exercise>>({});
  const previousRestMs=useRef<number|null>(null);
  const exerciseScroll=useRef<ScrollView>(null);
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
    void getTypedSetting('train.effortField').then(result=>{if(result.ok)setEffortMode(result.value);});
    return()=>setFocused(false);
  },[refresh]));
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  const exerciseIds=(view?.exercises??[]).map(e=>e.exerciseId).join('|');
  useEffect(()=>{
    let live=true;
    const ids=exerciseIds.split('|').filter(Boolean);
    void Promise.all(ids.map(id=>getExercise(id))).then(results=>{
      if(!live)return;
      setMuscleLookup(Object.fromEntries(ids.flatMap((id,i)=>{
        const found=results[i];
        return found?.ok && found.value ? [[id,found.value]] : [];
      })));
    });
    return()=>{live=false;};
  },[exerciseIds]);
  const muscleSummary=useMemo(()=>view?summarizeActiveMuscles(view,muscleLookup):null,[view,muscleLookup]);
  const exercise=view?.exercises[selected]??null;
  const barbell=!!exercise&&isPlateLoadedBarbell(exercise.type,muscleLookup[exercise.exerciseId]?.equipment);
  const slots=useMemo(()=>exercise&&view?slotsFor(exercise,view.sets):[],[exercise,view]);
  const current=slots.find(slot=>!slot.logged)??null;
  const latestRest=view?.sets.filter(s=>s.restDeadline).sort((a,b)=>b.loggedAt.localeCompare(a.loggedAt))[0]??null;
  const visibleRest=restSet??latestRest;
  const deadline=visibleRest?.restDeadline??null;
  const rest=restAt(deadline,now);
  const restLabel=rest.status==='running'?displayRest(deadline,now,language):rest.status==='over'?t('active.restOver'):t('active.restTimer');
  const stats=view?workoutNumbers(view):null;
  const step=workoutWeightStep(exercise?.type??'weighted',weightUnit,smallPlates);
  const exerciseId=exercise?.exerciseId,exerciseRowId=exercise?.id,repMax=exercise?.repMax;
  const expectedRows=exercise?exercise.targetSets*(exercise.unilateral?2:1):undefined;
  const slotPosition=current?.position,slotSide=current?.side;
  useEffect(()=>{
    if(exerciseId===undefined||repMax===undefined||expectedRows===undefined||
      slotPosition===undefined||slotSide===undefined||edit)return;
    let live=true;
    void previousWorkingSets(exerciseId).then(result=>{
      if(!live)return;
      const next=result.ok?suggestionForSlot(result.value,slotPosition,slotSide,
        repMax,expectedRows,step):null;
      setSuggestion(next);
      setKg(next?.weight??0);setReps(next?.reps??0);
    });
    return()=>{live=false;};
  },[exerciseId,repMax,expectedRows,slotPosition,slotSide,edit,step]);
  useEffect(()=>{
    if(exerciseRowId===undefined||exerciseId===undefined)return;
    let live=true;
    void Promise.all([readWorkoutExerciseNote(exerciseRowId),
      previousExerciseNote(exerciseId)]).then(([current,previous])=>{
      if(!live)return;
      if(current.ok)setExerciseNote(current.value);
      if(previous.ok)setPreviousNote(previous.value);
    });
    return()=>{live=false;};
  },[exerciseRowId,exerciseId]);
  useEffect(()=>{
    if(!view)return;
    const sub=AppState.addEventListener('change',state=>{
      if(state==='active'){void cancelSessionRestAlerts(view.id).catch(()=>setError(t('active.cancelAlertError')));return;}
      if(state!=='background')return;
      const latest=view.sets.filter(row=>row.restDeadline).sort((a,b)=>b.loggedAt.localeCompare(a.loggedAt))[0];
      if(latest?.restDeadline&&restAt(latest.restDeadline).status==='running'){
        const active=view.exercises.find(e=>e.id===latest.sessionExerciseId);
        void scheduleRestOver(latest.restDeadline,view.id,active?.name??view.title,latest.id,language)
          .catch(()=>setError(t('active.scheduleError')));
      }
    });
    return()=>sub.remove();
  },[view,t,language]);
  useEffect(()=>{
    if(!focused||rest.status==='idle')return;
    const remaining=rest.remainingMs;
    const prior=previousRestMs.current;
    if(prior!==null){
      const message=restAnnouncement(prior,remaining,language);
      if(message)void AccessibilityInfo.announceForAccessibility(message);
    }
    previousRestMs.current=remaining;
  },[rest.remainingMs,rest.status,focused,language]);
  const log=async()=>{
    if(!view||!exercise||busy)return;
    if(edit){
      setBusy(true);
      const effort=effortMode==='off'?undefined:{
        rpe:effortMode==='rpe'&&effortValue.trim()?Number(effortValue):null,
        rir:effortMode==='rir'&&effortValue.trim()?Number(effortValue):null,
      };
      const result=await editLoggedSet(edit.id,view.id,kg,reps,effort);
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
    // A unilateral set is incomplete until the second side is logged.
    const roundReady=!exercise.unilateral||current?.side!=='L';
    const superset=kind==='working'&&roundReady?supersetAfterSet(view.exercises,selected):
      {nextIndex:null,startRest:kind!=='working'};
    const effectiveRest=superset.startRest?exercise.restSec:0;
    const effort=effortMode==='off'||!effortValue.trim()?null:Number(effortValue);
    const saved=await logWorkoutSet({sessionId:view.id,sessionExerciseId:exercise.id,
      position,side:exercise.unilateral?(current?.side??'L'):null,weight:kg,reps,kind,
      restSec:effectiveRest,rpe:kind==='working'&&effortMode==='rpe'?effort:null,
      rir:kind==='working'&&effortMode==='rir'?effort:null});
    setBusy(false);
    if(!saved.ok){setError(t('active.saveError'));return;}
    if(haptics)Vibration.vibrate(12);
    setLastLogged(saved.value);
    setRestSet(saved.value);
    if(kind==='working'){setReps(0);setEffortValue('');}
    if(kind==='working'&&superset.nextIndex!==null&&superset.nextIndex!==selected)
      choose(superset.nextIndex);
    void AccessibilityInfo.announceForAccessibility(t('active.loggedAnnouncement',{name:kind==='warm-up'?t('active.warmupSet'):t('active.set',{count:position+1}),seconds:effectiveRest}));
    await refresh();
    if(saved.value.restDeadline){
      const asked=await getSetting('rest.permissionPromptSeen');
      if(asked.ok&&asked.value!=='yes'){setAskVisible(true);}
      else {setRestVisible(true);void armNotification(saved.value,exercise.name);}
    }
  };
  const armNotification=async(set:ActiveSet,name:string)=>{
    if(!set.restDeadline||!view||AppState.currentState==='active')return;
    try{await scheduleRestOver(set.restDeadline,view.id,name,set.id,language);}
    catch{setError(t('active.scheduleError'));}
  };
  const allow=async(grant:boolean)=>{
    setAskVisible(false);
    await setSetting('rest.permissionPromptSeen','yes');
    if(grant){const approved=await askRestPermission(language).catch(()=>false);
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
  const choose=(index:number)=>{setSelected(index);setEdit(null);setSuggestion(null);setKg(0);setReps(0);
    setEffortValue('');exerciseScroll.current?.scrollTo({x:Math.max(0,index-1)*145,animated:true});};
  const selectEdit=(s:ActiveSet)=>{setEdit(s);setKg(s.weight);setReps(s.reps);setKind(s.kind);
    setEffortValue(formatEditableNumber(s.rpe??s.rir,'effort'));};
  if(!view)return <Screen embedded><Header title={t('active.workout')} onBack={()=>router.replace('/(tabs)/train')}/>
    <Typography tone="secondary">{error??t('active.opening')}</Typography></Screen>;
  return <Screen embedded scroll={false}>
    {screenOn&&focused&&<KeepScreenOn/>}
    <View style={{paddingHorizontal:theme.layout.gutter,paddingTop:theme.space[2],gap:theme.space[2]}}>
      <Header title={view.title} subtitle={t('active.elapsed',{time:elapsedLabel(view.startedAt,now),count:stats?.sets??0})}
        onBack={()=>router.replace('/(tabs)/train')} right={<View style={{flexDirection:'row',gap:theme.space[2],alignItems:'center'}}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('polish.musclesSoFar')}
            onPress={()=>setMuscleOpen(true)}
            style={{minWidth:theme.size.touch.min,minHeight:theme.size.touch.min,
              alignItems:'center',justifyContent:'center'}}>
            <BodyMap mini icon primary={muscleSummary?.primary??[]} secondary={muscleSummary?.secondary??[]} />
          </Pressable>
          <Button label={t('active.finish')} variant="secondary"
            onPress={()=>stats?.pending?setFinishVisible(true):
              router.push({pathname:'/(tabs)/train/summary',params:{id:view.id}})}/>
        </View>}/>
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
      <ScrollView ref={exerciseScroll} horizontal contentContainerStyle={{gap:theme.space[2]}} showsHorizontalScrollIndicator={false}>
        {view.exercises.map((e,index)=><Button key={e.id} label={e.name}
          variant={selected===index?'train':'secondary'} onPress={()=>choose(index)}/>)}
      </ScrollView>
      {exercise?<Card title={exercise.name} rim="train">
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:theme.space[2]}}>
          <Button label={t('active.exerciseOptions')} variant="secondary" onPress={()=>setMenuOpen(true)}/>
        </View>
        {exercise.supersetGroup&&<Typography tone="secondary">{t('gymParity.supersetEnd')}</Typography>}
        {view.sets.filter(s=>s.sessionExerciseId===exercise.id&&s.kind==='warm-up')
          .sort((a,b)=>a.position-b.position).map((s,index)=>
            <ListRow key={s.id} title={t('active.warmupRow',{count:index+1})}
              detail={displayWeight(s.weight,exercise.type,weightUnit,language)+' × '+t('active.repsCount',{count:s.reps})}
              suffix={<Button label={t('active.undo')} variant="secondary" onPress={()=>setPendingUndo(s)}/>}
              onPress={()=>selectEdit(s)}/>)}
        <Typography tone="secondary" size="small">{exercise.unilateral?t('active.bothSides'):''}
          {exercise.type==='dumbbell'?t('active.perHand'):exercise.type==='assisted'?t('active.assistance'):exercise.type==='bodyweight'?t('active.addedWeight'):t('active.usedWeight')}</Typography>
        {slots.map((slot,index)=>{
          const active=!slot.logged&&current===slot;
          const label=t('active.set',{count:slot.position+1})+(slot.side?' '+sideLabel(slot.side,language):'');
          return <View key={index} style={{flexDirection:'row',alignItems:'center',gap:theme.space[2],
            minHeight:64,paddingVertical:theme.space[2],borderBottomWidth:1,borderColor:theme.color.border.subtle}}>
            <View style={{flex:1,gap:theme.space[1]}}>
              <Typography bold>{label}{active?' · '+t('active.current'):''}</Typography>
              {slot.logged?<Pressable accessibilityRole="button" accessibilityLabel={t('active.loggedA11y',{set:label,weight:Number(fromKg(slot.logged.weight,weightUnit).toFixed(2)),unit:weightUnit,reps:slot.logged.reps})}
                onPress={()=>selectEdit(slot.logged!)}>
                <Typography>{displayWeight(slot.logged.weight,exercise.type,weightUnit,language)} × {slot.logged.reps}
                {slot.logged.rpe!=null?' · '+t('effort.rpeValue',{value:slot.logged.rpe}):''}
                {slot.logged.rir!=null?' · '+t('effort.rirValue',{value:slot.logged.rir}):''} · {t('active.edit')}</Typography>
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
        {displayWeight(suggestion.weight,exercise?.type??'weighted',weightUnit,language)} × {t('active.suggestedReps',{count:suggestion.reps})}
      </Text>}
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:theme.space[2]}}>
        <GymStepper label={exercise?.type==='assisted'?t('active.assistanceUnit',{unit:weightUnit}):exercise?.type==='dumbbell'?t('active.eachUnit',{unit:weightUnit}):t('active.weightUnit',{unit:weightUnit})}
          value={fromKg(kg,weightUnit)} onChange={v=>setKg(toKg(v,weightUnit))}
          step={fromKg(step,weightUnit)} unit={weightUnit}/>
        <GymStepper label={t('active.reps')} value={reps} onChange={setReps} step={1} max={500}/>
      </View>
      {effortMode!=='off'&&kind==='working'&&
        <View style={{gap:theme.space[1]}}>
          <Field label={t(effortMode==='rpe'?'gymParity.rpeLabel':'gymParity.rirLabel')}
            value={effortValue} onChangeText={setEffortValue} keyboardType="decimal-pad"
            placeholder={t('gymParity.notEntered')}/>
          <Button label={t('gymParity.notEntered')} variant="ghost" onPress={()=>setEffortValue('')}/>
        </View>}
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
      <RestOrb remainingMs={rest.remainingMs} totalMs={(view.exercises.find(e=>e.id===visibleRest?.sessionExerciseId)?.restSec??120)*1000}
        label={restLabel} />
      <Chip kind="pending" label={t('active.devicePending')}/>
      <Typography tone="secondary" size="small">{t('active.nextSet',{name:exercise?.name??t('active.nextExercise'),set:current?t('active.set',{count:current.position+1}):t('active.chooseExercise')})}</Typography>
      <Typography tone="secondary">{lastLogged?
        t('active.recentLogged',{name:lastLogged.kind==='warm-up'?t('active.warmupSet'):t('active.set',{count:lastLogged.position+1}),weight:displayWeight(lastLogged.weight,exercise?.type??'weighted',weightUnit,language),reps:lastLogged.reps}):t('active.restContinues')}</Typography>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:theme.space[2]}}>
        <Button label={t('active.restMinus15')} variant="secondary" onPress={()=>void adjust(-15)}/>
        <Button label={t('active.restPlus15')} variant="secondary" onPress={()=>void adjust(15)}/>
        <Button label={t('active.restPlus30')} variant="secondary" onPress={()=>void adjust(30)}/>
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
      <Button label={t(barbell?'gymParity.plates':'gymParity.warmups')} fullWidth variant="secondary"
        disabled={!exercise||(exercise.type!=='weighted'&&exercise.type!=='dumbbell')}
        onPress={()=>{setMenuOpen(false);setPlateVisible(true);}}/>
      {!exercise?.supersetGroup&&selected+1<view.exercises.length&&
        <Button label={t('gymParity.linkNext')} variant="secondary" fullWidth
          onPress={()=>{void updateActiveSuperset(view.id,selected,2).then(()=>{
            void refresh();setMenuOpen(false);});}}/>}
      {!exercise?.supersetGroup&&selected+2<view.exercises.length&&
        <Button label={t('gymParity.superset')+' × 3'} variant="secondary" fullWidth
          onPress={()=>{void updateActiveSuperset(view.id,selected,3).then(()=>{
            void refresh();setMenuOpen(false);});}}/>}
      {exercise?.supersetGroup&&<Button label={t('gymParity.unlink')} variant="secondary" fullWidth
        onPress={()=>{void updateActiveSuperset(view.id,selected,0).then(()=>{
          void refresh();setMenuOpen(false);});}}/>}
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
    <Sheet visible={plateVisible} title={t(barbell?'gymParity.plates':'gymParity.warmups')}
      onClose={()=>setPlateVisible(false)}>
      <PlateCalculatorCard targetKg={kg>0?kg:suggestion?.weight}
       showPlates={barbell} unplatedStepKg={step} onWarmup={item=>{
        setKg(item.weight);setReps(item.reps);setKind('warm-up');
        setEdit(null);setPlateVisible(false);
      }}/>
    </Sheet>
    <Sheet visible={muscleOpen} title={t('polish.musclesSoFar')}
      description={t('polish.effectiveHint')} onClose={()=>setMuscleOpen(false)}>
      <BodyMap primary={muscleSummary?.primary??[]} secondary={muscleSummary?.secondary??[]}/>
      {(muscleSummary?.completedSets??0)===0?<ListRow title={t('polish.noSetsYet')} detail="—"/>:
        MUSCLES.filter(m=>(muscleSummary?.credit[m]??0)>0).map(m=>
          <ListRow key={m} title={muscleLabel(language,m)}
            detail={t('polish.effectiveSets',{count:formatNumber(language,muscleSummary?.credit[m]??0)})}/>)}
    </Sheet>
    <Sheet visible={noteOpen} title={t('active.noteTitle')} onClose={()=>setNoteOpen(false)}>
      {previousNote&&<Typography tone="secondary">{t('gymParity.previousNote',{note:previousNote})}</Typography>}
      <Field label={t('active.notesLabel')} value={exerciseNote} onChangeText={setExerciseNote} multiline/>
      <Button label={t('active.saveNote')} variant="train" fullWidth onPress={()=>{
        if(exercise)void saveWorkoutExerciseNote(exercise.id,exerciseNote).then(result=>{
          if(result.ok)setNoteOpen(false);else setError(t('active.saveError'));
        });
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
