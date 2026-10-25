import { useLanguage } from '../../../src/i18n/LanguageProvider';
import type { TranslationKey } from '../../../src/i18n';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Button, Card, Header, Screen, Typography } from '../../../src/design/primitives';
import { useTheme } from '../../../src/design/ThemeProvider';
import { MUSCLES, type ExerciseType, type Muscle } from '../../../src/services/database/gymTypes';
import { createCustomExercise, customExerciseSchema } from '../../../src/services/database/exerciseLibrary';

const types: {id:ExerciseType;label:TranslationKey}[]=[
  {id:'weighted',label:'custom.weighted'},
  {id:'dumbbell',label:'custom.dumbbell'},
  {id:'assisted',label:'custom.assisted'},
  {id:'bodyweight',label:'custom.bodyweight'},
];
export default function CreateExercise(){
  const {name:initialName}=useLocalSearchParams<{name?:string}>();
  const {theme}=useTheme();
  const {t}=useLanguage();
  const [name,setName]=useState(initialName??'');
  const [equipment,setEquipment]=useState('');
  const [type,setType]=useState<ExerciseType>('weighted');
  const [unilateral,setUnilateral]=useState(false);
  const [primary,setPrimary]=useState<Muscle[]>([]);
  const [secondary,setSecondary]=useState<Muscle[]>([]);
  const [error,setError]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const valid=customExerciseSchema.safeParse({
    name,equipment:equipment.trim()||null,type,unilateral,
    primaryMuscles:primary,secondaryMuscles:secondary,instructions:[],
  }).success;
  const toggle=(muscle:Muscle,kind:'primary'|'secondary')=>{
    if(kind==='primary'){
      setPrimary(old=>old.includes(muscle)?old.filter(m=>m!==muscle):[...old,muscle]);
      setSecondary(old=>old.filter(m=>m!==muscle));
    }else{
      setSecondary(old=>old.includes(muscle)?old.filter(m=>m!==muscle):[...old,muscle]);
      setPrimary(old=>old.filter(m=>m!==muscle));
    }
  };
  const save=async()=>{
    setBusy(true);setError(null);
    try{
      const saved=await createCustomExercise({
        name,equipment:equipment.trim()||null,type,unilateral,
        primaryMuscles:primary,secondaryMuscles:secondary,instructions:[],
      });
      if(saved.ok)router.replace({pathname:'/(tabs)/train/exercise/[id]',params:{id:saved.value.id}});
      else setError(t('custom.saveError'));
    }catch{setError(t('custom.validationError'));}
    finally{setBusy(false);}
  };
  return <Screen embedded scroll={false}>
    <ScrollView keyboardShouldPersistTaps="handled"
      contentContainerStyle={{paddingVertical:theme.space[3],gap:theme.layout.cardGap}}>
      <Header title={t('custom.title')} subtitle={t('custom.subtitle')} onBack={()=>router.back()}/>
      <Card title={t('custom.details')}>
        <Typography size="small">{t('custom.nameRequired')}</Typography>
        <TextInput value={name} onChangeText={setName} accessibilityLabel={t('custom.name')}
          placeholder={t('custom.name')} placeholderTextColor={theme.color.text.tertiary}
          maxLength={90} style={{minHeight:52,paddingHorizontal:theme.space[3],borderColor:theme.controlOutline,
            borderWidth:1,borderRadius:theme.radius.md,color:theme.color.text.primary,fontSize:theme.type.body.size}}/>
        <Typography size="small">{t('custom.equipmentOptional')}</Typography>
        <TextInput value={equipment} onChangeText={setEquipment} accessibilityLabel={t('custom.equipment')}
          placeholder={t('custom.equipmentExample')} placeholderTextColor={theme.color.text.tertiary}
          maxLength={60} style={{minHeight:52,paddingHorizontal:theme.space[3],borderColor:theme.controlOutline,
            borderWidth:1,borderRadius:theme.radius.md,color:theme.color.text.primary,fontSize:theme.type.body.size}}/>
        <Typography bold>{t('custom.weightType')}</Typography>
        {types.map(item=><Pressable key={item.id} accessibilityRole="radio"
          accessibilityState={{selected:item.id===type,checked:item.id===type}}
          accessibilityLabel={t(item.label)} onPress={()=>setType(item.id)}
          style={{minHeight:theme.size.touch.min,justifyContent:'center',paddingHorizontal:theme.space[3],
            borderWidth:1,borderColor:item.id===type?theme.color.domain.train:theme.controlOutline,
            borderRadius:theme.radius.md,backgroundColor:item.id===type?theme.color.tint.train:theme.cardFill}}>
          <Typography>{t(item.label)}</Typography>
        </Pressable>)}
        <Pressable accessibilityRole="checkbox" accessibilityState={{checked:unilateral}}
          onPress={()=>setUnilateral(x=>!x)} style={{minHeight:theme.size.touch.min,justifyContent:'center'}}>
          <Typography>{unilateral?'☑':'□'} {t('custom.unilateral')}</Typography>
        </Pressable>
      </Card>
      <Card title={t('custom.muscles')}>
        <Typography tone="secondary" size="small">{t('custom.musclesHint')}</Typography>
        {MUSCLES.map(m=><View key={m} style={{gap:theme.space[1]}}>
          <Typography bold>{t(`muscle.${m}` as TranslationKey)}</Typography>
          <View style={{flexDirection:'row',gap:theme.space[2]}}>
            {(['primary','secondary'] as const).map(kind=>{
              const checked=(kind==='primary'?primary:secondary).includes(m);
              return <Pressable key={kind} accessibilityRole="checkbox"
                accessibilityLabel={t('custom.muscleChoice',{name:t(`muscle.${m}` as TranslationKey),kind:t(kind==='primary'?'muscle.primary':'muscle.secondary')})}
                accessibilityState={{checked}} onPress={()=>toggle(m,kind)}
                style={{flex:1,minHeight:theme.size.touch.min,padding:theme.space[2],
                  justifyContent:'center',borderWidth:1,borderRadius:theme.radius.md,
                  backgroundColor:checked?theme.color.tint.train:theme.cardFill,
                  borderColor:checked?theme.color.domain.train:theme.controlOutline}}>
                <Typography size="small">{checked?'☑':'□'} {t(kind==='primary'?'muscle.primary':'muscle.secondary')}</Typography>
              </Pressable>;
            })}
          </View>
        </View>)}
      </Card>
      {error&&<Typography>{error}</Typography>}
      {!valid&&<Typography tone="secondary" size="small">{t('custom.needName')}</Typography>}
      <Button label={busy?t('custom.saving'):t('custom.save')} fullWidth variant="train"
        disabled={!valid||busy} onPress={()=>void save()}/>
    </ScrollView>
  </Screen>;
}