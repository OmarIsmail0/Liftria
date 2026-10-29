import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Header, ListRow, Screen, Typography } from '../../src/design/primitives';
import { parseImportCsv, csvFileTypeError, ImportParseError, MAX_CSV_BYTES, type Importer } from '../../src/features/import/importCsv';
import { setImportDraft } from '../../src/features/import/importDraft';
import { useLanguage } from '../../src/i18n/LanguageProvider';

const makeSources=(t: ReturnType<typeof useLanguage>['t']): {id:Importer;name:string;guide:string}[]=>[
 {id:'hevy',name:'Hevy',guide:t('im1.hevyGuide')},
 {id:'strong',name:'Strong',guide:t('im1.strongGuide')},
 {id:'fitnotes',name:'FitNotes',guide:t('im1.fitnotesGuide')},
 {id:'csv',name:t('im1.generic'),guide:t('im1.csvGuide')},
];
export default function ImportStart(){
 const {t,language}=useLanguage();
 const sources=makeSources(t);
 const [source,setSource]=useState<Importer>('hevy');
 const [reading,setReading]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const pick=async()=>{
  if(reading)return;setReading(true);setError(null);
  try{
   const result=await DocumentPicker.getDocumentAsync({copyToCacheDirectory:true,multiple:false,type:'*/*'});
   if(result.canceled||!result.assets[0])return;
   const asset=result.assets[0],file=new File(asset.uri);
   const wrongType=csvFileTypeError(asset.name,source,language);
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
    if(tooLarge)throw new ImportParseError('too-large',t('im1.tooLarge'));
    const parsed=parseImportCsv(source,asset.name,text,language);
    setImportDraft({parsed,error:null,source,fileName:asset.name});
   }catch(reason){
    if(reason instanceof ImportParseError)
     setImportDraft({parsed:null,error:reason,source,fileName:asset.name});
    else throw reason;
   }
   router.push('/import/preview');
  }catch{
   setError(t('im1.readFailed'));
  }finally{setReading(false);}
 };
 return <Screen>
  <Header title={t('im1.title')} subtitle={t('im1.subtitle')} onBack={()=>router.back()}/>
  <Card title={t('im1.sourceTitle')}>
   {sources.map(s=><ListRow key={s.id} title={(source===s.id?'✓ ':'')+s.name}
    detail={s.guide} accessibilityLabel={s.name+(source===s.id?', '+t('im1.selected'):'')+'. '+s.guide}
    onPress={()=>setSource(s.id)}/>)}
  </Card>
  <Card rim="train" title={t('im1.privacy')}>
   <Typography>{t('im1.privacyDesc')}</Typography>
   <Typography tone="secondary" size="small">{t('im1.privacyDetail')}</Typography>
  </Card>
  <Card title={t('im1.unavailable')}>
   <Typography tone="secondary">{t('im1.unavailableDesc')}</Typography>
  </Card>
  <View style={{gap:12}}>
   {error&&<Typography>{error}</Typography>}
   <Button label={reading?t('im1.reading'):t('im1.choose')} disabled={reading}
    size="xl" variant="train" fullWidth onPress={()=>void pick()}/>
  </View>
 </Screen>;
}
