import { router, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../../design/ThemeProvider';
import { Typography } from '../../design/primitives';
import { bidiIsolate, pluralForm, type TranslationKey } from '../../i18n';
import { useLanguage } from '../../i18n/LanguageProvider';
import { readInProgressWorkout, workoutNumbers, type ActiveWorkout } from './workoutData';
import { elapsedLabel } from './restClock';

/** Visible above the capsule on every main tab; never saves or starts a workout. */
export default function WorkoutMiniBar() {
  const {theme}=useTheme();
  const {t,language}=useLanguage();
  const path=usePathname();
  const [workout,setWorkout]=useState<ActiveWorkout|null>(null);
  const [now,setNow]=useState(() => Date.now());
  useEffect(()=>{
    let mounted=true;
    const refresh=()=>{void readInProgressWorkout().then(result=>{
      if(mounted&&result.ok)setWorkout(result.value);
    });};
    refresh();
    const timer=setInterval(()=>setNow(Date.now()),5000);
    return()=>{mounted=false;clearInterval(timer);};
  },[path]);
  if(!workout||path.includes('/train/active')||path.includes('/train/preview')||
    path.includes('/train/summary'))return null;
  const stats=workoutNumbers(workout);
  const totalSets=workout.exercises.reduce((n,e)=>n+e.targetSets,0);
  const logged=t((`miniBar.logged.${pluralForm(language,stats.sets)}`) as TranslationKey,{count:stats.sets});
  const progress=t((`miniBar.sets.${pluralForm(language,totalSets)}`) as TranslationKey,{
    done:stats.sets,count:totalSets,
  });
  return <Pressable accessibilityRole="button" accessibilityLabel={t('miniBar.resumeA11y',{
    name:workout.title,sets:logged,
  })} onPress={()=>router.push({
      pathname:'/(tabs)/train/active',params:{id:workout.id},
    })} style={{minHeight:64,marginHorizontal:theme.layout.gutter,marginBottom:theme.space[2],
    borderWidth:1.5,borderColor:theme.color.domain.train,
    backgroundColor:theme.color.bg.raised,borderRadius:theme.radius.pill,paddingHorizontal:theme.space[4],
    flexDirection:'row',gap:theme.space[3],alignItems:'center'}}>
    <View style={{flex:1}}>
      <Typography bold>{workout.title}</Typography>
      <Typography tone="secondary" size="small">{bidiIsolate(language,elapsedLabel(workout.startedAt,now))}
        {' · '}{progress}</Typography>
    </View>
    <Typography bold>{t('miniBar.resume')}</Typography>
  </Pressable>;
}
