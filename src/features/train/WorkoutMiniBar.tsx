import { router, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../../design/ThemeProvider';
import { Typography } from '../../design/primitives';
import { readInProgressWorkout, workoutNumbers, type ActiveWorkout } from './workoutData';
import { elapsedLabel } from './restClock';

/** Visible above the capsule on every main tab; never saves or starts a workout. */
export default function WorkoutMiniBar() {
  const {theme}=useTheme();
  const path=usePathname();
  const [workout,setWorkout]=useState<ActiveWorkout|null>(null);
  const [now,setNow]=useState(0);
  useEffect(()=>{
    let mounted=true;
    const refresh=()=>{void readInProgressWorkout().then(result=>{
      if(mounted&&result.ok)setWorkout(result.value);
    });};
    refresh();
    const timer=setInterval(()=>{setNow(Date.now());refresh();},5000);
    return()=>{mounted=false;clearInterval(timer);};
  },[path]);
  if(!workout||path.includes('/train/active')||path.includes('/train/preview')||
    path.includes('/train/summary'))return null;
  const stats=workoutNumbers(workout);
  return <Pressable accessibilityRole="button" accessibilityLabel={'Resume '+workout.title+
    ', '+stats.sets+' sets logged'} onPress={()=>router.push({
      pathname:'/(tabs)/train/active',params:{id:workout.id},
    })} style={{minHeight:64,marginHorizontal:theme.layout.gutter,marginBottom:theme.space[2],
    borderWidth:1.5,borderColor:theme.color.domain.train,
    backgroundColor:theme.color.bg.raised,borderRadius:theme.radius.pill,paddingHorizontal:theme.space[4],
    flexDirection:'row',gap:theme.space[3],alignItems:'center'}}>
    <View style={{flex:1}}>
      <Typography bold>{workout.title}</Typography>
      <Typography tone="secondary" size="small">{elapsedLabel(workout.startedAt,now)} · {stats.sets} of {
        workout.exercises.reduce((n,e)=>n+e.targetSets,0)} sets</Typography>
    </View>
    <Typography bold>Resume</Typography>
  </Pressable>;
}
