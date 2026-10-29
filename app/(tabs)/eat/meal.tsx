import {router,useFocusEffect,useLocalSearchParams} from 'expo-router';
import {useCallback,useEffect,useState} from 'react';
import {Button,Card,Chip,Field,Header,ListRow,Screen,Sheet,Snackbar,Typography} from '../../../src/design/primitives';
import {useLanguage} from '../../../src/i18n/LanguageProvider';
import {formatNumber} from '../../../src/i18n';
import {formatEditableNumber} from '../../../src/i18n/editableNumber';
import {MEALS,entryName,localDay,type MealKey,type Food} from '../../../src/features/eat/foodCatalog';
import {deleteEntry,foodById,moveEntry,readDiaryDay,removeMeal,restoreEntries,saveMeal,
  summarizeEntries,updateEntryGrams,type DiaryEntry} from '../../../src/features/eat/diaryRepository';
import {getTypedSetting} from '../../../src/services/database/settings';

export default function MealDetail(){
  const {t,language}=useLanguage();
  const params=useLocalSearchParams<{meal?:MealKey;day?:string}>();
  const meal=MEALS.includes(params.meal as MealKey)?params.meal!:'breakfast',day=params.day??localDay(new Date());
  const [entries,setEntries]=useState<DiaryEntry[]>([]);
  const [hidden,setHidden]=useState(false);
  const [selected,setSelected]=useState<DiaryEntry|null>(null),[edited,setEdited]=useState('');
  const [food,setFood]=useState<Food|null>(null),[deleting,setDeleting]=useState(false);
  const [deleted,setDeleted]=useState<DiaryEntry[]>([]);
  const [saving,setSaving]=useState(false),[error,setError]=useState(false);
  const [name,setName]=useState(''),[saved,setSaved]=useState(false);
  const reload=useCallback(async()=>{
    const [result,hide]=await Promise.all([readDiaryDay(day),getTypedSetting('hideNumbers')]);
    if(result.ok)setEntries(result.value.filter(e=>e.meal===meal));else setError(true);
    if(hide.ok)setHidden(hide.value);
  },[day,meal]);
  useFocusEffect(useCallback(()=>{void reload();},[reload]));
  useEffect(()=>{
    if(!deleted.length)return;
    const timer=setTimeout(()=>setDeleted([]),8000);
    return()=>clearTimeout(timer);
  },[deleted]);
  const summary=summarizeEntries(entries),format=(v:number)=>formatNumber(language,v);
  const displayName=t(`eatI.${meal}`);
  async function choose(entry:DiaryEntry){
    setSelected(entry);setEdited(formatEditableNumber(entry.grams,'grams'));
    if(entry.foodId){
      const result=await foodById(entry.foodId);
      setFood(result.ok?result.value:null);
    }else setFood(null);
  }
  async function update(){
    if(!selected)return;
    const grams=Number(edited);
    if(food&&Number.isFinite(grams)&&grams>0&&grams<=2000){
      const result=await updateEntryGrams(selected.id,food,grams);
      if(!result.ok)setError(true);
    }
    setSelected(null);await reload();
  }
  async function removeOne(){
    if(!selected)return;
    const result=await deleteEntry(selected.id);
    if(result.ok){setDeleted([selected]);setSelected(null);await reload();}
    else setError(true);
  }
  async function clear(){
    const result=await removeMeal(day,meal);
    if(result.ok){setDeleted(result.value);setDeleting(false);await reload();}
    else setError(true);
  }
  async function saveCombo(){
    setSaving(true);
    const result=await saveMeal(name||displayName,day,meal);
    setSaving(false);
    if(result.ok)setSaved(true);else setError(true);
  }
  return <Screen embedded>
    <Header title={displayName} onBack={()=>router.back()}/>
    <Card rim="eat" title={t('eatI.nutrition')}>
      <Typography>{entries.length===0?t('eatI.notLogged'):hidden?
        t('eatI.items',{count:entries.length}):t('eatI.kcal',{count:format(summary.kcal)})}</Typography>
      {!hidden&&summary.protein!==null&&<Typography tone="secondary">{t('eatI.macroAmounts',{
        p:format(Math.round(summary.protein)),c:summary.carbs===null?'—':format(Math.round(summary.carbs)),
        f:summary.fat===null?'—':format(Math.round(summary.fat))})}</Typography>}
      {entries.length>0&&!hidden&&<Typography tone="secondary" size="small">{t('nutrients.values',{fiber:summary.fiber===null?'—':format(Math.round(summary.fiber*10)/10),
 sugar:summary.sugar===null?'—':format(Math.round(summary.sugar*10)/10),
 sodium:summary.sodium===null?'—':format(Math.round(summary.sodium))})}</Typography>}
      {!hidden&&summary.completeMacroItems>0&&summary.completeMacroItems<summary.count&&
        <Typography tone="secondary" size="small">{t('eatI.partialMacros',{
          count:summary.completeMacroItems,total:summary.count})}</Typography>}
    </Card>
    <Card title={t('eatI.itemsTitle')}>
      {entries.length===0&&<Typography tone="secondary">{t('eatI.notLogged')}</Typography>}
      {entries.map(entry=><ListRow key={entry.id} title={entryName(entry,language)}
        detail={hidden?t('eatI.hidden'):t('eatI.kcal',{count:format(entry.kcal)})}
        onPress={()=>void choose(entry)}
        suffix={entry.source==='quick'?<Chip kind="estimate" label={t('eatI.caloriesOnly')}/>:undefined}/>)}
    </Card>
    <Button label={t('eatI.add')} variant="secondary" onPress={()=>router.push({
      pathname:'/(tabs)/eat/search',params:{day,meal}})}/>
    {entries.some(e=>e.foodId)&&<Card title={t('eatI.saveCombo')}>
      <Field label={t('eatI.savedName')} value={name} onChangeText={setName}/>
      <Button label={t('eatI.saveCombo')} disabled={saving} onPress={()=>void saveCombo()}/>
      {saved&&<Typography>{t('eatI.saved')}</Typography>}
    </Card>}
    {entries.length>0&&<Button label={t('eatI.deleteMeal')} variant="danger" onPress={()=>setDeleting(true)}/>}
    {deleted.length>0&&<Snackbar message={t('eatI.deleted')} onUndo={()=>void restoreEntries(deleted).then(()=>{
      setDeleted([]);void reload();})}/>}
    {error&&<Typography>{t('eatI.error')}</Typography>}
    <Sheet visible={selected!==null} title={selected?.name??displayName}
      onClose={()=>setSelected(null)}>
      {selected&&!hidden&&<Typography tone="secondary">{t('nutrients.values',{
        fiber:selected.fiber==null?'—':format(Math.round(selected.fiber*10)/10),
        sugar:selected.sugar==null?'—':format(Math.round(selected.sugar*10)/10),
        sodium:selected.sodium==null?'—':format(Math.round(selected.sodium))
       })}</Typography>}
      {selected?.grams&&food&&<Field label={t('eatI.gramsLabel')} value={edited}
        onChangeText={setEdited} keyboardType="decimal-pad"/>}
      {selected?.grams&&food&&<Button label={t('eatI.save')} onPress={()=>void update()} fullWidth/>}
      <Typography tone="secondary">{t('eatI.moveTo')}</Typography>
      {MEALS.filter(key=>key!==meal).map(key=><Button key={key} label={t(`eatI.${key}`)}
        variant="ghost" fullWidth onPress={()=>void moveEntry(selected!.id,key).then(()=>{
          setSelected(null);void reload();})}/>)}
      <Button label={t('eatI.removeItem')} variant="danger" onPress={()=>void removeOne()} fullWidth/>
    </Sheet>
    <Sheet visible={deleting} title={t('eatI.deleteMeal')}
      description={t('eatI.confirmDelete',{count:entries.length})}
      onClose={()=>setDeleting(false)}>
      <Button label={t('eatI.keep')} onPress={()=>setDeleting(false)} fullWidth/>
      <Button label={t('eatI.deleteMeal')} variant="danger" onPress={()=>void clear()} fullWidth/>
    </Sheet>
  </Screen>;
}
