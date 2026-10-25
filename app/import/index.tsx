import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Header, ListRow, Screen, Typography } from '../../src/design/primitives';
import { parseImportCsv, csvFileTypeError, ImportParseError, MAX_CSV_BYTES, type Importer } from '../../src/features/import/importCsv';
import { setImportDraft } from '../../src/features/import/importDraft';

const sources:{id:Importer;name:string;guide:string}[]=[
 {id:'hevy',name:'Hevy',guide:'Profile → Settings → Export & Import Data'},
 {id:'strong',name:'Strong',guide:'Settings → Export Data → CSV'},
 {id:'fitnotes',name:'FitNotes',guide:'Settings → Backup & Export → CSV'},
 {id:'csv',name:'Another app (CSV)',guide:'Export a CSV with date, exercise, weight and reps'},
];
export default function ImportStart(){
 const [source,setSource]=useState<Importer>('hevy');
 const [reading,setReading]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const pick=async()=>{
  if(reading)return;setReading(true);setError(null);
  try{
   const result=await DocumentPicker.getDocumentAsync({copyToCacheDirectory:true,multiple:false,type:'*/*'});
   if(result.canceled||!result.assets[0])return;
   const asset=result.assets[0],file=new File(asset.uri);
   const wrongType=csvFileTypeError(asset.name,source);
   if(wrongType){
    try{await file.delete();}catch{/* Picker cache cleanup is best effort. */}
    setError(wrongType);return;
   }
   let text='',tooLarge=false;
   try{
    tooLarge=(asset.size??file.size??0)>MAX_CSV_BYTES;
    if(!tooLarge)text=await file.text();
   }finally{try{await file.delete();}catch{/* Source picker cache cleanup is best effort. */}}
   try{
    if(tooLarge)throw new ImportParseError('too-large','This file is too large to import.');
    const parsed=parseImportCsv(source,asset.name,text);
    setImportDraft({parsed,error:null,source,fileName:asset.name});
   }catch(reason){
    if(reason instanceof ImportParseError)
     setImportDraft({parsed:null,error:reason,source,fileName:asset.name});
    else throw reason;
   }
   router.push('/import/preview');
  }catch{
   setError("Liftria couldn't read that file. Choose a different CSV.");
  }finally{setReading(false);}
 };
 return <Screen>
  <Header title="Import history" subtitle="From another app" onBack={()=>router.back()}/>
  <Card title="Where are you coming from?">
   {sources.map(s=><ListRow key={s.id} title={(source===s.id?'✓ ':'')+s.name}
    detail={s.guide} accessibilityLabel={s.name+(source===s.id?', selected':'')+'. '+s.guide}
    onPress={()=>setSource(s.id)}/>)}
  </Card>
  <Card rim="train" title="Your data stays yours">
   <Typography>The file stays on this phone. Liftria reads it and saves your workouts locally. Nothing is uploaded.</Typography>
   <Typography tone="secondary" size="small">Importing history does not change your plans or templates. The file is not kept after reading.</Typography>
  </Card>
  <Card title="Not in this version">
   <Typography tone="secondary">Hevy account/API import, Apple Health weight import, and exporting from Liftria.</Typography>
  </Card>
  <View style={{gap:12}}>
   {error&&<Typography>{error}</Typography>}
   <Button label={reading?'Reading file…':'Choose a file'} disabled={reading}
    size="xl" variant="train" fullWidth onPress={()=>void pick()}/>
  </View>
 </Screen>;
}
