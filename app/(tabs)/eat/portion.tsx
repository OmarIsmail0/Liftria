import {router,useLocalSearchParams} from 'expo-router';
import {useEffect,useMemo,useState} from 'react';
import {ScrollView,View} from 'react-native';
import {Button,Card,Chip,Field,Header,Screen,Typography} from '../../../src/design/primitives';
import {useTheme} from '../../../src/design/ThemeProvider';
import {useLanguage} from '../../../src/i18n/LanguageProvider';
import {formatNumber} from '../../../src/i18n';
import {foodName,snapshot,MEALS,type MealKey,type Food} from '../../../src/features/eat/foodCatalog';
import {foodById,logFood} from '../../../src/features/eat/diaryRepository';

export default function PortionPicker(){
  const params=useLocalSearchParams<{id:string;meal?:MealKey;day?:string}>();
  const {t,language}=useLanguage(),{theme}=useTheme();
  const [food,setFood]=useState<Food|null>(null);
  const [grams,setGrams]=useState('100');
  const [unit,setUnit]=useState('g');
  const [meal,setMeal]=useState<MealKey>(MEALS.includes(params.meal as MealKey)?params.meal!:'lunch');
  const [busy,setBusy]=useState(false),[error,setError]=useState(false);
  useEffect(()=>{
    let alive=true;
    void foodById(params.id).then(result=>{
      if(!alive)return;
      if(result.ok){setFood(result.value);setGrams(String(result.value?.portions[0]?.grams??100));}
      else setError(true);
    });
    return()=>{alive=false;};
  },[params.id]);
  const amount=Number(grams);
  const valid=Number.isFinite(amount)&&amount>0&&amount<=2000;
  const nutrition=useMemo(()=>food&&valid?snapshot(food,amount):null,[food,valid,amount]);
  async function save(){
    if(!food||!valid||busy)return;setBusy(true);
    const result=await logFood(food,amount,meal,params.day);
    if(result.ok)router.replace({pathname:'/(tabs)/eat',params:{undo:result.value.id}});
    else{setError(true);setBusy(false);}
  }
  return <Screen embedded scroll={false}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:theme.layout.cardGap,paddingVertical:theme.space[3]}}>
      <Header title={food?foodName(food,language):t('eatI.portion')} onBack={()=>router.back()}/>
      {food&&<>
        <Card rim="eat">
          {food.source==='egypt'?<Chip kind="estimate" label={t('eatI.recipeEstimate')}/>:
            <Chip kind={food.source==='custom'?'phone':'measured'}
              label={food.source==='custom'?t('eatI.myFood'):t('eatI.usda')}/>}
          <Typography tone="secondary">{t('eatI.chooseUnit')}</Typography>
          <ScrollView horizontal contentContainerStyle={{gap:theme.space[2]}}>
            <Button label="g" variant={unit==='g'?'primary':'secondary'}
              onPress={()=>{setUnit('g');setGrams('100');}}/>
            {food.portions.map(p=><Button key={p.labelEn}
              label={language==='ar'?(p.labelAr??p.labelEn):p.labelEn}
              variant={unit===p.labelEn?'primary':'secondary'}
              onPress={()=>{setUnit(p.labelEn);setGrams(String(p.grams));}}/>)}
          </ScrollView>
          <Field label={t('eatI.gramsLabel')} value={grams} keyboardType="decimal-pad" onChangeText={v=>{setGrams(v);setUnit('g');}}/>
          <Typography tone="secondary" size="small">{t('eatI.storedGrams')}</Typography>
          {amount>2000&&<Typography tone="secondary">{t('eatI.bigPortion')}</Typography>}
        </Card>
        <Card title={t('eatI.nutrition')}>
          <Typography size="head">{nutrition?t('eatI.kcal',{count:formatNumber(language,nutrition.kcal)}):'—'}</Typography>
          {nutrition&&<Typography tone="secondary">{t('eatI.macroAmounts',{
            p:formatNumber(language,nutrition.protein??0,{maximumFractionDigits:1}),
            c:formatNumber(language,nutrition.carbs??0,{maximumFractionDigits:1}),
            f:formatNumber(language,nutrition.fat??0,{maximumFractionDigits:1})})}</Typography>}
        </Card>
        <ScrollView horizontal contentContainerStyle={{gap:theme.space[2]}}>
          {MEALS.map(key=><Button key={key} label={t(`eatI.${key}`)}
            variant={meal===key?'primary':'secondary'} onPress={()=>setMeal(key)}/>)}
        </ScrollView>
        <View style={{alignItems:'stretch'}}>
          <Button label={t('eatI.addTo',{meal:t(`eatI.${meal}`)})} variant="primary"
            fullWidth disabled={busy||!valid} onPress={()=>void save()}/>
        </View>
      </>}
      {error&&<Typography tone="secondary">{t('eatI.error')}</Typography>}
    </ScrollView>
  </Screen>;
}
