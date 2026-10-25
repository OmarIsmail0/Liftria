import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView } from 'react-native';
import { BodyMap } from '../../../src/features/train/BodyMap';
import { Card, EmptyState, Header, ListRow, Screen, Typography } from '../../../src/design/primitives';
import { useTheme } from '../../../src/design/ThemeProvider';
import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { muscleLabel } from '../../../src/i18n/muscles';
import { MUSCLES, type Exercise, type Muscle } from '../../../src/services/database/gymTypes';
import { ensureExercisePack, listExercises, searchExercises } from '../../../src/services/database/exerciseLibrary';

export default function MuscleBrowser(){
  const {theme}=useTheme();
  const { t, language } = useLanguage();
  const {muscle}=useLocalSearchParams<{muscle?:string}>();
  const requested=MUSCLES.find(m=>m===muscle)??'chest';
  const [selected,setSelected]=useState<Muscle>(requested);
  const [all,setAll]=useState<Exercise[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  useFocusEffect(useCallback(()=>{
    let mounted=true;
    void (async()=>{
      const p=await ensureExercisePack();
      const rows=p.ok?await listExercises():null;
      if(mounted){
        if(rows?.ok)setAll(rows.value);else setError(true);
        setLoading(false);
      }
    })();
    return()=>{mounted=false;};
  },[]));
  const rows=useMemo(()=>searchExercises(all,'',selected),[all,selected]);
  return <Screen embedded scroll={false}>
    <ScrollView contentContainerStyle={{paddingVertical:theme.space[3],gap:theme.layout.cardGap}}>
      <Header title={t('train.muscles')} subtitle={t('muscle.browserSubtitle')} onBack={()=>router.back()}/>
      <Card rim="train">
        <BodyMap selected={selected} primary={[selected]} onSelect={setSelected}/>
      </Card>
      <Card title={t('muscle.browserCount', { name: muscleLabel(language,selected), count: rows.length })}>
        <Typography tone="secondary" size="small">{t('muscle.browserDescription')}</Typography>
        {loading&&<ActivityIndicator color={theme.color.domain.train}/>}
        {error&&<Typography>{t('muscle.browserLoadError')}</Typography>}
        {!loading&&!error&&rows.length===0&&<EmptyState title={t('muscle.browserEmpty')}
          description={t('muscle.browserEmptyDescription')}/>}
        {rows.slice(0,50).map(e=><ListRow key={e.id} title={e.name}
          detail={(e.equipment??t('muscle.notSpecified'))+' · '+(e.primaryMuscles.includes(selected)?t('muscle.primary'):t('muscle.secondary'))}
          onPress={()=>router.push({pathname:'/(tabs)/train/exercise/[id]',params:{id:e.id}})}/>)}
        {rows.length>50&&<Typography tone="secondary">{t('muscle.browserMore', { count:rows.length })}</Typography>}
      </Card>
      <Typography tone="tertiary" size="small">{t('muscle.browserData', { count:MUSCLES.length })}</Typography>
    </ScrollView>
  </Screen>;
}