import {router,useLocalSearchParams} from 'expo-router';
import {useState} from 'react';
import {Button,Card,Chip,Field,Header,Screen,Typography} from '../../../src/design/primitives';
import {useLanguage} from '../../../src/i18n/LanguageProvider';
import {useTheme} from '../../../src/design/ThemeProvider';
import {logQuick} from '../../../src/features/eat/diaryRepository';
import {MEALS,mealAtTime,type MealKey} from '../../../src/features/eat/foodCatalog';

export default function QuickCalories(){
  const {t}=useLanguage(),{theme}=useTheme();
  const params=useLocalSearchParams<{day?:string;meal?:MealKey}>();
  const [meal,setMeal]=useState<MealKey>(MEALS.includes(params.meal as MealKey)?params.meal!:mealAtTime(new Date()));
  const [name,setName]=useState(''),[kcal,setKcal]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState(false);
  const number=Number(kcal),valid=kcal.trim()!==''&&Number.isFinite(number)&&number>0&&number<=10000;
  async function save(){
    if(!valid||busy)return;setBusy(true);
    const result=await logQuick(number,meal,params.day,name.trim()||t('eatI.quick'));
    if(result.ok)router.replace({pathname:'/(tabs)/eat',params:{undo:result.value.id}});
    else{setError(true);setBusy(false);}
  }
  return <Screen embedded>
    <Header title={t('eatI.quick')} onBack={()=>router.back()}/>
    <Card rim="eat">
      <Chip kind="estimate" label={t('eatI.caloriesOnly')}/>
      <Typography tone="secondary">{t('eatI.noMacroClaim')}</Typography>
      <Field label={t('eatI.nameOptional')} value={name} onChangeText={setName}/>
      <Field label={t('eatI.calories')} keyboardType="decimal-pad" value={kcal} onChangeText={setKcal}/>
    </Card>
    <Card title={t('eatI.meal')}>
      {MEALS.map(key=><Button key={key} label={t(`eatI.${key}`)}
        variant={key===meal?'primary':'ghost'} onPress={()=>setMeal(key)}/>)}
    </Card>
    {error&&<Typography>{t('eatI.error')}</Typography>}
    <Button label={t('eatI.save')} disabled={!valid||busy} fullWidth onPress={()=>void save()}/>
  </Screen>;
}
