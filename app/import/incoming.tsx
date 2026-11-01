import { File } from 'expo-file-system';
import { router, useLocalSearchParams } from 'expo-router';
import { clearSharedPayloads, getResolvedSharedPayloadsAsync, getSharedPayloads } from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Button, Card, Header, Screen, Typography } from '../../src/design/primitives';
import { setImportDraft } from '../../src/features/import/importDraft';
import { previewDraftFromShare, type SharedPiece } from '../../src/features/import/importIncoming';
import { readFailureMessage } from '../../src/features/import/importCsv';
import { deleteCachedImportFile, writeIncomingImportFile } from '../../src/features/settings/storage';
import { useLanguage } from '../../src/i18n/LanguageProvider';

function one(value:string|string[]|undefined):string|null{
 if(Array.isArray(value))return value[0]??null;
 return value??null;
}
async function sharedPieces():Promise<SharedPiece[]>{
 const raw=getSharedPayloads();
 const asPiece=(piece:{value:string;shareType:SharedPiece['shareType'];mimeType?:string|null;
  contentUri?:string|null;originalName?:string|null}):SharedPiece=>({
  value:piece.value,shareType:piece.shareType,mimeType:piece.mimeType??null,
  contentUri:piece.contentUri??null,originalName:piece.originalName??null,
 });
 const needsFile=raw.some(piece=>piece.shareType==='file'||/^(content|file):/i.test(piece.value));
 if(!needsFile)return raw.map(piece=>asPiece(piece));
 try{
  const resolved=await getResolvedSharedPayloadsAsync();
  return resolved.map(piece=>asPiece({
   value:piece.value,shareType:piece.shareType,mimeType:piece.contentMimeType??piece.mimeType??null,
   contentUri:piece.contentUri,originalName:piece.originalName,
  }));
 }catch{
  return raw.map(piece=>asPiece(piece));
 }
}
export default function IncomingImport(){
 const {url}=useLocalSearchParams<{url?:string|string[]}>();
 const {t,language}=useLanguage();
 const [error,setError]=useState<string|null>(null);
 const sharedUrl=one(url);
 useEffect(()=>{
  let cancel=false;
  void (async()=>{
   try{
    const preview=await previewDraftFromShare({
     url:sharedUrl,language,payloads:await sharedPieces(),
     readText:uri=>new File(uri).text(),
    });
    try{clearSharedPayloads();}catch{/* Nothing was shared, or the module is unavailable. */}
    if(cancel)return;
    if(!preview.ok){setError(preview.message);return;}
    const cacheUri=await writeIncomingImportFile(preview.draft.fileName,preview.text);
    if(preview.sourceUri&&preview.sourceUri!==cacheUri)await deleteCachedImportFile(preview.sourceUri);
    if(cancel){await deleteCachedImportFile(cacheUri);return;}
    setImportDraft({...preview.draft,cacheUri});
    router.replace('/import/preview');
   }catch(reason){
    if(!cancel)setError(readFailureMessage(reason,language));
   }
  })();
  return()=>{cancel=true;};
 },[sharedUrl,language]);
 const back=()=>{if(router.canGoBack())router.back();else router.replace('/import');};
 return <Screen>
  <Header title={t('im1.incomingTitle')} onBack={back}/>
  <Card title={error?t('im1.incomingFailed'):t('im1.reading')}>
   <Typography>{error??t('im1.incomingReading')}</Typography>
   {error?<Button label={t('im1.choose')} variant="train" onPress={()=>router.replace('/import')}/>:null}
  </Card>
 </Screen>;
}
