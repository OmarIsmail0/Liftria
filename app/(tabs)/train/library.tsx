import { useLanguage } from '../../../src/i18n/LanguageProvider';
import type { TranslationKey } from '../../../src/i18n';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { BodyMap } from '../../../src/features/train/BodyMap';
import { Button, Card, EmptyState, Header, ListRow, Screen, Typography } from '../../../src/design/primitives';
import { useTheme } from '../../../src/design/ThemeProvider';
import { MUSCLE_GROUPS, type Exercise } from '../../../src/services/database/gymTypes';
import { ensureExercisePack, listExercises, searchExercises } from '../../../src/services/database/exerciseLibrary';
import { recentExerciseIds } from '../../../src/services/database/gymRepositories';

const groups=['All',...Object.keys(MUSCLE_GROUPS)] as const;
export default function ExerciseLibrary() {
  const {theme}=useTheme();
  const {t}=useLanguage();
  const groupLabel=(name:string)=>name==='All'?t('library.all'):name==='Chest'?t('library.chest'):
    name==='Back'?t('library.back'):name==='Arms'?t('library.arms'):t('library.legs');
  const params=useLocalSearchParams<{query?:string}>();
  const [query,setQuery]=useState(params.query??'');
  const [group,setGroup]=useState<string>('All');
  const [all,setAll]=useState<Exercise[]>([]);
  const [recent,setRecent]=useState<string[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  useFocusEffect(useCallback(()=>{
    let active=true;
    async function refresh(){
      setLoading(true);setError(null);
      const seeded=await ensureExercisePack();
      if(!seeded.ok){if(active){setError(t('library.openError'));setLoading(false);}return;}
      const [result,history]=await Promise.all([listExercises(),recentExerciseIds()]);
      if(!active)return;
      if(result.ok)setAll(result.value);
      else setError(t('library.readError'));
      setRecent(history.ok?history.value:[]);
      setLoading(false);
    }
    void refresh();
    return ()=>{active=false;};
  },[t]));
  const filtered=useMemo(()=>{
    let rows=searchExercises(all,query);
    if(group!=='All'){
      const muscles=MUSCLE_GROUPS[group as keyof typeof MUSCLE_GROUPS];
      if(muscles)rows=rows.filter(e=>e.primaryMuscles.some(m=>(muscles as readonly string[]).includes(m))
        || e.secondaryMuscles.some(m=>(muscles as readonly string[]).includes(m)));
    }
    return rows;
  },[all,query,group]);
  const recentRows=useMemo(()=>recent.map(id=>all.find(e=>e.id===id))
    .filter((e):e is Exercise=>Boolean(e)),[all,recent]);
  const row=(e:Exercise)=><ListRow key={e.id} title={e.name}
    detail={(e.equipment??t('library.equipmentUnknown'))+' · '+e.primaryMuscles.map(m=>t(`muscle.${m}` as TranslationKey)).join(', ')+(e.source==='custom'?' · '+t('library.mine'):'')}
    suffix={<View style={{width:42,height:76,justifyContent:'center'}}>
      <BodyMap mini primary={e.primaryMuscles} secondary={e.secondaryMuscles}/></View>}
    onPress={()=>router.push({pathname:'/(tabs)/train/exercise/[id]',params:{id:e.id}})}/>;
  return <Screen embedded scroll={false}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingVertical:theme.space[3],gap:theme.space[3]}}>
      <Header title={t('library.title')} subtitle={t('library.subtitle')} onBack={()=>router.back()}
        right={<Button label={t('library.new')} variant="secondary" onPress={()=>router.push('/(tabs)/train/create')}/>}/>
      <TextInput value={query} onChangeText={setQuery} accessibilityLabel={t('library.searchLabel')}
        placeholder={t('library.searchHint')} placeholderTextColor={theme.color.text.tertiary}
        style={{color:theme.color.text.primary,backgroundColor:theme.cardFill,borderColor:theme.controlOutline,
          borderWidth:1,borderRadius:theme.radius.pill,minHeight:52,paddingHorizontal:theme.space[4],
          fontSize:theme.type.body.size}}/>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{gap:theme.space[2],paddingVertical:theme.space[1]}}>
        <Button label={t('library.muscles')} variant="secondary" onPress={()=>router.push('/(tabs)/train/muscles')}/>
        {groups.map(g=><Pressable key={g} accessibilityRole="button"
          accessibilityLabel={t('library.filter',{name:groupLabel(g)})} accessibilityState={{selected:group===g}}
          onPress={()=>setGroup(g)} style={{minHeight:theme.size.touch.min,
            paddingHorizontal:theme.space[4],borderRadius:theme.radius.pill,
            borderWidth:1,borderColor:group===g?theme.color.domain.train:theme.controlOutline,
            justifyContent:'center',backgroundColor:group===g?theme.color.tint.train:theme.cardFill}}>
          <Typography size="small" bold={group===g}>{groupLabel(g)}</Typography>
        </Pressable>)}
      </ScrollView>
      {loading&&<ActivityIndicator color={theme.color.domain.train}/>}
      {error&&<Card><Typography>{error}</Typography><Button label={t('common.back')} onPress={()=>router.back()}/></Card>}
      {!loading&&!error&&!query&&group==='All'&&recentRows.length>0&&
        <Card title={t('library.recent')}>{recentRows.map(row)}</Card>}
      {!loading&&!error&&(filtered.length?
        <Card title={query?t('library.results',{count:filtered.length}):group==='All'?
          t('library.allResults',{count:filtered.length}):t('library.groupResults',{name:groupLabel(group),count:filtered.length})}>
          {filtered.slice(0,60).map(row)}
          {filtered.length>60&&<Typography tone="secondary" size="small">{t('library.limited',{count:filtered.length})}</Typography>}
        </Card>:
        <EmptyState title={query?t('library.noMatch',{query}):t('library.noGroup')}
          description={t('library.emptyHint')}
          action={<Button label={t('library.createNamed',{name:query.trim()||t('library.exercise')})}
            onPress={()=>router.push({pathname:'/(tabs)/train/create',params:{name:query.trim()}})}/>}
        />)}
      <Typography tone="tertiary" size="small">{t('library.attribution')}</Typography>
    </ScrollView>
  </Screen>;
}