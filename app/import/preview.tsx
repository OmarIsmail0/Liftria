import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Header, ListRow, Screen, Typography } from '../../src/design/primitives';
import { getImportDraft, setPendingImport } from '../../src/features/import/importDraft';
import { readImportContext } from '../../src/features/import/importRepository';
import { canImportPlan, createImportPlan, resolveImportMappings, type ImportChoice, type ImportContext } from '../../src/features/import/importPlanning';
import { expectedColumns, type WeightUnit } from '../../src/features/import/importCsv';
import { useTheme } from '../../src/design/ThemeProvider';
import { getTypedSetting } from '../../src/services/database/settings';
export default function ImportPreview(){
 const {theme}=useTheme();
 const draft=getImportDraft();
 const [context,setContext]=useState<ImportContext|null>(null);
 const [error,setError]=useState<string|null>(null);
 const [unit,setUnit]=useState<WeightUnit|null>(null);
 const [displayUnit,setDisplayUnit]=useState<WeightUnit>('kg');
 const [decisions,setDecisions]=useState<Record<string,ImportChoice>>({});
 const load=useCallback(async()=>{
  const result=await readImportContext();
  if(result.ok)setContext(result.value);
  else setError('Could not read existing workouts; nothing was imported.');
 },[]);
 useEffect(()=>{if(draft?.parsed)void Promise.resolve().then(()=>load());},[load,draft?.parsed]);
 useEffect(()=>{void getTypedSetting('units.weight').then(r=>{if(r.ok)setDisplayUnit(r.value);});},[]);
 const plan=draft?.parsed&&context?createImportPlan(draft.parsed,context,unit,decisions,displayUnit):null;
 const suggestions=draft?.parsed&&context?
  resolveImportMappings(draft.parsed,{...context,remembered:{}},{}) : [];
 const unmatchedNames=new Set(suggestions.filter(x=>x.status!=='exact').map(x=>x.name));
 const mappings=plan?.mappings.filter(m=>unmatchedNames.has(m.name))??[];
 const start=()=>{
  if(!plan||!canImportPlan(plan))return;
  setPendingImport(plan);router.push('/import/importing');
 };
 if(!draft)return <Screen><Header title="Review import" onBack={()=>router.back()}/>
  <Typography>No file selected. Choose a CSV first.</Typography>
  <Button label="Choose a file" onPress={()=>router.replace('/import')}/></Screen>;
 const parseError=draft.error;
 const nothing=plan&&(plan.hashDuplicate||plan.workouts.length===0);
 return <Screen>
  <Header title="Review import" subtitle={draft.fileName+' · from '+draft.source}
   onBack={()=>router.back()}/>
  {parseError?<Card title={parseError.code==='empty'?'No workouts found in this file':
    parseError.code==='too-large'?'This file is too large to import':
     "This does not look like a "+draft.source+' export'}>
   <Typography tone="secondary">{parseError.message} Nothing was imported.</Typography>
   <Typography tone="secondary" size="small">Expected: {(parseError.expected.length?parseError.expected:
    expectedColumns(draft.source as 'hevy'|'strong'|'fitnotes'|'csv')).join(', ')}</Typography>
   <Typography tone="secondary" size="small">Found: {parseError.found.join(', ')||'No columns'}</Typography>
   <Button label="Choose another file" onPress={()=>router.replace('/import')}/>
  </Card>:!plan?<Card title="Reading…"><Typography>{error??'Checking workout history on your phone…'}</Typography>
   {error&&<Button label="Retry" onPress={()=>void load()}/>}</Card>:
  nothing?<Card title="Nothing new to import">
   <Typography tone="secondary">All {plan.parsed.workouts.length} workouts in this file are already in Liftria, or the file was previously imported.</Typography>
   <Button label="Done" onPress={()=>router.back()}/>
   <Button label="Choose another file" variant="secondary" onPress={()=>router.replace('/import')}/>
  </Card>:<>
   <Card rim="train" title={plan.workouts.length+' workouts · '+plan.setCount+' sets'}>
    <Typography tone="secondary" size="small">{'From '+draft.source}</Typography>
    <Typography tone="secondary">{new Date(plan.workouts[0]!.startedAt).toLocaleDateString()+
     ' – '+new Date(plan.workouts[plan.workouts.length-1]!.startedAt).toLocaleDateString()}</Typography>
    <ListRow title="Warm-up sets marked" detail={String(plan.warmupCount)}/>
    {!plan.parsed.warmupMarked&&<Typography tone="secondary" size="small">Warm-ups were not marked in this file. All sets will import as working sets.</Typography>}
    <ListRow title="Days already logged (skipped)" detail={String(plan.skippedDays.length)}/>
    {plan.skippedDays.length>0&&<Typography size="small" tone="secondary">
      {plan.skippedDays.slice(0,3).join(', ')}{plan.skippedDays.length>3?
        ' and '+(plan.skippedDays.length-3)+' more':''}</Typography>}
    <ListRow title="Rows ignored" detail={String(plan.parsed.ignored)}/>
    {plan.parsed.nonStrengthRows>0&&<Typography tone="secondary" size="small">
     {plan.parsed.nonStrengthRows} cardio/timed rows without reps aren't imported yet.
     No distance or duration is converted into strength sets.</Typography>}
    <ListRow title="Your own exercises to create" detail={String(plan.customCount)}/>
   </Card>
   {plan.parsed.needsUnit&&<Card title="Were these weights in kg or lb?">
    <Typography tone="secondary">The file does not say. Liftria never guesses; Import stays off until you choose.</Typography>
    <View style={{flexDirection:'row',gap:theme.space[2]}}>
     <Button label={unit==='kg'?'✓ kg':'kg'} variant="secondary" onPress={()=>setUnit('kg')}/>
     <Button label={unit==='lb'?'✓ lb':'lb'} variant="secondary" onPress={()=>setUnit('lb')}/>
    </View>
    {unit&&<Typography>Weights will be read as {unit}.</Typography>}
   </Card>}
   {mappings.length>0&&<Card title={mappings.length+' exercises need a match'}>
    <Typography tone="secondary">Suggested matches are never applied automatically. If you make no choice, Liftria creates a new exercise with no muscles until you add them.</Typography>
    {mappings.map(m=><View key={m.name} style={{gap:theme.space[2],paddingVertical:theme.space[2]}}>
     <Typography bold>{m.name} · {m.count} sets</Typography>
     <Typography tone="secondary">Current choice: {m.resolvedId?
      'Use existing library exercise':'Keep as my own exercise'}</Typography>
     {suggestions.find(s=>s.name===m.name)?.suggestedId&&
      <Typography tone="secondary">Suggested: {suggestions.find(s=>s.name===m.name)?.suggestedName}</Typography>}
     {suggestions.find(s=>s.name===m.name)?.suggestedId&&
      <Button label={'Use '+suggestions.find(s=>s.name===m.name)?.suggestedName}
       variant="secondary" onPress={()=>setDecisions(old=>({...old,[m.name]:
        suggestions.find(s=>s.name===m.name)!.suggestedId!}))}/>}
     <Button label="Keep as my own" variant="secondary"
      onPress={()=>setDecisions(old=>({...old,[m.name]:'custom'}))}/>
    </View>)}
   </Card>}
   <Card title="Records preview">
    {plan.missingUnit?<Typography tone="secondary">Records are shown once you choose the unit.</Typography>:
     plan.changes.length===0?<Typography tone="secondary">No new strength records in these sets.</Typography>:
     plan.changes.slice(0,6).map((change,i)=><ListRow key={i} title={change.exerciseName}
       detail={change.before+' → '+change.after}/>)}
    <Typography tone="secondary" size="small">Estimated 1RM is a trend, not a test.</Typography>
   </Card>
   {error&&<Typography>{error}</Typography>}
   <Button label={'Import '+plan.workouts.length+' workouts'} variant="train" size="xl"
    disabled={!canImportPlan(plan)} fullWidth onPress={start}/>
   <Button label="Cancel" variant="secondary" fullWidth onPress={()=>router.back()}/>
  </>}
 </Screen>;
}
