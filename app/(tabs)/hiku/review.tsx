import {router} from 'expo-router';
import {useState} from 'react';
import {Button,Card,Chip,Field,Header,Screen,Sheet,Typography} from '../../../src/design/primitives';
import {useLanguage} from '../../../src/i18n/LanguageProvider';
import {formatNumber} from '../../../src/i18n';
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
 function edit(index:number){setSelected(index);setEdited(String(items[index]?.grams??''));}
 function apply(){
  if(selected===null)return;
  const item=items[selected],grams=Number(edited);
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
 const photoReady=draft?.kind!=='photo'||photoReviewReady(items,reviewed);
 return <Screen embedded>
  <Header title={t('hikuK.review')} onBack={()=>router.back()}/>
  {!draft?<Card title={t('hikuK.noDraft')}>
   <Button label={t('hikuK.describe')} onPress={()=>router.push('/(tabs)/hiku/describe')}/>
  </Card>:<>
   <Card rim="hiku" title={draft.meal.meal_name}>
    <Chip kind="estimate"/>
    {draft.demo&&draft.kind==='photo'&&<>
     <Typography tone="secondary">{t('hikuPhoto.sampleNotice')}</Typography>
     <DemoPhotoIllustration/>
    </>}
    {draft.kind==='photo'&&<>
     <Chip kind="pending" label={t('hikuPhoto.beta')}/>
     <Typography tone="secondary">{t('hikuPhoto.warning')}</Typography>
    </>}
    {draft.demo&&<Typography tone="secondary">{t('hikuK.demoWarning')}</Typography>}
    <Typography tone="secondary">{t('hikuK.checkItems')}</Typography>
    {draft.kind==='photo'&&<Typography tone="secondary" size="small">
     {t('hikuPhoto.reviewProgress',{checked:items.filter(i=>reviewed.has(i.original)).length,
      total:items.length})}
    </Typography>}
    <Typography>{t('hikuK.total',{kcal:fmt(sum.kcal),protein:fmt(sum.protein),
      carbs:fmt(sum.carbs),fat:fmt(sum.fat)})}</Typography>
    <Typography tone="secondary" size="small">{t('hikuK.originalReview')}</Typography>
   </Card>
   <Card title={t('hikuK.foodItems')}>
    {items.map((item,index)=><Button key={index} variant="secondary" fullWidth
      label={(language==='ar'?item.name_ar:item.name_en)+' · '+fmt(item.grams)+' g · '+
       fmt(item.kcal)+' kcal'+(draft.kind==='photo'?
        (item.confidence==='check'?' · '+t('hikuK.check'):'')+
        ' · '+t(reviewed.has(item.original)?'hikuPhoto.checked':'hikuPhoto.toCheck'):
        ' · '+t(item.confidence==='sure'?'hikuK.sure':'hikuK.check'))}
      onPress={()=>edit(index)}/>)}
   </Card>
   <Card title={t('hikuK.mealChoice')}>
    {MEALS.map(key=><Button key={key} label={t(('eatI.'+key) as 'eatI.dinner')}
     variant={meal===key?'primary':'secondary'} onPress={()=>setMeal(key)}/>)}
   </Card>
   {error&&<Typography>{t('hikuK.saveError')}</Typography>}
   <Button label={t('hikuK.saveTo',{meal:t(('eatI.'+meal) as 'eatI.dinner')})}
    onPress={()=>void save()} disabled={busy||Boolean(draft.demo)||items.length===0||!photoReady} fullWidth/>
   <Button label={t('hikuK.discard')} variant="ghost" onPress={discard}/>
   <Sheet visible={selected!==null} title={t('hikuK.editGrams')} onClose={()=>setSelected(null)}>
    <Field label={t('eatI.gramsLabel')} value={edited} onChangeText={setEdited}
      keyboardType="decimal-pad"/>
    <Button label={t('hikuK.apply')} disabled={!Number.isFinite(Number(edited))||
     Number(edited)<=0||Number(edited)>2000} fullWidth onPress={apply}/>
    <Button label={t('hikuK.remove')} variant="danger" onPress={()=>{
      setItems(prev=>prev.filter((_,index)=>index!==selected));setChanged(true);setSelected(null);}}/>
   </Sheet>
   <Sheet visible={discardConfirm} title={t('hikuK.discardTitle')}
    description={t('hikuK.discardWarning')} onClose={()=>setDiscardConfirm(false)}>
    <Button label={t('hikuK.keepEditing')} onPress={()=>setDiscardConfirm(false)}/>
    <Button label={t('hikuK.discard')} variant="danger" onPress={()=>{
      clearHikuDraft();setDiscardConfirm(false);router.replace('/(tabs)/hiku');}}/>
   </Sheet>
  </>}
 </Screen>;
}
