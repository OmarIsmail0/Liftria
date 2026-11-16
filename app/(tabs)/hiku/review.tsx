import {router} from 'expo-router';
import {useState} from 'react';
import {View} from 'react-native';
import {Button,Card,Chip,EmptyState,Field,Header,ListGroup,ListRow,Screen,SectionHeader,SegmentedControl,Sheet,StatBlock,Typography} from '../../../src/design/primitives';
import {useLanguage} from '../../../src/i18n/LanguageProvider';
import {bidiIsolate,formatNumber} from '../../../src/i18n';
import {formatEditableNumber,parseEditableNumber} from '../../../src/i18n/editableNumber';
import {MEALS,localDay,type MealKey} from '../../../src/features/eat/foodCatalog';
import {getHikuDraft,clearHikuDraft,photoReviewReady} from '../../../src/features/hiku/draft';
import type {HikuReviewedItem,HikuItem} from '../../../src/features/hiku/mealSchema';
import {saveHikuReviewed} from '../../../src/features/hiku/requestRepository';
import {bundledFoods,snapshot} from '../../../src/features/eat/foodCatalog';
import {DemoPhotoIllustration} from '../../../src/features/hiku/DemoPhotoIllustration';

export default function ReviewEstimate(){
 const {t,language}=useLanguage();
 const draft=getHikuDraft();
 const [items,setItems]=useState<HikuReviewedItem[]>(draft?.items??[]);
 const [reviewed,setReviewed]=useState<ReadonlySet<HikuItem>>(new Set());
 const [meal,setMeal]=useState<MealKey>('dinner');
 const [selected,setSelected]=useState<number|null>(null),[edited,setEdited]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(false);
 const [discardConfirm,setDiscardConfirm]=useState(false),[changed,setChanged]=useState(false);
 const sum=items.reduce((s,item)=>({kcal:s.kcal+item.kcal,protein:s.protein+item.protein,
  carbs:s.carbs+item.carbs,fat:s.fat+item.fat}),{kcal:0,protein:0,carbs:0,fat:0});
 function edit(index:number){setSelected(index);
  setEdited(formatEditableNumber(items[index]?.grams,'grams'));}
 function apply(){
  if(selected===null)return;
  const item=items[selected],grams=parseEditableNumber(edited)??Number.NaN;
  if(!item||!Number.isFinite(grams)||grams<=0||grams>2000)return;
  let updated:HikuReviewedItem;
  if(item.foodId){
   const food=bundledFoods().find(f=>f.id===item.foodId);
   if(!food)return;
   const n=snapshot(food,grams);
   updated={...item,grams,kcal:n.kcal,protein:n.protein??0,carbs:n.carbs??0,fat:n.fat??0};
  }else{
   const factor=grams/item.original.grams;
   updated={...item,grams,kcal:item.original.kcal*factor,protein:item.original.protein*factor,
    carbs:item.original.carbs*factor,fat:item.original.fat*factor};
  }
  setItems(prev=>prev.map((entry,index)=>index===selected?updated:entry));
  setReviewed(prev=>new Set([...prev,item.original]));
  setChanged(true);setSelected(null);
 }
 async function save(){
  if(!draft||draft.demo||!items.length||busy||
   draft.kind==='photo'&&!photoReviewReady(items,reviewed))return;
  setBusy(true);
  const r=await saveHikuReviewed(draft.meal,items,draft.requestId,localDay(new Date()),meal);
  if(r.ok){clearHikuDraft();router.replace('/(tabs)/eat');return;}
  setError(true);setBusy(false);
 }
 function discard(){
  if(changed){setDiscardConfirm(true);return;}
  clearHikuDraft();router.replace('/(tabs)/hiku');
 }
 const fmt=(n:number)=>formatNumber(language,Math.round(n));
 const gramsValue=(n:number)=>bidiIsolate(language,t('hikuK.valueGrams',{count:fmt(n)}));
 const kcalValue=(n:number)=>bidiIsolate(language,t('hikuK.valueKcal',{count:fmt(n)}));
 const statusLabel=(item:HikuReviewedItem)=>{
  if(draft?.kind!=='photo')return t(item.confidence==='sure'?'hikuK.sure':'hikuK.check');
  if(reviewed.has(item.original))return t('hikuPhoto.checked');
  return t(item.confidence==='check'?'hikuK.check':'hikuPhoto.toCheck');
 };
 const photoReady=draft?.kind!=='photo'||photoReviewReady(items,reviewed);
 return <Screen embedded safeBottom>
  <Header mode="inline" title={t('hikuK.review')} onBack={()=>router.back()}/>
  {!draft?<Card>
   <EmptyState title={t('hikuK.noDraft')} description={t('hikuK.noDraftDetail')}
    action={<Button label={t('hikuK.describe')} fullWidth
     onPress={()=>router.push('/(tabs)/hiku/describe')}/>}/>
  </Card>:<>
   <Card title={draft.meal.meal_name}>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
     <Chip kind="estimate"/>
     {draft.kind==='photo'&&<Chip kind="pending" label={t('hikuPhoto.beta')}/>}
    </View>
    {draft.demo&&draft.kind==='photo'&&<>
     <Typography tone="secondary">{t('hikuPhoto.sampleNotice')}</Typography>
     <DemoPhotoIllustration/>
    </>}
    {draft.kind==='photo'&&<Typography tone="secondary">{t('hikuPhoto.warning')}</Typography>}
    {draft.demo&&<Typography tone="secondary">{t('hikuK.demoWarning')}</Typography>}
    <Typography tone="secondary">{t('hikuK.checkItems')}</Typography>
    {draft.kind==='photo'&&<Typography tone="secondary" size="secondary">
     {t('hikuPhoto.reviewProgress',{checked:items.filter(i=>reviewed.has(i.original)).length,
      total:items.length})}
    </Typography>}
    <View style={{flexDirection:'row',gap:8}}>
     <View style={{flex:1}}><StatBlock value={fmt(sum.kcal)} label={t('hikuK.statKcal')}/></View>
     <View style={{flex:1}}><StatBlock value={fmt(sum.protein)} label={t('hikuK.statProtein')}/></View>
     <View style={{flex:1}}><StatBlock value={fmt(sum.carbs)} label={t('hikuK.statCarbs')}/></View>
     <View style={{flex:1}}><StatBlock value={fmt(sum.fat)} label={t('hikuK.statFat')}/></View>
    </View>
    <Typography tone="secondary" size="secondary">{t('hikuK.originalReview')}</Typography>
   </Card>
   <View style={{gap:8}}>
    <SectionHeader title={t('hikuK.foodItems')}/>
    <ListGroup>
     {items.map((item,index)=><ListRow key={index} onPress={()=>edit(index)}
       title={language==='ar'?item.name_ar:item.name_en}
       detail={t('hikuK.itemStatus',{grams:gramsValue(item.grams),kcal:kcalValue(item.kcal),
        status:statusLabel(item)})}/>)}
    </ListGroup>
   </View>
   <View style={{gap:8}}>
    <SectionHeader title={t('hikuK.mealChoice')}/>
    <SegmentedControl label={t('hikuK.mealChoice')} value={meal} onChange={setMeal}
     options={MEALS.map(key=>({value:key,label:t(('eatI.'+key) as 'eatI.dinner')}))}/>
   </View>
   {error&&<Typography>{t('hikuK.saveError')}</Typography>}
   <View style={{gap:8}}>
    <Button label={t('hikuK.saveTo',{meal:t(('eatI.'+meal) as 'eatI.dinner')})}
     onPress={()=>void save()} disabled={busy||Boolean(draft.demo)||items.length===0||!photoReady} fullWidth/>
    <Button label={t('hikuK.discard')} variant="destructive" fullWidth onPress={discard}/>
   </View>
   <Sheet visible={selected!==null} title={t('hikuK.editGrams')} onClose={()=>setSelected(null)}>
    <Field label={t('eatI.gramsLabel')} value={edited} onChangeText={setEdited}
      keyboardType="decimal-pad"/>
    <Button label={t('hikuK.apply')} disabled={!Number.isFinite(Number(edited))||
     !((parseEditableNumber(edited)??0)>0&&(parseEditableNumber(edited)??0)<=2000)} fullWidth onPress={apply}/>
    <Button label={t('hikuK.remove')} variant="destructive" fullWidth onPress={()=>{
      setItems(prev=>prev.filter((_,index)=>index!==selected));setChanged(true);setSelected(null);}}/>
   </Sheet>
   <Sheet visible={discardConfirm} title={t('hikuK.discardTitle')}
    description={t('hikuK.discardWarning')} onClose={()=>setDiscardConfirm(false)}>
    <Button label={t('hikuK.keepEditing')} fullWidth onPress={()=>setDiscardConfirm(false)}/>
    <Button label={t('hikuK.discard')} variant="destructive" fullWidth onPress={()=>{
      clearHikuDraft();setDiscardConfirm(false);router.replace('/(tabs)/hiku');}}/>
   </Sheet>
  </>}
 </Screen>;
}
