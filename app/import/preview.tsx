import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Header, ListRow, Screen, Typography } from '../../src/design/primitives';
import { getImportDraft, setPendingImport } from '../../src/features/import/importDraft';
import { readImportContext } from '../../src/features/import/importRepository';
import { canImportPlan, createImportPlan, resolveImportMappings, keepAllAsOwn, type ImportChoice, type ImportContext } from '../../src/features/import/importPlanning';
import { expectedColumns, importerLabel, type WeightUnit } from '../../src/features/import/importCsv';
import { useTheme } from '../../src/design/ThemeProvider';
import { ExerciseThumbnail } from '../../src/features/train/ExerciseThumbnail';
import { bundledExercises } from '../../src/services/database/exerciseLibrary';
import { getTypedSetting } from '../../src/services/database/settings';
import { formatNumber, bidiIsolate, latinDigits } from '../../src/i18n';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { exerciseName } from '../../src/i18n/exerciseNames';
export default function ImportPreview(){
 const {theme}=useTheme();
 const {t,language}=useLanguage();
 const draft=getImportDraft();
 const [context,setContext]=useState<ImportContext|null>(null);
 const [error,setError]=useState<string|null>(null);
 const [unit,setUnit]=useState<WeightUnit|null>(null);
 const [displayUnit,setDisplayUnit]=useState<WeightUnit>('kg');
 const [decisions,setDecisions]=useState<Record<string,ImportChoice>>({});
 const load=useCallback(async()=>{
  const result=await readImportContext();
  if(result.ok)setContext(result.value);
  else setError(t('im2.readFailed'));
 },[t]);
 useEffect(()=>{if(draft?.parsed)void Promise.resolve().then(()=>load());},[load,draft?.parsed]);
 useEffect(()=>{void getTypedSetting('units.weight').then(r=>{if(r.ok)setDisplayUnit(r.value);});},[]);
 const plan=draft?.parsed&&context?createImportPlan(draft.parsed,context,unit,decisions,displayUnit,language):null;
 const suggestions=draft?.parsed&&context?
  resolveImportMappings(draft.parsed,{...context,remembered:{}},{}) : [];
 const unmatchedNames=new Set(suggestions.filter(x=>x.status!=='exact').map(x=>x.name));
 const mappings=plan?.mappings.filter(m=>unmatchedNames.has(m.name)||decisions[m.name]==='custom')??[];
 const exerciseCatalog=[...(context?.exercises??[]),...bundledExercises()];
 const imageForId=(id:string|null)=>exerciseCatalog.find(e=>e.id===id);
 const start=()=>{
  if(!plan||!canImportPlan(plan))return;
  setPendingImport(plan);router.push('/import/importing');
 };
 if(!draft)return <Screen><Header title={t("im2.review")} onBack={()=>router.back()}/>
  <Typography>{t('im2.noFile')}</Typography>
  <Button label={t("im2.chooseFile")} onPress={()=>router.replace('/import')}/></Screen>;
 const parseError=draft.error;
 const nothing=plan&&(plan.hashDuplicate||plan.workouts.length===0);
 return <Screen>
  <Header title={t("im2.review")} subtitle={t("im2.from",{file:draft.fileName,source:importerLabel(draft.source)})}
   onBack={()=>router.back()}/>
  {parseError?<Card title={parseError.code==='empty'?t("im2.empty"):
    parseError.code==='too-large'?t("im2.tooLarge"):
     t("im2.invalid",{source:importerLabel(draft.source)})}>
   <Typography tone="secondary">{language==="en"?parseError.message:t("im2.parseIssue")} {t("im2.nothingImported")}</Typography>
   <Typography tone="secondary" size="small">{t('im2.expected',{columns:(parseError.expected.length?parseError.expected:
    expectedColumns(draft.source as 'hevy'|'strong'|'fitnotes'|'csv')).join(', ')})}</Typography>
   <Typography tone="secondary" size="small">{t('im2.found',{columns:parseError.found.join(', ')||t('im2.noColumns')})}</Typography>
   <Button label={t("im2.chooseAnother")} onPress={()=>router.replace('/import')}/>
  </Card>:!plan?<Card title={t("im2.reading")}><Typography>{error??t("im2.checking")}</Typography>
   {error&&<Button label={t("im2.retry")} onPress={()=>void load()}/>}</Card>:
  nothing?<Card title={t("im2.nothingNew")}>
   <Typography tone="secondary">{t("im2.duplicate",{count:plan.parsed.workouts.length})}</Typography>
   <Button label={t("im2.done")} onPress={()=>router.back()}/>
   <Button label={t("im2.chooseAnother")} variant="secondary" onPress={()=>router.replace('/import')}/>
  </Card>:<>
   <Card rim="train" title={t("im2.summary",{workouts:plan.workouts.length,sets:plan.setCount})}>
    <Typography tone="secondary" size="small">{t("im2.fromSource",{source:importerLabel(draft.source)})}</Typography>
    <Typography tone="secondary">{bidiIsolate(language,latinDigits(new Date(plan.workouts[0]!.startedAt).toLocaleDateString(language==='ar'?'ar-EG-u-nu-latn':'en-US')))+
     ' – '+bidiIsolate(language,latinDigits(new Date(plan.workouts[plan.workouts.length-1]!.startedAt).toLocaleDateString(language==='ar'?'ar-EG-u-nu-latn':'en-US')))}</Typography>
    <ListRow title={t("im2.warmups")} detail={formatNumber(language,plan.warmupCount)}/>
    {!plan.parsed.warmupMarked&&<Typography tone="secondary" size="small">{t("im2.warmupsNotMarked")}</Typography>}
    <ListRow title={t("im2.skipped")} detail={formatNumber(language,plan.skippedDays.length)}/>
    {plan.skippedDays.length>0&&<Typography size="small" tone="secondary">
      {plan.skippedDays.slice(0,3).join(', ')}{plan.skippedDays.length>3?
        t("im2.more",{count:plan.skippedDays.length-3}):''}</Typography>}
    <ListRow title={t("im2.rowsIgnored")} detail={formatNumber(language,plan.parsed.ignored)}/>
    {plan.parsed.nonStrengthRows>0&&<Typography tone="secondary" size="small">
     {t("im2.cardio",{count:plan.parsed.nonStrengthRows})}</Typography>}
    <ListRow title={t("im2.custom")} detail={formatNumber(language,plan.customCount)}/>
   </Card>
   {plan.parsed.needsUnit&&<Card title={t("im2.unitTitle")}>
    <Typography tone="secondary">{t("im2.unitExplain")}</Typography>
    <View style={{flexDirection:'row',gap:theme.space[2]}}>
     <Button label={unit==='kg'?'✓ kg':'kg'} variant="secondary" onPress={()=>setUnit('kg')}/>
     <Button label={unit==='lb'?'✓ lb':'lb'} variant="secondary" onPress={()=>setUnit('lb')}/>
    </View>
    {unit&&<Typography>{t("im2.unitChoice",{unit})}</Typography>}
   </Card>}
   {plan.mappings.length>0&&<Card title={t("im2.matching",{count:mappings.length})}>
    <Typography tone="secondary">{t("im2.matchExplain")}</Typography>
    <Button label={t("im2.keepAll")} variant="secondary"
     onPress={()=>setDecisions(old=>keepAllAsOwn(plan,old))}/>
    {Object.keys(decisions).length>0&&<Button label={t("im2.restore")} variant="secondary"
     onPress={()=>setDecisions({})}/>}
    {mappings.length===0&&<Typography tone="secondary" size="small">{t("im2.allMatched")}</Typography>}
    {mappings.map(m=><View key={m.name} style={{gap:theme.space[2],paddingVertical:theme.space[2]}}>
     <View style={{flexDirection:'row',alignItems:'center',gap:theme.space[2]}}>
      {imageForId(m.resolvedId??m.suggestedId) &&
        <ExerciseThumbnail exercise={imageForId(m.resolvedId??m.suggestedId)!}/>}
      <Typography bold>{t("im2.matchCount",{name:m.name,count:m.count})}</Typography>
     </View>
     <Typography tone="secondary">{m.resolvedId?t("im2.currentLibrary"):t("im2.currentOwn")}</Typography>
     {suggestions.find(s=>s.name===m.name)?.status==='exact'&&
      <Button label={t("im2.useExact")} variant="secondary"
       onPress={()=>setDecisions(old=>({...old,[m.name]:
        suggestions.find(s=>s.name===m.name)!.resolvedId!}))}/>}
     {suggestions.find(s=>s.name===m.name)?.suggestedId&&
      <Typography tone="secondary">{t("im2.suggested",{name:exerciseName(language,suggestions.find(s=>s.name===m.name)?.suggestedId,suggestions.find(s=>s.name===m.name)?.suggestedName??"")})}</Typography>}
     {suggestions.find(s=>s.name===m.name)?.suggestedId&&
      <Button label={t("im2.useSuggested",{name:exerciseName(language,suggestions.find(s=>s.name===m.name)?.suggestedId,suggestions.find(s=>s.name===m.name)?.suggestedName??"")})}
       variant="secondary" onPress={()=>setDecisions(old=>({...old,[m.name]:
        suggestions.find(s=>s.name===m.name)!.suggestedId!}))}/>}
     <Button label={t("im2.keepOwn")} variant="secondary"
      onPress={()=>setDecisions(old=>({...old,[m.name]:'custom'}))}/>
    </View>)}
   </Card>}
   <Card title={t("im2.records")}>
    {plan.missingUnit?<Typography tone="secondary">{t("im2.unitFirst")}</Typography>:
     plan.changes.length===0?<Typography tone="secondary">{t("im2.noRecords")}</Typography>:
     plan.changes.slice(0,6).map((change,i)=><ListRow key={i} title={change.exerciseName}
       leading={exerciseCatalog.find(e=>e.name===change.exerciseName)?
         <ExerciseThumbnail exercise={exerciseCatalog.find(e=>e.name===change.exerciseName)!}/>:undefined}
       detail={bidiIsolate(language,change.before)+' → '+bidiIsolate(language,change.after)}/>)}
    <Typography tone="secondary" size="small">{t("im2.rmEstimate")}</Typography>
   </Card>
   {error&&<Typography>{error}</Typography>}
   <Button label={t("im2.import",{count:plan.workouts.length})} variant="train" size="xl"
    disabled={!canImportPlan(plan)} fullWidth onPress={start}/>
   <Button label={t("im2.cancel")} variant="secondary" fullWidth onPress={()=>router.back()}/>
  </>}
 </Screen>;
}
