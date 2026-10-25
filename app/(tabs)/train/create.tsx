import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Button, Card, Header, Screen, Typography } from '../../../src/design/primitives';
import { useTheme } from '../../../src/design/ThemeProvider';
import { MUSCLES, titleMuscle, type ExerciseType, type Muscle } from '../../../src/services/database/gymTypes';
import { createCustomExercise, customExerciseSchema } from '../../../src/services/database/exerciseLibrary';

const types: {id:ExerciseType;label:string}[]=[
  {id:'weighted',label:'Weighted (total load)'},
  {id:'dumbbell',label:'Dumbbell (kg each)'},
  {id:'assisted',label:'Assisted (assist kg)'},
  {id:'bodyweight',label:'Body weight (+ added kg)'},
];
export default function CreateExercise(){
  const {name:initialName}=useLocalSearchParams<{name?:string}>();
  const {theme}=useTheme();
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
      else setError('Could not save this exercise on your phone. Try again.');
    }catch{setError('Check the exercise name and muscle choices.');}
    finally{setBusy(false);}
  };
  return <Screen embedded scroll={false}>
    <ScrollView keyboardShouldPersistTaps="handled"
      contentContainerStyle={{paddingVertical:theme.space[3],gap:theme.layout.cardGap}}>
      <Header title="Custom exercise" subtitle="Only on this phone" onBack={()=>router.back()}/>
      <Card title="Details">
        <Typography size="small">Name · required</Typography>
        <TextInput value={name} onChangeText={setName} accessibilityLabel="Custom exercise name"
          placeholder="Exercise name" placeholderTextColor={theme.color.text.tertiary}
          maxLength={90} style={{minHeight:52,paddingHorizontal:theme.space[3],borderColor:theme.controlOutline,
            borderWidth:1,borderRadius:theme.radius.md,color:theme.color.text.primary,fontSize:theme.type.body.size}}/>
        <Typography size="small">Equipment · optional</Typography>
        <TextInput value={equipment} onChangeText={setEquipment} accessibilityLabel="Equipment"
          placeholder="e.g. cable, kettlebell, barbell" placeholderTextColor={theme.color.text.tertiary}
          maxLength={60} style={{minHeight:52,paddingHorizontal:theme.space[3],borderColor:theme.controlOutline,
            borderWidth:1,borderRadius:theme.radius.md,color:theme.color.text.primary,fontSize:theme.type.body.size}}/>
        <Typography bold>Weight type</Typography>
        {types.map(item=><Pressable key={item.id} accessibilityRole="radio"
          accessibilityState={{selected:item.id===type,checked:item.id===type}}
          accessibilityLabel={item.label} onPress={()=>setType(item.id)}
          style={{minHeight:theme.size.touch.min,justifyContent:'center',paddingHorizontal:theme.space[3],
            borderWidth:1,borderColor:item.id===type?theme.color.domain.train:theme.controlOutline,
            borderRadius:theme.radius.md,backgroundColor:item.id===type?theme.color.tint.train:theme.cardFill}}>
          <Typography>{item.label}</Typography>
        </Pressable>)}
        <Pressable accessibilityRole="checkbox" accessibilityState={{checked:unilateral}}
          onPress={()=>setUnilateral(x=>!x)} style={{minHeight:theme.size.touch.min,justifyContent:'center'}}>
          <Typography>{unilateral?'☑':'□'} Unilateral · separate left and right</Typography>
        </Pressable>
      </Card>
      <Card title="Muscles">
        <Typography tone="secondary" size="small">Choose primary and secondary muscles. Every item is a separate accessible control. You can leave them empty.</Typography>
        {MUSCLES.map(m=><View key={m} style={{gap:theme.space[1]}}>
          <Typography bold>{titleMuscle(m)}</Typography>
          <View style={{flexDirection:'row',gap:theme.space[2]}}>
            {(['primary','secondary'] as const).map(kind=>{
              const checked=(kind==='primary'?primary:secondary).includes(m);
              return <Pressable key={kind} accessibilityRole="checkbox"
                accessibilityLabel={titleMuscle(m)+' '+kind}
                accessibilityState={{checked}} onPress={()=>toggle(m,kind)}
                style={{flex:1,minHeight:theme.size.touch.min,padding:theme.space[2],
                  justifyContent:'center',borderWidth:1,borderRadius:theme.radius.md,
                  backgroundColor:checked?theme.color.tint.train:theme.cardFill,
                  borderColor:checked?theme.color.domain.train:theme.controlOutline}}>
                <Typography size="small">{checked?'☑':'□'} {kind==='primary'?'Primary':'Secondary'}</Typography>
              </Pressable>;
            })}
          </View>
        </View>)}
      </Card>
      {error&&<Typography>{error}</Typography>}
      {!valid&&<Typography tone="secondary" size="small">Enter a name to save your exercise.</Typography>}
      <Button label={busy?'Saving…':'Save custom exercise'} fullWidth variant="train"
        disabled={!valid||busy} onPress={()=>void save()}/>
    </ScrollView>
  </Screen>;
}