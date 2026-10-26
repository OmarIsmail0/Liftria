import {router,useFocusEffect,useLocalSearchParams} from 'expo-router';
import {useCallback,useMemo,useState} from 'react';
import {ScrollView,View} from 'react-native';
import {Button,Card,Field,Header,ListRow,Screen,Typography} from '../../../src/design/primitives';
import {useTheme} from '../../../src/design/ThemeProvider';
import {useLanguage} from '../../../src/i18n/LanguageProvider';
import {formatNumber} from '../../../src/i18n';
import {foodName,bundledFoods,searchFoods,mealAtTime,localDay,MEALS,type Food,type MealKey} from '../../../src/features/eat/foodCatalog';
import {listFavoriteFoods,listRecentFoods,readLocalFoods,logFood,lastLoggedGrams,toggleFavorite} from '../../../src/features/eat/diaryRepository';

export default function FoodSearch(){
  const {t,language}=useLanguage(),{theme}=useTheme();
  const params=useLocalSearchParams<{meal?:MealKey;day?:string}>();
  const [meal,setMeal]=useState<MealKey>(MEALS.includes(params.meal as MealKey)?params.meal!:mealAtTime(new Date()));
  const day=params.day??localDay(new Date());
  const [query,setQuery]=useState('');
  const [custom,setCustom]=useState<Food[]>([]);
  const [favorites,setFavorites]=useState<Food[]>([]);
  const [recent,setRecent]=useState<Food[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState(false);
  useFocusEffect(useCallback(()=>{
    let mounted=true;
    void Promise.all([readLocalFoods(),listFavoriteFoods(),listRecentFoods(meal)]).then(([a,b,c])=>{
      if(!mounted)return;
      if(a.ok)setCustom(a.value);if(b.ok)setFavorites(b.value);if(c.ok)setRecent(c.value);
    });
    return()=>{mounted=false;};
  },[meal]));
  const catalog=useMemo(()=>[...bundledFoods(),...custom],[custom]);
  const rows=useMemo(()=>query.trim()?searchFoods(catalog,query,60):
    [...favorites,...recent,...catalog.filter(f=>f.source==='egypt')].filter(
      (food,index,array)=>array.findIndex(row=>row.id===food.id)===index).slice(0,40),
    [catalog,query,favorites,recent]);
  async function quick(food:Food){
    if(busy)return;
    setBusy(true);
    const portion=await lastLoggedGrams(food);
    const grams=portion.ok?portion.value:(food.portions[0]?.grams??100);
    const result=await logFood(food,grams,meal,day);
    if(result.ok)router.replace({pathname:'/(tabs)/eat',params:{undo:result.value.id}});
    else{setError(true);setBusy(false);}
  }
  return <Screen embedded scroll={false}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:theme.layout.cardGap,paddingVertical:theme.space[3]}}>
      <Header title={t('eatI.search')} onBack={()=>router.back()}/>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:theme.space[2]}}>
        {MEALS.map(key=><Button key={key} label={t(`eatI.${key}`)}
          variant={meal===key?'primary':'secondary'} onPress={()=>setMeal(key)}/>)}
      </ScrollView>
      <Field label={t('eatI.findFood')} placeholder={t('eatI.searchHint')}
        value={query} onChangeText={setQuery}/>
      <Typography tone="secondary" size="small">{t('eatI.offlineSearch')}</Typography>
      <Card rim="eat" title={query?t('eatI.results'):t('eatI.recentAndEgypt')}>
        {rows.map(food=><View key={food.id} style={{gap:theme.space[1]}}>
          <View style={{flexDirection:'row',gap:theme.space[2],alignItems:'center'}}>
            <View style={{flex:1}}>
              <ListRow title={foodName(food,language)}
                detail={t('eatI.per100',{count:formatNumber(language,Math.round(food.kcal))})+
                  (food.estimate?' · '+t('eatI.recipeEstimate'):'')}
                onPress={()=>router.push({pathname:'/(tabs)/eat/portion',params:{id:food.id,meal,day}})}/>
            </View>
            <Button label={t('eatI.add')} disabled={busy} variant="secondary"
              onPress={()=>void quick(food)}/>
          </View>
          <Button label={favorites.some(f=>f.id===food.id)?t('eatI.unfavorite'):t('eatI.favorite')}
            variant="ghost" onPress={()=>void toggleFavorite(food).then(result=>{
              if(result.ok)setFavorites(previous=>result.value?[food,...previous]:previous.filter(f=>f.id!==food.id));
            })}/>
        </View>)}
        {rows.length===0&&<Typography>{t('eatI.noResults')}</Typography>}
      </Card>
      <Button label={t('eatI.createFood')} variant="secondary" onPress={()=>
        router.push({pathname:'/(tabs)/eat/custom',params:{meal,day}})}/>
      <Button label={t('eatI.quick')} variant="secondary" onPress={()=>
        router.push({pathname:'/(tabs)/eat/quick',params:{meal,day}})}/>
      {error&&<Typography>{t('eatI.error')}</Typography>}
    </ScrollView>
  </Screen>;
}
